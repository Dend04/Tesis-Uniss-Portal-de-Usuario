import express from 'express';
import { 
  checkGmailService, 
  handleForgotPasswordGmail, 
  getGmailStatistics,
  resetGmailCount, 
  sendBackupEmailVerificationGmail,
  resendWelcomeEmailGmail,
  resendChangeEmailVerificationGmail
} from '../controllers/emailGoogle.controller';

const router = express.Router();

// ✅ RUTAS PÚBLICAS PARA GMAIL
router.get('/gmail/status', checkGmailService);
router.post('/gmail/forgot-password', handleForgotPasswordGmail);
router.get('/gmail/stats', getGmailStatistics);

router.post('/gmail/backup-email-verification', sendBackupEmailVerificationGmail); 

// ✅ RUTA DE DESARROLLO (SOLO PARA DEBUG)
router.post('/gmail/reset-counter', resetGmailCount);

router.post('/resend-welcome-gmail', resendWelcomeEmailGmail);

router.post('/resend-change-email-verification-gmail', resendChangeEmailVerificationGmail);

export default router;