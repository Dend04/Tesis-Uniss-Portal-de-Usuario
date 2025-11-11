// routes/totp-verification.routes.ts
import { Router } from 'express';
import { verifyTOTPCode, getTOTPUserInfo } from '../controllers/totp-verification.controller';

const router = Router();

// ✅ VERIFICACIÓN TOTP (para recuperación de contraseña)
router.post('/verify-totp', verifyTOTPCode);
router.post('/get-totp-info', getTOTPUserInfo);

export default router;