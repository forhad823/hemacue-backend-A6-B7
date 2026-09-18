import type { PaymentType } from "../../../../generated/prisma/enums";

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
