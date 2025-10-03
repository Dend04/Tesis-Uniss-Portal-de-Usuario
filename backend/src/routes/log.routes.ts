// src/routes/log.routes.ts
import { Router } from "express";
import { logController } from "../controllers/log.controller";
import { verifyTokenMiddleware } from "../middlewares/auth.middleware";


const router = Router();

/**
 * @route GET /api/logs/mis-logs
 * @desc Obtener los logs del usuario autenticado (basado en el token)
 * @access Privado
 */
router.get("/mis-logs", verifyTokenMiddleware,logController.obtenerMisLogs);

/**
 * @route GET /api/logs/employee/:employeeID
 * @desc Obtener logs por employeeID específico (requiere permisos administrativos)
 * @access Privado/Admin
 */
router.get("/employee/:employeeID", verifyTokenMiddleware,logController.obtenerLogsPorEmployeeID);

/**
 * @route GET /api/logs/recientes
 * @desc Obtener logs recientes (requiere permisos administrativos)
 * @access Privado/Admin
 */
router.get("/recientes", verifyTokenMiddleware,logController.obtenerLogsRecientes);

/**
 * @route GET /api/logs/usuario/:usuario
 * @desc Obtener logs por nombre de usuario (requiere permisos administrativos)
 * @access Privado/Admin
 */
router.get("/usuario/:usuario", verifyTokenMiddleware,logController.obtenerLogsPorUsuario);

export default router;