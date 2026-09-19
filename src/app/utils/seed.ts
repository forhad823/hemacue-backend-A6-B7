import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import config from "../config";
import { prisma } from "../lib/prisma";
import { AppError } from "../errors/AppError";
import { BloodGroup, UserRole } from "../../../generated/prisma/enums";

//create tester admin

export const seedTesterAdmin = async () => {
	try {
		const isTesterAdminExist = await prisma.user.findUnique({
			where: {
				email: config.tester_admin_email,
			},
		});

		if (isTesterAdminExist) {
			console.log("Tester Admin Already Exists!");
			return;
		}

		const name = config.tester_admin_name;
		const email = config.tester_admin_email;
		const password = config.tester_admin_password;

		if (!name || !email || !password) {
			throw new AppError(
				httpStatus.INTERNAL_SERVER_ERROR,
				"Tester Admin Name , Email, Password Missing In Env File!!!",
			);
		}

		const hashedPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds),
		);

		const testerAdmin = await prisma.user.create({
			data: {
				name,
				email,
				password: hashedPassword,
				role: UserRole.ADMIN,
				bloodGroup: BloodGroup.O_POSITIVE,
				needPasswordChange: false,
				isEmailVerified: true,
			},
		});

		console.log("Tester Admin Created : ", testerAdmin);
	} catch (error) {
		console.log("Error Seeding Tester Admin : ", error);

		await prisma.user.delete({
			where: {
				email: config.tester_admin_email,
			},
		});
	}
};

export const seedTesterUser = async () => {
	try {
		const isTesterUserExist = await prisma.user.findUnique({
			where: {
				email: config.tester_user_email,
			},
		});

		if (isTesterUserExist) {
			console.log("Tester Patient Already Exists!");
			return;
		}

		const name = config.tester_user_name;
		const email = config.tester_user_email;
		const password = config.tester_user_password;
		const role = config.tester_user_role as UserRole;
		const bloodGroup = config.tester_user_blood_group as BloodGroup;
		const lastDonatedAt = config.tester_user_last_donation_date
			? new Date(config.tester_user_last_donation_date)
			: undefined;

		if (!name || !email || !password) {
			throw new AppError(
				httpStatus.INTERNAL_SERVER_ERROR,
				"Tester user Name , Email, Password Missing In Env File!!!",
			);
		}

		const hashedPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds),
		);
		const userRoles = Object.values(UserRole);
		const bloodGroups = Object.values(BloodGroup);
		if (
			!userRoles.includes(role) ||
			!bloodGroups.includes(bloodGroup) ||
			(lastDonatedAt && !(lastDonatedAt instanceof Date))
		) {
			throw new AppError(
				httpStatus.INTERNAL_SERVER_ERROR,
				"role or bloodGroup or lastDonatedAt is not valid!!!",
			);
		}
		const testerUser = await prisma.user.create({
			data: {
				name,
				email,
				password: hashedPassword,
				role: role,
				bloodGroup: bloodGroup,
				lastDonatedAt: lastDonatedAt,
				needPasswordChange: false,
				isEmailVerified: true,
			},
		});

		console.log("Tester User Created : ", testerUser);
	} catch (error) {
		console.log("Error Seeding Tester User : ", error);

		await prisma.user.delete({
			where: {
				email: config.tester_user_email,
			},
		});
	}
};
