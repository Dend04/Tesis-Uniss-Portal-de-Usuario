// routes/2fa.routes.ts - RUTAS ACTUALIZADAS CON DOCUMENTACIÓN SWAGGER
import express from 'express';
import {
  activate2FAController,
  check2FAUserStatus,
  deactivate2FAController,
  get2FAStatusController,
  verify2FACodeRecovery,
} from '../controllers/2fa.controller';
import { forgotPassword2FAController } from '../controllers/forgotPassword2FA.controller';

const router = express.Router();

/**
 * @swagger
 * /api/2fa/activate:
 *   post:
 *     summary: Activar la autenticación de dos factores para un usuario
 *     tags: [2FA]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Activate2FARequest'
 *     responses:
 *       200:
 *         description: 2FA activado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TwoFactorActivationResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/TwoFactorNotFound'
 *       500:
 *         $ref: '#/components/responses/TwoFactorError'
 */
router.post('/activate', activate2FAController);

/**
 * @swagger
 * /api/2fa/status/{sAMAccountName}:
 *   get:
 *     summary: Obtener el estado de la autenticación de dos factores de un usuario
 *     tags: [2FA]
 *     parameters:
 *       - in: path
 *         name: sAMAccountName
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre de usuario (sAMAccountName)
 *         example: "jperez"
 *     responses:
 *       200:
 *         description: Estado del 2FA obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TwoFactorStatusResponse'
 *       404:
 *         $ref: '#/components/responses/TwoFactorNotFound'
 *       500:
 *         $ref: '#/components/responses/TwoFactorError'
 */
router.get('/status/:sAMAccountName', get2FAStatusController);

/**
 * @swagger
 * /api/2fa/deactivate:
 *   post:
 *     summary: Desactivar la autenticación de dos factores para un usuario
 *     tags: [2FA]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Deactivate2FARequest'
 *     responses:
 *       200:
 *         description: 2FA desactivado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "2FA desactivado correctamente"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/TwoFactorNotFound'
 *       500:
 *         $ref: '#/components/responses/TwoFactorError'
 */
router.post('/deactivate', deactivate2FAController);

/**
 * @swagger
 * /api/2fa/check-status:
 *   post:
 *     summary: Verificar el estado de 2FA para un usuario (por sAMAccountName o employeeID)
 *     tags: [2FA]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Check2FAStatusRequest'
 *     responses:
 *       200:
 *         description: Estado del 2FA obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Check2FAStatusResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/TwoFactorNotFound'
 *       500:
 *         $ref: '#/components/responses/TwoFactorError'
 */
router.post('/check-status', check2FAUserStatus);

/**
 * @swagger
 * /api/2fa/verify-code:
 *   post:
 *     summary: Verificar el código de recuperación de 2FA
 *     tags: [2FA]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Verify2FACodeRequest'
 *     responses:
 *       200:
 *         description: Código verificado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TwoFactorVerificationResponse'
 *       400:
 *         $ref: '#/components/responses/InvalidTwoFactorCode'
 *       404:
 *         $ref: '#/components/responses/TwoFactorNotFound'
 *       500:
 *         $ref: '#/components/responses/TwoFactorError'
 */
router.post('/verify-code', verify2FACodeRecovery);

/**
 * @swagger
 * /api/2fa/reset-password:
 *   post:
 *     summary: Restablecer la contraseña utilizando el código de verificación de 2FA
 *     tags: [2FA]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPassword2FARequest'
 *     responses:
 *       200:
 *         description: Contraseña restablecida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Contraseña restablecida correctamente"
 *       400:
 *         $ref: '#/components/responses/InvalidTwoFactorCode'
 *       404:
 *         $ref: '#/components/responses/TwoFactorNotFound'
 *       500:
 *         $ref: '#/components/responses/TwoFactorError'
 */
router.post('/reset-password', (req, res) => forgotPassword2FAController.resetPassword(req, res));

export default router;