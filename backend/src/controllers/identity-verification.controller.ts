// src/controllers/identity.controller.ts
import { Request, Response } from 'express';
import logger from '../utils/logger';
import identityVerificationServices from '../services/identity-verification.services';

export const verifyCI = async (req: Request, res: Response): Promise<void> => {
    try {
        logger.info('Verificando identidad...');
        const { ci } = req.body;

        if (!ci) {
            logger.warn('El parámetro CI es requerido y no fue proporcionado.');
            res.status(400).json({
                success: false,
                error: "El parámetro CI es requerido"
            });
            return;
        }

        logger.info(`CI recibido: ${ci}`);

        const result = await identityVerificationServices.verifyCI(ci);

        logger.info('Identidad verificada con éxito.');
        res.status(200).json({
            success: true,
            data: result
        });

    } catch (error: any) {
        logger.error(`Error al verificar identidad: ${error.message}`);
        const statusCode = error.message.includes('No se encontró') ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            error: error.message || 'Error interno del servidor'
        });
    }
};
