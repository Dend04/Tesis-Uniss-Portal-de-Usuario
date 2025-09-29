// src/services/dual-verification.service.ts
import { PrismaClient } from "@prisma/client";

export type DualStatus = {
  isEmployee: boolean;
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
      const employeeData = await this.checkEmployee(cleanCI);
      const isEmployee = !!employeeData;

      // Convertir BigInt a string/number antes de devolver
      const serializedEmployeeData = employeeData ? this.serializeBigInts(employeeData) : null;

      return {
        isEmployee,
        employeeData: serializedEmployeeData,
      };
    } finally {
      await this.prisma.$disconnect();
    }
  }

  private sanitizeCI(ci: string): string {
    return ci.replace(/\D/g, '').trim();
  }

  // Función recursiva para serializar BigInts
  private serializeBigInts(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj === 'bigint') {
      return obj.toString();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.serializeBigInts(item));
    }
    
    if (typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.serializeBigInts(value);
      }
      return result;
    }
    
    return obj;
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
      
      // ✅ Obtener la descripción del cargo
      const cargoDescription = await this.getCargoDescription(employee.Id_Cargo);
      
      // ✅ NUEVO: Obtener la descripción de la profesión
      const profesionDescription = await this.getProfesionDescription(employee.Id_Profesion);
      
      // ✅ NUEVO: Obtener la descripción del municipio
      const municipioDescription = await this.getMunicipioDescription(employee.Id_Provincia, employee.Id_Municipio);
      
      return {
        ...employee,
        department: department?.Desc_Direccion || 'Sin departamento',
        cargoDescription: cargoDescription || 'Cargo no disponible',
        profesionDescription: profesionDescription || 'Profesión no disponible', // ✅ Nuevo campo
        municipioDescription: municipioDescription || 'Municipio no disponible' // ✅ Nuevo campo
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

  // Función para obtener descripción del cargo
  private async getCargoDescription(idCargo: string): Promise<string> {
    try {
      if (!idCargo || idCargo.trim() === '') {
        return 'Cargo no disponible';
      }

      const cargo = await this.prisma.rH_Variaciones_Plantilla_Detalles.findFirst({
        where: {
          Id_Cargo: idCargo.trim()
        },
        select: {
          Desc_Cargo: true
        }
      });

      return cargo?.Desc_Cargo || 'Cargo no disponible';
    } catch (error) {
      console.error('Error obteniendo descripción del cargo:', error);
      return 'Cargo no disponible';
    }
  }

  // ✅ NUEVA FUNCIÓN: Obtener descripción de la profesión
  private async getProfesionDescription(idProfesion: string): Promise<string> {
    try {
      if (!idProfesion || idProfesion.trim() === '') {
        return 'Profesión no disponible';
      }

      const profesion = await this.prisma.rH_Profesiones.findFirst({
        where: {
          Id_Profesion: idProfesion.trim()
        },
        select: {
          Desc_Profesion: true
        }
      });

      return profesion?.Desc_Profesion || 'Profesión no disponible';
    } catch (error) {
      console.error('Error obteniendo descripción de la profesión:', error);
      return 'Profesión no disponible';
    }
  }

  // ✅ NUEVA FUNCIÓN: Obtener descripción del municipio
  private async getMunicipioDescription(idProvincia: string, idMunicipio: string): Promise<string> {
    try {
      if (!idProvincia || !idMunicipio || idProvincia.trim() === '' || idMunicipio.trim() === '') {
        return 'Municipio no disponible';
      }

      const municipio = await this.prisma.rH_Municipios.findFirst({
        where: {
          Id_Provincia: idProvincia.trim(),
          Id_Municipio: idMunicipio.trim()
        },
        select: {
          Desc_Municipio: true
        }
      });

      return municipio?.Desc_Municipio || 'Municipio no disponible';
    } catch (error) {
      console.error('Error obteniendo descripción del municipio:', error);
      return 'Municipio no disponible';
    }
  }
}

export default new DualVerificationService();