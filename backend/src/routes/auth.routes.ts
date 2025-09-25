// src/routes/auth.routes.ts
import { Router } from "express";
import {
  
  changePasswordController,
  checkAndUpdateEmployeeID,
  /* checkPasswordHistoryController, */
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
/* router.post('/check-password-history', checkPasswordHistoryController); */

export default router;
