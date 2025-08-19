import express from 'express';
import { getEmailStats, sendPasswordAlert, sendTestEmail, sendVerificationCodeEmail } from '../controllers/email.controller';


const router = express.Router();

// Usa la función controladora directamente como middleware
router.post('/bienvenida', (req, res) => sendTestEmail(req, res));
router.post('/alerta', sendPasswordAlert);
router.post('/verificacion', sendVerificationCodeEmail);
router.get('/email-stats', getEmailStats);
export default router;