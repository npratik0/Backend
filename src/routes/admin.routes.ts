import {Router} from "express";
import { deleteUser, getAllUsers, updateUserRole } from "../controllers/admin.controller";
import { authenticate } from "../middlewares/auth.middleware";
import {authorize} from "../middlewares/authorize.middleware";

const router = Router();

router.get("/users",authenticate, authorize('admin','superadmin'), getAllUsers);
router.put("/users/:id/role",authenticate, authorize('admin','superadmin'), updateUserRole);
router.delete("/users/:id",authenticate, authorize('admin','superadmin'), deleteUser);

export default router;