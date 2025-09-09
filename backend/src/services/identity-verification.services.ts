// src/services/identity-verification.service.ts
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import logger from '../utils/logger';
import https from 'https';
import dotenv from 'dotenv';

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

  constructor() {
    this.prisma = new PrismaClient();
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
  
      const username = process.env.SIGENU_API_USER;
      const password = process.env.SIGENU_API_PASSWORD;
  
      if (!username || !password) {
        throw new Error(
          'Credenciales SIGENU no configuradas. Verifique las variables de entorno: ' +
          'SIGENU_API_USER y SIGENU_API_PASSWORD'
        );
      }
  
      const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  
      const response = await axios.get(
        `http://localhost:5550/api/students/${ci}`,
        {
          headers: {
            Authorization: authHeader
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          }),
          timeout: 10000
        }
      );
  
      // Solo considera estudiante activo si studentStatus es "Activo"
      if (response.data?.success && response.data?.data?.rawData?.docentData?.studentStatus === "Activo") {
        return {
          fullName: response.data.data.personalData.fullName,
          career: response.data.data.academicData.career,
          faculty: response.data.data.academicData.faculty,
          academicYear: parseInt(response.data.data.academicData.year),
          status: 'active',
          ci: response.data.data.personalData.identification
        };
      }
  
      return null;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        logger.error(`Error en SIGENU API: ${error.response?.status} - ${error.response?.data}`);
  
        if (error.response?.status === 401) {
          throw new Error('Credenciales SIGENU inválidas');
        }
        if (error.response?.status === 404) {
          return null;
        }
      }
  
      logger.error(`Error al consultar SIGENU para CI: ${ci}. Error: ${error.message}`);
      throw new Error(`Error al consultar SIGENU: ${error.message}`);
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
        return null;
      }

      const department = await this.getDepartmentData(employee.Id_Direccion);

      return {
        fullName: `${employee.Nombre} ${employee.Apellido_1} ${employee.Apellido_2 || ''}`.trim(),
        department: department?.Desc_Direccion || 'Sin departamento',
        ci: employee.No_CI,
        status: 'active'
      };
    } catch (error: any) {
      logger.error(`Error al consultar datos de empleado para CI: ${ci}. Error: ${error.message}`);
      throw new Error(`Error al consultar datos de empleado: ${error.message}`);
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
