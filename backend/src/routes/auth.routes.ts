// src/routes/auth.routes.ts
import { Router } from "express";
import {
  changePasswordController,
  checkAndUpdateEmployeeID,
  loginController,
} from "../controllers/auth.controllers";
import { verifyTokenMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.post("/login", loginController);
router.post(
  "/change-password",
  verifyTokenMiddleware,
  changePasswordController
);
router.get("/employee-check", checkAndUpdateEmployeeID);

export default router;
