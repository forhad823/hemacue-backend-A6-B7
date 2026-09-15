// import { Role } from "../../generated/prisma/enums";

import { BloodGroup, UserRole } from "../../../generated/prisma/enums";

// global type augmentation (or declaration merging)
declare global {
  namespace Express {
    interface Request {
      user?: {
        email: string;
        name: string;
        id: string;
        role: UserRole;
        bloodGroup: BloodGroup;
        isEmailVerified: Boolean;
      };
    }
  }
}

export {};
