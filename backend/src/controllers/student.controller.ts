import { NextFunction, Request, Response } from 'express';
import { SigenuService } from '../services/sigenu.services';

export class StudentController {
    static async getStudent(
      req: Request,
      res: Response,
      next: NextFunction // Añadir este parámetro
    ): Promise<void> { // Definir retorno explícito
      try {
        const { ci } = req.params;
        
        if (!this.validateCubanCI(ci)) {
          res.status(400).json({
            success: false,
            error: 'CI inválido. Debe tener 11 dígitos'
          });
          return; // Importante: detener ejecución después de enviar respuesta
        }
  
        const result = await SigenuService.getStudentData(ci);
        
        if (!result.success) {
          res.status(502).json(result);
          return;
        }
  
        res.json({
          success: true,
          data: this.sanitizeResponse(result.data)
        });
  
      } catch (error) {
        next(error); // Pasar el error al middleware centralizado
      }
    }
  private static validateCubanCI(ci: string): boolean {
    return /^\d{11}$/.test(ci);
  }

  private static sanitizeResponse(data: any) {
    // Eliminar datos sensibles para el frontend
    const { rawData, ...sanitizedData } = data;
    return sanitizedData;
  }
}