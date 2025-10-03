// src/controllers/log.controller.ts
import { Request, Response } from "express";
import { auditService } from "../services/audit.services";
import { logService } from "../services/log.services";

export class LogController {
  
  async obtenerMisLogs(req: Request, res: Response): Promise<void> {
    try {
      // El usuario ya viene del middleware - no necesitas verificar el token again
      const user = (req as any).user;

      if (!user || !user.sAMAccountName) {
        res.status(401).json({
          exito: false,
          mensaje: "Usuario no autenticado"
        });
        return;
      }

      console.log(`📋 Solicitando logs para usuario: ${user.sAMAccountName}`);

      // Como el middleware solo proporciona sAMAccountName, necesitamos buscar por usuario
      const logs = await logService.getLogsPorUsuario(user.sAMAccountName);

      // Auditoría de la consulta
      await auditService.addLogEntry(
        user.sAMAccountName, 
        "CONSULTA_LOGS", 
        `Consulta de logs para usuario: ${user.sAMAccountName}. Encontrados: ${logs.length} registros`
      );

      res.json({
        exito: true,
        datos: {
          usuario: user.sAMAccountName,
          logs: logs,
          total: logs.length
        }
      });

    } catch (error: any) {
      console.error('❌ Error en obtenerMisLogs:', error);
      
      // Auditoría de error
      try {
        const user = (req as any).user;
        if (user) {
          await auditService.addLogEntry(
            user.sAMAccountName,
            "ERROR_CONSULTA_LOGS", 
            `Error consultando logs: ${error.message}`
          );
        }
      } catch (errorAuditoria) {
        console.error('Error en auditoría:', errorAuditoria);
      }

      res.status(500).json({
        exito: false,
        mensaje: error.message || "Error interno del servidor"
      });
    }
  }

  async obtenerLogsPorEmployeeID(req: Request, res: Response): Promise<void> {
    try {
      // Usuario del middleware
      const user = (req as any).user;

      const { employeeID } = req.params;
      
      if (!employeeID) {
        res.status(400).json({
          exito: false,
          mensaje: "employeeID es requerido"
        });
        return;
      }

      console.log(`🔍 Solicitando logs administrativos para employeeID: ${employeeID} por usuario: ${user.sAMAccountName}`);

      const logs = await logService.getLogsByEmployeeID(employeeID);

      // Auditoría de consulta administrativa
      await auditService.addLogEntry(
        user.sAMAccountName,
        "CONSULTA_LOGS_ADMIN",
        `Consulta administrativa de logs para employeeID: ${employeeID}. Encontrados: ${logs.length} registros`
      );

      res.json({
        exito: true,
        datos: {
          employeeIDSolicitado: employeeID,
          logs: logs,
          total: logs.length
        }
      });

    } catch (error: any) {
      console.error('❌ Error en obtenerLogsPorEmployeeID:', error);
      res.status(500).json({
        exito: false,
        mensaje: error.message || "Error interno del servidor"
      });
    }
  }

  async obtenerLogsRecientes(req: Request, res: Response): Promise<void> {
    try {
      // Usuario del middleware
      const user = (req as any).user;

      const limite = parseInt(req.query.limite as string) || 100;
      const logs = await logService.getLogsRecientes(limite);

      // Auditoría
      await auditService.addLogEntry(
        user.sAMAccountName,
        "CONSULTA_LOGS_RECIENTES",
        `Consulta de logs recientes (límite: ${limite}). Encontrados: ${logs.length} registros`
      );

      res.json({
        exito: true,
        datos: {
          logs: logs,
          total: logs.length,
          limite: limite
        }
      });

    } catch (error: any) {
      console.error('❌ Error en obtenerLogsRecientes:', error);
      res.status(500).json({
        exito: false,
        mensaje: error.message || "Error interno del servidor"
      });
    }
  }

  async obtenerLogsPorUsuario(req: Request, res: Response): Promise<void> {
    try {
      // Usuario del middleware
      const user = (req as any).user;

      const { usuario } = req.params;
      
      if (!usuario) {
        res.status(400).json({
          exito: false,
          mensaje: "Nombre de usuario es requerido"
        });
        return;
      }

      console.log(`🔍 Solicitando logs para usuario: ${usuario} por usuario: ${user.sAMAccountName}`);

      const logs = await logService.getLogsPorUsuario(usuario);

      // Auditoría
      await auditService.addLogEntry(
        user.sAMAccountName,
        "CONSULTA_LOGS_USUARIO",
        `Consulta de logs para usuario: ${usuario}. Encontrados: ${logs.length} registros`
      );

      res.json({
        exito: true,
        datos: {
          usuarioSolicitado: usuario,
          logs: logs,
          total: logs.length
        }
      });

    } catch (error: any) {
      console.error('❌ Error en obtenerLogsPorUsuario:', error);
      res.status(500).json({
        exito: false,
        mensaje: error.message || "Error interno del servidor"
      });
    }
  }
}

export const logController = new LogController();