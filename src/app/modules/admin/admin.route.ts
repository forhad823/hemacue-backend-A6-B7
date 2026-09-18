import { Router } from "express";
import { UserRole } from "../../../../generated/prisma/enums";
import auth from "../../middlewares/checkAuth";
import validateRequest from "../../middlewares/validateRequest";
import { AdminController } from "./admin.controller";
import { AdminValidation } from "./admin.validation";

const router = Router();

router.get(
	"/users",
	auth(UserRole.ADMIN),
	validateRequest({ query: AdminValidation.adminUsersQuerySchema }),
	AdminController.getAllUsers,
);

router.patch(
	"/users/:id/role",
	auth(UserRole.ADMIN),
	validateRequest({
		params: AdminValidation.targetUserIdParamsSchema,
		body: AdminValidation.updateUserRoleSchema,
	}),
	AdminController.updateUserRole,
);

router.get(
	"/dashboard-stats",
	auth(UserRole.ADMIN),
	AdminController.getDashboardStats,
);

router.get(
	"/audit-logs",
	auth(UserRole.ADMIN),
	validateRequest({ query: AdminValidation.auditLogsQuerySchema }),
	AdminController.getAuditLogs,
);

export const AdminRoutes = router;
