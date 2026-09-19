import httpStatus from "http-status";
import {
	AssignmentStatus,
	PaymentStatus,
	RequestStatus,
	UserRole,
	UserStatus,
} from "../../../../generated/prisma/enums";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import type {
	IAdminUsersQueryParams,
	IAuditLogsQueryParams,
	IUpdateUserRolePayload,
} from "./admin.interface";

const ADMIN_USER_SELECT = {
	id: true,
	name: true,
	email: true,
	phone: true,
	role: true,
	bloodGroup: true,
	district: true,
	city: true,
	address: true,
	isAvailable: true,
	status: true,
	lastDonatedAt: true,
	avatarUrl: true,
	isEmailVerified: true,
	isDeleted: true,
	createdAt: true,
	updatedAt: true,
} as const;

const buildUsersWhere = (query: IAdminUsersQueryParams) => {
	const { role, bloodGroup, district, searchTerm } = query;

	const where: Record<string, unknown> = {};

	if (role) {
		where.role = role;
	}
	if (bloodGroup) {
		where.bloodGroup = bloodGroup;
	}
	if (district) {
		where.district = district;
	}
	if (searchTerm) {
		where.OR = [
			{ name: { contains: searchTerm, mode: "insensitive" } },
			{ email: { contains: searchTerm, mode: "insensitive" } },
		];
	}

	return where;
};

const getAllUsers = async (query: IAdminUsersQueryParams) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "createdAt",
		sortOrder = "desc",
	} = query;

	const where = buildUsersWhere(query);
	const skip = (page - 1) * limit;
	const orderBy = { [sortBy]: sortOrder };

	const total = await prisma.user.count({ where });

	const users = await prisma.user.findMany({
		where,
		skip,
		take: limit,
		orderBy,
		select: {
			...ADMIN_USER_SELECT,
			_count: {
				select: {
					bloodRequests: true,
					donorAssignments: true,
					payments: true,
				},
			},
		},
	});

	return {
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
			totalPage: Math.ceil(total / limit),
		},
		data: users,
	};
};

const updateUserRole = async (
	targetUserId: string,
	payload: IUpdateUserRolePayload,
	adminId: string,
	ipAddress?: string,
) => {
	if (targetUserId === adminId) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"You cannot change your own role or block yourself",
		);
	}

	const targetUser = await prisma.user.findUnique({
		where: { id: targetUserId },
	});

	if (!targetUser) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	if (payload.role && !Object.values(UserRole).includes(payload.role)) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid role");
	}

	if (payload.status && !Object.values(UserStatus).includes(payload.status)) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid user status");
	}

	if (
		payload.role === targetUser.role &&
		payload.status === targetUser.status &&
		payload.isDeleted === undefined
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"No changes detected. Provide a new role or isDeleted value.",
		);
	}

	const updateData: Record<string, unknown> = {};

	if (payload.role) {
		updateData.role = payload.role;
	}
	if (payload.status) {
		updateData.status = payload.status;
	}
	if (payload.isDeleted !== undefined) {
		updateData.isDeleted = payload.isDeleted;
	}

	const updatedUser = await prisma.$transaction(async (tx) => {
		const user = await tx.user.update({
			where: { id: targetUserId },
			data: updateData,
			select: ADMIN_USER_SELECT,
		});

		const action = payload.isDeleted
			? "USER_BLOCKED"
			: payload.role
				? "USER_ROLE_UPDATED"
				: "USER_UPDATED";

		await tx.auditLog.create({
			data: {
				userId: adminId,
				action,
				entity: "User",
				entityId: targetUserId,
				details: {
					from: {
						role: targetUser.role,
						status: targetUser.status,
						isDeleted: targetUser.isDeleted,
					},
					to: {
						...(payload.role ? { role: payload.role } : {}),
						...(payload.status ? { status: payload.status } : {}),
						...(payload.isDeleted !== undefined
							? { isDeleted: payload.isDeleted }
							: {}),
					},
				},
				ipAddress,
			},
		});

		return user;
	});

	return {
		id: updatedUser.id,
		name: updatedUser.name,
		email: updatedUser.email,
		role: updatedUser.role,
		isDeleted: updatedUser.isDeleted,
		status: updatedUser.status,
	};
};

const buildAuditLogsWhere = (query: IAuditLogsQueryParams) => {
	const { action, entity, actorEmail } = query;

	const where: Record<string, unknown> = {};

	if (action) {
		where.action = action;
	}
	if (entity) {
		where.entity = entity;
	}
	if (actorEmail) {
		where.user = { email: { contains: actorEmail, mode: "insensitive" } };
	}

	return where;
};

const getAuditLogs = async (query: IAuditLogsQueryParams) => {
	const { page = 1, limit = 10, sortOrder = "desc" } = query;

	const where = buildAuditLogsWhere(query);
	const skip = (page - 1) * limit;

	const total = await prisma.auditLog.count({ where });

	const auditLogs = await prisma.auditLog.findMany({
		where,
		skip,
		take: limit,
		orderBy: { createdAt: sortOrder },
		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					role: true,
				},
			},
		},
	});

	return {
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
			totalPage: Math.ceil(total / limit),
		},
		data: auditLogs,
	};
};

const getDashboardStats = async () => {
	const [
		totalUsers,
		totalBloodRequests,
		totalCompletedDonations,
		totalCompletedPayments,
		totalRevenue,
		usersByRole,
		requestsByStatus,
	] = await Promise.all([
		prisma.user.count({ where: { isDeleted: false } }),
		prisma.bloodRequest.count({ where: { isDeleted: false } }),
		prisma.donorAssignment.count({
			where: { status: AssignmentStatus.COMPLETED },
		}),
		prisma.payment.count({ where: { status: PaymentStatus.COMPLETED } }),
		prisma.payment.aggregate({
			where: { status: PaymentStatus.COMPLETED },
			_sum: { amount: true },
		}),
		prisma.user.groupBy({
			by: ["role"],
			_count: true,
			where: { isDeleted: false },
		}),
		prisma.bloodRequest.groupBy({
			by: ["status"],
			_count: true,
			where: { isDeleted: false },
		}),
	]);

	const roleBreakdown = {
		[UserRole.DONOR]: 0,
		[UserRole.PATIENT]: 0,
		[UserRole.ADMIN]: 0,
	};
	for (const group of usersByRole) {
		roleBreakdown[group.role] = group._count;
	}

	const statusBreakdown = {
		[RequestStatus.PENDING]: 0,
		[RequestStatus.VERIFIED]: 0,
		[RequestStatus.DONOR_ASSIGNED]: 0,
		[RequestStatus.IN_PROGRESS]: 0,
		[RequestStatus.COMPLETED]: 0,
		[RequestStatus.CANCELLED]: 0,
	};
	for (const group of requestsByStatus) {
		statusBreakdown[group.status] = group._count;
	}

	return {
		totalUsers,
		usersByRole: roleBreakdown,
		totalBloodRequests,
		bloodRequestsByStatus: statusBreakdown,
		totalCompletedDonations,
		payments: {
			totalCompletedPayments,
			totalRevenue: totalRevenue._sum.amount ?? 0,
			currency: "BDT",
		},
	};
};

export const AdminService = {
	getAllUsers,
	updateUserRole,
	getAuditLogs,
	getDashboardStats,
};
