import httpStatus from "http-status";
import {
  PaymentStatus,
  PaymentType,
  UserRole,
} from "../../../../generated/prisma/enums";
import config from "../../config";
import { AppError } from "../../errors/AppError";
import { getBkashIdToken } from "../../lib/bkash";
import { generateInvoicePdf, sendInvoiceEmail } from "../../lib/invoice";
import { prisma } from "../../lib/prisma";
import type {
  IExecutePaymentPayload,
  IInitiatePaymentPayload,
  IRefundPaymentPayload,
} from "./payment.interface";

const bkashApiHeaders = (idToken: string) => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  Authorization: idToken,
  "X-App-Key": config.bkash_app_key,
});

const paymentByIdentifier = async (identifier: string) => {
  return prisma.payment.findFirst({
    where: {
      OR: [{ id: identifier }, { paymentID: identifier }],
    },
  });
};

const assertPaymentOwner = (
  payment: { userId: string },
  userId: string,
  userRole: string,
) => {
  if (userRole !== UserRole.ADMIN && payment.userId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not allowed to access this payment",
    );
  }
};

const initiatePayment = async (
  userId: string,
  userRole: string,
  payload: IInitiatePaymentPayload,
) => {
  const { requestId, paymentType, amount } = payload;

  const bloodRequest = await prisma.bloodRequest.findUnique({
    where: { id: requestId },
  });

  if (!bloodRequest || bloodRequest.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Blood request not found");
  }

  if (userRole !== UserRole.ADMIN && bloodRequest.requesterId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not allowed to pay for this blood request",
    );
  }

  const payer = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  const idToken: any = await getBkashIdToken();

  const createResponse = await fetch(
    `${config.bkash_base_url}/tokenized/checkout/create`,
    {
      method: "POST",
      headers: bkashApiHeaders(idToken),
      body: JSON.stringify({
        mode: "0011",
        payerReference: payer.email ?? payer.phone ?? userId,
        callbackURL: `${config.bkash_callback_url}/payments/execute`,
        amount: amount.toFixed(2),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: `HC${Date.now()}`,
      }),
    },
  );

  const createResult = (await createResponse.json()) as {
    paymentID?: string;
    bkashURL?: string;
    statusMessage?: string;
  };
  // testing
  // console.log("bKash create body:", JSON.stringify(createResult, null, 2));

  if (!createResponse.ok || !createResult.paymentID) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      `bKash payment creation failed: ${
        createResult.statusMessage ?? createResult.paymentID ?? "Unknown error"
      }`,
    );
  }

  const payment = await prisma.payment.create({
    data: {
      userId,
      requestId,
      paymentGateway: "bkash",
      paymentID: createResult.paymentID,
      amount,
      currency: "BDT",
      status: PaymentStatus.INITIALIZED,
      paymentType,
      payerReference: payer.email ?? null,
    },
  });

  return {
    paymentID: createResult.paymentID,
    bkashURL: createResult.bkashURL,
    payment: {
      id: payment.id,
      status: payment.status,
      paymentType: payment.paymentType,
      amount: payment.amount,
      currency: payment.currency,
      requestId: payment.requestId,
    },
  };
};

