import type { ZodError, z } from "zod";

export type TErrorSource = {
  path: string;
  message: string;
};

export type TGenericErrorResponse = {
  statusCode: number;
  message: string;
  errors: TErrorSource[];
};

export const handleZodError = (err: ZodError): TGenericErrorResponse => {
  const errors: TErrorSource[] = err.issues.map((issue: z.core.$ZodIssue) => {
    return {
      path: String(issue.path[issue.path.length - 1] ?? ""),
      message: issue.message,
    }; 
  });

  const statusCode = 400;

  return {
    statusCode,
    message: "Validation Error",
    errors,
  };
};
