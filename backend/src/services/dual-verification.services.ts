// src/services/dual-verification.service.ts
import { PrismaClient } from "@prisma/client";

export type DualStatus = {
  isStudent: boolean;
  isEmployee: boolean;
  studentData?: any;
  employeeData?: any;
};

class DualVerificationService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async verifyDualStatus(ci: string): Promise<DualStatus> {
    const cleanCI = this.sanitizeCI(ci);
    
    try {
      // Verificar si es empleado
      const employeeData = await this.checkEmployee(cleanCI);
      const isEmployee = !!employeeData;

      // Verificar si es estudiante
      const isStudent = await this.checkStudent(cleanCI);

      return {
        isStudent,
        isEmployee,
        employeeData,
        studentData: isStudent ? { ci: cleanCI } : undefined
      };
    } finally {
      await this.prisma.$disconnect();
    }
  }

  private sanitizeCI(ci: string): string {
    return ci.replace(/\D/g, '').trim();
  }

  private async checkEmployee(ci: string): Promise<any> {
    try {
      const employee = await this.prisma.empleados_Gral.findFirst({
        where: {
          No_CI: ci,
          Baja: false
        }
      });

      if (!employee) {
        return null;
      }

      // Consulta separada para obtener el departamento
      const department = await this.getDepartmentData(employee.Id_Direccion);
      
      return {
        ...employee,
        department: department?.Desc_Direccion || 'Sin departamento'
      };
    } catch (error) {
      console.error('Error checking employee:', error);
      return null;
    }
  }

  private async getDepartmentData(idDireccion: string) {
    try {
      return await this.prisma.rH_Plantilla.findFirst({
        where: {
          Id_Direccion: idDireccion
        },
        select: {
          Desc_Direccion: true
        }
      });
    } catch (error) {
      console.error('Error getting department:', error);
      return null;
    }
  }

  private async checkStudent(ci: string): Promise<boolean> {
    // Aquí puedes integrar con SigenuService
    return true;
  }
}

export default new DualVerificationService();