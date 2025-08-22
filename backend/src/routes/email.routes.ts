import express from 'express';
import { getEmailStats, resendVerificationCode, sendPasswordAlert, sendTestEmail, sendVerificationCodeChangeEmail, sendVerificationCodeEmailPassword, verifyCode } from '../controllers/email.controller';


const router = express.Router();

// Usa la función controladora directamente como middleware
router.post('/bienvenida', (req, res) => sendTestEmail(req, res));
router.post('/alerta', sendPasswordAlert);
router.post('/verificacion', sendVerificationCodeEmailPassword);
router.get('/email-stats', getEmailStats);
router.post('/cambioCorreo', sendVerificationCodeChangeEmail);
router.post('/verify-code', verifyCode);
router.post('/resend-verification', resendVerificationCode);
export default router;