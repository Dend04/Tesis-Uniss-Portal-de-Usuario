// src/controllers/student-account.controller.ts
import { Request, Response, NextFunction } from "express";

import { handleServiceResponse } from "../utils/handler.util";
import { SigenuService } from "../services/sigenu.services";
import { LDAPAccountService } from "../services/ldap-account.services";

export class StudentAccountController {
  static async createAccount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> { // 1. Especificar retorno void
    try {
      const { ci } = req.params;


      
      // 1. Obtener datos del estudiante
      const studentResponse = await SigenuService.getMainStudentData(ci);
      
      // 2. Validar respuesta
      if (!studentResponse.success) {
        handleServiceResponse(res, { // 2. Eliminar return
          success: false,
          error: "Estudiante no encontrado",
          code: "STUDENT_NOT_FOUND"
        });
        return; // 3. Agregar return explícito
      }
      

      // 3. Crear cuenta LDAP
      const ldapService = new LDAPAccountService();
      const result = await ldapService.createStudentAccount({
        ...studentResponse.data,
      });

      // 4. Enviar respuesta unificada
      handleServiceResponse(res, {
        ...result,
        message: result.success ? "Cuenta creada con contraseña por defecto" : result.message
      });

    } catch (error) {
      next(StudentAccountController.handleError(error));
    }
  }

  private static handleError(error: unknown): Error {
    console.error("Error en creación de cuenta:", error);
    return error instanceof Error 
      ? error 
      : new Error("Error desconocido al crear cuenta");
  }
}