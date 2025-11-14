// src/routes/email.routes.ts
import express from 'express';
import { 
  checkUserExists, 
  debugVerificationCodes, 
  enviarAlertasManuales, 
  generarReporteExpiración, 
  getEmailStats, 
  handleForgotPassword, 
  sendChangeEmailVerificationCode, 
  sendPasswordAlert, 
  sendVerificationCodeChangeEmail, 
  sendVerificationCodeEmailPassword, 
  sendWelcomeEmailToUser, 
  verEstadoCache, 
  verifyAndUpdateBackupEmail, 
  verifyCode, 
  verifyCodeAndResetPassword 
} from '../controllers/email.controller';
import { verifyTokenMiddleware } from '../middlewares/auth.middleware';

const router = express.Router();

/**
 * @swagger
 * /email/bienvenido:
 *   post:
 *     summary: Envía correo de bienvenida a un nuevo usuario
 *     tags: [Email]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WelcomeEmailRequest'
 *     responses:
 *       200:
 *         description: Correo de bienvenida enviado exitosamente
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
 *                   example: "Correo de bienvenida enviado exitosamente"
 *                 email:
 *                   type: string
 *                   example: "nuevo.usuario@uniss.edu.cu"
 *                 userName:
 *                   type: string
 *                   example: "Juan Pérez González"
 *                 userType:
 *                   type: string
 *                   example: "Estudiante"
 *                 response:
 *                   type: string
 *                   example: "250 2.0.0 OK"
 *                 emailStats:
 *                   $ref: '#/components/schemas/EmailStats'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/bienvenido', sendWelcomeEmailToUser);

/**
 * @swagger
 * /email/alerta:
 *   post:
 *     summary: Envía alerta de expiración de contraseña
 *     tags: [Email]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordAlertRequest'
 *     responses:
 *       200:
 *         description: Alerta de contraseña enviada exitosamente
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
 *                   example: "Alerta de contraseña enviada"
 *                 email:
 *                   type: string
 *                   example: "usuario@ejemplo.com"
 *                 userName:
 *                   type: string
 *                   example: "Juan Pérez"
 *                 daysLeft:
 *                   type: number
 *                   example: 7
 *                 alertType:
 *                   type: string
 *                   example: "primera-alerta"
 *                 emailStats:
 *                   $ref: '#/components/schemas/EmailStats'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/alerta', sendPasswordAlert);

/**
 * @swagger
 * /email/verificacion:
 *   post:
 *     summary: Envía código de verificación para restablecer contraseña
 *     tags: [Email]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerificationCodeRequest'
 *     responses:
 *       200:
 *         description: Código de verificación enviado exitosamente
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
 *                   example: "Código de verificación enviado"
 *                 email:
 *                   type: string
 *                   example: "usuario@ejemplo.com"
 *                 userName:
 *                   type: string
 *                   example: "Usuario"
 *                 code:
 *                   type: string
 *                   example: "123456"
 *                 emailStats:
 *                   $ref: '#/components/schemas/EmailStats'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/verificacion', sendVerificationCodeEmailPassword);

/**
 * @swagger
 * /email/email-stats:
 *   get:
 *     summary: Obtiene estadísticas de correos enviados
 *     tags: [Email]
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 stats:
 *                   $ref: '#/components/schemas/EmailStats'
 */
router.get('/email-stats', getEmailStats);

