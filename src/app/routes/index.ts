import { Router } from "express";

import { AuthRoutes } from "../modules/auth/auth.route";
import { BloodRequestRoutes } from "../modules/bloodRequest/bloodRequest.route";
import {
	DonorMatchRequestRoutes,
	DonorMatchRoutes,
} from "../modules/donorMatch/donorMatch.route";
import { UserRoutes } from "../modules/user/user.route";

const router = Router();

const moduleRoutes = [
	{
		path: "/auth",
		route: AuthRoutes,
	},
	{
		path: "/users",
		route: UserRoutes,
	},
	{
		path: "/blood-requests",
		route: BloodRequestRoutes,
	},
	{
		// /blood-requests/:id/respond & /blood-requests/:id/status
		path: "/blood-requests",
		route: DonorMatchRequestRoutes,
	},
	{
		path: "/donor-matches",
		route: DonorMatchRoutes,
	},
];

moduleRoutes.forEach((route) => {
	router.use(route.path, route.route);
});

export default router;
