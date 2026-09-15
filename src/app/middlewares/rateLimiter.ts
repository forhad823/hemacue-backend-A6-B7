import type { NextFunction, Request, Response } from "express";
import { redisClient } from "../lib/redis";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  message: string;
};

const createRateLimiter = (options: RateLimitOptions, name: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip || "unknown";
      const key = `rate-limit:${name}:${ip}`;

      const currentCount = await redisClient.incr(key);

      // Set expiration only when this is the first request
      if (currentCount === 1) {
        await redisClient.pExpire(key, options.windowMs);
      }

      if (currentCount > options.max) {
        return res.status(429).json({
          success: false,
          message: options.message,
          errors: [
            {
              path: "",
              message: options.message,
            },
          ],
        });
      }

      return next();
    } catch (error) {
      // If Redis fails, don't bring down the API.
      console.error("Rate limiter Redis error:", error);

      return next();
    }
  };
};

// Global API rate limiter:
// 100 requests per 15 minutes per IP
export const globalRateLimiter = createRateLimiter(
  {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message:
      "Too many requests from this IP, please try again after 15 minutes.",
  },
  "global",
);

// Auth & Payment initiation:
// 10 requests per 15 minutes per IP
export const authPaymentRateLimiter = createRateLimiter(
  {
    windowMs: 15 * 60 * 1000,
    max: 10,
    message:
      "Too many auth/payment attempts from this IP, please try again after 15 minutes.",
  },
  "auth-payment",
);

export default globalRateLimiter;
