import { z } from "zod";
import { BloodGroup } from "../../../../generated/prisma/enums";

const updateProfileValidationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phone: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isAvailable: z.boolean().optional(),
  lastDonatedAt: z
    .iso
    .datetime({ message: "Invalid date format. Expected ISO date string" })
    .or(z.date())
    .optional(),
  bloodGroup: z.enum(BloodGroup).optional(),
});

export const UserValidation = {
  updateProfileValidationSchema,
};
