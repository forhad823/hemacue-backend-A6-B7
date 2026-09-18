import httpStatus from "http-status";
import {
	AssignmentStatus,
	RequestStatus,
	UserRole,
} from "../../../../generated/prisma/enums";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import type {
	ICompatibleDonorQueryParams,
	IRespondRequestPayload,
} from "./donorMatch.interface";

export const BLOOD_COMPATIBILITY_MAP: Record<string, string[]> = {
	A_POSITIVE: ["A_POSITIVE", "A_NEGATIVE", "O_POSITIVE", "O_NEGATIVE"],
	A_NEGATIVE: ["A_NEGATIVE", "O_NEGATIVE"],
	B_POSITIVE: ["B_POSITIVE", "B_NEGATIVE", "O_POSITIVE", "O_NEGATIVE"],
	B_NEGATIVE: ["B_NEGATIVE", "O_NEGATIVE"],
	AB_POSITIVE: [
		"A_POSITIVE",
		"A_NEGATIVE",
		"B_POSITIVE",
		"B_NEGATIVE",
		"AB_POSITIVE",
		"AB_NEGATIVE",
		"O_POSITIVE",
		"O_NEGATIVE",
	],
	AB_NEGATIVE: ["AB_NEGATIVE", "A_NEGATIVE", "B_NEGATIVE", "O_NEGATIVE"],
	O_POSITIVE: ["O_POSITIVE", "O_NEGATIVE"],
	O_NEGATIVE: ["O_NEGATIVE"],
};

const DONOR_ELIGIBLE_SELECT = {
	id: true,
	name: true,
	email: true,
	phone: true,
	bloodGroup: true,
	district: true,
	city: true,
	address: true,
	isAvailable: true,
	lastDonatedAt: true,
	avatarUrl: true,
} as const;

const findCompatibleDonors = async (params: ICompatibleDonorQueryParams) => {
	const { bloodGroup, district, requestId } = params;

	const compatibleGroups = BLOOD_COMPATIBILITY_MAP[bloodGroup];

	if (!compatibleGroups) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid blood group");
	}

	const cooldownCutoff = new Date();
	cooldownCutoff.setDate(cooldownCutoff.getDate() - 90);

	const where: Record<string, unknown> = {
		role: UserRole.DONOR,
		isDeleted: false,
		isAvailable: true,
		bloodGroup: { in: compatibleGroups },
		AND: [
			{
				OR: [
					{ lastDonatedAt: null },
					{ lastDonatedAt: { lte: cooldownCutoff } },
				],
			},
		],
	};

	if (district) {
		where.district = district;
	}

	if (requestId) {
		where.donorAssignments = { none: { requestId } };
	}

	const donors = await prisma.user.findMany({
		where,
		select: DONOR_ELIGIBLE_SELECT,
		orderBy: { lastDonatedAt: "desc" },
	});

	return donors;
};

const respondToRequest = async (
	requestId: string,
	donorId: string,
	payload: IRespondRequestPayload,
) => {
	const { response } = payload;

	const assignment = await prisma.donorAssignment.findUnique({
		where: {
			requestId_donorId: { requestId, donorId },
		},
		include: {
			request: true,
		},
	});

	if (!assignment) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"You have not been assigned to this blood request",
		);
	}

	if (assignment.request.isDeleted) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"This blood request is no longer active",
		);
	}

	if (assignment.status !== AssignmentStatus.NOTIFIED) {
		throw new AppError(
			httpStatus.CONFLICT,
			`This assignment was already ${assignment.status.toLowerCase()}`,
		);
	}

	if (response === AssignmentStatus.ACCEPTED) {
		if (
			assignment.request.status === RequestStatus.CANCELLED ||
			assignment.request.status === RequestStatus.COMPLETED
		) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"This blood request is no longer accepting donors",
			);
		}

		if (assignment.request.status === RequestStatus.PENDING) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Blood request is not verified yet. Please try again after verification.",
			);
		}

		if (assignment.request.status === RequestStatus.DONOR_ASSIGNED) {
			throw new AppError(
				httpStatus.CONFLICT,
				"Another donor has already accepted this request",
			);
		}

		await prisma.$transaction(async (tx) => {
			await tx.donorAssignment.update({
				where: { id: assignment.id },
				data: {
					status: AssignmentStatus.ACCEPTED,
					respondedAt: new Date(),
				},
			});

			await tx.donorAssignment.updateMany({
				where: {
					requestId,
					status: AssignmentStatus.NOTIFIED,
				},
				data: { status: AssignmentStatus.CANCELLED },
			});

			await tx.bloodRequest.update({
				where: { id: requestId },
				data: { status: RequestStatus.DONOR_ASSIGNED },
			});

			await tx.auditLog.create({
				data: {
					userId: donorId,
					action: "DONOR_ACCEPTED",
					entity: "BloodRequest",
					entityId: requestId,
					details: { donorId },
				},
			});
		});

		return { message: "Donation accepted successfully" };
	}

	await prisma.$transaction(async (tx) => {
		await tx.donorAssignment.update({
			where: { id: assignment.id },
			data: {
				status: AssignmentStatus.DECLINED,
				respondedAt: new Date(),
			},
		});

		await tx.auditLog.create({
			data: {
				userId: donorId,
				action: "DONOR_DECLINED",
				entity: "BloodRequest",
				entityId: requestId,
				details: { donorId },
			},
		});
	});

	return { message: "Donation request declined" };
};

