import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { UserService } from "./user.service";

const getProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const result = await UserService.getProfile(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User profile retrieved successfully",
    data: result,
  });
});

const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const result = await UserService.updateProfile(userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User profile updated successfully",
    data: result,
  });
});

const uploadAvatar = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const result = await UserService.uploadAvatar(userId, req.file);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Avatar uploaded successfully",
    data: result,
  });
});

export const UserController = {
  getProfile,
  updateProfile,
  uploadAvatar,
};