const executePayment = async (
  userId: string,
  userRole: string,
  payload: IExecutePaymentPayload,
) => {
  const { paymentID } = payload;

  const existingPayment = await prisma.payment.findUnique({
    where: { paymentID },
    include: {
      user: true,
      request: true,
    },
  });

  if (!existingPayment) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  }

  assertPaymentOwner(existingPayment, userId, userRole);

  const idToken = await getBkashIdToken();

  const executeResponse = await fetch(
    `${config.bkash_base_url}/tokenized/checkout/execute`,
    {
      method: "POST",
      headers: bkashApiHeaders(idToken),
      body: JSON.stringify({ paymentID }),
    },
  );

  const executeResult = (await executeResponse.json()) as {
    paymentID?: string;
    trxID?: string;
    transactionStatus?: string;
    statusMessage?: string;
  };

  if (executeResult.transactionStatus !== "Completed") {
    await prisma.payment.update({
      where: { id: existingPayment.id },
      data: {
        status: PaymentStatus.FAILED,
        gatewayResponse: executeResult,
      },
    });

    throw new AppError(
      httpStatus.BAD_GATEWAY,
      executeResult.statusMessage ??
        `bKash payment not completed. Status: ${
          executeResult.transactionStatus ?? "Unknown"
        }`,
    );
  }

  const paidAt = new Date().toISOString();

  const updatedPayment = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { id: existingPayment.id },
      data: {
        status: PaymentStatus.COMPLETED,
        trxID: executeResult.trxID ?? null,
        paidAt,
        gatewayResponse: executeResult,
      },
    });

    if (existingPayment.paymentType === PaymentType.PREMIUM_NOTIFICATION) {
      await tx.bloodRequest.update({
        where: { id: existingPayment.requestId },
        data: { isPremiumNotificationPaid: true },
      });
    } else if (
      existingPayment.paymentType === PaymentType.EMERGENCY_LOGISTICS
    ) {
      await tx.bloodRequest.update({
        where: { id: existingPayment.requestId },
        data: { isLogisticsPaid: true },
      });
    }

    await tx.auditLog.create({
      data: {
        userId,
        action: "PAYMENT_COMPLETED",
        entity: "Payment",
        entityId: payment.id,
        details: {
          paymentID: existingPayment.paymentID,
          trxID: executeResult.trxID,
          amount: existingPayment.amount,
          paymentType: existingPayment.paymentType,
          requestId: existingPayment.requestId,
        },
      },
    });

    return payment;
  });

  // Outside the transaction: PDF/email I/O must never hold a DB transaction open.
  try {
    const pdfBuffer = await generateInvoicePdf(
      updatedPayment,
      existingPayment.request,
    );

    await sendInvoiceEmail(
      existingPayment.user.email,
      updatedPayment,
      pdfBuffer,
      existingPayment.request.patientName,
    );
  } catch (error) {
    console.error(
      "Invoice generation or email delivery failed after payment completed:",
      error,
    );
  }

  return {
    id: updatedPayment.id,
    paymentID: updatedPayment.paymentID,
    trxID: updatedPayment.trxID,
    status: updatedPayment.status,
    paymentType: updatedPayment.paymentType,
    amount: updatedPayment.amount,
    currency: updatedPayment.currency,
    paidAt: updatedPayment.paidAt,
    requestId: updatedPayment.requestId,
    message: "Payment completed successfully",
  };
};

const refundEmergencyLogisticsPayment = async (
  requestId: string,
  payload: IRefundPaymentPayload,
  adminId: string,
) => {
  const { reason } = payload;

  const existingPayment = await prisma.payment.findFirst({
    where: {
      requestId,
      paymentType: PaymentType.EMERGENCY_LOGISTICS,
      status: PaymentStatus.COMPLETED,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!existingPayment) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Completed logistics payment not found for this request",
    );
  }

  if (!existingPayment.trxID) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Cannot refund payment without a bKash transaction ID",
    );
  }

  const idToken = await getBkashIdToken();

  const refundResponse = await fetch(
    `${config.bkash_base_url}/tokenized/checkout/payment/refund`,
    {
      method: "POST",
      headers: bkashApiHeaders(idToken),
      body: JSON.stringify({
        paymentID: existingPayment.paymentID,
        trxID: existingPayment.trxID,
        amount: existingPayment.amount,
        reason,
        sku: "BloodRequest/EmergencyLogistics",
      }),
    },
  );

  const refundResult = (await refundResponse.json()) as {
    refundTrxID?: string;
    transactionStatus?: string;
    statusMessage?: string;
  };

  if (!refundResponse.ok || !refundResult.refundTrxID) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      `bKash refund failed: ${
        refundResult.statusMessage ??
        refundResult.transactionStatus ??
        "Unknown error"
      }`,
    );
  }

  const updatedPayment = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { id: existingPayment.id },
      data: {
        status: PaymentStatus.CANCELLED,
        refundTrxId: refundResult.refundTrxID,
        refundAmount: existingPayment.amount,
        refundReason: reason,
        refundedAt: new Date().toISOString(),
      },
    });

    await tx.bloodRequest.update({
      where: { id: requestId },
      data: { isLogisticsPaid: false },
    });

    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "PAYMENT_REFUNDED",
        entity: "Payment",
        entityId: payment.id,
        details: {
          refundTrxID: refundResult.refundTrxID,
          amount: existingPayment.amount,
          reason,
          requestId,
        },
      },
    });

    return payment;
  });

  return {
    id: updatedPayment.id,
    paymentID: updatedPayment.paymentID,
    trxID: updatedPayment.trxID,
    status: updatedPayment.status,
    refundTrxId: updatedPayment.refundTrxId,
    refundAmount: updatedPayment.refundAmount,
    refundReason: updatedPayment.refundReason,
    refundedAt: updatedPayment.refundedAt,
    message: "Payment refunded successfully",
  };
};

const getPaymentDetails = async (
  identifier: string,
  userId: string,
  userRole: string,
) => {
  const payment = await paymentByIdentifier(identifier);

  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  }

  assertPaymentOwner(payment, userId, userRole);

  return prisma.payment.findUnique({
    where: { id: payment.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      request: {
        select: {
          id: true,
          patientName: true,
          bloodGroup: true,
          hospitalName: true,
          district: true,
          city: true,
          status: true,
        },
      },
    },
  });
};

export const PaymentService = {
  initiatePayment,
  executePayment,
  refundEmergencyLogisticsPayment,
  getPaymentDetails,
};
