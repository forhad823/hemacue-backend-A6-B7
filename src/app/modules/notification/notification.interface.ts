import type { NotificationType } from "../../../../generated/prisma/enums";

export interface ICreateNotificationPayload {
	userId: string;
	type?: NotificationType;
	title: string;
	message: string;
	relatedEntityType?: string;
	relatedEntityId?: string;
}

export interface IMyNotificationsQueryParams {
	page?: number;
	limit?: number;
	sortBy?: "createdAt";
	sortOrder?: "asc" | "desc";
	type?: NotificationType;
	isRead?: boolean;
	searchTerm?: string;
}
