import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest";
import { AuthController } from "./auth.controller";
import { UserValidation } from "./auth.validation";

const router = Router();

router.post(
  "/register",
  validateRequest(UserValidation.registerValidationSchema),
  AuthController.registerUser,
);

router.post(
  "/verify-email",
  validateRequest(UserValidation.EmailVerifyZodSchema),
  AuthController.verifyEmail,
);

router.post(
  "/login",
  validateRequest(UserValidation.LoginZodSchema),
  AuthController.loginUser,
);

router.post("/refresh-token", AuthController.refreshToken);

router.post(
  "/google-login",
  validateRequest(UserValidation.GoogleLoginZodSchema),
  AuthController.googleLogin,
);

router.post(
  "/forgot-password",
  validateRequest(UserValidation.ForgotPasswordZodSchema),
  AuthController.forgotPassword,
);

router.post(
  "/reset-password",
  validateRequest(UserValidation.ResetPasswordZodSchema),
  AuthController.resetPassword,
);

export const AuthRoutes = router;
