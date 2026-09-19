import multer from "multer";
// import { AppError } from '../errors/AppError';

const storage = multer.memoryStorage();

export const upload = multer({
	storage,
	// fileFilter,
	// limits: {
	//   fileSize: 5 * 1024 * 1024, // 5MB limit
	// },
});
// const fileFilter = (
//   _req: Express.Request,
//   file: Express.Multer.File,
//   cb: multer.FileFilterCallback
// ) => {
//   const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
//   if (allowedMimeTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(
//       new AppError(
//         400,
//         'Invalid file type. Only JPEG, JPG, PNG, and WEBP image files are allowed.'
//       )
//     );
//   }
// };

export default upload;
