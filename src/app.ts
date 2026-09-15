import express, {
	type Application,
	type Request,
	type Response,
} from "express";

import cookieParser from "cookie-parser";
import cors from "cors";
import config from "./app/config";
import httpStatus from "http-status";
import { notFound } from "./app/utils/notFound";
import { globalErrorHandler } from "./app/errors/globalErrorHandler";

const app: Application = express();

app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
	}),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

// Basic route
app.get("/", async (req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message:
			"Welcome to Hemacue Backend, The blood donation and emergency service platform.",
	});
});

// Global Not Found handler for unmapped routes
app.use(notFound);

// Global Error Handler middleware
app.use(globalErrorHandler);

export default app;
