import { Request, Response } from "express";
import { pinService } from "../services/pin.services";

export class PinController {
  /**
   * Guarda o actualiza el PIN del usuario
   */
  async savePin(req: Request, res: Response): Promise<void> {
    try {
      const { pin } = req.body;
      const sAMAccountName = (req as any).user?.sAMAccountName; // Del token de autenticación

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

      // Validaciones de seguridad del PIN
      const validationError = this.validatePinSecurity(pin);
      if (validationError) {
        res.status(400).json({
          success: false,
          error: validationError,
        });
        return;
      }

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
  }

  /**
   * Elimina el PIN del usuario
   */
  async removePin(req: Request, res: Response): Promise<void> {
    try {
      const sAMAccountName = (req as any).user?.sAMAccountName; // Del token de autenticación

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
  }

  /**
   * Verifica si el usuario tiene PIN configurado
   */
  async checkPin(req: Request, res: Response): Promise<void> {
    try {
      const sAMAccountName = (req as any).user?.sAMAccountName; // Del token de autenticación

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
  }

  /**
   * Verifica el PIN para recuperación de contraseña (sin autenticación)
   * Ahora acepta sAMAccountName o employeeID
   */
  async verifyPinForRecovery(req: Request, res: Response): Promise<void> {
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
          userDN: result.userDN, // Para uso en recuperación de contraseña
          userData: result.userData, // Datos del usuario para mostrar en frontend
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
  }

  /**
   * Busca usuario por identificador (para mostrar info en recuperación)
   */
  async findUserForRecovery(req: Request, res: Response): Promise<void> {
    try {
      const { identifier } = req.body;

      if (!identifier) {
        res.status(400).json({
          success: false,
          error: "Identificador (usuario o carnet) es requerido",
        });
        return;
      }

      const result = await pinService.findUserByIdentifier(identifier);

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
      console.error("Error en findUserForRecovery controller:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  }

  /**
   * Valida la seguridad del PIN (las mismas reglas que en el frontend)
   */
  private validatePinSecurity(pin: string): string | null {
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
  }
}

export const pinController = new PinController();