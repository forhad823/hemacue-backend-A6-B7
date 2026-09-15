import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { catchAsync } from "../utils/catchAsync";

export const validateRequest = (schema: z.ZodType) =>
  catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
      cookies: req.cookies,
    });

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Validation schema must return an object.");
    }

    const data = parsed as Record<string, unknown>;

    for (const key of ["body", "query", "params", "cookies"] as const) {
      if (key in data) {
        req[key] = data[key];
      }
    }

    next();
  });

export default validateRequest;
