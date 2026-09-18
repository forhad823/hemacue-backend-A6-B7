import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { DonorMatchService } from "./donorMatch.service";

const findCompatibleDonors = catchAsync(async (req: Request, res: Response) => {
  const result = await DonorMatchService.findCompatibleDonors(
    (req.validatedQuery as never) ?? {},
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Compatible donors retrieved successfully",
    data: result,
  });
});

const assignDonor = catchAsync(async (req: Request, res: Response) => {
  const result = await DonorMatchService.assignDonor(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Donor assigned successfully",
    data: result,
  });
});

const respondToRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const donorId = req.user?.userId as string;

  const result = await DonorMatchService.respondToRequest(
    id,
    donorId,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message || "Response recorded successfully",
    data: null,
  });
});

const updateRequestStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const userId = req.user?.userId as string;
  const userRole = req.user?.role as string;

  const result = await DonorMatchService.updateRequestStatus(
    id,
    req.body.status,
    userId,
    userRole,
    req.ip,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Blood request status updated to ${result.status} successfully`,
    data: result,
  });
});

const getMyDonations = catchAsync(async (req: Request, res: Response) => {
  const donorId = req.user?.userId as string;
  const result = await DonorMatchService.getMyDonations(donorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Donation history retrieved successfully",
    data: result,
  });
});

export const DonorMatchController = {
  findCompatibleDonors,
  respondToRequest,
  updateRequestStatus,
  getMyDonations,
  assignDonor,
};
