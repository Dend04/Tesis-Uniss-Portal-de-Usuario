import { Request, Response } from "express";
import { ForgotPassword2FAService } from "../services/forgotPassword2FA.services";

const service = new ForgotPassword2FAService();

interface CheckUserResult {
  success: boolean;
  error?: string;
  user?: {
    email: string;
    displayName: string;
    sAMAccountName: string;
    employeeID: string;
    dn: string;
    has2FA: boolean;
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

      const result: CheckUserResult = await service.checkUser(identifier);

      // ✅ VERIFICACIÓN SEGURA DE result.user
      if (!result.success || !result.user) {
        res.status(404).json({
          success: false,
          error: result.error || "Usuario no encontrado",
        });
        return;
      }

      // ✅ ESTRUCTURA COMPATIBLE CON FRONTEND
      res.json({
        success: true,
        userData: {
          email: result.user.email,
          displayName: result.user.displayName,
          sAMAccountName: result.user.sAMAccountName,
          employeeID: result.user.employeeID,
          dn: result.user.dn,
          has2FA: result.user.has2FA,
        },
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

      const result = await service.verifyCode(identifier, code);

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
}
