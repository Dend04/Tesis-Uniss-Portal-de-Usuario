import express from 'express';
import { getEmailStats, sendPasswordAlert, sendVerificationCodeChangeEmail, sendVerificationCodeEmailPassword, sendWelcomeEmailToUser, verifyCode } from '../controllers/email.controller';
import { sendWelcomeEmail } from '../services/emailService';


const router = express.Router();

// Usa la función controladora directamente como middleware
router.post('/bienvenido', sendWelcomeEmailToUser); 
router.post('/alerta', sendPasswordAlert);
router.post('/verificacion', sendVerificationCodeEmailPassword);
router.get('/email-stats', getEmailStats);
router.post('/cambioCorreo', sendVerificationCodeChangeEmail);
router.post('/verify-code', verifyCode);
export default router;