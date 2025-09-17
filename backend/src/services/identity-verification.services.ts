// src/services/identity-verification.service.ts
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import logger from '../utils/logger';
import https from 'https';
import dotenv from 'dotenv';
import { SigenuService } from "./sigenu.services";

dotenv.config();

export type StudentData = {
  fullName: string;
  career: string;
  faculty: string;
  academicYear: number;
  status: 'active' | 'inactive';
  ci: string;
};

export type EmployeeWithDepartment = {
  fullName: string;
  department: string;
  ci: string;
  status: 'active' | 'inactive';
};

class IdentityVerificationService {
  private prisma: PrismaClient;
  private sigenuService: SigenuService;

  constructor() {
    this.prisma = new PrismaClient();
    this.sigenuService = new SigenuService(); // Instancia de SigenuService
  }

  async verifyCI(ci: string): Promise<{ type: 'student' | 'employee', data: StudentData | EmployeeWithDepartment }> {
    const cleanCI = this.sanitizeCI(ci);
    logger.info(`Verificando CI: ${cleanCI}`);

    try {
      const studentData = await this.checkStudent(cleanCI);
      if (studentData) {
        logger.info(`Datos de estudiante encontrados para CI: ${cleanCI}`);
        return { type: 'student', data: studentData };
      }

      const employeeData = await this.checkEmployee(cleanCI);
      if (employeeData) {
        logger.info(`Datos de empleado encontrados para CI: ${cleanCI}`);
        return { type: 'employee', data: employeeData };
      }

      throw new Error('No se encontró registro como estudiante o trabajador');
    } finally {
      await this.prisma.$disconnect();
    }
  }

  private sanitizeCI(ci: string): string {
    const sanitizedCI = ci.replace(/\D/g, '').trim();
    logger.info(`CI saneado: ${sanitizedCI}`);
    return sanitizedCI;
  }

  private async checkStudent(ci: string): Promise<StudentData | null> {
    try {
      logger.info(`Consultando datos de estudiante para CI: ${ci}`);
  
      // Usar métodos estáticos de SigenuService
      const response = await SigenuService.getStudentData(ci);
  
      // Manejar el caso de error explícitamente
      if (!response.success) {
        logger.error(`No se encontraron datos válidos para el CI: ${ci}. Error: ${response.error}`);
        return null;
      }
  
      // Si llegamos aquí, TypeScript sabe que response.success es true y response.data existe
      const studentData = response.data.mainData;
      const rawData = studentData.rawData;
  
      // Verificar si el estudiante está activo
      const studentStatus = rawData.docentData?.studentStatus || 'Desconocido';
      if (studentStatus !== 'Activo') {
        logger.info(`Estudiante con CI ${ci} está ${studentStatus.toLowerCase()}. No se considera activo.`);
        return null;
      }
  
      // Obtener el nombre de la carrera usando el método estático
      const careerCode = rawData.docentData?.career || '00000';
      const careerName = await SigenuService.getNationalCareerName(careerCode);
  
      // Extraer el año académico
      let academicYear = 1;
      if (rawData.docentData?.year) {
        academicYear = parseInt(rawData.docentData.year);
      } else if (typeof rawData.docentData?.academicSituation === 'string') {
        const yearMatch = rawData.docentData.academicSituation.match(/\d+/);
        academicYear = yearMatch ? parseInt(yearMatch[0]) : 1;
      }
  
      return {
        fullName: studentData.personalData.fullName,
        career: careerName,
        faculty: studentData.academicData.faculty,
        academicYear: academicYear,
        status: 'active',
        ci: studentData.personalData.identification,
      };
  
    } catch (error: any) {
      logger.error(`Error al consultar estudiante con CI ${ci}: ${error.message}`);
      return null;
    }
  }
  

  
  

  private async checkEmployee(ci: string): Promise<EmployeeWithDepartment | null> {
    try {
      logger.info(`Consultando datos de empleado para CI: ${ci}`);
      const employee = await this.prisma.empleados_Gral.findFirst({
        where: {
          No_CI: ci,
          Baja: false
        }
      });
  
      if (!employee) {
        logger.warn(`No se encontraron datos de empleado para CI: ${ci}`);
        return null; // <-- Correcto
      }
  
      try {
        const department = await this.getDepartmentData(employee.Id_Direccion);
        return {
          fullName: `${employee.Nombre} ${employee.Apellido_1} ${employee.Apellido_2 || ''}`.trim(),
          department: department?.Desc_Direccion || 'Sin departamento',
          ci: employee.No_CI,
          status: 'active'
        };
      } catch (departmentError: any) {
        logger.error(`Error al consultar departamento para CI: ${ci}. Usando valores por defecto.`);
        // Devuelve datos parciales (sin departamento) en lugar de fallar
        return {
          fullName: `${employee.Nombre} ${employee.Apellido_1} ${employee.Apellido_2 || ''}`.trim(),
          department: 'Sin departamento',
          ci: employee.No_CI,
          status: 'active'
        };
      }
    } catch (error: any) {
      logger.error(`Error al consultar datos de empleado para CI: ${ci}. Error: ${error.message}`);
      return null; // <-- Ahora devuelve null en lugar de lanzar el error
    }
  }
  


  private async getDepartmentData(idDireccion: string) {
    try {
      logger.info(`Consultando datos de departamento para Id_Direccion: ${idDireccion}`);
      return await this.prisma.rH_Plantilla.findFirst({
        where: {
          Id_Direccion: idDireccion
        },
        select: {
          Desc_Direccion: true
        },
        orderBy: {
          Id_Direccion: 'asc'
        },
        take: 1
      });
    } catch (error: any) {
      logger.error(`Error al consultar datos de departamento para Id_Direccion: ${idDireccion}. Error: ${error.message}`);
      throw new Error(`Error al consultar datos de departamento: ${error.message}`);
    }
  }
}

export default new IdentityVerificationService();
