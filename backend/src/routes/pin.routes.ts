// routes/pin.routes.ts
import { Router } from "express";
import { pinController } from "../controllers/pin.controller";
import { verifyTokenMiddleware } from "../middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/pin/save:
 *   post:
 *     summary: Guardar o actualizar el PIN de seguridad del usuario autenticado
 *     tags: [PIN]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SavePinRequest'
 *     responses:
 *       200:
 *         description: PIN guardado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SimpleSuccessResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/PinError'
 */
router.post("/save", verifyTokenMiddleware, pinController.savePin);

/**
 * @swagger
 * /api/pin/remove:
 *   delete:
 *     summary: Eliminar el PIN de seguridad del usuario autenticado
 *     tags: [PIN]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: PIN eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SimpleSuccessResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/PinError'
 */
router.delete("/remove", verifyTokenMiddleware, pinController.removePin);

/**
 * @swagger
 * /api/pin/check:
 *   get:
 *     summary: Verificar si el usuario autenticado tiene PIN configurado
 *     tags: [PIN]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estado del PIN obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PinStatusResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/PinError'
 */
router.get("/check", verifyTokenMiddleware, pinController.checkPin);

/**
 * @swagger
 * /api/pin/verify-for-recovery:
 *   post:
 *     summary: Verificar PIN para recuperación de contraseña (sin autenticación)
 *     tags: [PIN]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyPinForRecoveryRequest'
 *     responses:
 *       200:
 *         description: PIN verificado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PinVerificationResponse'
 *       400:
 *         $ref: '#/components/responses/InvalidPin'
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         $ref: '#/components/responses/PinError'
 */
router.post("/verify-for-recovery", pinController.verifyPinForRecovery);

/**
 * @swagger
 * /api/pin/find-user:
 *   post:
 *     summary: Buscar usuario para recuperación por PIN (sin autenticación)
 *     tags: [PIN]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FindUserForRecoveryRequest'
 *     responses:
 *       200:
 *         description: Usuario encontrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     displayName:
 *                       type: string
 *                       example: "Juan Pérez"
 *                     sAMAccountName:
 *                       type: string
 *                       example: "jperez"
 *                     email:
 *                       type: string
 *                       example: "jperez@uniss.edu.cu"
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         $ref: '#/components/responses/PinError'
 */
router.post("/find-user", pinController.findUserForRecovery);

/**
 * @swagger
 * /api/pin/check-user-has-pin:
 *   post:
 *     summary: Verificar si un usuario tiene PIN configurado (sin autenticación)
 *     tags: [PIN]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CheckUserHasPinRequest'
 *     responses:
 *       200:
 *         description: Estado del PIN obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PinStatusResponse'
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         $ref: '#/components/responses/PinError'
 */
router.post("/check-user-has-pin", pinController.checkUserHasPin);

/**
 * @swagger
 * /api/pin/reset-password:
 *   post:
 *     summary: Restablecer contraseña utilizando PIN de verificación (sin autenticación)
 *     tags: [PIN]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordWithPINRequest'
 *     responses:
 *       200:
 *         description: Contraseña restablecida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SimpleSuccessResponse'
 *       400:
 *         $ref: '#/components/responses/InvalidPin'
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         $ref: '#/components/responses/PinError'
 */
router.post("/reset-password", pinController.resetPasswordWithPIN);

export default router;