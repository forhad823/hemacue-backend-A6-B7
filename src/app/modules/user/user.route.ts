import { Router } from "express";
import { UserRole } from "../../../../generated/prisma/enums";
import upload from "../../lib/upload";
import auth from "../../middlewares/checkAuth";
import validateRequest from "../../middlewares/validateRequest";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";

const router = Router();

router.get(
	"/me",
	auth(UserRole.DONOR, UserRole.PATIENT, UserRole.ADMIN),
	UserController.getProfile,
);

router.patch(
	"/me",
	auth(UserRole.DONOR, UserRole.PATIENT, UserRole.ADMIN),
	validateRequest(UserValidation.updateProfileValidationSchema),
	UserController.updateProfile,
);

router.patch(
	"/me/avatar",
	auth(UserRole.DONOR, UserRole.PATIENT, UserRole.ADMIN),
	upload.single("avatar"),
	UserController.uploadAvatar,
);

export const UserRoutes = router;
