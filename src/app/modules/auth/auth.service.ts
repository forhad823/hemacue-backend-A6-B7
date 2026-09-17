import bcrypt from "bcryptjs";
import crypto from "crypto";
import ejs from "ejs";
import type { TokenPayload } from "google-auth-library";
import httpStatus from "http-status";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import path from "path";
// import {
//   AuthProvider,
//   UserRole,
//   UserStatus,
// } from "../../../generated/prisma/enums";
import config from "../../config";
import { AppError } from "../../errors/AppError";
import { googleClient } from "../../lib/googleAuth";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import { redisClient } from "../../lib/redis";
import { jwtUtils } from "../../utils/jwt";
import type {
	IForgotPasswordPayload,
	IGoogleLoginPayload,
	ILoginUserPayload,
	IRegisterUserPayload,
	IResetPasswordPayload,
	IVerifyEmailPayload,
} from "./auth.interface";
import {
	AuthProvider,
	UserRole,
	UserStatus,
} from "../../../../generated/prisma/enums";

const registerUser = async (payload: IRegisterUserPayload) => {
	const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExists) {
		throw new AppError(
			httpStatus.CONFLICT,
			"User with this email already exists",
		);
	}

	const hashedPassword = await bcrypt.hash(
		payload.password,
		Number(config.bcrypt_salt_rounds) || 10,
	);

	const expirationSeconds = 5 * 60; // 5 minutes OTP expiry

	const otpKey = `user-registration-otp:${email}`;
	const otpValue = crypto.randomInt(100000, 1000000).toString();

	await redisClient.set(otpKey, otpValue, {
		expiration: {
			type: "EX",
			value: expirationSeconds,
		},
	});

	const userRegistrationKey = `user-registration-data:${email}`;
	const redisUserDataPayload = {
		...payload,
		email,
		password: hashedPassword,
		role: payload.role || UserRole.DONOR,
	};

	await redisClient.set(
		userRegistrationKey,
		JSON.stringify(redisUserDataPayload),
		{
			expiration: {
				type: "EX",
				value: expirationSeconds,
			},
		},
	);

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/registration-user-otp.ejs",
	);

	const templateData = {
		name: payload.name,
		email,
		otp: otpValue,
		expirationMinutes: expirationSeconds / 60,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: email,
		subject: "Hemacue Email Verification Code",
		html,
	});

	return { message: "Verification OTP Sent to your email" };
};

const verifyEmail = async (payload: IVerifyEmailPayload) => {
	const otp = payload.otp;
	const email = payload.email.trim().toLowerCase();

	const isUserExist = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExist?.status === UserStatus.BLOCKED) {
		throw new AppError(httpStatus.FORBIDDEN, "User account is blocked");
	}

	if (isUserExist?.isEmailVerified) {
		throw new AppError(httpStatus.CONFLICT, "Email is already verified");
	}

	if (isUserExist?.isDeleted || isUserExist?.status === UserStatus.DELETED) {
		throw new AppError(httpStatus.FORBIDDEN, "User account is deleted");
	}

	const otpKey = `user-registration-otp:${email}`;
	const redisOtp = await redisClient.get(otpKey);

	if (!redisOtp) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid or expired OTP");
	}

	if (redisOtp !== otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "OTP does not match");
	}

	await redisClient.del(otpKey);

	const userRegistrationKey = `user-registration-data:${email}`;
	const redisUserData = await redisClient.get(userRegistrationKey);

	if (!redisUserData) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Registration data expired or not found",
		);
	}

	const userPayload: IRegisterUserPayload & { role: UserRole } =
		JSON.parse(redisUserData);

	const createdUser = await prisma.user.create({
		data: {
			name: userPayload.name,
			email: userPayload.email,
			password: userPayload.password,
			role: userPayload.role || UserRole.DONOR,
			bloodGroup: userPayload.bloodGroup,
			phone: userPayload.phone,
			district: userPayload.district,
			city: userPayload.city,
			address: userPayload.address || null,
			isAvailable: true,
			status: UserStatus.ACTIVE,
			isEmailVerified: true,
			authProvider: AuthProvider.CREDENTIAL,
		},
		omit: { password: true },
	});

	await redisClient.del(userRegistrationKey);

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/welcome-email.ejs",
	);

	const templateData = {
		name: createdUser.name,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: email,
		subject: "Welcome to Hemacue Platform",
		html,
	});

	const jwtPayload = {
		userId: createdUser.id,
		name: createdUser.name,
		email: createdUser.email,
		role: createdUser.role,
		bloodGroup: createdUser.bloodGroup,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		user: createdUser,
		accessToken,
		refreshToken,
	};
};

const loginUser = async (payload: ILoginUserPayload) => {
	const { password } = payload;
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({
		where: { email },
	});

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new AppError(httpStatus.FORBIDDEN, "User is blocked");
	}

	if (user.isDeleted || user.status === UserStatus.DELETED) {
		throw new AppError(httpStatus.FORBIDDEN, "User is deleted");
	}

	if (user.password === null || user.authProvider === AuthProvider.GOOGLE) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"This account was registered using Google. Please log in with Google.",
		);
	}

	const isPasswordMatched = await bcrypt.compare(password, user.password);

	if (!isPasswordMatched) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
		bloodGroup: user.bloodGroup,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const refreshToken = async (token: string) => {
	const verifiedRefreshToken = jwtUtils.verifyToken(
		token,
		config.jwt_refresh_secret,
	);

	if (!verifiedRefreshToken.success || !verifiedRefreshToken.data) {
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			config.node_env === "development"
				? (verifiedRefreshToken.error as string)
				: "Invalid or expired refresh token",
		);
	}

	const data = verifiedRefreshToken.data as JwtPayload;

	const user = await prisma.user.findUnique({
		where: { id: data.userId },
	});

	if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			"User is inactive, blocked, or not found",
		);
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
		bloodGroup: user.bloodGroup,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const newRefreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken: newRefreshToken,
	};
};

