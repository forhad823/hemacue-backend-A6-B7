import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import type { z } from "zod";
import { AppError } from "../errors/AppError";
import { catchAsync } from "../utils/catchAsync";

type TValidationTarget = "body" | "query" | "params" | "cookies";

type TSchemaInput = z.ZodType | Partial<Record<TValidationTarget, z.ZodType>>;

const isTargetConfig = (
	input: TSchemaInput,
): input is Partial<Record<TValidationTarget, z.ZodType>> => {
	return (
		typeof input === "object" &&
		input !== null &&
		("body" in input ||
			"query" in input ||
			"params" in input ||
			"cookies" in input)
	);
};

export const validateRequest = (input: TSchemaInput) => {
	return catchAsync((req: Request, res: Response, next: NextFunction) => {
		const schemas: Partial<Record<TValidationTarget, z.ZodType>> =
			isTargetConfig(input) ? input : { body: input };

		for (const target of Object.keys(schemas) as TValidationTarget[]) {
			const schema = schemas[target];
			if (!schema) {
				continue;
			}

			const result = schema.safeParse(req[target]);

			if (!result.success) {
				console.log(result.error.issues);
				throw new AppError(
					httpStatus.BAD_REQUEST,
					result.error.issues[0].message,
				);
			}

			// Express 5 exposes `req.query` as a getter-only property, so it can't be
			// reassigned. Store parsed query params on `req.validatedQuery` instead.
			if (target === "query") {
				req.validatedQuery = result.data as Record<string, unknown>;
			} else {
				(req as unknown as Record<string, unknown>)[target] = result.data;
			}
		}

		next();
	});
};
export default validateRequest;

// export const validateRequest = (schema: z.ZodType) =>
//   catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
//     console.log(req.body);
//     const parsed = await schema.parseAsync({
//       body: req.body,
//       query: req.query,
//       params: req.params,
//       cookies: req.cookies,
//     });
//     // console.log("Parsed data:", parsed);

//     if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
//       throw new Error("Validation schema must return an object.");
//     }

//     const data = parsed as Record<string, unknown>;

//     for (const key of ["body", "query", "params", "cookies"] as const) {
//       if (key in data) {
//         req[key] = data[key];
//       }
//     }

//     next();
//   });
