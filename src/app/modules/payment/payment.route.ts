import { Router } from "express";
import { UserRole } from "../../../../generated/prisma/enums";
import auth from "../../middlewares/checkAuth";
import { authPaymentRateLimiter } from "../../middlewares/rateLimiter";
import validateRequest from "../../middlewares/validateRequest";
import { PaymentController } from "./payment.controller";
import { PaymentValidation } from "./payment.validation";

const router = Router();

router.post(
	"/initiate",
	auth(UserRole.PATIENT, UserRole.ADMIN),
	authPaymentRateLimiter,
	validateRequest({ body: PaymentValidation.initiatePaymentSchema }),
	PaymentController.initiatePayment,
);

router.post(
	"/execute",
	auth(UserRole.PATIENT, UserRole.ADMIN),
	authPaymentRateLimiter,
	validateRequest({ body: PaymentValidation.executePaymentSchema }),
	PaymentController.executePayment,
);

router.post(
	"/refund/:requestId",
	auth(UserRole.ADMIN),
	validateRequest({
		params: PaymentValidation.refundPaymentParamsSchema,
		body: PaymentValidation.refundPaymentSchema,
	}),
	PaymentController.refundEmergencyLogisticsPayment,
);

router.get(
	"/:id",
	auth(UserRole.PATIENT, UserRole.ADMIN),
	validateRequest({ params: PaymentValidation.paymentIdParamSchema }),
	PaymentController.getPaymentDetails,
);

export const PaymentRoutes = router;
