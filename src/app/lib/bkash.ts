import httpStatus from "http-status";
import config from "../config";
import { AppError } from "../errors/AppError";
import { redisClient } from "./redis";

const ID_TOKEN_KEY = "bkash:idToken";
const REFRESH_TOKEN_KEY = "bkash:refreshToken";
const ID_TOKEN_TTL_SECONDS = 60 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 28;

/**
 * getBkashIdToken - Single source of truth for the bKash id_token.
 *
 * Handles the full token lifecycle using Redis:
 *   1. Cached id_token still valid (>10 min TTL)  -> return it.
 *   2. id_token missing / near expiry but refresh token alive -> refresh grant.
 *   3. Cold start -> full token/grant, stores id_token + refresh_token.
 */
export const getBkashIdToken = async (): Promise<string> => {
	try {
		const bkashIdToken = await redisClient.get(ID_TOKEN_KEY);
		const bkashIdTokenTTL = await redisClient.ttl(ID_TOKEN_KEY);

		const bkashRefreshToken = await redisClient.get(REFRESH_TOKEN_KEY);
		const bkashRefreshTokenTTL = await redisClient.ttl(REFRESH_TOKEN_KEY);

		// Refresh path: id token missing / near expiry, refresh token still valid
		if (
			(bkashIdTokenTTL <= 600 || !bkashIdToken) &&
			bkashRefreshToken &&
			bkashRefreshTokenTTL > 600
		) {
			const refreshTokenResponse = await fetch(
				`${config.bkash_base_url}/tokenized/checkout/token/refresh`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
						username: config.bkash_username,
						password: config.bkash_password,
					},
					body: JSON.stringify({
						app_key: config.bkash_app_key,
						app_secret: config.bkash_app_secret,
						refresh_token: bkashRefreshToken,
					}),
				},
			);

			if (!refreshTokenResponse.ok) {
				throw new AppError(
					httpStatus.BAD_GATEWAY,
					"bKash Access Token Refresh Failed",
				);
			}

			const refreshResult = (await refreshTokenResponse.json()) as {
				id_token?: string;
			};

			if (!refreshResult.id_token) {
				throw new AppError(
					httpStatus.BAD_GATEWAY,
					"bKash Access Token Refresh Failed",
				);
			}

			await redisClient.set(ID_TOKEN_KEY, refreshResult.id_token, {
				expiration: { type: "EX", value: ID_TOKEN_TTL_SECONDS },
			});

			return refreshResult.id_token;
		}

		// Cached token still valid
		if (bkashIdToken && bkashIdTokenTTL > 600) {
			return bkashIdToken;
		}

		// Cold start / full grant
		const grantResponse = await fetch(
			`${config.bkash_base_url}/tokenized/checkout/token/grant`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					username: config.bkash_username,
					password: config.bkash_password,
				},
				body: JSON.stringify({
					app_key: config.bkash_app_key,
					app_secret: config.bkash_app_secret,
				}),
			},
		);

		if (!grantResponse.ok) {
			throw new AppError(
				httpStatus.BAD_GATEWAY,
				"bKash Access Token Grant Failed",
			);
		}

		const grantResult = (await grantResponse.json()) as {
			id_token?: string;
			refresh_token?: string;
		};

		if (!grantResult.id_token || !grantResult.refresh_token) {
			throw new AppError(
				httpStatus.BAD_GATEWAY,
				"bKash Access Token Grant Failed",
			);
		}

		await redisClient.set(ID_TOKEN_KEY, grantResult.id_token, {
			expiration: { type: "EX", value: ID_TOKEN_TTL_SECONDS },
		});

		await redisClient.set(REFRESH_TOKEN_KEY, grantResult.refresh_token, {
			expiration: { type: "EX", value: REFRESH_TOKEN_TTL_SECONDS },
		});

		return grantResult.id_token;
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		const message =
			error instanceof Error ? error.message : "bKash token request failed";

		throw new AppError(httpStatus.BAD_GATEWAY, message);
	}
};
