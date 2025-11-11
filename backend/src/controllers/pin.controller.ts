import { Request, Response } from "express";
import { pinService } from "../services/pin.services";

export class PinController {
  /**
   * Guarda o actualiza el PIN del usuario
   */
  savePin = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('📌 Iniciando savePin controller');
      const { pin } = req.body;
      const sAMAccountName = (req as any).user?.sAMAccountName;

      console.log('🔍 Datos recibidos:', { 
        sAMAccountName, 
        pinLength: pin?.length,
        hasUser: !!(req as any).user 
      });

      if (!sAMAccountName) {
        res.status(401).json({
          success: false,
          error: "Usuario no autenticado",
        });
        return;
      }

      // Validaciones básicas
      if (!pin) {
        res.status(400).json({
          success: false,
          error: "PIN es requerido",
        });
        return;
      }

      if (pin.length !== 6 || !/^\d+$/.test(pin)) {
        res.status(400).json({
          success: false,
          error: "El PIN debe tener exactamente 6 dígitos numéricos",
        });
        return;
      }

      // ✅ CORREGIDO: Llamar directamente a la función privada
      const validationError = this.validatePinSecurity(pin);
      if (validationError) {
        res.status(400).json({
          success: false,
          error: validationError,
        });
        return;
      }

      console.log('🔐 Guardando PIN para:', sAMAccountName);
      const result = await pinService.saveUserPin(sAMAccountName, pin);

      if (result.success) {
        res.json({
          success: true,
          message: "PIN guardado exitosamente",
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Error en savePin controller:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  };

  /**
   * Elimina el PIN del usuario
   */
  removePin = async (req: Request, res: Response): Promise<void> => {
    try {
      const sAMAccountName = (req as any).user?.sAMAccountName;

      if (!sAMAccountName) {
        res.status(401).json({
          success: false,
          error: "Usuario no autenticado",
        });
        return;
      }

      const result = await pinService.removeUserPin(sAMAccountName);

      if (result.success) {
        res.json({
          success: true,
          message: "PIN eliminado exitosamente",
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Error en removePin controller:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  };

  /**
   * Verifica si el usuario tiene PIN configurado
   */
  checkPin = async (req: Request, res: Response): Promise<void> => {
    try {
      const sAMAccountName = (req as any).user?.sAMAccountName;

      if (!sAMAccountName) {
        res.status(401).json({
          success: false,
          error: "Usuario no autenticado",
        });
        return;
      }

      const result = await pinService.hasUserPin(sAMAccountName);

      res.json({
        success: true,
        hasPin: result.hasPin,
        error: result.error,
      });
    } catch (error) {
      console.error("Error en checkPin controller:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  };

  /**
   * Verifica el PIN para recuperación de contraseña (sin autenticación)
   * Ahora acepta sAMAccountName o employeeID
   */
  verifyPinForRecovery = async (req: Request, res: Response): Promise<void> => {
    try {
      const { identifier, pin } = req.body;

      if (!identifier || !pin) {
        res.status(400).json({
          success: false,
          error: "Identificador (usuario o carnet) y PIN son requeridos",
        });
        return;
      }

      if (pin.length !== 6 || !/^\d+$/.test(pin)) {
        res.status(400).json({
          success: false,
          error: "El PIN debe tener exactamente 6 dígitos numéricos",
        });
        return;
      }

      const result = await pinService.verifyUserPin(identifier, pin);

      if (result.success) {
        res.json({
          success: true,
          message: "PIN verificado correctamente",
          userDN: result.userDN,
          userData: result.userData,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Error en verifyPinForRecovery controller:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  };

  /**
   * Busca usuario por identificador (para mostrar info en recuperación)
   */
findUserForRecovery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier } = req.body;

    console.log('🔍 Iniciando findUserForRecovery:', { identifier });

    if (!identifier) {
      console.log('❌ Identificador faltante');
      res.status(400).json({
        success: false,
        error: "Identificador (usuario o carnet) es requerido",
      });
      return;
    }

    const result = await pinService.findUserByIdentifier(identifier);

    console.log('📊 Resultado de búsqueda:', { 
      success: result.success, 
      hasUserData: !!result.userData,
      error: result.error 
    });

    if (result.success) {
      res.json({
        success: true,
        userData: result.userData,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("❌ Error en findUserForRecovery controller:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
};

  /**
   * Valida la seguridad del PIN (las mismas reglas que en el frontend)
   */
  private validatePinSecurity = (pin: string): string | null => {
    // No puede ser el mismo dígito repetido
    if (/^(\d)\1{5}$/.test(pin)) {
      return "El PIN no puede ser el mismo dígito repetido 6 veces";
    }

    // No puede ser una secuencia consecutiva
    if (/012345|123456|234567|345678|456789|567890/.test(pin) ||
        /098765|987654|876543|765432|654321|543210/.test(pin)) {
      return "El PIN no puede ser una secuencia consecutiva";
    }

    // No puede ser un patrón repetitivo (ej: 121212)
    if (/^(\d{2})\1{2}$/.test(pin)) {
      return "El PIN no puede ser un patrón repetitivo";
    }

    return null;
  };

  /**
   * ✅ NUEVO: Verifica si un usuario tiene PIN configurado (para recuperación)
   * No requiere autenticación - se usa en flujo de recuperación
   */
  checkUserHasPin = async (req: Request, res: Response): Promise<void> => {
    try {
      const { identifier } = req.body;

      if (!identifier) {
        res.status(400).json({
          success: false,
          error: "Identificador (usuario o carnet) es requerido",
        });
        return;
      }

      console.log('🔍 Verificando estado PIN para:', identifier);

      // Buscar usuario primero
      const userResult = await pinService.findUserByIdentifier(identifier);
      if (!userResult.success || !userResult.userData) {
        res.status(400).json({
          success: false,
          error: userResult.error || "Usuario no encontrado",
        });
        return;
      }

      // Verificar si tiene PIN
      const pinResult = await pinService.hasUserPin(userResult.userData.sAMAccountName);
      
      res.json({
        success: true,
        hasPin: pinResult.hasPin,
        userData: userResult.userData,
        error: pinResult.error,
      });

    } catch (error) {
      console.error("Error en checkUserHasPin controller:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  };

  /**
 * Restablece la contraseña usando el flujo de PIN
 */
resetPasswordWithPIN = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userIdentifier, newPassword } = req.body;

      console.log('🔐 Iniciando resetPasswordWithPIN:', { 
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

      console.log('🔄 Restableciendo contraseña para:', userIdentifier);
      
      // ✅ USAR EL SERVICIO CORREGIDO
      const result = await pinService.resetPasswordWithPIN(userIdentifier, newPassword);

      if (result.success) {
        console.log('✅ Contraseña restablecida exitosamente');
        res.json({
          success: true,
          message: result.message || "Contraseña restablecida exitosamente"
        });
      } else {
        console.log('❌ Error al restablecer contraseña:', result.error);
        
        // ✅ Distinguir entre errores de validación y errores del servidor
        const statusCode = result.error?.includes("no encontrado") || 
                          result.error?.includes("seguridad") || 
                          result.error?.includes("caracteres") ||
                          result.error?.includes("complejidad") ||
                          result.error?.includes("política") ? 400 : 500;
        
        res.status(statusCode).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error("❌ Error en resetPasswordWithPIN controller:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor al restablecer la contraseña"
      });
    }
  };
}


export const pinController = new PinController();