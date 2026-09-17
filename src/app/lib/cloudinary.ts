import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import config from "../config";

cloudinary.config({
  cloud_name: config.cloudinary_cloud_name,
  api_key: config.cloudinary_api_key,
  api_secret: config.cloudinary_api_secret,
});

export const uploadToCloudinary = (
  fileBuffer: Buffer,
  fileName: string,
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "hemacue/avatars",
        public_id: `${Date.now()}-${fileName.replace(/\.[^/.]+$/, "")}`,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        if (!result) {
          return reject(
            new Error("Cloudinary upload returned empty response."),
          );
        }
        resolve(result);
      },
    );

    uploadStream.end(fileBuffer);
  });
};

export { cloudinary };
export default uploadToCloudinary;
