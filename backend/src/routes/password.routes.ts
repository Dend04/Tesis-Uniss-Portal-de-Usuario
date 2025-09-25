// src/routes/password.routes.ts
import { Router } from "express";
import {
  changePasswordController,
  checkPasswordHistoryController,
} from "../controllers/auth.controllers";
import { verifyTokenMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// Todas las rutas relacionadas con contraseñas
router.post("/change", verifyTokenMiddleware, changePasswordController);
router.post("/check-history", verifyTokenMiddleware, checkPasswordHistoryController);
// Futuras rutas: /reset, /recovery, /policy, etc.

export default router;