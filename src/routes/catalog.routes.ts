import { Router } from "express";
import { listServices, listProviders, getProvider } from "../controllers/catalog.controller";

const router = Router();

router.get("/services", listServices);
router.get("/providers", listProviders);
router.get("/providers/:id", getProvider);

export default router;
