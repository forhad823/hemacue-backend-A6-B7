import type { NextFunction, Request, Response } from "express";
import type { JwtPayload } from "jsonwebtoken";
import config from "../config";
import { AppError } from "../errors/AppError";
import { catchAsync } from "../utils/catchAsync";
import { jwtUtils } from "../utils/jwt";
import "../types/express.d.ts";
import { UserRole } from "../../../generated/prisma/enums";
import { prisma } from "../lib/prisma";

export const auth = (...requiredRoles: (UserRole | string)[]) => { 
	return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
		const token = req.cookies?.accessToken
			? req.cookies.accessToken
			: req.headers.authorization?.startsWith("Bearer ")
				? req.headers.authorization?.split(" ")[1]
				: req.headers.authorization;

		if (!token) {
			throw new AppError(
				401,
				"You are not logged in. Please log in to access this resource.",
			);
		}

		const verifiedToken = jwtUtils.verifyToken(token, config.jwt_access_secret);

		if (!verifiedToken.success || !verifiedToken.data) {
			throw new AppError(
				401,
				typeof verifiedToken.error === "string"
					? verifiedToken.error
					: "Invalid access token. Please log in again.",
			);
		}

		const { email, name, userId, role, bloodGroup, isEmailVerified } =
			verifiedToken.data as JwtPayload;

		if (requiredRoles.length > 0 && !requiredRoles.includes(role)) {
			throw new AppError(
				403,
				"Forbidden. You don't have permission to access this resource.",
			);
		}

		const user = await prisma.user.findUnique({
			where: {
				id: userId,
			},
		});

		if (!user) {
			throw new AppError(401, "User not found. Please log in again.");
		}

		if (user.isDeleted) {
			throw new AppError(403, "Your account has been deleted or blocked.");
		}

		req.user = {
			email,
			name,
			userId,
			role,
			bloodGroup,
			isEmailVerified,
		};

		next();
	});
};

export default auth;
