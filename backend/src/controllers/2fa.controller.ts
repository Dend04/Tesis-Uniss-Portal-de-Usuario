import { Request, Response } from 'express';
import { ldap2FAService } from '../services/ldap-2fa.services';
import { ForgotPassword2FAService } from '../services/forgotPassword2FA.services';

// ✅ CREAR INSTANCIA DEL SERVICIO
const forgotPassword2FAService = new ForgotPassword2FAService();

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

/**
 * ✅ CONTROLADOR CORREGIDO PARA VERIFICAR USUARIO EN RECUPERACIÓN CON 2FA
 * Compatible con el componente frontend UserIdentifierForm
 */
export const check2FAUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier } = req.body;

    console.log('🔐 Verificando usuario para recuperación 2FA:', identifier);

    if (!identifier) {
      res.status(400).json({
        success: false,
        error: 'Se requiere un identificador (usuario o carnet)'
      });
      return;
    }

    // ✅ CORREGIDO: Usar la instancia en lugar de la clase
    const result = await forgotPassword2FAService.checkUser(identifier);

    console.log('📊 Resultado de checkUser:', result);

    if (!result.success || !result.user) {
      res.status(404).json({
        success: false,
        error: result.error || 'Usuario no encontrado'
      });
      return;
    }

    // ✅ ESTRUCTURA COMPATIBLE CON EL FRONTEND - INCLUIR TODOS LOS CAMPOS NECESARIOS
    const response = {
      success: true,
      userData: {
        email: result.user.email,
        displayName: result.user.displayName,
        sAMAccountName: result.user.sAMAccountName,
        employeeID: result.user.employeeID || result.user.sAMAccountName,
        dn: result.user.dn,
        has2FA: result.user.has2FA,
        // ✅ INCLUIR LOS CAMPOS ESPECÍFICOS PARA 2FA
        employeeNumber: result.user.employeeNumber,
        userParameters: result.user.userParameters
      }
    };

    console.log('✅ Respuesta 2FA completa para frontend:', response);

    res.json(response);

  } catch (error) {
    console.error('❌ Error en check2FAUserStatus:', error);
    res.status(500).json({
      success: false,
      error: 'Error del servidor al verificar usuario'
    });
  }
};

/**
 * ✅ VALIDAR CÓDIGO 2FA DURANTE RECUPERACIÓN
 */
export const verify2FACodeRecovery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, code } = req.body;

    console.log('🔢 Verificando código 2FA para:', identifier);

    if (!identifier || !code) {
      res.status(400).json({
        success: false,
        error: 'Identificador y código son requeridos'
      });
      return;
    }

    // ✅ CORREGIDO: Usar la instancia en lugar de la clase
    const result = await forgotPassword2FAService.verifyCode(identifier, code);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error
      });
      return;
    }

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('❌ Error en verify2FACodeRecovery:', error);
    res.status(500).json({
      success: false,
      error: 'Error del servidor al verificar código'
    });
  }
};