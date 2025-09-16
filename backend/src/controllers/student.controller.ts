// src/controllers/student.controller.ts
import { NextFunction, Request, Response } from "express";
import { SigenuService } from "../services/sigenu.services";
import { handleServiceResponse } from "../utils/handler.util";

export class StudentController {
  static async getMainData(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { ci } = req.params;

      
      // 1. Ejecución del servicio
      const result = await SigenuService.getMainStudentData(ci);
      
      // 2. Respuesta normalizada
      handleServiceResponse(res, result);
    } catch (error) {
      // 3. Manejo centralizado de errores
      next(StudentController.wrapServiceError(error));
    }
  }


  private static wrapServiceError(error: unknown): Error {
    console.error("Error en controlador:", error);
    return error instanceof Error 
      ? error 
      : new Error("Error desconocido en el servidor");
  }
}