const googleLogin = async (payload: IGoogleLoginPayload) => {
	let googleIdTokenPayload: TokenPayload | null | undefined = null;
	try {
		const ticket = await googleClient.verifyIdToken({
			idToken: payload.idToken,
			audience: config.google_client_id,
		});

		googleIdTokenPayload = ticket.getPayload();
	} catch (error) {
		console.error("Google ID Token Verification Error:", error);
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			"Invalid or expired Google ID Token",
		);
	}

	if (!googleIdTokenPayload || !googleIdTokenPayload.email) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Failed to retrieve user email from Google token",
		);
	}

	const email = googleIdTokenPayload.email.trim().toLowerCase();

	let user = await prisma.user.findUnique({
		where: { email },
	});

	if (user) {
		if (user.status === UserStatus.BLOCKED) {
			throw new AppError(httpStatus.FORBIDDEN, "User account is blocked");
		}

		if (user.isDeleted || user.status === UserStatus.DELETED) {
			throw new AppError(httpStatus.FORBIDDEN, "User account is deleted");
		}

		if (!user.googleId) {
			user = await prisma.user.update({
				where: { id: user.id },
				data: { googleId: googleIdTokenPayload.sub },
			});
		}
	} else {
		// Create new Google User with default values
		const randomPassword = crypto.randomBytes(16).toString("hex");
		const hashedPassword = await bcrypt.hash(
			randomPassword,
			Number(config.bcrypt_salt_rounds) || 10,
		);

		user = await prisma.user.create({
			data: {
				name: googleIdTokenPayload.name || "Google User",
				email,
				password: hashedPassword,
				googleId: googleIdTokenPayload.sub,
				authProvider: AuthProvider.GOOGLE,
				role: UserRole.DONOR,
				bloodGroup: "O_POSITIVE", // Default blood group placeholder to be updated by user later
				isEmailVerified: true,
				isAvailable: true,
				status: UserStatus.ACTIVE,
			},
		});

		const templatePath = path.join(
			process.cwd(),
			"src/app/templates/welcome-email.ejs",
		);

		const templateData = { name: user.name };
		const html = await ejs.renderFile(templatePath, templateData);

		await transporter.sendMail({
			from: config.email_sender,
			to: email,
			subject: "Welcome to Hemacue Platform",
			html,
		});
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
		bloodGroup: user.bloodGroup,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const forgotPassword = async (payload: IForgotPasswordPayload) => {
	const email = payload.email.trim().toLowerCase();

	const isUserExist = await prisma.user.findUnique({
		where: { email },
	});

	if (!isUserExist) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"No account found with this email address",
		);
	}

	if (isUserExist.status === UserStatus.BLOCKED) {
		throw new AppError(httpStatus.FORBIDDEN, "User account is blocked");
	}

	if (!isUserExist.isEmailVerified) {
		throw new AppError(httpStatus.FORBIDDEN, "User email is not verified yet");
	}

	if (isUserExist.isDeleted || isUserExist.status === UserStatus.DELETED) {
		throw new AppError(httpStatus.FORBIDDEN, "User account is deleted");
	}

	if (
		isUserExist.googleId &&
		isUserExist.authProvider === AuthProvider.GOOGLE
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"This account was registered using Google login",
		);
	}

	const otp = crypto.randomInt(100000, 1000000).toString();
	const key = `forgot-password-otp:${isUserExist.email}`;
	const expirationSeconds = 5 * 60;

	await redisClient.set(key, otp, {
		expiration: {
			type: "EX",
			value: expirationSeconds,
		},
	});

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/forgot-password.ejs",
	);

	const templateData = {
		name: isUserExist.name,
		otp,
		expirationMinutes: expirationSeconds / 60,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: isUserExist.email,
		subject: "Hemacue Reset Password OTP",
		html,
	});
};

const resetPassword = async (payload: IResetPasswordPayload) => {
	const { otp, newPassword } = payload;
	const email = payload.email.trim().toLowerCase();

	const isUserExist = await prisma.user.findUnique({
		where: { email },
	});

	if (!isUserExist) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"No account found with this email address",
		);
	}

	if (isUserExist.status === UserStatus.BLOCKED) {
		throw new AppError(httpStatus.FORBIDDEN, "User account is blocked");
	}

	if (isUserExist.isDeleted || isUserExist.status === UserStatus.DELETED) {
		throw new AppError(httpStatus.FORBIDDEN, "User account is deleted");
	}

	const key = `forgot-password-otp:${isUserExist.email}`;
	const redisOtp = await redisClient.get(key);

	if (!redisOtp) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid or expired OTP");
	}

	if (redisOtp !== otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "OTP does not match");
	}

	const hashedNewPassword = await bcrypt.hash(
		newPassword,
		Number(config.bcrypt_salt_rounds) || 10,
	);

	await prisma.user.update({
		where: { email: isUserExist.email },
		data: { password: hashedNewPassword },
	});

	await redisClient.del(key);

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/reset-password-success.ejs",
	);

	const templateData = { name: isUserExist.name };
	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: isUserExist.email,
		subject: "Hemacue Password Changed Successfully",
		html,
	});
};

export const AuthService = {
	registerUser,
	verifyEmail,
	loginUser,
	refreshToken,
	googleLogin,
	forgotPassword,
	resetPassword,
};
