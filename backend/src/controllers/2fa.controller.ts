// controllers/2fa.controller.ts
import { Request, Response } from 'express';
import { ldap2FAService } from '../services/ldap-2fa.services';

/**
 * ✅ ACTIVAR 2FA - SIMPLIFICADO
 */
export const activate2FAController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sAMAccountName, secret } = req.body;

    console.log('🔐 Activando 2FA para:', sAMAccountName);

    if (!sAMAccountName || !secret) {
      res.status(400).json({ 
        success: false,
        error: 'sAMAccountName and secret are required' 
      });
      return;
    }

    await ldap2FAService.activateTwoFactorAuth(sAMAccountName, secret);
    
    res.json({ 
      success: true, 
      message: '2FA activated successfully'
    });

  } catch (error) {
    console.error('❌ Error activando 2FA:', error);
    
    let errorMessage = 'Error activating 2FA';
    if (error instanceof Error) {
      if (error.message.includes('Formato de secreto TOTP inválido')) {
        errorMessage = error.message;
      } else if (error.message.includes('Usuario no encontrado')) {
        errorMessage = 'Usuario no encontrado en el directorio';
      }
    }

    res.status(500).json({ 
      success: false,
      error: errorMessage
    });
  }
};

/**
 * ✅ OBTENER ESTADO 2FA
 */
export const get2FAStatusController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sAMAccountName } = req.params;

    if (!sAMAccountName) {
      res.status(400).json({ 
        success: false,
        error: 'sAMAccountName parameter is required' 
      });
      return;
    }

    const status = await ldap2FAService.getTwoFactorAuthStatus(sAMAccountName);

    res.json({ 
      success: true,
      enabled: status.enabled,
      hasSecret: !!status.secret,
      sAMAccountName: sAMAccountName
    });

  } catch (error) {
    console.error('❌ Error verificando estado 2FA:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error checking 2FA status'
    });
  }
};

/**
 * ✅ DESACTIVAR 2FA
 */
export const deactivate2FAController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sAMAccountName } = req.body;

    console.log('🔍 Desactivando 2FA para:', sAMAccountName);

    if (!sAMAccountName) {
      res.status(400).json({ 
        success: false,
        error: 'sAMAccountName is required' 
      });
      return;
    }

    await ldap2FAService.disableTwoFactorAuth(sAMAccountName);
    
    res.json({ 
      success: true, 
      message: '2FA desactivado exitosamente'
    });
  } catch (error) {
    console.error('Error desactivando 2FA:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error desactivando 2FA'
    });
  }
};