// src/controllers/username-options.controller.ts
import { Request, Response } from 'express';
import { SigenuService } from '../services/sigenu.services';
import { PrismaClient } from '@prisma/client';
import { UsernameOptionsService } from '../services/username-options.services';

const usernameService = new UsernameOptionsService();

export class UsernameOptionsController {
  static async getUsernameOptions(req: Request, res: Response): Promise<void> {
    // Crear una instancia de PrismaClient dentro del método
    const prisma = new PrismaClient();
    
    try {
      const { ci, userType } = req.params;
      const { reset } = req.query;

      if (!['student', 'employee'].includes(userType)) {
        res.status(400).json({
          success: false,
          error: 'Tipo de usuario inválido. Debe ser "student" o "employee"'
        });
        return;
      }

      let userData;
      
      if (userType === 'student') {
        // Obtener datos del estudiante desde SIGENU
        const studentResponse = await SigenuService.getMainStudentData(ci);
        if (!studentResponse.success) {
          res.status(404).json({
            success: false,
            error: 'Estudiante no encontrado'
          });
          return;
        }
        userData = studentResponse.data;
      } else {
        // Obtener datos del empleado desde la base de datos
        const employee = await prisma.empleados_Gral.findFirst({
          where: { No_CI: ci, Baja: false }
        });
        
        if (!employee) {
          res.status(404).json({
            success: false,
            error: 'Empleado no encontrado'
          });
          return;
        }
        userData = employee;
      }

      // Generar opciones de username
      const options = await usernameService.generateUsernameOptions(
        userData, 
        userType as 'student' | 'employee', 
        reset === 'true'
      );

      res.json({
        success: true,
        options
      });
    } catch (error) {
      console.error('Error generando opciones de username:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    } finally {
      // Cerrar la conexión de Prisma
      await prisma.$disconnect();
    }
  }

  static async checkUsername(req: Request, res: Response): Promise<void> {
    try {
      const { username } = req.body;

      if (!username) {
        res.status(400).json({
          success: false,
          error: 'Username es requerido'
        });
        return;
      }

      const available = await usernameService.checkUsernameAvailability(username);

      res.json({
        success: true,
        available,
        username
      });
    } catch (error) {
      console.error('Error verificando username:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}