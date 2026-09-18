import { z } from "zod";
import {
	BloodGroup,
	RequestStatus,
	UrgencyLevel,
} from "../../../../generated/prisma/enums";

const createBloodRequestSchema = z.object({
	patientName: z
		.string()
		.min(1, "Patient name is required")
		.min(2, "Patient name must be at least 2 characters long"),
	patientAge: z
		.number({ message: "Patient age must be a number" })
		.int("Patient age must be an integer")
		.min(1, "Patient age must be at least 1")
		.max(120, "Patient age must be at most 120"),
	bloodGroup: z.enum(BloodGroup, { message: "Invalid blood group" }),
	unitsRequired: z
		.number({ message: "Units required must be a number" })
		.int("Units required must be an integer")
		.min(1, "Units required must be at least 1")
		.optional(),
	hospitalName: z.string().min(1, "Hospital name is required"),
	hospitalAddress: z.string().min(1, "Hospital address is required"),
	district: z.string().min(1, "District is required"),
	city: z.string().min(1, "City is required"),
	latitude: z.number().optional(),
	longitude: z.number().optional(),
	urgency: z
		.enum(UrgencyLevel, { message: "Invalid urgency level" })
		.optional(),
	neededBy: z.iso
		.datetime({
			message: "Invalid neededBy date format. Expected ISO date string",
		})
		.or(z.date())
		.describe("neededBy must be a valid ISO date string"),
	notes: z.string().optional(),
});

const updateBloodRequestSchema = z.object({
	patientName: z
		.string()
		.min(2, "Patient name must be at least 2 characters long")
		.optional(),
	patientAge: z
		.number({ message: "Patient age must be a number" })
		.int("Patient age must be an integer")
		.min(1, "Patient age must be at least 1")
		.max(120, "Patient age must be at most 120")
		.optional(),
	bloodGroup: z.enum(BloodGroup, { message: "Invalid blood group" }).optional(),
	unitsRequired: z
		.number({ message: "Units required must be a number" })
		.int("Units required must be an integer")
		.min(1, "Units required must be at least 1")
		.optional(),
	hospitalName: z.string().min(1, "Hospital name is required").optional(),
	hospitalAddress: z.string().min(1, "Hospital address is required").optional(),
	district: z.string().min(1, "District is required").optional(),
	city: z.string().min(1, "City is required").optional(),
	latitude: z.number().optional(),
	longitude: z.number().optional(),
	urgency: z
		.enum(UrgencyLevel, { message: "Invalid urgency level" })
		.optional(),
	neededBy: z.iso
		.datetime({
			message: "Invalid neededBy date format. Expected ISO date string",
		})
		.or(z.date())
		.optional(),
	notes: z.string().optional(),
});

const queryBloodRequestSchema = z.object({
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
		.enum([
			"createdAt",
			"updatedAt",
			"neededBy",
			"patientName",
			"bloodGroup",
			"urgency",
		])
		.default("createdAt"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
	bloodGroup: z.enum(BloodGroup, { message: "Invalid blood group" }).optional(),
	district: z.string().trim().optional(),
	urgency: z
		.enum(UrgencyLevel, { message: "Invalid urgency level" })
		.optional(),
	status: z
		.enum(RequestStatus, { message: "Invalid request status" })
		.optional(),
	searchTerm: z.string().trim().optional(),
});

export const BloodRequestValidation = {
	createBloodRequestSchema,
	updateBloodRequestSchema,
	queryBloodRequestSchema,
};
