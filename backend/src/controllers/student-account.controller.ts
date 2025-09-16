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
      const { password, email, userData } = req.body; // Obtener email y userData del cuerpo

      // Validar que se proporcionó una contraseña
      if (!password) {
        res.status(400).json({
          success: false,
          error: "La contraseña es requerida",
          code: "PASSWORD_REQUIRED"
        });
        return;
      }

      // Validar que se proporcionó un email
      if (!email) {
        res.status(400).json({
          success: false,
          error: "El email es requerido",
          code: "EMAIL_REQUIRED"
        });
        return;
      }

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

      // 3. Crear cuenta LDAP con la contraseña y email proporcionados por el usuario
      const ldapService = new LDAPAccountService();
      const result = await ldapService.createStudentAccount({
        ...studentResponse.data,
        backupEmail: email // Usar el email proporcionado por el usuario
      }, password); // Pasar la contraseña al servicio

      // 4. Enviar respuesta unificada
      handleServiceResponse(res, {
        ...result,
        message: result.success ? "Cuenta creada exitosamente" : result.message
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