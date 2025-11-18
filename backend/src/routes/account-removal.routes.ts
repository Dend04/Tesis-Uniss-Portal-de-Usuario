import express from "express";
import { AccountRemovalController } from "../controllers/account-removal.controller";
import { verifyTokenMiddleware } from "../middlewares/auth.middleware";


const router = express.Router();

// ✅ AGREGAR MIDDLEWARE DE AUTENTICACIÓN
router.delete('/:identifier', verifyTokenMiddleware, AccountRemovalController.deleteAccount);

export default router;