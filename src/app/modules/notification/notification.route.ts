import { Router } from "express";
import { UserRole } from "../../../../generated/prisma/enums";
import auth from "../../middlewares/checkAuth";
import validateRequest from "../../middlewares/validateRequest";
import { NotificationController } from "./notification.controller";
import { NotificationValidation } from "./notification.validation";

const router = Router();

router.post(
	"/",
	auth(UserRole.ADMIN),
	validateRequest(NotificationValidation.createNotificationSchema),
	NotificationController.createNotification,
);

router.get(
	"/",
	auth(UserRole.DONOR, UserRole.PATIENT, UserRole.ADMIN),
	validateRequest({ query: NotificationValidation.myNotificationsQuerySchema }),
	NotificationController.getMyNotifications,
);

export const NotificationRoutes = router;
