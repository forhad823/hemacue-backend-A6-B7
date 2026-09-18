import { Router } from "express";
import { UserRole } from "../../../../generated/prisma/enums";
import auth from "../../middlewares/checkAuth";
import validateRequest from "../../middlewares/validateRequest";
import { BloodRequestController } from "./bloodRequest.controller";
import { BloodRequestValidation } from "./bloodRequest.validation";

const router = Router();

router.post(
	"/",
	auth(UserRole.PATIENT, UserRole.ADMIN),
	validateRequest(BloodRequestValidation.createBloodRequestSchema),
	BloodRequestController.createBloodRequest,
);

router.get(
	"/",
	validateRequest({ query: BloodRequestValidation.queryBloodRequestSchema }),
	BloodRequestController.getAllBloodRequests,
);

router.get(
	"/my-requests",
	auth(UserRole.PATIENT, UserRole.ADMIN),
	validateRequest({ query: BloodRequestValidation.queryBloodRequestSchema }),
	BloodRequestController.getMyBloodRequests,
);

router.get("/:id", BloodRequestController.getBloodRequestById);

router.patch(
	"/:id",
	auth(UserRole.PATIENT, UserRole.ADMIN),
	validateRequest(BloodRequestValidation.updateBloodRequestSchema),
	BloodRequestController.updateBloodRequest,
);

router.delete(
	"/:id",
	auth(UserRole.PATIENT, UserRole.ADMIN),
	BloodRequestController.softDeleteBloodRequest,
);

export const BloodRequestRoutes = router;
