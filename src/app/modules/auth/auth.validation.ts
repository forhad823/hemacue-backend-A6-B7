import { z } from "zod";

import { UserRole, BloodGroup } from "../../../../generated/prisma/enums";

const registerValidationSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters long"),

  email: z.email("Invalid email format"),

  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters long")
    .regex(/[a-z]/, "Password must contain atleast 1 Lowercase Letter")
    .regex(/[A-Z]/, "Password must contain atleast 1 Uppercase Letter")

    .regex(/[0-9]/, "Password must contain atleast 1 Number")
    .regex(/[^A-Za-z0-9]/, "Password must contain atleast 1 Special Character"),

  role: z.enum([UserRole.DONOR, UserRole.PATIENT]).default(UserRole.DONOR),

  bloodGroup: z.enum(BloodGroup),

  phone: z.string().min(1, "Phone number is required"),

  district: z.string().min(1, "District is required"),

  city: z.string().min(1, "City is required"),

  address: z.string().optional(),
});

const EmailVerifyZodSchema = z.object({
  email: z.email(),

  otp: z.string().min(1, "OTP is required").length(6, "OTP must be 6 digits"),
});

const LoginZodSchema = z.object({
  email: z.email("Invalid email format"),

  password: z
    .string()
    .min(1, "Password is required")
    .regex(/[a-z]/, "Password must contain atleast 1 Lowercase Letter")
    .regex(/[A-Z]/, "Password must contain atleast 1 Uppercase Letter")

    .regex(/[0-9]/, "Password must contain atleast 1 Number")
    .regex(/[^A-Za-z0-9]/, "Password must contain atleast 1 Special Character"),
});

const GoogleLoginZodSchema = z.object({
  idToken: z.string().min(1, "idToken is required"),
});

const ForgotPasswordZodSchema = z.object({
  email: z.email(),
});

const ResetPasswordZodSchema = z.object({
  email: z.email("Invalid email format"),

  newPassword: z
    .string()
    .min(1, "New password is required")
    .min(6, "Password must be at least 6 characters long")
    .regex(/[a-z]/, "Password must contain atleast 1 Lowercase Letter")
    .regex(/[A-Z]/, "Password must contain atleast 1 Uppercase Letter")

    .regex(/[0-9]/, "Password must contain atleast 1 Number")
    .regex(/[^A-Za-z0-9]/, "Password must contain atleast 1 Special Character"),

  otp: z.string().min(1, "OTP is required").length(6, "OTP must be 6 digits"),
});

export const UserValidation = {
  registerValidationSchema,
  EmailVerifyZodSchema,
  LoginZodSchema,
  GoogleLoginZodSchema,
  ForgotPasswordZodSchema,
  ResetPasswordZodSchema,
};
