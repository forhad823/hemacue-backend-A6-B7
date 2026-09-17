import { Prisma } from "../../../generated/prisma/client";
import type { TErrorSource, TGenericErrorResponse } from "./handleZodError";

export const handlePrismaKnownRequestError = (
	err: Prisma.PrismaClientKnownRequestError,
): TGenericErrorResponse => {
	let statusCode = 400;
	let message = "Database Error";
	let errors: TErrorSource[] = [];

	if (err.code === "P2002") {
		statusCode = 400;
		message = "Duplicate Key Error";
		const target = err.meta?.target;
		const field = Array.isArray(target)
			? target.join(", ")
			: (target as string) || "field";
		errors = [
			{
				path: field,
				message: `${field} already exists and must be unique.`,
			},
		];
	} else if (err.code === "P2003") {
		statusCode = 400;
		message = "Foreign Key Constraint Failed";
		const field = (err.meta?.field_name as string) || "foreign key";
		errors = [
			{
				path: field,
				message: `Referenced record in ${field} does not exist.`,
			},
		];
	} else if (err.code === "P2025") {
		statusCode = 404;
		message = "Record Not Found";
		const cause =
			(err.meta?.cause as string) || "Requested record was not found.";
		errors = [
			{
				path: "",
				message: cause,
			},
		];
	} else {
		errors = [
			{
				path: "",
				message: err.message,
			},
		];
	}

	return {
		statusCode,
		message,
		errors,
	};
};

export const handlePrismaValidationError = (
	err: Prisma.PrismaClientValidationError,
): TGenericErrorResponse => {
	return {
		statusCode: 400,
		message: "Prisma Validation Error",
		errors: [
			{
				path: "",
				message:
					"Invalid input or missing required fields in database operation.",
			},
		],
	};
};
