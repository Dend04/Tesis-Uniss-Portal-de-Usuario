// src/routes/student-account.routes.ts
import { Router } from "express";
import { StudentAccountController } from "../controllers/student-account.controller";

const router = Router();

router.post(
  '/:ci/create-account',
  StudentAccountController.createAccount
);

export default router;