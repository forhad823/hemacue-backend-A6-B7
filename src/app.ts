import express, {
	type Application,
	type Request,
	type Response,
} from "express";

import cookieParser from "cookie-parser";
import cors from "cors";
import config from "./app/config";
import httpStatus from "http-status";
import { globalErrorHandler } from "./app/middlewares/globalErrorHandler";
import { notFound } from "./app/middlewares/notFound";



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

app.use(globalErrorHandler);
app.use(notFound);

export default app;
