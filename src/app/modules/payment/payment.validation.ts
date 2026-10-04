import { z } from "zod";
import { PaymentType } from "../../../../generated/prisma/enums";

const initiatePaymentSchema = z.object({
	requestId: z.string().uuid("Invalid request id format"),
	paymentType: z.enum(
		[PaymentType.PREMIUM_NOTIFICATION, PaymentType.EMERGENCY_LOGISTICS],
		{ message: "Invalid payment type" },
	),
	amount: z
		.number({ message: "Amount must be a number" })
		.positive("Amount must be greater than zero"),
});

const executePaymentSchema = z.object({
	paymentID: z.string().min(1, "paymentID is required"),
});

const refundPaymentParamsSchema = z.object({
	requestId: z.string().uuid("Invalid request id format"),
});

const refundPaymentSchema = z.object({
	reason: z.string().min(1, "Refund reason is required"),
});

const paymentIdParamSchema = z.object({
	id: z.string().min(1, "Payment id is required"),
});

const myPaymentsQuerySchema = z.object({
	page: z.coerce
		.number()
		.int("Page must be an integer")
		.min(1, "Page must be at least 1")
		.default(1),
	limit: z.coerce
		.number()
		.int("Limit must be an integer")
		.min(1, "Limit must be at least 1")
		.max(100, "Limit must be at most 100")
		.default(10),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const PaymentValidation = {
	initiatePaymentSchema,
	executePaymentSchema,
	refundPaymentParamsSchema,
	refundPaymentSchema,
	paymentIdParamSchema,
	myPaymentsQuerySchema,
};
