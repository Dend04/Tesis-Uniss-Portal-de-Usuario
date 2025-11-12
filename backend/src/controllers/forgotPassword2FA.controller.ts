import { Request, Response } from "express";
import { forgotPassword2FAService } from "../services/forgotPassword2FA.services";
import { passwordService } from "../services/password.services"; // ✅ IMPORTAR SERVICIO DE CONTRASEÑAS

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
    try {
      const { identifier } = req.body;

      console.log("🔐 Verificando usuario para recuperación 2FA:", identifier);

      if (!identifier) {
        res.status(400).json({
          success: false,
          error: "Identificador es requerido",
        });
        return;
      }

      // ✅ NO ESPECIFICAR EL TIPO O USAR 'any' TEMPORALMENTE
      const result = await forgotPassword2FAService.checkUser(identifier);

      // ✅ VERIFICACIÓN SEGURA CON TYPE GUARDS
      if (!result.success || !result.user) {
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

      res.json({
        success: true,
        userData: response.user
      });
    } catch (error) {
      console.error("❌ Error en checkUser controller:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  }

  async verifyCode(req: Request, res: Response): Promise<void> {
    try {
      const { identifier, code } = req.body;

      console.log("🔢 Verificando código para:", identifier);

      if (!identifier || !code) {
        res.status(400).json({
          success: false,
          error: "Identificador y código son requeridos",
        });
        return;
      }

      const result = await forgotPassword2FAService.verifyCode(identifier, code);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error("❌ Error en verifyCode controller:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  }

  /**
   * ✅ RESET PASSWORD PARA FLUJO 2FA - BASADO EN TU CÓDIGO DE PIN
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { userIdentifier, newPassword } = req.body;

      console.log('🔐 [2FA] Iniciando resetPassword:', { 
        userIdentifier, 
        passwordLength: newPassword?.length 
      });

      // Validaciones básicas
      if (!userIdentifier || !newPassword) {
        res.status(400).json({
          success: false,
          error: "Identificador de usuario y nueva contraseña son requeridos"
        });
        return;
      }

      // Validaciones de contraseña (igual que en el frontend)
      if (newPassword.length < 8) {
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
        res.status(404).json({
          success: false,
          error: userResult.error || "Usuario no encontrado"
        });
        return;
      }

      const userDN = userResult.user.dn;
      
      console.log('✅ [2FA] Usuario encontrado, DN:', userDN);
      
      // ✅ USAR EL SERVICIO DE CONTRASEÑAS PARA RESTABLECER
      await passwordService.resetPassword(userDN, newPassword);

      console.log('✅ [2FA] Contraseña restablecida exitosamente');
      
      res.json({
        success: true,
        message: "Contraseña restablecida exitosamente"
      });

    } catch (error: any) {
      console.error("❌ [2FA] Error en resetPassword controller:", error);
      
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
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage
      });
    }
  }
}

export const forgotPassword2FAController = new ForgotPassword2FAController();