import { Request, Response } from 'express';
import { ldap2FAService } from '../services/ldap-2fa.services';
import { ForgotPassword2FAService } from '../services/forgotPassword2FA.services';
import { databaseLogService, LogData } from '../services/database-log.services';

// ✅ CREAR INSTANCIA DEL SERVICIO
const forgotPassword2FAService = new ForgotPassword2FAService();

/**
 * ✅ ACTIVAR 2FA - CON LOGS COMPLETOS
 */
export const activate2FAController = async (req: Request, res: Response): Promise<void> => {
  const logData: LogData = {
    accion: 'ACTIVATE_2FA',
    username: req.body.sAMAccountName || 'unknown',
    exitoso: false,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    dispositivo: 'web'
  };

  try {
    const { sAMAccountName, secret } = req.body;

    console.log('🔐 Activando 2FA para:', sAMAccountName);

    if (!sAMAccountName || !secret) {
      logData.detalles = 'Faltan sAMAccountName o secret';
      await databaseLogService.guardarLog(logData);
      
      res.status(400).json({ 
        success: false,
        error: 'sAMAccountName and secret are required' 
      });
      return;
    }

    logData.username = sAMAccountName;

    await ldap2FAService.activateTwoFactorAuth(sAMAccountName, secret);
    
    // ✅ LOG EXITOSO
    logData.exitoso = true;
    logData.detalles = '2FA activado exitosamente';
    await databaseLogService.guardarLog(logData);
    
    res.json({ 
      success: true, 
      message: '2FA activated successfully'
    });

  } catch (error: any) {
    console.error('❌ Error activando 2FA:', error);
    
    // ✅ LOG DE ERROR
    logData.detalles = `Error: ${error.message}`;
    logData.error = error.message;
    await databaseLogService.guardarLog(logData);
    
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
 * ✅ OBTENER ESTADO 2FA - CON LOGS
 */
export const get2FAStatusController = async (req: Request, res: Response): Promise<void> => {
  const logData: LogData = {
    accion: 'GET_2FA_STATUS',
    username: req.params.sAMAccountName || 'unknown',
    exitoso: false,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    dispositivo: 'web'
  };

  try {
    const { sAMAccountName } = req.params;

    if (!sAMAccountName) {
      logData.detalles = 'Falta sAMAccountName parameter';
      await databaseLogService.guardarLog(logData);
      
      res.status(400).json({ 
        success: false,
        error: 'sAMAccountName parameter is required' 
      });
      return;
    }

    logData.username = sAMAccountName;

    const status = await ldap2FAService.getTwoFactorAuthStatus(sAMAccountName);

    // ✅ LOG EXITOSO
    logData.exitoso = true;
    logData.detalles = `Estado 2FA obtenido: ${status.enabled ? 'activado' : 'desactivado'}`;
    await databaseLogService.guardarLog(logData);

    res.json({ 
      success: true,
      enabled: status.enabled,
      hasSecret: !!status.secret,
      sAMAccountName: sAMAccountName
    });

  } catch (error: any) {
    console.error('❌ Error verificando estado 2FA:', error);
    
    // ✅ LOG DE ERROR
    logData.detalles = `Error: ${error.message}`;
    logData.error = error.message;
    await databaseLogService.guardarLog(logData);
    
    res.status(500).json({ 
      success: false,
      error: 'Error checking 2FA status'
    });
  }
};

/**
 * ✅ DESACTIVAR 2FA - CON LOGS
 */
export const deactivate2FAController = async (req: Request, res: Response): Promise<void> => {
  const logData: LogData = {
    accion: 'DEACTIVATE_2FA',
    username: req.body.sAMAccountName || 'unknown',
    exitoso: false,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    dispositivo: 'web'
  };

  try {
    const { sAMAccountName } = req.body;

    console.log('🔍 Desactivando 2FA para:', sAMAccountName);

    if (!sAMAccountName) {
      logData.detalles = 'Falta sAMAccountName';
      await databaseLogService.guardarLog(logData);
      
      res.status(400).json({ 
        success: false,
        error: 'sAMAccountName is required' 
      });
      return;
    }

    logData.username = sAMAccountName;

    await ldap2FAService.disableTwoFactorAuth(sAMAccountName);
    
    // ✅ LOG EXITOSO
    logData.exitoso = true;
    logData.detalles = '2FA desactivado exitosamente';
    await databaseLogService.guardarLog(logData);
    
    res.json({ 
      success: true, 
      message: '2FA desactivado exitosamente'
    });
  } catch (error: any) {
    console.error('❌ Error desactivando 2FA:', error);
    
    // ✅ LOG DE ERROR
    logData.detalles = `Error: ${error.message}`;
    logData.error = error.message;
    await databaseLogService.guardarLog(logData);
    
    res.status(500).json({ 
      success: false,
      error: 'Error desactivando 2FA'
    });
  }
};

/**
 * ✅ VERIFICAR USUARIO 2FA - CON LOGS COMPLETOS
 */
export const check2FAUserStatus = async (req: Request, res: Response): Promise<void> => {
  const logData: LogData = {
    accion: 'CHECK_2FA_USER_STATUS',
    username: req.body.identifier || 'unknown',
    exitoso: false,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    dispositivo: 'web'
  };

  try {
    const { identifier } = req.body;

    console.log('🔐 Verificando usuario para recuperación 2FA:', identifier);

    if (!identifier) {
      logData.detalles = 'Falta identificador';
      await databaseLogService.guardarLog(logData);
      
      res.status(400).json({
        success: false,
        error: 'Se requiere un identificador (usuario o carnet)'
      });
      return;
    }

    logData.username = identifier;

    // ✅ CORREGIDO: Usar la instancia en lugar de la clase
    const result = await forgotPassword2FAService.checkUser(identifier);

    console.log('📊 Resultado de checkUser:', result);

    if (!result.success || !result.user) {
      logData.detalles = `Usuario no encontrado: ${result.error}`;
      await databaseLogService.guardarLog(logData);
      
      res.status(404).json({
        success: false,
        error: result.error || 'Usuario no encontrado'
      });
      return;
    }

    // ✅ ESTRUCTURA COMPATIBLE CON EL FRONTEND
    const response = {
      success: true,
      userData: {
        email: result.user.email,
        displayName: result.user.displayName,
        sAMAccountName: result.user.sAMAccountName,
        employeeID: result.user.employeeID || result.user.sAMAccountName,
        dn: result.user.dn,
        has2FA: result.user.has2FA,
        employeeNumber: result.user.employeeNumber,
        userParameters: result.user.userParameters
      }
    };

    // ✅ LOG EXITOSO
    logData.exitoso = true;
    logData.detalles = `Usuario verificado exitosamente - 2FA: ${result.user.has2FA ? 'activado' : 'desactivado'}`;
    await databaseLogService.guardarLog(logData);

    console.log('✅ Respuesta 2FA completa para frontend:', response);

    res.json(response);

  } catch (error: any) {
    console.error('❌ Error en check2FAUserStatus:', error);
    
    // ✅ LOG DE ERROR
    logData.detalles = `Error: ${error.message}`;
    logData.error = error.message;
    await databaseLogService.guardarLog(logData);
    
    res.status(500).json({
      success: false,
      error: 'Error del servidor al verificar usuario'
    });
  }
};

/**
 * ✅ VALIDAR CÓDIGO 2FA DURANTE RECUPERACIÓN - CON LOGS
 */
export const verify2FACodeRecovery = async (req: Request, res: Response): Promise<void> => {
  const logData: LogData = {
    accion: 'VERIFY_2FA_CODE_RECOVERY',
    username: req.body.identifier || 'unknown',
    exitoso: false,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    dispositivo: 'web'
  };

  try {
    const { identifier, code } = req.body;

    console.log('🔢 Verificando código 2FA para:', identifier);

    if (!identifier || !code) {
      logData.detalles = 'Faltan identificador o código';
      await databaseLogService.guardarLog(logData);
      
      res.status(400).json({
        success: false,
        error: 'Identificador y código son requeridos'
      });
      return;
    }

    logData.username = identifier;

    // ✅ CORREGIDO: Usar la instancia en lugar de la clase
    const result = await forgotPassword2FAService.verifyCode(identifier, code);

    if (!result.success) {
      logData.detalles = `Código 2FA inválido: ${result.error}`;
      await databaseLogService.guardarLog(logData);
      
      res.status(400).json({
        success: false,
        error: result.error
      });
      return;
    }

    // ✅ LOG EXITOSO
    logData.exitoso = true;
    logData.detalles = 'Código 2FA verificado exitosamente';
    await databaseLogService.guardarLog(logData);

    res.json({
      success: true,
      message: result.message
    });

  } catch (error: any) {
    console.error('❌ Error en verify2FACodeRecovery:', error);
    
    // ✅ LOG DE ERROR
    logData.detalles = `Error: ${error.message}`;
    logData.error = error.message;
    await databaseLogService.guardarLog(logData);
    
    res.status(500).json({
      success: false,
      error: 'Error del servidor al verificar código'
    });
  }
};