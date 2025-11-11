import { Router } from "express";
import { pinController } from "../controllers/pin.controller";
import { verifyTokenMiddleware } from "../middlewares/auth.middleware";


const router = Router();

// Rutas que requieren autenticación
router.post("/save", verifyTokenMiddleware, pinController.savePin);
router.delete("/remove", verifyTokenMiddleware, pinController.removePin);
router.get("/check", verifyTokenMiddleware, pinController.checkPin);

// Ruta para recuperación de contraseña (sin autenticación)
router.post("/verify-for-recovery", pinController.verifyPinForRecovery);
router.post("/find-user", pinController.findUserForRecovery);

// ✅ NUEVA RUTA: Verificar si un usuario tiene PIN configurado (sin autenticación)
router.post("/check-user-has-pin", pinController.checkUserHasPin);

// ✅ NUEVA RUTA: Restablecer contraseña con PIN (sin autenticación)
router.post("/reset-password", pinController.resetPasswordWithPIN);

export default router;