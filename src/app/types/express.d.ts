import type { BloodGroup, UserRole } from '@prisma/client';

export type TAuthUser = {
  email: string;
  name?: string;
  userId: string;
  role: UserRole | string;
  bloodGroup?: BloodGroup | string;
  isEmailVerified?: boolean;
};

declare global {
  namespace Express {
    interface Request {
      user?: TAuthUser;
    }
  }
}
