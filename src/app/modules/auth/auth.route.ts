import { Router } from "express";
import { authPaymentRateLimiter } from "../../middlewares/rateLimiter";
import validateRequest from "../../middlewares/validateRequest";
import { AuthController } from "./auth.controller";
import { UserValidation } from "./auth.validation";

const router = Router();

router.post(
  "/register",
  authPaymentRateLimiter,
  validateRequest(UserValidation.registerValidationSchema),
  AuthController.registerUser,
);

router.post(
  "/verify-email",
  authPaymentRateLimiter,
  validateRequest(UserValidation.EmailVerifyZodSchema),
  AuthController.verifyEmail,
);

router.post(
  "/verify-email/resend-otp",
  authPaymentRateLimiter,
  AuthController.resendRegisterOTP,
);

router.post(
  "/login",
  authPaymentRateLimiter,
  validateRequest(UserValidation.LoginZodSchema),
  AuthController.loginUser,
);

router.post(
  "/refresh-token",
  authPaymentRateLimiter,
  AuthController.refreshToken,
);

router.post(
  "/google-login",
  authPaymentRateLimiter,
  validateRequest(UserValidation.GoogleLoginZodSchema),
  AuthController.googleLogin,
);

router.post(
  "/forgot-password",
  authPaymentRateLimiter,
  validateRequest(UserValidation.ForgotPasswordZodSchema),
  AuthController.forgotPassword,
);

// to resend forgot-password OTP, we can just reuse the same {POST /forgot-password api}

router.post(
  "/reset-password",
  authPaymentRateLimiter,
  validateRequest(UserValidation.ResetPasswordZodSchema),
  AuthController.resetPassword,
);

router.post("/logout", AuthController.logout);

export const AuthRoutes = router;
