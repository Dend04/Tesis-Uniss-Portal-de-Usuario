// routes/2fa.routes.ts - RUTAS ACTUALIZADAS
import express from 'express';
import {
  activate2FAController,
  check2FAUserStatus,
  deactivate2FAController,
  get2FAStatusController,
  verify2FACodeRecovery,
} from '../controllers/2fa.controller';

const router = express.Router();

// Activar 2FA
router.post('/activate', activate2FAController);

// Verificar estado del 2FA por sAMAccountName
router.get('/status/:sAMAccountName', get2FAStatusController);

// Desactivar 2FA
router.post('/deactivate', deactivate2FAController);

router.post('/check-status', check2FAUserStatus); // Para el UserIdentifierForm
router.post('/verify-code', verify2FACodeRecovery); // Para verificar el código

export default router;