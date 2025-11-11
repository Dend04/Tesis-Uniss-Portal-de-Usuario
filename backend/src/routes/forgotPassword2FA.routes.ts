import { Router } from 'express';
import { ForgotPassword2FAController } from '../controllers/forgotPassword2FA.controller';

const router = Router();
const controller = new ForgotPassword2FAController();

// POST /api/forgot-password/2fa/check-user
router.post('/check-user', controller.checkUser.bind(controller));

// POST /api/forgot-password/2fa/verify-code  
router.post('/verify-code', controller.verifyCode.bind(controller));

export default router;