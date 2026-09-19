import { z } from "zod";
import {
  BloodGroup,
  UserRole,
  UserStatus,
} from "../../../../generated/prisma/enums";

const updateUserRoleSchema = z.object({
  role: z.enum(UserRole, { message: "Invalid role" }).optional(),
  status: z.enum(UserStatus, { message: "Invalid user status" }).optional(),
  isDeleted: z.boolean().optional(),
});

const adminUsersQuerySchema = z.object({
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
    .enum(["name", "email", "role", "createdAt"], {
      message: "Invalid sort field",
    })
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  role: z.enum(UserRole, { message: "Invalid role" }).optional(),
  bloodGroup: z.enum(BloodGroup, { message: "Invalid blood group" }).optional(),
  district: z.string().trim().optional(),
  searchTerm: z.string().trim().optional(),
});

const targetUserIdParamsSchema = z.object({
  id: z.string().uuid("Invalid user id format"),
});

const auditLogsQuerySchema = z.object({
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
  action: z.string().trim().optional(),
  entity: z.string().trim().optional(),
  actorEmail: z.string().trim().optional(),
});

export const AdminValidation = {
  updateUserRoleSchema,
  adminUsersQuerySchema,
  targetUserIdParamsSchema,
  auditLogsQuerySchema,
};
