import httpStatus from "http-status";
import {
  AssignmentStatus,
  UserStatus,
} from "../../../../generated/prisma/enums";
import { AppError } from "../../errors/AppError";
import { uploadToCloudinary } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import type { IUpdateProfilePayload } from "./user.interface";

const getProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      bloodGroup: true,
      phone: true,
      district: true,
      city: true,
      address: true,
      latitude: true,
      longitude: true,
      isAvailable: true,
      status: true,
      lastDonatedAt: true,
      avatarUrl: true,
      authProvider: true,
      isEmailVerified: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          bloodRequests: {
            where: { isDeleted: false },
          },
          donorAssignments: {
            where: { status: AssignmentStatus.COMPLETED },
          },
        },
      },
    },
  });

  if (!user || user.status === UserStatus.DELETED) {
    throw new AppError(httpStatus.NOT_FOUND, "User profile not found");
  }

  if (user.status === UserStatus.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, "User profile is blocked");
  }

  const { _count, ...userData } = user;

  return {
    ...userData,
    totalBloodRequests: _count.bloodRequests,
    totalCompletedDonations: _count.donorAssignments,
  };
};

const updateProfile = async (
  userId: string,
  payload: IUpdateProfilePayload,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.isDeleted || user.status === UserStatus.DELETED) {
    throw new AppError(httpStatus.NOT_FOUND, "User profile not found");
  }

  if (user.status === UserStatus.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, "User profile is blocked");
  }

  const updateData: Record<string, any> = { ...payload };

  if (payload.lastDonatedAt !== undefined && payload.lastDonatedAt !== null) {
    const lastDonatedDate = new Date(payload.lastDonatedAt);
    updateData.lastDonatedAt = lastDonatedDate;

    const diffInMs = Date.now() - lastDonatedDate.getTime();
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    // 90-day cooldown period logic
    if (diffInDays < 90) {
      updateData.isAvailable = false;
    } else if (payload.isAvailable === undefined) {
      updateData.isAvailable = true;
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      bloodGroup: true,
      phone: true,
      district: true,
      city: true,
      address: true,
      latitude: true,
      longitude: true,
      isAvailable: true,
      status: true,
      lastDonatedAt: true,
      avatarUrl: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

const uploadAvatar = async (userId: string, file?: Express.Multer.File) => {
  if (!file) {
    throw new AppError(httpStatus.BAD_REQUEST, "Please upload an image file");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.isDeleted || user.status === UserStatus.DELETED) {
    throw new AppError(httpStatus.NOT_FOUND, "User profile not found");
  }

  if (user.status === UserStatus.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, "User profile is blocked");
  }

  const cloudinaryResult = await uploadToCloudinary(
    file.buffer,
    file.originalname,
  );

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      avatarUrl: cloudinaryResult.secure_url,
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  });

  return updatedUser;
};

export const UserService = {
  getProfile,
  updateProfile,
  uploadAvatar,
};
