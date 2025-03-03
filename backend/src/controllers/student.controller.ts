// src/controllers/student.controller.ts
import { NextFunction, Request, Response } from 'express';
import { SigenuService } from '../services/sigenu.services';
import { ApiResponse } from '../interface/student.interface';
import { handleServiceResponse } from "../utils/handler.util";

export class StudentController {
  static async getMainData(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { ci } = req.params;

      const result = await SigenuService.getMainStudentData(ci);
      handleServiceResponse(res, result); 
      
    } catch (error) {
      next(error);
    }
  }

  static async getPhoto(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { ci } = req.params;
      
      const result = await SigenuService.getStudentPhoto(ci);
      handleServiceResponse(res, result);
      
    } catch (error) {
      next(error);
    }
  }

  static async getAcademicStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await SigenuService.getStudentStatusList();
      handleServiceResponse(res, result);
      
    } catch (error) {
      next(error);
    }
  }

  private static handleServiceResponse<T>(res: Response, result: ApiResponse<T>): void {
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      const status = result.error?.includes('500') ? 502 : 400;
      this.sendError(res, status, result.error);
    }
  }

  private static sendError(res: Response, code: number, message: string): void {
    res.status(code).json({
      success: false,
      error: message
    });
  }

  private static validateCubanCI(ci: string): boolean {
    return /^\d{11}$/.test(ci);
  }
}