/**
 * @swagger
 * /email/cambioCorreo:
 *   post:
 *     summary: [Legacy] Envía código de verificación para cambio de correo
 *     tags: [Email]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerificationCodeRequest'
 *     responses:
 *       200:
 *         description: Código de verificación enviado exitosamente
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
 *                   example: "Código de verificación enviado"
 *                 email:
 *                   type: string
 *                   example: "usuario@ejemplo.com"
 *                 userName:
 *                   type: string
 *                   example: "Usuario"
 *                 emailStats:
 *                   $ref: '#/components/schemas/EmailStats'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/cambioCorreo', sendVerificationCodeChangeEmail);

/**
 * @swagger
 * /email/verify-code:
 *   post:
 *     summary: Verifica un código de verificación
 *     tags: [Email]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyCodeRequest'
 *     responses:
 *       200:
 *         description: Código verificado correctamente
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
 *                   example: "Código verificado correctamente"
 *       400:
 *         description: Código inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "El código de verificación es incorrecto"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/verify-code', verifyCode);

/**
 * @swagger
 * /email/debug/verification-codes:
 *   get:
 *     summary: [Debug] Obtiene estado de todos los códigos de verificación almacenados
 *     tags: [Email]
 *     responses:
 *       200:
 *         description: Estado obtenido exitosamente
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
 *                   example: "Estado del almacenamiento de códigos"
 *                 count:
 *                   type: number
 *                   example: 5
 *                 codes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       email:
 *                         type: string
 *                         example: "usuario@ejemplo.com"
 *                       code:
 *                         type: string
 *                         example: "123456"
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/debug/verification-codes', debugVerificationCodes);

// ✅ NUEVAS RUTAS PARA CAMBIO DE CORREO

/**
 * @swagger
 * /email/change-email/send-code:
 *   post:
 *     summary: Envía código de verificación para cambio de correo de respaldo
 *     tags: [Email]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangeEmailRequest'
 *     responses:
 *       200:
 *         description: Código de verificación enviado exitosamente
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
 *                   example: "Código de verificación enviado para cambio de correo"
 *                 email:
 *                   type: string
 *                   example: "actual@ejemplo.com"
 *                 newEmail:
 *                   type: string
 *                   example: "nuevo@ejemplo.com"
 *                 userName:
 *                   type: string
 *                   example: "Usuario"
 *                 emailStats:
 *                   $ref: '#/components/schemas/EmailStats'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "No puedes utilizar un correo institucional @uniss"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/change-email/send-code', sendChangeEmailVerificationCode);

/**
 * @swagger
 * /email/change-backup-email/verify-and-update:
 *   post:
 *     summary: Verifica código y actualiza correo de respaldo (atributo company en LDAP)
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BackupEmailUpdateRequest'
 *     responses:
 *       200:
 *         description: Correo de respaldo actualizado exitosamente
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
 *                   example: "Correo de respaldo actualizado exitosamente"
 *                 newEmail:
 *                   type: string
 *                   example: "micorreo@gmail.com"
 *       400:
 *         description: Código inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Código de verificación inválido o expirado"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/change-backup-email/verify-and-update', verifyTokenMiddleware, verifyAndUpdateBackupEmail);

// ✅ NUEVAS RUTAS PARA GESTIÓN MANUAL DE EXPIRACIÓN

/**
 * @swagger
 * /email/expiracion/reporte:
 *   get:
 *     summary: Genera reporte manual de expiración de contraseñas
 *     tags: [Email]
 *     parameters:
 *       - in: query
 *         name: baseDN
 *         schema:
 *           type: string
 *         description: Base DN opcional para la búsqueda LDAP
 *         example: "OU=Estudiantes,DC=uniss,DC=edu,DC=cu"
 *     responses:
 *       200:
 *         description: Reporte generado exitosamente
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
 *                   example: "Reporte de expiración generado exitosamente"
 *                 baseDNUtilizada:
 *                   type: string
 *                 reporte:
 *                   type: object
 *                 cacheEstado:
 *                   type: object
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/expiracion/reporte', generarReporteExpiración);

/**
 * @swagger
 * /email/expiración/enviar-alertas:
 *   post:
 *     summary: Envía alertas manuales de expiración de contraseñas
 *     tags: [Email]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ManualAlertsRequest'
 *     responses:
 *       200:
 *         description: Alertas enviadas exitosamente
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
 *                 resultados:
 *                   type: array
 *                 resumen:
 *                   type: object
 *                 emailStats:
 *                   $ref: '#/components/schemas/EmailStats'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/expiración/enviar-alertas', enviarAlertasManuales);

/**
 * @swagger
 * /email/expiración/estado-cache:
 *   get:
 *     summary: Obtiene estado actual del caché de expiración
 *     tags: [Email]
 *     responses:
 *       200:
 *         description: Estado del caché obtenido exitosamente
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
 *                 cache:
 *                   type: object
 *                 estadisticas:
 *                   type: object
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/expiración/estado-cache', verEstadoCache);

/**
 * @swagger
 * /email/forgot-password:
 *   post:
 *     summary: Inicia proceso de recuperación de contraseña
 *     tags: [Email]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Código de verificación enviado exitosamente
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
 *                 email:
 *                   type: string
 *                 displayName:
 *                   type: string
 *                 sAMAccountName:
 *                   type: string
 *                 employeeID:
 *                   type: string
 *                 userPrincipalName:
 *                   type: string
 *                 dn:
 *                   type: string
 *                 accountStatus:
 *                   type: string
 *                 emailStats:
 *                   $ref: '#/components/schemas/EmailStats'
 *       400:
 *         description: Identificador no proporcionado o usuario no encontrado
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/forgot-password', handleForgotPassword);

/**
 * @swagger
 * /email/reset-password:
 *   post:
 *     summary: Restablece la contraseña usando código de verificación
 *     tags: [Email]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
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
 *                   example: "Contraseña restablecida exitosamente"
 *       400:
 *         description: Código inválido o expirado
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/reset-password', verifyCodeAndResetPassword);

/**
 * @swagger
 * /email/check-user/{identifier}:
 *   get:
 *     summary: Verifica si un usuario existe en el sistema
 *     tags: [Email]
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre de usuario (sAMAccountName) o carnet de identidad (employeeID)
 *         example: "jperez"
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserExistsResponse'
 *       400:
 *         description: Identificador no proporcionado
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/check-user/:identifier', checkUserExists);

export default router;