import type {
	BloodGroup,
	PaymentStatus,
	PaymentType,
	UserRole,
	UserStatus,
} from "../../../../generated/prisma/enums";

export interface IUpdateUserRolePayload {
	role?: UserRole;
	isDeleted?: boolean;
	status?: UserStatus;
}

export interface IAdminUsersQueryParams {
	page: number;
	limit: number;
	sortBy: "name" | "email" | "role" | "createdAt";
	sortOrder: "asc" | "desc";
	role?: UserRole;
	bloodGroup?: BloodGroup;
	district?: string;
	searchTerm?: string;
}

export interface IAdminPaymentsQueryParams {
	page: number;
	limit: number;
	sortBy: "createdAt" | "amount";
	sortOrder: "asc" | "desc";
	status?: PaymentStatus;
	paymentType?: PaymentType;
	/** Matches paymentID, trxID, or the payer's email. */
	searchTerm?: string;
}

export interface IAuditLogsQueryParams {
	page: number;
	limit: number;
	sortBy: "createdAt";
	sortOrder: "asc" | "desc";
	action?: string;
	entity?: string;
	actorEmail?: string;
}
