import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { UserEntriesBuilder } from '../services/assets-account.services';

const prisma = new PrismaClient();
const userBuilder = new UserEntriesBuilder();

export class WorkerAccountController {
  static async createUserByCI(
    req: Request<{ ci: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { ci } = req.params;

      // Validación mejorada del CI
      if (!/^\d{11}$/.test(ci)) {
        WorkerAccountController.sendErrorResponse(res, 400, 'Formato de CI inválido', 'INVALID_CI');
        return;
      }

      const employee = await prisma.empleados_Gral.findFirst({
        where: {
          No_CI: ci,
          Baja: false
        }
      });

      if (!employee) {
        WorkerAccountController.sendErrorResponse(res, 404, 'Empleado no encontrado', 'EMPLOYEE_NOT_FOUND');
        return;
      }

      // Crear entrada de usuario basada en el CI
      await userBuilder.createUserEntryByCI(ci);

      WorkerAccountController.sendSuccessResponse(res, {
        message: 'Usuario creado exitosamente',
        employeeId: employee.Id_Expediente
      });

    } catch (error: any) {
      next(WorkerAccountController.handleControllerError(error));
    }
  }

  private static sendSuccessResponse(
    res: Response,
    data: object,
    code: number = 200
  ): void {
    res.status(code).json({
      success: true,
      ...data
    });
  }

  private static sendErrorResponse(
    res: Response,
    code: number,
    message: string,
    errorCode: string
  ): void {
    res.status(code).json({
      success: false,
      error: message,
      code: errorCode
    });
  }

  private static handleControllerError(error: any): Error {
    console.error('Controller Error:', error);
    return error instanceof Error ? error : new Error('Error desconocido');
  }
}
