import type {
	AssignmentStatus,
	BloodGroup,
	RequestStatus,
	UrgencyLevel,
} from "../../../../generated/prisma/enums";

export interface ICreateDonorAssignmentPayload {
	donorId: string;
	requestId: string;
}

export interface IRespondRequestPayload {
	response: AssignmentStatus;
}

export interface IUpdateRequestStatusPayload {
	status: RequestStatus;
}

export interface ICompatibleDonorQueryParams {
	bloodGroup: BloodGroup;
	district?: string;
	requestId?: string;
}

export interface IMyDonationsQueryParams {
	page?: number;
	limit?: number;
	sortBy?: "assignedAt" | "neededBy";
	sortOrder?: "asc" | "desc";
	status?: AssignmentStatus;
	urgency?: UrgencyLevel;
	bloodGroup?: BloodGroup;
	searchTerm?: string;
}
