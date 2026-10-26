import httpStatus from "http-status";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import type {
	ICreateNotificationPayload,
	IMyNotificationsQueryParams,
} from "./notification.interface";

const NOTIFICATION_SELECT = {
	id: true,
	userId: true,
	type: true,
	title: true,
	message: true,
	isRead: true,
	relatedEntityType: true,
	relatedEntityId: true,
	createdAt: true,
	updatedAt: true,
} as const;

const createNotification = async (payload: ICreateNotificationPayload) => {
	const targetUser = await prisma.user.findUnique({
		where: { id: payload.userId },
	});

	if (!targetUser) {
		throw new AppError(httpStatus.NOT_FOUND, "Target user not found");
	}

	if (targetUser.isDeleted) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot create a notification for a deleted user",
		);
	}

	const notification = await prisma.notification.create({
		data: {
			userId: payload.userId,
			type: payload.type,
			title: payload.title,
			message: payload.message,
			relatedEntityType: payload.relatedEntityType ?? null,
			relatedEntityId: payload.relatedEntityId ?? null,
		},
		select: NOTIFICATION_SELECT,
	});

	return notification;
};

const getMyNotifications = async (
	userId: string,
	query: IMyNotificationsQueryParams,
) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "createdAt",
		sortOrder = "desc",
		type,
		isRead,
		searchTerm,
	} = query;

	const where: Record<string, unknown> = { userId };

	if (type) {
		where.type = type;
	}
	if (isRead !== undefined) {
		where.isRead = isRead;
	}
	if (searchTerm) {
		where.OR = [
			{ title: { contains: searchTerm, mode: "insensitive" } },
			{ message: { contains: searchTerm, mode: "insensitive" } },
		];
	}

	const skip = (page - 1) * limit;
	const orderBy = { [sortBy]: sortOrder };

	const total = await prisma.notification.count({ where });

	const notifications = await prisma.notification.findMany({
		where,
		skip,
		take: limit,
		orderBy,
		select: NOTIFICATION_SELECT,
	});

	return {
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
			totalPage: Math.ceil(total / limit),
		},
		data: notifications,
	};
};

export const NotificationService = {
	createNotification,
	getMyNotifications,
};
