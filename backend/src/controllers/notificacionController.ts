import { PrismaClient } from '.prisma/client_portal';
import { Request, Response } from 'express';
import { CreateNotificacion } from '../types/portalTypes';

const prisma = new PrismaClient();

export const notificacionController = {
  // CREATE - Crear nueva notificación
  async create(req: Request, res: Response) {
    try {
      const data: CreateNotificacion = req.body;

      const notificacion = await prisma.notificacion.create({
        data: {
          titulo: data.titulo,
          mensaje: data.mensaje,
          username: data.username,
          leida: data.leida ?? false,
          tipo: data.tipo ?? 'INFORMATIVA',
          metadata: data.metadata
        }
      });

      res.status(201).json({
        message: 'Notificación creada exitosamente',
        data: notificacion
      });
    } catch (error) {
      console.error('Error creating notificacion:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // READ - Obtener todas las notificaciones
  async getAll(req: Request, res: Response) {
    try {
      const { 
        username, 
        leida, 
        tipo, 
        page = 1, 
        limit = 20 
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      
      let where: any = {};
      if (username) where.username = username as string;
      if (leida !== undefined) where.leida = leida === 'true';
      if (tipo) where.tipo = tipo as string;

      const [notificaciones, total] = await Promise.all([
        prisma.notificacion.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.notificacion.count({ where })
      ]);

      res.json({
        data: notificaciones,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching notificaciones:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // READ - Obtener notificaciones por usuario
  async getByUser(req: Request, res: Response) {
    try {
      const { username } = req.params;
      const { leida, limit = 50 } = req.query;

      let where: any = { username };
      if (leida !== undefined) where.leida = leida === 'true';

      const notificaciones = await prisma.notificacion.findMany({
        where,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      });

      // Contar notificaciones no leídas
      const unreadCount = await prisma.notificacion.count({
        where: { username, leida: false }
      });

      res.json({ 
        data: notificaciones,
        unreadCount,
        total: notificaciones.length
      });
    } catch (error) {
      console.error('Error fetching user notificaciones:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // UPDATE - Marcar como leída
  async markAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const notificacion = await prisma.notificacion.update({
        where: { id: Number(id) },
        data: {
          leida: true,
          leidaAt: new Date()
        }
      });

      res.json({
        message: 'Notificación marcada como leída',
        data: notificacion
      });
    } catch (error) {
      console.error('Error marking notificacion as read:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // UPDATE - Marcar todas como leídas
  async markAllAsRead(req: Request, res: Response) {
    try {
      const { username } = req.params;

      await prisma.notificacion.updateMany({
        where: { 
          username,
          leida: false
        },
        data: {
          leida: true,
          leidaAt: new Date()
        }
      });

      res.json({ message: 'Todas las notificaciones marcadas como leídas' });
    } catch (error) {
      console.error('Error marking all notificaciones as read:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // UPDATE - Actualizar notificación
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data: Partial<CreateNotificacion> = req.body;

      const notificacion = await prisma.notificacion.update({
        where: { id: Number(id) },
        data
      });

      res.json({
        message: 'Notificación actualizada exitosamente',
        data: notificacion
      });
    } catch (error) {
      console.error('Error updating notificacion:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // DELETE - Eliminar notificación
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.notificacion.delete({
        where: { id: Number(id) }
      });

      res.json({ message: 'Notificación eliminada exitosamente' });
    } catch (error) {
      console.error('Error deleting notificacion:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};