import type {
  PaymentStatus,
  PaymentType,
} from "../../../../generated/prisma/enums";

export interface IInitiatePaymentPayload {
  requestId: string;
  paymentType: PaymentType;
  amount: number;
}

export interface IExecutePaymentPayload {
  paymentID: string;
}

export interface IRefundPaymentPayload {
  reason: string;
}

export interface IMyPaymentsQueryParams {
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "amount";
  sortOrder?: "asc" | "desc";
  status?: PaymentStatus;
  paymentType?: PaymentType;
  searchTerm?: string;
}
