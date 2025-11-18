// src/controllers/logs.controller.ts
import { Request, Response } from "express";
import { PrismaClient } from ".prisma/client_portal";
import { databaseLogService } from "../services/database-log.services";

const prisma = new PrismaClient();

export const logsController = {
  /**
   * ✅ Obtener todos los logins con filtros y paginación
   */
  async obtenerLogins(req: Request, res: Response): Promise<void> {
    try {
      // Parámetros de paginación y filtros
      const {
        pagina = 1,
        limite = 50,
        usuario,
        exitoso,
        fechaInicio,
        fechaFin,
        accion = 'LOGIN' // Por defecto filtrar solo logins
      } = req.query;

      const paginaNum = parseInt(pagina as string, 10);
      const limiteNum = parseInt(limite as string, 10);
      const skip = (paginaNum - 1) * limiteNum;

      // Construir filtros
      const where: any = {
        accion: accion as string
      };

      if (usuario) {
        where.username = {
          contains: usuario as string,
          mode: 'insensitive'
        };
      }

      if (exitoso !== undefined) {
        where.exitoso = exitoso === 'true';
      }

      if (fechaInicio || fechaFin) {
        where.createdAt = {};
        if (fechaInicio) {
          where.createdAt.gte = new Date(fechaInicio as string);
        }
        if (fechaFin) {
          where.createdAt.lte = new Date(fechaFin as string);
        }
      }

      // Obtener logs con paginación
      const [logs, total] = await Promise.all([
        prisma.log.findMany({
          where,
          skip,
          take: limiteNum,
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            accion: true,
            username: true,
            exitoso: true,
            detalles: true,
            ip: true,
            userAgent: true,
            dispositivo: true,
            createdAt: true
          }
        }),
        prisma.log.count({ where })
      ]);

      // Obtener estadísticas
      const estadisticas = await databaseLogService.obtenerEstadisticasLogs();

      res.json({
        success: true,
        data: {
          logs,
          paginacion: {
            pagina: paginaNum,
            limite: limiteNum,
            total,
            totalPaginas: Math.ceil(total / limiteNum)
          },
          estadisticas,
          filtros: {
            usuario: usuario || '',
            exitoso: exitoso || '',
            fechaInicio: fechaInicio || '',
            fechaFin: fechaFin || ''
          }
        }
      });

    } catch (error: any) {
      console.error('❌ Error obteniendo logins:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los logins',
        error: error.message
      });
    }
  },

  /**
   * ✅ Obtener los logins del usuario actual
   */
  async obtenerMisLogins(req: Request, res: Response): Promise<void> {
    try {
      // Obtener usuario del token
      const user = (req as any).user;
      if (!user || !user.username) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      // Parámetros de paginación y filtros
      const {
        pagina = 1,
        limite = 50,
        exitoso,
        fechaInicio,
        fechaFin,
        accion = 'LOGIN'
      } = req.query;

      const paginaNum = parseInt(pagina as string, 10);
      const limiteNum = parseInt(limite as string, 10);
      const skip = (paginaNum - 1) * limiteNum;

      // Construir filtros - SIEMPRE filtrar por el usuario actual
      const where: any = {
        accion: accion as string,
        username: user.username // Filtro fijo por el usuario actual
      };

      if (exitoso !== undefined) {
        where.exitoso = exitoso === 'true';
      }

      if (fechaInicio || fechaFin) {
        where.createdAt = {};
        if (fechaInicio) {
          where.createdAt.gte = new Date(fechaInicio as string);
        }
        if (fechaFin) {
          where.createdAt.lte = new Date(fechaFin as string);
        }
      }

      // Obtener logs con paginación
      const [logs, total] = await Promise.all([
        prisma.log.findMany({
          where,
          skip,
          take: limiteNum,
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            accion: true,
            username: true,
            exitoso: true,
            detalles: true,
            ip: true,
            userAgent: true,
            dispositivo: true,
            createdAt: true
          }
        }),
        prisma.log.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          logs,
          paginacion: {
            pagina: paginaNum,
            limite: limiteNum,
            total,
            totalPaginas: Math.ceil(total / limiteNum)
          },
          filtros: {
            exitoso: exitoso || '',
            fechaInicio: fechaInicio || '',
            fechaFin: fechaFin || '',
            usuario: user.username // Siempre el usuario actual
          }
        }
      });

    } catch (error: any) {
      console.error('❌ Error obteniendo mis logins:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener mis logins',
        error: error.message
      });
    }
  },

  /**
   * ✅ Obtener estadísticas detalladas de logins
   */
  async obtenerEstadisticasLogins(req: Request, res: Response): Promise<void> {
    try {
      const { fechaInicio, fechaFin } = req.query;

      const where: any = {
        accion: 'LOGIN'
      };

      if (fechaInicio || fechaFin) {
        where.createdAt = {};
        if (fechaInicio) {
          where.createdAt.gte = new Date(fechaInicio as string);
        }
        if (fechaFin) {
          where.createdAt.lte = new Date(fechaFin as string);
        }
      }

      const [
        totalLogins,
        loginsExitosos,
        loginsFallidos,
        usuariosUnicos,
        ultimaSemana,
        dispositivosMasUsados
      ] = await Promise.all([
        // Total de logins
        prisma.log.count({ where }),

        // Logins exitosos
        prisma.log.count({
          where: {
            ...where,
            exitoso: true
          }
        }),

        // Logins fallidos
        prisma.log.count({
          where: {
            ...where,
            exitoso: false
          }
        }),

        // Usuarios únicos
        prisma.log.groupBy({
          by: ['username'],
          where,
          _count: {
            username: true
          }
        }),

        // Logins de la última semana
        prisma.log.count({
          where: {
            ...where,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        }),

        // Dispositivos más usados
        prisma.log.groupBy({
          by: ['dispositivo'],
          where: {
            ...where,
            dispositivo: {
              not: null
            }
          },
          _count: {
            dispositivo: true
          },
          orderBy: {
            _count: {
              dispositivo: 'desc'
            }
          },
          take: 10
        })
      ]);

      const tasaExito = totalLogins > 0 ? (loginsExitosos / totalLogins) * 100 : 0;

      res.json({
        success: true,
        data: {
          totalLogins,
          loginsExitosos,
          loginsFallidos,
          tasaExito: Math.round(tasaExito * 100) / 100,
          usuariosUnicos: usuariosUnicos.length,
          actividadReciente: {
            ultimaSemana,
            promedioDiario: Math.round(ultimaSemana / 7 * 100) / 100
          },
          dispositivosMasUsados,
          periodo: {
            fechaInicio: fechaInicio || 'No especificado',
            fechaFin: fechaFin || 'No especificado'
          }
        }
      });

    } catch (error: any) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las estadísticas',
        error: error.message
      });
    }
  },

  /**
   * ✅ Obtener estadísticas de mis logins
   */
  async obtenerMisEstadisticas(req: Request, res: Response): Promise<void> {
    try {
      const { fechaInicio, fechaFin } = req.query;
      const user = (req as any).user;
      
      if (!user || !user.username) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const where: any = {
        accion: 'LOGIN',
        username: user.username // Siempre filtrar por el usuario actual
      };

      if (fechaInicio || fechaFin) {
        where.createdAt = {};
        if (fechaInicio) {
          where.createdAt.gte = new Date(fechaInicio as string);
        }
        if (fechaFin) {
          where.createdAt.lte = new Date(fechaFin as string);
        }
      }

      const [
        totalLogins,
        loginsExitosos,
        loginsFallidos,
        ultimaSemana,
        dispositivosMasUsados
      ] = await Promise.all([
        // Total de logins
        prisma.log.count({ where }),

        // Logins exitosos
        prisma.log.count({
          where: {
            ...where,
            exitoso: true
          }
        }),

        // Logins fallidos
        prisma.log.count({
          where: {
            ...where,
            exitoso: false
          }
        }),

        // Logins de la última semana
        prisma.log.count({
          where: {
            ...where,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        }),

        // Dispositivos más usados
        prisma.log.groupBy({
          by: ['dispositivo'],
          where: {
            ...where,
            dispositivo: {
              not: null
            }
          },
          _count: {
            dispositivo: true
          },
          orderBy: {
            _count: {
              dispositivo: 'desc'
            }
          },
          take: 5
        })
      ]);

      const tasaExito = totalLogins > 0 ? (loginsExitosos / totalLogins) * 100 : 0;

      res.json({
        success: true,
        data: {
          totalLogins,
          loginsExitosos,
          loginsFallidos,
          tasaExito: Math.round(tasaExito * 100) / 100,
          actividadReciente: {
            ultimaSemana,
            promedioDiario: Math.round(ultimaSemana / 7 * 100) / 100
          },
          dispositivosMasUsados,
          periodo: {
            fechaInicio: fechaInicio || 'No especificado',
            fechaFin: fechaFin || 'No especificado'
          },
          usuario: user.username
        }
      });

    } catch (error: any) {
      console.error('❌ Error obteniendo mis estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener mis estadísticas',
        error: error.message
      });
    }
  },

  /**
   * ✅ Reintentar guardar logs pendientes manualmente
   */
  async reintentarLogsPendientes(req: Request, res: Response): Promise<void> {
    try {
      await databaseLogService.reintentarLogsPendientes();
      const estadisticas = await databaseLogService.obtenerEstadisticasLogs();

      res.json({
        success: true,
        message: 'Reintento de logs pendientes completado',
        data: estadisticas
      });

    } catch (error: any) {
      console.error('❌ Error reintentando logs pendientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al reintentar logs pendientes',
        error: error.message
      });
    }
  },
};