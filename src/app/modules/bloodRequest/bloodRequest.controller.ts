import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { BloodRequestService } from "./bloodRequest.service";

const createBloodRequest = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId as string;
	const result = await BloodRequestService.createBloodRequest(userId, req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Blood request created successfully",
		data: result,
	});
});

const getAllBloodRequests = catchAsync(async (req: Request, res: Response) => {
	const result = await BloodRequestService.getAllBloodRequests(
		(req.validatedQuery as never) ?? {},
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Blood requests retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getMyBloodRequests = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId as string;
	const result = await BloodRequestService.getMyBloodRequests(
		userId,
		(req.validatedQuery as never) ?? {},
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "My blood requests retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getBloodRequestById = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params as { id: string };
	const result = await BloodRequestService.getBloodRequestById(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Blood request retrieved successfully",
		data: result,
	});
});

const updateBloodRequest = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params as { id: string };
	const userId = req.user?.userId as string;
	const userRole = req.user?.role as string;

	const result = await BloodRequestService.updateBloodRequest(
		id,
		userId,
		userRole,
		req.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Blood request updated successfully",
		data: result,
	});
});

const softDeleteBloodRequest = catchAsync(
	async (req: Request, res: Response) => {
		const { id } = req.params as { id: string };
		const userId = req.user?.userId as string;
		const userRole = req.user?.role as string;

		await BloodRequestService.softDeleteBloodRequest(id, userId, userRole);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Blood request deleted successfully",
			data: null,
		});
	},
);

export const BloodRequestController = {
	createBloodRequest,
	getAllBloodRequests,
	getMyBloodRequests,
	getBloodRequestById,
	updateBloodRequest,
	softDeleteBloodRequest,
};
