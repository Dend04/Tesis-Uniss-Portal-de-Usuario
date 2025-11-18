// src/controllers/forgotPassword2FA.controller.ts
import { Request, Response } from "express";
import { forgotPassword2FAService } from "../services/forgotPassword2FA.services";
import { passwordService } from "../services/password.services";
import { databaseLogService, LogData } from "../services/database-log.services";

// ✅ INTERFAZ LOCAL ESPECÍFICA PARA EL CONTROLADOR
interface ControllerCheckUserResult {
  success: boolean;
  error?: string;
  user?: {
    email: string;
    displayName: string;
    sAMAccountName: string;
    employeeID: string;
    dn: string;
    has2FA: boolean;
    userPrincipalName?: string;
    accountStatus?: string;
  };
}

export class ForgotPassword2FAController {
  async checkUser(req: Request, res: Response): Promise<void> {
    // ✅ LOG DATA CONSISTENTE
    const logData: LogData = {
      accion: 'FORGOT_PASSWORD_2FA_CHECK_USER',
      username: req.body.identifier || 'unknown',
      exitoso: false,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      dispositivo: 'web'
    };

    try {
      const { identifier } = req.body;

      console.log("🔐 Verificando usuario para recuperación 2FA:", identifier);

      if (!identifier) {
        logData.detalles = 'Falta identificador';
        await databaseLogService.guardarLog(logData);
        
        res.status(400).json({
          success: false,
          error: "Identificador es requerido",
        });
        return;
      }

      logData.username = identifier;

      // ✅ NO ESPECIFICAR EL TIPO O USAR 'any' TEMPORALMENTE
      const result = await forgotPassword2FAService.checkUser(identifier);

      // ✅ VERIFICACIÓN SEGURA CON TYPE GUARDS
      if (!result.success || !result.user) {
        logData.detalles = `Usuario no encontrado: ${result.error}`;
        await databaseLogService.guardarLog(logData);
        
        res.status(404).json({
          success: false,
          error: result.error || "Usuario no encontrado",
        });
        return;
      }

      // ✅ ASEGURAR QUE LOS CAMPOS REQUERIDOS EXISTAN
      const userData = {
        email: result.user.email || '',
        displayName: result.user.displayName || '',
        sAMAccountName: result.user.sAMAccountName || '',
        employeeID: result.user.employeeID || '',
        dn: result.user.dn,
        has2FA: result.user.has2FA,
        userPrincipalName: result.user.userPrincipalName || '',
        accountStatus: result.user.accountStatus || 'unknown'
      };

      // ✅ CREAR RESPUESTA CON TIPO SEGURO
      const response: ControllerCheckUserResult = {
        success: true,
        user: userData
      };

      // ✅ LOG EXITOSO
      logData.exitoso = true;
      logData.detalles = `Usuario verificado para recuperación - 2FA: ${result.user.has2FA ? 'activado' : 'desactivado'}`;
      await databaseLogService.guardarLog(logData);

      res.json({
        success: true,
        userData: response.user
      });
    } catch (error: any) {
      console.error("❌ Error en checkUser controller:", error);
      
      // ✅ LOG DE ERROR
      logData.detalles = `Error: ${error.message}`;
      logData.error = error.message;
      await databaseLogService.guardarLog(logData);
      
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  }

  async verifyCode(req: Request, res: Response): Promise<void> {
    // ✅ LOG DATA CONSISTENTE
    const logData: LogData = {
      accion: 'FORGOT_PASSWORD_2FA_VERIFY_CODE',
      username: req.body.identifier || 'unknown',
      exitoso: false,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      dispositivo: 'web'
    };

    try {
      const { identifier, code } = req.body;

      console.log("🔢 Verificando código para:", identifier);

      if (!identifier || !code) {
        logData.detalles = 'Faltan identificador o código';
        await databaseLogService.guardarLog(logData);
        
        res.status(400).json({
          success: false,
          error: "Identificador y código son requeridos",
        });
        return;
      }

      logData.username = identifier;

      const result = await forgotPassword2FAService.verifyCode(identifier, code);

      if (result.success) {
        // ✅ LOG EXITOSO
        logData.exitoso = true;
        logData.detalles = 'Código 2FA verificado exitosamente';
        await databaseLogService.guardarLog(logData);
        
        res.json({
          success: true,
          message: result.message,
        });
      } else {
        // ✅ LOG DE FALLO EN VERIFICACIÓN
        logData.detalles = `Código 2FA inválido: ${result.error}`;
        await databaseLogService.guardarLog(logData);
        
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error: any) {
      console.error("❌ Error en verifyCode controller:", error);
      
      // ✅ LOG DE ERROR
      logData.detalles = `Error: ${error.message}`;
      logData.error = error.message;
      await databaseLogService.guardarLog(logData);
      
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  }

  /**
   * ✅ RESET PASSWORD PARA FLUJO 2FA - CON LOGS COMPLETOS
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    // ✅ LOG DATA CONSISTENTE
    const logData: LogData = {
      accion: 'PASSWORD_RESET_2FA',
      username: req.body.userIdentifier || 'unknown',
      exitoso: false,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      dispositivo: 'web'
    };

    try {
      const { userIdentifier, newPassword } = req.body;

      console.log('🔐 [2FA] Iniciando resetPassword:', { 
        userIdentifier, 
        passwordLength: newPassword?.length 
      });

      // Validaciones básicas
      if (!userIdentifier || !newPassword) {
        logData.detalles = 'Faltan userIdentifier o newPassword';
        await databaseLogService.guardarLog(logData);
        
        res.status(400).json({
          success: false,
          error: "Identificador de usuario y nueva contraseña son requeridos"
        });
        return;
      }

      logData.username = userIdentifier;

      // Validaciones de contraseña (igual que en el frontend)
      if (newPassword.length < 8) {
        logData.detalles = 'La contraseña debe tener al menos 8 caracteres';
        await databaseLogService.guardarLog(logData);
        
        res.status(400).json({
          success: false,
          error: "La contraseña debe tener al menos 8 caracteres"
        });
        return;
      }

      // Validar complejidad básica
      const hasUpperCase = /[A-Z]/.test(newPassword);
      const hasLowerCase = /[a-z]/.test(newPassword);
      const hasNumbers = /\d/.test(newPassword);
      const hasSymbols = /[^A-Za-z0-9]/.test(newPassword);

      if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSymbols) {
        logData.detalles = 'La contraseña no cumple con los requisitos de complejidad';
        await databaseLogService.guardarLog(logData);
        
        res.status(400).json({
          success: false,
          error: "La contraseña debe contener al menos una letra mayúscula, una minúscula, un número y un carácter especial"
        });
        return;
      }

      console.log('🔄 [2FA] Restableciendo contraseña para:', userIdentifier);
      
      // ✅ PRIMERO BUSCAR EL USUARIO PARA OBTENER EL DN
      const userResult = await forgotPassword2FAService.checkUser(userIdentifier);
      
      if (!userResult.success || !userResult.user) {
        logData.detalles = `Usuario no encontrado: ${userResult.error}`;
        await databaseLogService.guardarLog(logData);
        
        res.status(404).json({
          success: false,
          error: userResult.error || "Usuario no encontrado"
        });
        return;
      }

      const userDN = userResult.user.dn;
      const username = userResult.user.sAMAccountName || userIdentifier;
      
      console.log('✅ [2FA] Usuario encontrado, DN:', userDN);
      
      // ✅ USAR EL SERVICIO DE CONTRASEÑAS PARA RESTABLECER
      await passwordService.resetPassword(userDN, newPassword);

      console.log('✅ [2FA] Contraseña restablecida exitosamente');

      // ✅ LOG EXITOSO
      logData.exitoso = true;
      logData.detalles = 'Recuperación de contraseña exitosa mediante autenticación de dos factores';
      await databaseLogService.guardarLog(logData);
      
      res.json({
        success: true,
        message: "Contraseña restablecida exitosamente"
      });

    } catch (error: any) {
      console.error("❌ [2FA] Error en resetPassword controller:", error);

      // ✅ LOG DE ERROR
      logData.detalles = `Error: ${error.message}`;
      logData.error = error.message;
      await databaseLogService.guardarLog(logData);
      
      // ✅ MANEJAR DIFERENTES TIPOS DE ERRORES
      let errorMessage = "Error interno del servidor al restablecer la contraseña";
      let statusCode = 500;

      if (error.message?.includes("LDAP")) {
        errorMessage = "Error de conexión con el directorio. Por favor, intente nuevamente.";
        statusCode = 503;
      } else if (error.message?.includes("contraseña")) {
        errorMessage = error.message;
        statusCode = 400;
      } else if (error.message?.includes("política")) {
        errorMessage = error.message;
        statusCode = 400;
      } else if (error.message?.includes("history") || error.message?.includes("historial")) {
        errorMessage = "La contraseña ya ha sido utilizada anteriormente";
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage
      });
    }
  }

  /**
   * ✅ VERIFICAR ESTADO DE RECUPERACIÓN - CON LOGS
   */
  async getRecoveryStatus(req: Request, res: Response): Promise<void> {
    const logData: LogData = {
      accion: 'GET_RECOVERY_STATUS',
      username: req.params.identifier || 'unknown',
      exitoso: false,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      dispositivo: 'web'
    };

    try {
      const { identifier } = req.params;

      if (!identifier) {
        logData.detalles = 'Falta identificador';
        await databaseLogService.guardarLog(logData);
        
        res.status(400).json({
          success: false,
          error: "Identificador es requerido"
        });
        return;
      }

      logData.username = identifier;

      const result = await forgotPassword2FAService.checkUser(identifier);

      if (!result.success) {
        logData.detalles = `Usuario no encontrado: ${result.error}`;
        await databaseLogService.guardarLog(logData);
        
        res.status(404).json({
          success: false,
          error: result.error
        });
        return;
      }

      // ✅ LOG EXITOSO
      logData.exitoso = true;
      logData.detalles = `Estado de recuperación obtenido - 2FA: ${result.user?.has2FA ? 'activado' : 'desactivado'}`;
      await databaseLogService.guardarLog(logData);

      res.json({
        success: true,
        userExists: true,
        has2FA: result.user?.has2FA || false,
        canRecover: true
      });

    } catch (error: any) {
      console.error("❌ Error en getRecoveryStatus:", error);
      
      // ✅ LOG DE ERROR
      logData.detalles = `Error: ${error.message}`;
      logData.error = error.message;
      await databaseLogService.guardarLog(logData);
      
      res.status(500).json({
        success: false,
        error: "Error al verificar estado de recuperación"
      });
    }
  }

  /**
   * ✅ OBTENER ESTADÍSTICAS DE RECUPERACIÓN - CON LOGS
   */
  async getRecoveryStats(req: Request, res: Response): Promise<void> {
    const logData: LogData = {
      accion: 'GET_RECOVERY_STATS',
      username: 'system',
      exitoso: false,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      dispositivo: 'web'
    };

    try {
      // Aquí podrías agregar lógica para obtener estadísticas
      // Por ahora retornamos un objeto básico
      const stats = {
        totalRecoveryAttempts: 0,
        successfulRecoveries: 0,
        failedRecoveries: 0,
        averageRecoveryTime: 0
      };

      // ✅ LOG EXITOSO
      logData.exitoso = true;
      logData.detalles = 'Estadísticas de recuperación obtenidas';
      await databaseLogService.guardarLog(logData);

      res.json({
        success: true,
        data: stats
      });

    } catch (error: any) {
      console.error("❌ Error en getRecoveryStats:", error);
      
      // ✅ LOG DE ERROR
      logData.detalles = `Error: ${error.message}`;
      logData.error = error.message;
      await databaseLogService.guardarLog(logData);
      
      res.status(500).json({
        success: false,
        error: "Error al obtener estadísticas de recuperación"
      });
    }
  }
}

export const forgotPassword2FAController = new ForgotPassword2FAController();