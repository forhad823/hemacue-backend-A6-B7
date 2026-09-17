import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../errors/AppError";
import httpStatus from "http-status";

export const validateRequest = (zodSchema: z.ZodObject) => {
  return catchAsync((req: Request, res: Response, next: NextFunction) => {
    // const payload = req.body ? req.body : {}
    const payload = req.body ?? {};

    const result = zodSchema.safeParse(payload);

    if (!result.success) {
      console.log(result.error);
      console.log(result.error.issues);

      throw new AppError(
        httpStatus.BAD_REQUEST,
        result.error.issues[0].message,
      );
    }

    req.body = result.data;

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