const ALLOWED_STATUS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
	[RequestStatus.PENDING]: [RequestStatus.VERIFIED, RequestStatus.CANCELLED],
	[RequestStatus.VERIFIED]: [RequestStatus.CANCELLED],
	[RequestStatus.DONOR_ASSIGNED]: [
		RequestStatus.IN_PROGRESS,
		RequestStatus.CANCELLED,
	],
	[RequestStatus.IN_PROGRESS]: [
		RequestStatus.COMPLETED,
		RequestStatus.CANCELLED,
	],
	[RequestStatus.COMPLETED]: [],
	[RequestStatus.CANCELLED]: [],
};

const updateRequestStatus = async (
	requestId: string,
	status: RequestStatus,
	userId: string,
	userRole: string,
	ipAddress?: string,
) => {
	const existingRequest = await prisma.bloodRequest.findUnique({
		where: { id: requestId },
	});

	if (!existingRequest || existingRequest.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Blood request not found");
	}

	const isAdmin = userRole === UserRole.ADMIN;
	const isOwner = existingRequest.requesterId === userId;

	if (!isAdmin && !isOwner) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not allowed to update the status of this blood request",
		);
	}

	const allowedNextStatuses =
		ALLOWED_STATUS_TRANSITIONS[existingRequest.status];

	if (!allowedNextStatuses.includes(status)) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Cannot change request status from ${existingRequest.status} to ${status}`,
		);
	}

	await prisma.$transaction(async (tx) => {
		await tx.bloodRequest.update({
			where: { id: requestId },
			data: { status },
		});

		await tx.auditLog.create({
			data: {
				userId,
				action: "STATUS_CHANGE",
				entity: "BloodRequest",
				entityId: requestId,
				details: {
					from: existingRequest.status,
					to: status,
				},
				ipAddress,
			},
		});

		if (status === RequestStatus.COMPLETED) {
			const acceptedAssignment = await tx.donorAssignment.findFirst({
				where: {
					requestId,
					status: AssignmentStatus.ACCEPTED,
				},
			});

			if (acceptedAssignment) {
				const now = new Date();

				await tx.donorAssignment.update({
					where: { id: acceptedAssignment.id },
					data: { status: AssignmentStatus.COMPLETED },
				});

				await tx.user.update({
					where: { id: acceptedAssignment.donorId },
					data: {
						lastDonatedAt: now,
						isAvailable: false, // 90-day cooldown starts
					},
				});
			}
		}

		if (status === RequestStatus.CANCELLED) {
			await tx.donorAssignment.updateMany({
				where: {
					requestId,
					status: {
						in: [AssignmentStatus.NOTIFIED, AssignmentStatus.ACCEPTED],
					},
				},
				data: { status: AssignmentStatus.CANCELLED },
			});
		}
	});

	return { status };
};

const getMyDonations = async (donorId: string) => {
	const donations = await prisma.donorAssignment.findMany({
		where: { donorId },
		include: {
			request: {
				select: {
					id: true,
					patientName: true,
					patientAge: true,
					bloodGroup: true,
					unitsRequired: true,
					hospitalName: true,
					hospitalAddress: true,
					district: true,
					city: true,
					urgency: true,
					status: true,
					neededBy: true,
					isLogisticsPaid: true,
					notes: true,
					createdAt: true,
				},
			},
		},
		orderBy: { assignedAt: "desc" },
	});

	return donations;
};

export const DonorMatchService = {
	BLOOD_COMPATIBILITY_MAP,
	findCompatibleDonors,
	respondToRequest,
	updateRequestStatus,
	getMyDonations,
};
