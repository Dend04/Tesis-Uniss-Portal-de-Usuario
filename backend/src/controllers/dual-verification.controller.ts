// src/controllers/dual-verification.controller.ts
import { Request, Response } from 'express';
import logger from '../utils/logger';
import { verifyToken } from '../utils/jwt.utils';
import dualVerificationServices from '../services/dual-verification.services';

// Interfaz para tipar el request con usuario
interface AuthenticatedRequest extends Request {
  user?: any;
}

export const verifyDualStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // 1. Extraer el token del header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      logger.error('Header de autorización faltante');
      res.status(401).json({
        success: false,
        error: "Header de autorización requerido"
      });
      return;
    }

    // 2. Verificar formato y extraer token
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      logger.error(`Formato de token inválido. Header completo: ${authHeader}`);
      res.status(401).json({
        success: false,
        error: "Formato de autorización inválido. Se espera: Bearer <token>"
      });
      return;
    }

    const token = tokenParts[1];
    
    // 3. Verificar y decodificar el token
    let decodedToken;
    try {
      decodedToken = verifyToken(token);
      logger.info('Token decodificado:', decodedToken);
    } catch (tokenError: any) {
      logger.error(`Error verificando token: ${tokenError.message}`);
      res.status(401).json({
        success: false,
        error: "Token inválido o expirado"
      });
      return;
    }

    // 4. Verificar la presencia de employeeID
    if (!decodedToken.employeeID) {
      logger.error(`Campo employeeID no encontrado en token. Campos disponibles: ${Object.keys(decodedToken)}`);
      res.status(400).json({
        success: false,
        error: "No se pudo obtener el CI del token",
        details: `El campo employeeID no está presente. Campos en token: ${Object.keys(decodedToken).join(', ')}`
      });
      return;
    }

    const ci = decodedToken.employeeID;
    const userTitle = decodedToken.title; // ✅ OBTENER EL TÍTULO DEL TOKEN
    
    logger.info(`Verificando estado dual para CI: ${ci}, Título: ${userTitle || 'No especificado'}`);

    // 5. Proceder con la verificación dual (ahora con título)
    const result = await dualVerificationServices.verifyDualStatus(ci, userTitle);

    // Función replacer para BigInt
    const replacer = (key: string, value: any) => {
        if (typeof value === 'bigint') {
            return value.toString();
        }
        return value;
    };

    res.status(200).json({
      success: true,
      isAlsoEmployee: result.isEmployee,
      userTitle: userTitle,
      usedSigenu: userTitle && userTitle.toLowerCase() === 'estudiante',
      isGraduated: result.isGraduated,
      studentStatus: result.studentStatus,
      hasDualOccupation: result.hasDualOccupation || false, // ✅ AGREGAR ESTA LÍNEA
      data: result
    });

  } catch (error: any) {
    logger.error(`Error al verificar estado dual: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
};