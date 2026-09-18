import type {
	AssignmentStatus,
	BloodGroup,
	RequestStatus,
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
