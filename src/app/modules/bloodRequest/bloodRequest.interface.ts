import type {
	BloodGroup,
	RequestStatus,
	UrgencyLevel,
} from "../../../../generated/prisma/enums";

export interface ICreateBloodRequestPayload {
	patientName: string;
	patientAge: number;
	bloodGroup: BloodGroup;
	unitsRequired?: number;
	hospitalName: string;
	hospitalAddress: string;
	district: string;
	city: string;
	latitude?: number;
	longitude?: number;
	urgency?: UrgencyLevel;
	neededBy: string | Date;
	notes?: string;
}

export interface IUpdateBloodRequestPayload {
	patientName?: string;
	patientAge?: number;
	bloodGroup?: BloodGroup;
	unitsRequired?: number;
	hospitalName?: string;
	hospitalAddress?: string;
	district?: string;
	city?: string;
	latitude?: number;
	longitude?: number;
	urgency?: UrgencyLevel;
	neededBy?: string | Date;
	notes?: string;
}

export interface IBloodRequestQueryOptions {
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
	bloodGroup?: BloodGroup;
	district?: string;
	urgency?: UrgencyLevel;
	status?: RequestStatus;
	searchTerm?: string;
}

export interface IBloodRequestPaginationResult<T> {
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages?: number;
		totalPage?: number;
	};
	data: T;
}
