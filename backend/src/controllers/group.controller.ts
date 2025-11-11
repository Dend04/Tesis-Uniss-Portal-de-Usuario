// backend/controllers/groupController.ts
import { Request, Response } from 'express';
import { groupService } from '../services/group.services';


export const getAllGroups = async (req: Request, res: Response) => {
  try {
    const { page = '1', pageSize = '100', search = '' } = req.query;
    
    const result = await groupService.getAllGroups(
      parseInt(page as string),
      parseInt(pageSize as string),
      search as string
    );

    res.json({ 
      success: true, 
      groups: result.groups,
      pagination: {
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        total: result.total,
        totalPages: Math.ceil(result.total / parseInt(pageSize as string))
      }
    });
  } catch (error: any) {
    console.error('Error al obtener grupos:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

export const getUserGroups = async (req: Request, res: Response) => {
  const { username } = req.params;

  try {
    const groups = await groupService.getUserGroups(username);
    res.json({ success: true, groups });
  } catch (error: any) {
    console.error(`Error al obtener grupos del usuario ${username}:`, error);
    
    if (error.message.includes('no encontrado')) {
      res.status(404).json({ 
        success: false, 
        error: error.message 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
};

export const getUserAllGroups = async (req: Request, res: Response) => {
  const { username } = req.params;

  try {
    const { directGroups, nestedGroups } = await groupService.getUserAllGroups(username);
    
    res.json({ 
      success: true, 
      groups: {
        direct: directGroups,
        nested: nestedGroups,
        all: [...directGroups, ...nestedGroups]
      }
    });
  } catch (error: any) {
    console.error(`Error al obtener todos los grupos del usuario ${username}:`, error);
    
    if (error.message.includes('no encontrado')) {
      res.status(404).json({ 
        success: false, 
        error: error.message 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
};

export const updateUserGroups = async (req: Request, res: Response) => {
  const { username } = req.params;
  const { groupsToAdd = [], groupsToRemove = [] } = req.body;

  try {
    // Validar entrada
    if (!Array.isArray(groupsToAdd) || !Array.isArray(groupsToRemove)) {
      res.status(400).json({
        success: false,
        error: 'groupsToAdd y groupsToRemove deben ser arrays'
      });
      return;
    }

    if (groupsToAdd.length === 0 && groupsToRemove.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Debe proporcionar al menos un grupo para agregar o remover'
      });
      return;
    }

    let result;

    // Ejecutar operaciones en secuencia
    if (groupsToRemove.length > 0) {
      result = await groupService.removeUserFromGroups(username, groupsToRemove);
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
    }

    if (groupsToAdd.length > 0) {
      result = await groupService.addUserToGroups(username, groupsToAdd);
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
    }

    // Si ambas operaciones fueron exitosas, obtener grupos actualizados
    const updatedGroups = await groupService.getUserGroups(username);

    res.json({ 
      success: true,
      message: 'Permisos actualizados correctamente',
      groups: updatedGroups 
    });

  } catch (error: any) {
    console.error(`Error al actualizar permisos del usuario ${username}:`, error);
    
    if (error.message.includes('no encontrado')) {
      res.status(404).json({ 
        success: false, 
        error: error.message 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
};

export const searchGroups = async (req: Request, res: Response) => {
  const { q, limit = '50' } = req.query;

  try {
    if (!q || typeof q !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Parámetro de búsqueda (q) requerido'
      });
      return;
    }

    const groups = await groupService.searchGroups(
      q as string, 
      parseInt(limit as string)
    );

    res.json({ 
      success: true, 
      groups,
      count: groups.length
    });
  } catch (error: any) {
    console.error('Error buscando grupos:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

export const getGroupDetails = async (req: Request, res: Response) => {
  const { groupDN } = req.params;

  try {
    const group = await groupService.getGroupDetails(groupDN);

    if (!group) {
      res.status(404).json({
        success: false,
        error: 'Grupo no encontrado'
      });
      return;
    }

    res.json({ 
      success: true, 
      group 
    });
  } catch (error: any) {
    console.error(`Error obteniendo detalles del grupo ${groupDN}:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

export const checkUserMembership = async (req: Request, res: Response) => {
  const { username, groupDN } = req.params;

  try {
    const isMember = await groupService.isUserInGroup(username, groupDN);

    res.json({ 
      success: true, 
      isMember,
      message: isMember 
        ? `El usuario ${username} pertenece al grupo` 
        : `El usuario ${username} no pertenece al grupo`
    });
  } catch (error: any) {
    console.error(`Error verificando membresía del usuario ${username} en grupo ${groupDN}:`, error);
    
    if (error.message.includes('no encontrado')) {
      res.status(404).json({ 
        success: false, 
        error: error.message 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
};

// Controlador para limpiar cache/recursos (opcional, para administración)
export const cleanup = async (req: Request, res: Response) => {
  try {
    groupService.destroy();
    res.json({ 
      success: true, 
      message: 'Recursos del servicio de grupos liberados' 
    });
  } catch (error: any) {
    console.error('Error en cleanup:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};