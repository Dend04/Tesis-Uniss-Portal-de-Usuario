import { Request, Response } from 'express';
import { totpVerificationService } from '../services/totp-verification.services';

/**
 * ✅ VERIFICAR CÓDIGO TOTP - ENDPOINT SIMPLIFICADO
 */
export const verifyTOTPCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, code } = req.body;

    console.log('🔐 Verificando código TOTP para:', identifier);

    if (!identifier || !code) {
      res.status(400).json({
        success: false,
        error: 'Identificador y código son requeridos'
      });
      return;
    }

    const result = await totpVerificationService.verifyTOTPCode(identifier, code);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error
      });
      return;
    }

    res.json({
      success: true,
      message: result.message,
      user: result.user
    });

  } catch (error) {
    console.error('❌ Error en verifyTOTPCode:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al verificar código'
    });
  }
};

/**
 * ✅ OBTENER INFORMACIÓN TOTP DEL USUARIO
 */
export const getTOTPUserInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier } = req.body;

    console.log('🔍 Obteniendo información TOTP para:', identifier);

    if (!identifier) {
      res.status(400).json({
        success: false,
        error: 'Identificador es requerido'
      });
      return;
    }

    const result = await totpVerificationService.getUserTOTPInfo(identifier);

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: result.error
      });
      return;
    }

    res.json({
      success: true,
      userData: result.user
    });

  } catch (error) {
    console.error('❌ Error en getTOTPUserInfo:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener información del usuario'
    });
  }
};