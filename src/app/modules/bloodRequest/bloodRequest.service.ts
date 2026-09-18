import httpStatus from "http-status";
import {
  RequestStatus,
  UrgencyLevel,
  UserRole,
} from "../../../../generated/prisma/enums";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import type {
  IBloodRequestQueryOptions,
  ICreateBloodRequestPayload,
  IUpdateBloodRequestPayload,
} from "./bloodRequest.interface";

const BLOOD_REQUEST_SELECT = {
  id: true,
  requesterId: true,
  patientName: true,
  patientAge: true,
  bloodGroup: true,
  unitsRequired: true,
  hospitalName: true,
  hospitalAddress: true,
  district: true,
  city: true,
  latitude: true,
  longitude: true,
  urgency: true,
  status: true,
  neededBy: true,
  isPremiumNotificationPaid: true,
  isLogisticsPaid: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const;

const buildWhereClause = (query: IBloodRequestQueryOptions) => {
  const { bloodGroup, district, urgency, status, searchTerm } = query;

  const where: Record<string, unknown> = {
    isDeleted: false,
  };

  if (bloodGroup) {
    where.bloodGroup = bloodGroup;
  }
  if (district) {
    where.district = district;
  }
  if (urgency) {
    where.urgency = urgency;
  }
  if (status) {
    where.status = status;
  }
  if (searchTerm) {
    where.OR = [
      { hospitalName: { contains: searchTerm, mode: "insensitive" } },
      { patientName: { contains: searchTerm, mode: "insensitive" } },
      { city: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  return where;
};

const createBloodRequest = async (
  userId: string,
  payload: ICreateBloodRequestPayload,
) => {
  const bloodRequest = await prisma.bloodRequest.create({
    data: {
      requesterId: userId,
      status: RequestStatus.PENDING,
      patientName: payload.patientName,
      patientAge: payload.patientAge,
      bloodGroup: payload.bloodGroup,
      unitsRequired: payload.unitsRequired ?? 1,
      hospitalName: payload.hospitalName,
      hospitalAddress: payload.hospitalAddress,
      district: payload.district,
      city: payload.city,
      latitude: payload.latitude,
      longitude: payload.longitude,
      urgency: payload.urgency ?? UrgencyLevel.NORMAL,
      neededBy:
        typeof payload.neededBy === "string"
          ? new Date(payload.neededBy)
          : payload.neededBy,
      notes: payload.notes ?? null,
      isDeleted: false,
    },
    select: BLOOD_REQUEST_SELECT,
  });
  // in the case of add-on subscriptions, An number of compatible donors and notify them  to them by creating assignments to them that will be depend on subscription amount. in the case of free subscription, only 5 compatible donors will be notified or Admin or Patient should assign compatible donors manually.
  return bloodRequest;
};

const getAllBloodRequests = async (queryOptions: IBloodRequestQueryOptions) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = queryOptions;

  const where = buildWhereClause(queryOptions);
  const skip = (page - 1) * limit;
  const orderBy = { [sortBy]: sortOrder };

  const total = await prisma.bloodRequest.count({ where });

  const bloodRequests = await prisma.bloodRequest.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: BLOOD_REQUEST_SELECT,
  });

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      totalPage: Math.ceil(total / limit),
    },
    data: bloodRequests,
  };
};

const getBloodRequestById = async (id: string) => {
  const bloodRequest = await prisma.bloodRequest.findUnique({
    where: {
      id,
      isDeleted: false,
    },
    include: {
      requester: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          bloodGroup: true,
          district: true,
          city: true,
          avatarUrl: true,
        },
      },
      assignments: {
        include: {
          donor: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              bloodGroup: true,
              district: true,
              city: true,
              avatarUrl: true,
              lastDonatedAt: true,
              isAvailable: true,
            },
          },
        },
      },
    },
  });

  if (!bloodRequest) {
    throw new AppError(httpStatus.NOT_FOUND, "Blood request not found");
  }

  return bloodRequest;
};

const getMyBloodRequests = async (
  userId: string,
  queryOptions: IBloodRequestQueryOptions,
) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = queryOptions;

  const baseWhere = buildWhereClause(queryOptions);
  const where = { ...baseWhere, requesterId: userId };
  const skip = (page - 1) * limit;
  const orderBy = { [sortBy]: sortOrder };

  const total = await prisma.bloodRequest.count({ where });

  const bloodRequests = await prisma.bloodRequest.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: BLOOD_REQUEST_SELECT,
  });

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      totalPage: Math.ceil(total / limit),
    },
    data: bloodRequests,
  };
};

const updateBloodRequest = async (
  id: string,
  userId: string,
  userRole: string,
  payload: IUpdateBloodRequestPayload,
) => {
  const existingRequest = await prisma.bloodRequest.findUnique({
    where: { id },
  });

  if (!existingRequest || existingRequest.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Blood request not found");
  }

  if (userRole !== UserRole.ADMIN && existingRequest.requesterId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not allowed to update this blood request",
    );
  }

  const updateData: IUpdateBloodRequestPayload = { ...payload };

  if (updateData.neededBy && typeof updateData.neededBy === "string") {
    updateData.neededBy = new Date(updateData.neededBy);
  }

  const updatedRequest = await prisma.bloodRequest.update({
    where: { id },
    data: updateData,
    select: BLOOD_REQUEST_SELECT,
  });

  return updatedRequest;
};

const softDeleteBloodRequest = async (
  id: string,
  userId: string,
  userRole: string,
) => {
  const existingRequest = await prisma.bloodRequest.findUnique({
    where: { id },
  });

  if (!existingRequest || existingRequest.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Blood request not found");
  }

  if (userRole !== UserRole.ADMIN && existingRequest.requesterId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not allowed to delete this blood request",
    );
  }

  await prisma.bloodRequest.update({
    where: { id },
    data: { isDeleted: true },
  });

  return null;
};

export const BloodRequestService = {
  createBloodRequest,
  getAllBloodRequests,
  getBloodRequestById,
  getMyBloodRequests,
  updateBloodRequest,
  softDeleteBloodRequest,
};
