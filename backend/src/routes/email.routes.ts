import express from 'express';
import { debugVerificationCodes, enviarAlertasManuales, generarReporteExpiración, getEmailStats, sendChangeEmailVerificationCode, sendPasswordAlert, sendVerificationCodeChangeEmail, sendVerificationCodeEmailPassword, sendWelcomeEmailToUser, verEstadoCache, verifyAndUpdateEmail, verifyCode } from '../controllers/email.controller';
import { sendWelcomeEmail } from '../services/emailService';
import { verifyTokenMiddleware } from '../middlewares/auth.middleware';


const router = express.Router();

// Usa la función controladora directamente como middleware
router.post('/bienvenido', sendWelcomeEmailToUser); 
router.post('/alerta', sendPasswordAlert);
router.post('/verificacion', sendVerificationCodeEmailPassword);
router.get('/email-stats', getEmailStats);
router.post('/cambioCorreo', sendVerificationCodeChangeEmail);
router.post('/verify-code', verifyCode);
router.get('/debug/verification-codes', debugVerificationCodes);

// ✅ NUEVAS RUTAS PARA CAMBIO DE CORREO
router.post('/change-email/send-code', sendChangeEmailVerificationCode);
router.post('/change-email/verify-and-update', verifyTokenMiddleware, verifyAndUpdateEmail); // Protegida con autenticación

// ✅ NUEVAS RUTAS PARA GESTIÓN MANUAL DE EXPIRACIÓN
router.get('/expiracion/reporte', generarReporteExpiración);
router.post('/expiración/enviar-alertas', enviarAlertasManuales);
router.get('/expiración/estado-cache', verEstadoCache);


export default router;