import { z } from "zod";
import {
	AssignmentStatus,
	BloodGroup,
	RequestStatus,
} from "../../../../generated/prisma/enums";

const UUID_PARAMS = {
	id: z.string().uuid("Invalid request id format"),
} as const;

const compatibleDonorsQuerySchema = z.object({
	bloodGroup: z.enum(BloodGroup, { message: "Invalid blood group" }),
	district: z.string().trim().optional(),
	requestId: z.string().uuid("Invalid request id format").optional(),
});

const respondToRequestParamsSchema = z.object(UUID_PARAMS);

const respondToRequestSchema = z.object({
	response: z.enum([AssignmentStatus.ACCEPTED, AssignmentStatus.DECLINED], {
		message: "Response must be either ACCEPTED or DECLINED",
	}),
});

const updateRequestStatusParamsSchema = z.object(UUID_PARAMS);

const updateRequestStatusSchema = z.object({
	status: z.enum(
		[
			RequestStatus.VERIFIED,
			RequestStatus.IN_PROGRESS,
			RequestStatus.COMPLETED,
			RequestStatus.CANCELLED,
		],
		{ message: "Invalid request status transition" },
	),
});

export const DonorMatchValidation = {
	compatibleDonorsQuerySchema,
	respondToRequestParamsSchema,
	respondToRequestSchema,
	updateRequestStatusParamsSchema,
	updateRequestStatusSchema,
};
