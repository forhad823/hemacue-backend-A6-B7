import { BloodGroup } from "../../../../generated/prisma/enums";

export interface IUpdateProfilePayload {
  name?: string;
  phone?: string;
  district?: string;
  city?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  isAvailable?: boolean;
  lastDonatedAt?: string | Date;
  bloodGroup?: BloodGroup;
}
