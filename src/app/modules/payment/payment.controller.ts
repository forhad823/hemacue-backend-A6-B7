import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { PaymentService } from "./payment.service";

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId as string;
	const userRole = req.user?.role as string;

	const result = await PaymentService.initiatePayment(
		userId,
		userRole,
		req.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Payment initiated successfully",
		data: result,
	});
});

const executePayment = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId as string;
	const userRole = req.user?.role as string;

	const result = await PaymentService.executePayment(
		userId,
		userRole,
		req.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payment executed successfully",
		data: result,
	});
});

const refundEmergencyLogisticsPayment = catchAsync(
	async (req: Request, res: Response) => {
		const { requestId } = req.params as { requestId: string };
		const adminId = req.user?.userId as string;

		const result = await PaymentService.refundEmergencyLogisticsPayment(
			requestId,
			req.body,
			adminId,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Payment refunded successfully",
			data: result,
		});
	},
);

const getPaymentDetails = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params as { id: string };
	const userId = req.user?.userId as string;
	const userRole = req.user?.role as string;

	const result = await PaymentService.getPaymentDetails(id, userId, userRole);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payment details retrieved successfully",
		data: result,
	});
});

const getMyPayments = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId as string;

	const result = await PaymentService.getMyPayments(
		userId,
		(req.validatedQuery as never) ?? { page: 1, limit: 10, sortOrder: "desc" },
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payments retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

export const PaymentController = {
	initiatePayment,
	executePayment,
	refundEmergencyLogisticsPayment,
	getPaymentDetails,
	getMyPayments,
};
