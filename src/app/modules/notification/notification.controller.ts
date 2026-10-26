import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { NotificationService } from "./notification.service";

const createNotification = catchAsync(async (req: Request, res: Response) => {
	const result = await NotificationService.createNotification(req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Notification created successfully",
		data: result,
	});
});

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId as string;
	const result = await NotificationService.getMyNotifications(
		userId,
		(req.validatedQuery as never) ?? {},
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Notifications retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

export const NotificationController = {
	createNotification,
	getMyNotifications,
};
