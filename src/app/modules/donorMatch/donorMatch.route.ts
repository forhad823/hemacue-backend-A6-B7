import { Router } from "express";
import { UserRole } from "../../../../generated/prisma/enums";
import auth from "../../middlewares/checkAuth";
import validateRequest from "../../middlewares/validateRequest";
import { DonorMatchController } from "./donorMatch.controller";
import { DonorMatchValidation } from "./donorMatch.validation";

const donorMatchesRouter = Router();
const requestStatusRouter = Router();

donorMatchesRouter.get(
  "/compatible-donors",
  auth(UserRole.PATIENT, UserRole.ADMIN),
  validateRequest({
    query: DonorMatchValidation.compatibleDonorsQuerySchema,
  }),
  DonorMatchController.findCompatibleDonors,
);

donorMatchesRouter.get(
  "/my-donations",
  auth(UserRole.DONOR),
  DonorMatchController.getMyDonations,
);

donorMatchesRouter.post(
  "/assign-donor",
  auth(UserRole.ADMIN, UserRole.PATIENT),
  validateRequest({
    body: DonorMatchValidation.assignDonorSchema,
  }),
  DonorMatchController.assignDonor,
);
// qqqqqq

requestStatusRouter.post(
  "/:id/respond",
  auth(UserRole.DONOR),
  validateRequest({
    params: DonorMatchValidation.respondToRequestParamsSchema,
    body: DonorMatchValidation.respondToRequestSchema,
  }),
  DonorMatchController.respondToRequest,
);

requestStatusRouter.patch(
  "/:id/status",
  auth(UserRole.PATIENT, UserRole.ADMIN),
  validateRequest({
    params: DonorMatchValidation.updateRequestStatusParamsSchema,
    body: DonorMatchValidation.updateRequestStatusSchema,
  }),
  DonorMatchController.updateRequestStatus,
);

export const DonorMatchRoutes = donorMatchesRouter;
export const DonorMatchRequestRoutes = requestStatusRouter;
