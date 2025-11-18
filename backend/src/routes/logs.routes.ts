// src/routes/logs.routes.ts
import { Router } from "express";
import { logsController } from "../controllers/logs.controller";
import { verifyTokenMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyTokenMiddleware);

/**
 * @swagger
 * /api/logs/logins:
 *   get:
 *     summary: Obtener todos los logins con filtros y paginación
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Límite de registros por página
 *       - in: query
 *         name: usuario
 *         schema:
 *           type: string
 *         description: Filtrar por nombre de usuario
 *       - in: query
 *         name: exitoso
 *         schema:
 *           type: boolean
 *         description: Filtrar por éxito (true/false)
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio (YYYY-MM-DD)
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Lista de logins obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           accion:
 *                             type: string
 *                           username:
 *                             type: string
 *                           exitoso:
 *                             type: boolean
 *                           detalles:
 *                             type: string
 *                           ip:
 *                             type: string
 *                           userAgent:
 *                             type: string
 *                           dispositivo:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     paginacion:
 *                       type: object
 *                       properties:
 *                         pagina:
 *                           type: integer
 *                         limite:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPaginas:
 *                           type: integer
 *                     estadisticas:
 *                       type: object
 *                     filtros:
 *                       type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/logins", logsController.obtenerLogins);

/**
 * @swagger
 * /api/logs/mis-logins:
 *   get:
 *     summary: Obtener los logins del usuario actual con filtros y paginación
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Límite de registros por página
 *       - in: query
 *         name: exitoso
 *         schema:
 *           type: boolean
 *         description: Filtrar por éxito (true/false)
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio (YYYY-MM-DD)
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Lista de logins del usuario actual obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           accion:
 *                             type: string
 *                           username:
 *                             type: string
 *                           exitoso:
 *                             type: boolean
 *                           detalles:
 *                             type: string
 *                           ip:
 *                             type: string
 *                           userAgent:
 *                             type: string
 *                           dispositivo:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     paginacion:
 *                       type: object
 *                       properties:
 *                         pagina:
 *                           type: integer
 *                         limite:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPaginas:
 *                           type: integer
 *                     filtros:
 *                       type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/mis-logins", logsController.obtenerMisLogins);

/**
 * @swagger
 * /api/logs/estadisticas:
 *   get:
 *     summary: Obtener estadísticas detalladas de logins
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio para el análisis (YYYY-MM-DD)
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin para el análisis (YYYY-MM-DD)
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalLogins:
 *                       type: integer
 *                     loginsExitosos:
 *                       type: integer
 *                     loginsFallidos:
 *                       type: integer
 *                     tasaExito:
 *                       type: number
 *                     usuariosUnicos:
 *                       type: integer
 *                     actividadReciente:
 *                       type: object
 *                     dispositivosMasUsados:
 *                       type: array
 *                     periodo:
 *                       type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/estadisticas", logsController.obtenerEstadisticasLogins);

/**
 * @swagger
 * /api/logs/mis-estadisticas:
 *   get:
 *     summary: Obtener estadísticas de los logins del usuario actual
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio para el análisis (YYYY-MM-DD)
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin para el análisis (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Estadísticas del usuario actual obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalLogins:
 *                       type: integer
 *                     loginsExitosos:
 *                       type: integer
 *                     loginsFallidos:
 *                       type: integer
 *                     tasaExito:
 *                       type: number
 *                     actividadReciente:
 *                       type: object
 *                     dispositivosMasUsados:
 *                       type: array
 *                     periodo:
 *                       type: object
 *                     usuario:
 *                       type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/mis-estadisticas", logsController.obtenerMisEstadisticas);

/**
 * @swagger
 * /api/logs/reintentar-pendientes:
 *   post:
 *     summary: Reintentar guardar logs pendientes manualmente
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reintento completado exitosamente
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
 *                 data:
 *                   type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/reintentar-pendientes", logsController.reintentarLogsPendientes);

export default router;