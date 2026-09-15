import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { Prisma } from "../../../generated/prisma/client";

import config from "../config";
import { AppError } from "./AppError";
import { handleZodError, type TErrorSource } from "./handleZodError";
import {
  handlePrismaKnownRequestError,
  handlePrismaValidationError,
} from "./handlePrismaError";

export const globalErrorHandler: ErrorRequestHandler = (
  err,
  _req,
  res,
  _next,
) => {
  let statusCode = 500;
  let message = "Something went wrong!";
  let errors: TErrorSource[] = [
    {
      path: "",
      message: "Something went wrong!",
    },
  ];

  if (err instanceof ZodError) {
    const simplifiedError = handleZodError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errors = simplifiedError.errors;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const simplifiedError = handlePrismaKnownRequestError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errors = simplifiedError.errors;
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    const simplifiedError = handlePrismaValidationError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errors = simplifiedError.errors;
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = [
      {
        path: "",
        message: err.message,
      },
    ];
  } else if (err instanceof Error) {
    message = err.message;
    errors = [
      {
        path: "",
        message: err.message,
      },
    ];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: config.node_env === "development" ? err?.stack : undefined,
  });
};
