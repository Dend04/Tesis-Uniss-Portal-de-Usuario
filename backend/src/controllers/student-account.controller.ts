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
      const { password, email, username } = req.body; // Cambiar userData por username

      console.log("📥 Datos recibidos para crear cuenta:", { 
        ci, 
        email, 
        username,
        hasPassword: !!password 
      });

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

      // Validar que se proporcionó un username
      if (!username) {
        res.status(400).json({
          success: false,
          error: "El nombre de usuario es requerido",
          code: "USERNAME_REQUIRED"
        });
        return;
      }

      // 1. Obtener datos del estudiante
      console.log("🔍 Obteniendo datos del estudiante con CI:", ci);
      const studentResponse = await SigenuService.getMainStudentData(ci);
      
      // 2. Validar respuesta
      if (!studentResponse.success) {
        console.error("❌ Estudiante no encontrado en SIGENU:", ci);
        res.status(404).json({
          success: false,
          error: "Estudiante no encontrado",
          code: "STUDENT_NOT_FOUND"
        });
        return;
      }

      console.log("✅ Datos del estudiante obtenidos correctamente");
      console.log("📝 Información del estudiante:", {
        nombre: studentResponse.data.personalData?.fullName,
        facultad: studentResponse.data.academicData?.faculty,
        carrera: studentResponse.data.academicData?.career,
        situacionAcademica: studentResponse.data.rawData?.docentData?.academicSituation
      });

      // 3. Crear cuenta LDAP con la contraseña, email y username proporcionados
      const ldapService = new LDAPAccountService();
      console.log("🏗️ Creando cuenta LDAP con username:", username);
      
      const result = await ldapService.createStudentAccount({
        ...studentResponse.data,
        backupEmail: email // Usar el email proporcionado por el usuario
      }, password, username); // ← Pasar el username seleccionado

      console.log("📨 Resultado de creación de cuenta:", {
        success: result.success,
        username: result.username,
        message: result.message
      });

      // 4. Enviar respuesta unificada
      handleServiceResponse(res, {
        ...result,
        message: result.success 
          ? `✅ Cuenta creada exitosamente. Usuario: ${result.username}` 
          : result.message
      });

      if (result.success) {
        console.log(`🎉 Cuenta creada exitosamente para: ${result.username}`);
      } else {
        console.error(`❌ Error creando cuenta: ${result.error}`);
      }

    } catch (error) {
      console.error("❌ Error en creación de cuenta:", error);
      
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "INTERNAL_SERVER_ERROR",
        details: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  }
}