// src/controllers/user-profile.controller.ts
import { Request, Response } from 'express';
import { generateTokens, verifyToken } from '../utils/jwt.utils';
import logger from '../utils/logger';
import { updateAccountService } from '../services/updateAccount.services';

interface AuthenticatedRequest extends Request {
  user?: any;
}

export const updateEmployeeID = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: "Header de autorización requerido"
      });
      return;
    }

    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      res.status(401).json({
        success: false,
        error: "Formato de autorización inválido"
      });
      return;
    }

    const token = tokenParts[1];
    const decodedToken = verifyToken(token);
    
    const { employeeID } = req.body;
    
    if (!employeeID) {
      res.status(400).json({
        success: false,
        error: "El campo employeeID es requerido"
      });
      return;
    }

    // Validar que sea un CI válido (11 dígitos)
    const cleanCI = employeeID.replace(/\D/g, '');
    if (cleanCI.length !== 11) {
      res.status(400).json({
        success: false,
        error: "El Carnet de Identidad debe tener 11 dígitos"
      });
      return;
    }

    // Obtener el username del token
    const username = decodedToken.sAMAccountName || decodedToken.username;
    
    if (!username) {
      res.status(400).json({
        success: false,
        error: "No se pudo obtener el nombre de usuario del token"
      });
      return;
    }

    // Actualizar el employeeID en LDAP
    await updateAccountService.updateUserEmployeeID(username, cleanCI);

    logger.info(`EmployeeID actualizado para usuario ${username}: ${cleanCI}`);

    // ✅ GENERAR NUEVO TOKEN CON EL EMPLOYEEID ACTUALIZADO
    const newTokenPayload = {
      sAMAccountName: decodedToken.sAMAccountName,
      username: decodedToken.username,
      employeeID: cleanCI, // ✅ Usar el NUEVO employeeID
      displayName: decodedToken.displayName,
      title: decodedToken.title,
      dn: decodedToken.dn
    };

    const { accessToken: newToken } = generateTokens(newTokenPayload);

    res.status(200).json({
      success: true,
      message: "Carnet de Identidad actualizado exitosamente",
      employeeID: cleanCI,
      newToken: newToken // ✅ Enviar el nuevo token al frontend
    });

  } catch (error: any) {
    logger.error(`Error al actualizar employeeID: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
};

export const updateUserEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: "Header de autorización requerido"
      });
      return;
    }

    const tokenParts = authHeader.split(' ');
    const token = tokenParts[1];
    const decodedToken = verifyToken(token);
    
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({
        success: false,
        error: "El campo email es requerido"
      });
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        error: "El formato del email no es válido"
      });
      return;
    }

    // Obtener el username del token
    const username = decodedToken.sAMAccountName || decodedToken.username;
    
    if (!username) {
      res.status(400).json({
        success: false,
        error: "No se pudo obtener el nombre de usuario del token"
      });
      return;
    }

    // Actualizar el company (email de respaldo) en LDAP
    await updateAccountService.updateUserCompany(username, email);

    logger.info(`Email de respaldo actualizado para usuario ${username}: ${email}`);

    res.status(200).json({
      success: true,
      message: "Correo de respaldo actualizado exitosamente",
      email: email
    });

  } catch (error: any) {
    logger.error(`Error al actualizar email: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
};

export const getUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: "Header de autorización requerido"
      });
      return;
    }

    const tokenParts = authHeader.split(' ');
    const token = tokenParts[1];
    const decodedToken = verifyToken(token);

    // Obtener el username del token
    const username = decodedToken.sAMAccountName || decodedToken.username;
    
    if (!username) {
      res.status(400).json({
        success: false,
        error: "No se pudo obtener el nombre de usuario del token"
      });
      return;
    }

    // Obtener datos actualizados del usuario
    const userData = await updateAccountService.getUserData(username);

    res.status(200).json({
      success: true,
      user: userData
    });

  } catch (error: any) {
    logger.error(`Error al obtener perfil: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
};