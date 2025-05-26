import { Request, Response, NextFunction } from "express";
import { handleServiceResponse } from "../utils/handler.util";
import { LDAPAccountRemovalService } from "../services/ldap-account-removal.services";


export class AccountRemovalController {
  static async deleteAccount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { identifier } = req.params;
      
      if (!identifier) {
        handleServiceResponse(res, {
          success: false,
          error: "Se requiere un identificador (nombre de usuario, email o ID)",
          code: "MISSING_IDENTIFIER"
        });
        return;
      }

      const removalService = new LDAPAccountRemovalService();
      const result = await removalService.removeAccount(identifier);

      handleServiceResponse(res, {
        success: result,
        message: result 
          ? "Cuenta eliminada exitosamente" 
          : "No se pudo eliminar la cuenta"
      });
      
    } catch (error) {
      next(AccountRemovalController.handleError(error));
    }
  }

  private static handleError(error: unknown): Error {
    console.error("Error en eliminación de cuenta:", error);
    return error instanceof Error 
      ? error 
      : new Error("Error desconocido al eliminar cuenta");
  }
}