// src/controllers/student-account.controller.ts
import { Request, Response } from "express";
import { handleServiceResponse } from "../utils/handler.util";
import { SigenuService } from "../services/sigenu.services";
import { LDAPAccountService } from "../services/ldap-account.services";

export class StudentAccountController {
  static async createAccount(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { ci } = req.params;

      // 1. Obtener datos del estudiante
      const studentResponse = await SigenuService.getMainStudentData(ci);
      
      // 2. Validar respuesta
      if (!studentResponse.success) {
        res.status(404).json({
          success: false,
          error: "Estudiante no encontrado",
          code: "STUDENT_NOT_FOUND"
        });
        return;
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
      console.error("Error en creación de cuenta:", error);
      
      // Manejo de errores directamente en el controlador
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "INTERNAL_SERVER_ERROR"
      });
    }
  }
}