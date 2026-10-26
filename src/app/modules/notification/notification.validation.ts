import { z } from "zod";
import { NotificationType } from "../../../../generated/prisma/enums";

const createNotificationSchema = z.object({
	userId: z.uuid("Invalid user id format"),
	type: z
		.enum(NotificationType, { message: "Invalid notification type" })
		.optional(),
	title: z
		.string()
		.min(1, "Title is required")
		.max(200, "Title must be at most 200 characters long"),
	message: z
		.string()
		.min(1, "Message is required")
		.max(2000, "Message must be at most 2000 characters long"),
	relatedEntityType: z.string().trim().optional(),
	relatedEntityId: z.string().trim().optional(),
});

const myNotificationsQuerySchema = z.object({
	page: z.coerce
		.number()
		.int("Page must be an integer")
		.min(1, "Page must be at least 1")
		.default(1),
	limit: z.coerce
		.number()
		.int("Limit must be an integer")
		.min(1, "Limit must be at least 1")
		.max(100, "Limit must be at most 100")
		.default(10),
	sortBy: z
		.enum(["createdAt"], { message: "Invalid sort field" })
		.default("createdAt"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
	type: z
		.enum(NotificationType, { message: "Invalid notification type" })
		.optional(),
	// NOTE: query strings arrive as strings; "true"/"false" must be decoded
	// before being passed to Prisma's boolean filter.
	isRead: z
		.enum(["true", "false"], { message: "isRead must be 'true' or 'false'" })
		.transform((value) => value === "true")
		.optional(),
	searchTerm: z.string().trim().optional(),
});

export const NotificationValidation = {
	createNotificationSchema,
	myNotificationsQuerySchema,
};
