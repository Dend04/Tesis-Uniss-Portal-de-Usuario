// src/controllers/dual-verification.controller.ts
import { Request, Response } from 'express';
import logger from '../utils/logger';
import dualVerificationServices from '../services/dual-verification.services';


export const verifyDualStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        // Extraer el CI del token (asumiendo que el middleware de autenticación ya adjuntó los datos del usuario)
        const user = (req as any).user; // Ajusta según cómo esté estructurado tu middleware
        
        if (!user || !user.employeeID) {
            res.status(400).json({
                success: false,
                error: "No se pudo obtener el CI del token"
            });
            return;
        }

        const ci = user.employeeID;
        logger.info(`Verificando estado dual para CI: ${ci} (extraído del token)`);

        const result = await dualVerificationServices.verifyDualStatus(ci);

        res.status(200).json({
            success: true,
            isAlsoEmployee: result.isEmployee,
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