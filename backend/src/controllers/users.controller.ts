import { Request, Response } from "express";
import { usersService } from "../services/users.services";

export class UsersController {
  /**
   * Obtiene todos los usuarios (con caché y paginación)
   */
  obtenerTodosUsuarios = async (req: Request, res: Response): Promise<void> => {
    try {
      const { forceRefresh, page = '1', limit = '50' } = req.query;
      
      const paginationOptions = {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      // Validar parámetros de paginación
      if (paginationOptions.page < 1 || paginationOptions.limit < 1) {
        res.status(400).json({
          success: false,
          error: 'Los parámetros de paginación deben ser números positivos'
        });
        return;
      }

      console.log('📋 Solicitando todos los usuarios con paginación', {
        paginationOptions,
        forceRefresh: forceRefresh === 'true',
        timestamp: new Date().toISOString()
      });

      const result = await usersService.obtenerTodosUsuarios(
        paginationOptions, 
        forceRefresh === 'true'
      );

      if (result.success && result.data) {
        res.json({
          success: true,
          data: {
            usuarios: result.data.data,
            pagination: result.data.pagination,
            fromCache: result.fromCache,
            timestamp: new Date().toISOString()
          },
          message: result.fromCache 
            ? 'Usuarios obtenidos desde caché' 
            : 'Usuarios obtenidos directamente del directorio'
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      console.error('❌ Error en obtenerTodosUsuarios controller:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor al obtener usuarios'
      });
    }
  };

  /**
   * Obtiene un usuario específico por sAMAccountName
   */
  obtenerUsuarioPorSAM = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sAMAccountName } = req.params;

      if (!sAMAccountName) {
        res.status(400).json({
          success: false,
          error: 'sAMAccountName es requerido'
        });
        return;
      }

      console.log(`🔍 Buscando usuario específico: ${sAMAccountName}`);

      const result = await usersService.obtenerUsuarioPorSAM(sAMAccountName);

      if (result.success) {
        res.json({
          success: true,
          data: {
            usuario: result.usuario
          }
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error || 'Usuario no encontrado'
        });
      }
    } catch (error: any) {
      console.error('❌ Error en obtenerUsuarioPorSAM controller:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor al obtener usuario'
      });
    }
  };

  /**
   * Busca usuarios por término con paginación
   */
  buscarUsuarios = async (req: Request, res: Response): Promise<void> => {
    try {
      const { q, page = '1', limit = '50' } = req.query;

      if (!q || typeof q !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Término de búsqueda (q) es requerido'
        });
        return;
      }

      const paginationOptions = {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      // Validar parámetros de paginación
      if (paginationOptions.page < 1 || paginationOptions.limit < 1) {
        res.status(400).json({
          success: false,
          error: 'Los parámetros de paginación deben ser números positivos'
        });
        return;
      }

      console.log(`🔍 Buscando usuarios con término: ${q}`, paginationOptions);

      const result = await usersService.buscarUsuarios(q, paginationOptions);

      if (result.success && result.data) {
        res.json({
          success: true,
          data: {
            usuarios: result.data.data,
            pagination: result.data.pagination,
            termino: q
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      console.error('❌ Error en buscarUsuarios controller:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor al buscar usuarios'
      });
    }
  };

  /**
   * Limpia la caché de usuarios
   */
  limpiarCache = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🧹 Solicitando limpieza de caché de usuarios');

      const result = usersService.limpiarCache();

      if (result.success) {
        res.json({
          success: true,
          message: result.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.message
        });
      }
    } catch (error: any) {
      console.error('❌ Error en limpiarCache controller:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor al limpiar caché'
      });
    }
  };

  /**
   * Obtiene estadísticas de la caché
   */
  obtenerEstadisticasCache = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('📊 Solicitando estadísticas de caché');

      const result = usersService.obtenerEstadisticasCache();

      res.json(result);
    } catch (error: any) {
      console.error('❌ Error en obtenerEstadisticasCache controller:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor al obtener estadísticas'
      });
    }
  };
}

export const usersController = new UsersController();