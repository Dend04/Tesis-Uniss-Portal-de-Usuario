// src/routes/auth.routes.ts
import { Router } from "express";
import {
  loginController,
  checkAndUpdateEmployeeID,
} from "../controllers/auth.controllers";
import { verifyTokenMiddleware } from "../middlewares/auth.middleware";


const router = Router();

// Rutas de autenticación básica
router.post("/login", loginController);
router.get("/employee-check", verifyTokenMiddleware, checkAndUpdateEmployeeID);

export default router;