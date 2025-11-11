import { PrismaClient } from '.prisma/client_portal';
import { Request, Response } from 'express';
import { CreateLog } from '../types/portalTypes';

const prisma = new PrismaClient();

export const logController = {
  // CREATE - Crear nuevo log
  async create(req: Request, res: Response) {
    try {
      const data: CreateLog = req.body;

      const log = await prisma.log.create({
        data: {
          accion: data.accion,
          username: data.username,
          ip: data.ip,
          userAgent: data.userAgent,
          dispositivo: data.dispositivo,
          exitoso: data.exitoso ?? true,
          detalles: data.detalles,
          dispositivoId: data.dispositivoId
        }
      });

      res.status(201).json({
        message: 'Log creado exitosamente',
        data: log
      });
    } catch (error) {
      console.error('Error creating log:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // READ - Obtener todos los logs
  async getAll(req: Request, res: Response) {
    try {
      const { 
        username, 
        accion, 
        exitoso, 
        page = 1, 
        limit = 50 
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      
      let where: any = {};
      if (username) where.username = username as string;
      if (accion) where.accion = { contains: accion as string, mode: 'insensitive' };
      if (exitoso !== undefined) where.exitoso = exitoso === 'true';

      const [logs, total] = await Promise.all([
        prisma.log.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            dispositivoRel: {
              select: { mac: true, nombre: true, tipo: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.log.count({ where })
      ]);

      res.json({
        data: logs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching logs:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // READ - Obtener logs por usuario
  async getByUser(req: Request, res: Response) {
    try {
      const { username } = req.params;
      const { limit = 20 } = req.query;

      const logs = await prisma.log.findMany({
        where: { username },
        take: Number(limit),
        include: {
          dispositivoRel: {
            select: { mac: true, nombre: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ 
        data: logs,
        total: logs.length
      });
    } catch (error) {
      console.error('Error fetching user logs:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // READ - Obtener estadísticas de logs
  async getStats(req: Request, res: Response) {
    try {
      const { days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));

      const stats = await prisma.log.groupBy({
        by: ['accion', 'exitoso'],
        where: {
          createdAt: {
            gte: startDate
          }
        },
        _count: {
          _all: true
        }
      });

      const totalLogs = await prisma.log.count({
        where: {
          createdAt: {
            gte: startDate
          }
        }
      });

      res.json({
        data: stats,
        total: totalLogs,
        period: `${days} días`
      });
    } catch (error) {
      console.error('Error fetching log stats:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};