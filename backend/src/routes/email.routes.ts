import express from 'express';
import { debugVerificationCodes, enviarAlertasManuales, generarReporteExpiración, getEmailStats, sendPasswordAlert, sendVerificationCodeChangeEmail, sendVerificationCodeEmailPassword, sendWelcomeEmailToUser, verEstadoCache, verifyCode } from '../controllers/email.controller';
import { sendWelcomeEmail } from '../services/emailService';


const router = express.Router();

// Usa la función controladora directamente como middleware
router.post('/bienvenido', sendWelcomeEmailToUser); 
router.post('/alerta', sendPasswordAlert);
router.post('/verificacion', sendVerificationCodeEmailPassword);
router.get('/email-stats', getEmailStats);
router.post('/cambioCorreo', sendVerificationCodeChangeEmail);
router.post('/verify-code', verifyCode);
router.get('/debug/verification-codes', debugVerificationCodes);

// ✅ NUEVAS RUTAS PARA GESTIÓN MANUAL DE EXPIRACIÓN
router.get('/expiración/reporte', generarReporteExpiración);
router.post('/expiración/enviar-alertas', enviarAlertasManuales);
router.get('/expiración/estado-cache', verEstadoCache);


export default router;