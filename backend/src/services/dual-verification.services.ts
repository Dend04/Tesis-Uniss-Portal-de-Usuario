// src/services/dual-verification.service.ts
import { PrismaClient } from "@prisma/client";

export type DualStatus = {
  isEmployee: boolean;
  employeeData?: any;
  studentData?: any;
  isGraduated?: boolean; // ✅ Nuevo campo para indicar si es egresado
  studentStatus?: string; // ✅ Estado del estudiante
  hasDualOccupation?: boolean;
};

class DualVerificationService {
  private prisma: PrismaClient;
  private sigenuBaseUrl: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.sigenuBaseUrl = process.env.API_BASE_URL_SIGENU || 'https://sigenu.uniss.edu.cu/sigenu-rest';
  }

// En dual-verification.service.ts - método verifyDualStatus
async verifyDualStatus(ci: string, userTitle?: string): Promise<DualStatus> {
    const cleanCI = this.sanitizeCI(ci);
    
    try {
        const userTitleLower = userTitle?.toLowerCase() || '';
        const isEstudiante = userTitleLower === 'estudiante';
        
        // Verificar si es empleado (siempre verificar esto)
        const employeeData = await this.checkEmployee(cleanCI);
        const isEmployee = !!employeeData;
        const serializedEmployeeData = employeeData ? this.serializeBigInts(employeeData) : null;

        // Si NO es estudiante, solo devolver datos de empleado
        if (!isEstudiante) {
            console.log(`🔍 ${userTitle} - verificando si también es estudiante`);
            
            const { studentData, isGraduated, studentStatus } = await this.getStudentDataFromSigenu(cleanCI);
            
            // ✅ CRUCIAL: Si es egresado, NO es doble ocupación
            const hasDualOccupation = !!studentData && !isGraduated;
            
            return {
                isEmployee,
                employeeData: serializedEmployeeData,
                studentData,
                isGraduated,
                studentStatus,
                hasDualOccupation
            };
        } else {
            // Si ES estudiante, obtener datos completos de SIGENU
            console.log(`🎓 Estudiante - verificando si también es empleado`);
            
            const { studentData, isGraduated, studentStatus } = await this.getStudentDataFromSigenu(cleanCI);
            
            // ✅ CRUCIAL: Si es egresado, NO es doble ocupación
            const hasDualOccupation = isEmployee && !isGraduated;
            
            return {
                isEmployee,
                employeeData: serializedEmployeeData,
                studentData,
                isGraduated,
                studentStatus,
                hasDualOccupation
            };
        }
    } finally {
        await this.prisma.$disconnect();
    }
}

  // ✅ NUEVO MÉTODO: Obtener datos del estudiante desde SIGENU
  private async getStudentDataFromSigenu(ci: string): Promise<{ 
    studentData: any; 
    isGraduated: boolean; 
    studentStatus: string 
  }> {
    try {
      const url = `${this.sigenuBaseUrl}/student/fileStudent/getStudentAllData/${ci}`;
      console.log(`🌐 Consultando SIGENU: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Error SIGENU: ${response.status} ${response.statusText}`);
      }

      const studentData = await response.json();
      console.log('✅ Datos obtenidos de SIGENU:', studentData);
      
      // ✅ VERIFICAR SI ES EGRESADO
      const { isGraduated, studentStatus } = this.checkIfStudentIsGraduated(studentData);
      
      console.log(`📊 Estado del estudiante: ${studentStatus}, Egresado: ${isGraduated}`);
      
      return {
        studentData,
        isGraduated,
        studentStatus
      };
    } catch (error) {
      console.error('❌ Error obteniendo datos de SIGENU:', error);
      
      // Manejo específico para errores de timeout
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        return {
          studentData: {
            error: 'La consulta a SIGENU tardó demasiado tiempo',
            details: 'Timeout de 10 segundos excedido'
          },
          isGraduated: false,
          studentStatus: 'Error: Timeout'
        };
      }
      
      return {
        studentData: {
          error: 'No se pudieron obtener los datos del estudiante',
          details: error instanceof Error ? error.message : 'Error desconocido'
        },
        isGraduated: false,
        studentStatus: 'Error: Datos no disponibles'
      };
    }
  }
  
  private checkIfStudentIsGraduated(studentData: any): { isGraduated: boolean; studentStatus: string } {
    try {
      // Verificar si studentData es un array y tiene al menos un elemento
      if (!Array.isArray(studentData) || studentData.length === 0) {
        return { isGraduated: false, studentStatus: 'No hay datos' };
      }

      const firstStudent = studentData[0];
      
      // Verificar si existe docentData y studentStatus
      if (!firstStudent.docentData || !firstStudent.docentData.studentStatus) {
        return { isGraduated: false, studentStatus: 'Estado no disponible' };
      }

      const studentStatus = firstStudent.docentData.studentStatus;
      const isGraduated = studentStatus.toLowerCase().includes('egresado');

      return {
        isGraduated,
        studentStatus
      };
    } catch (error) {
      console.error('Error verificando estado del estudiante:', error);
      return { isGraduated: false, studentStatus: 'Error en verificación' };
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
      
      // ✅ Obtener la descripción de la profesión
      const profesionDescription = await this.getProfesionDescription(employee.Id_Profesion);
      
      // ✅ Obtener la descripción del municipio
      const municipioDescription = await this.getMunicipioDescription(employee.Id_Provincia, employee.Id_Municipio);
      
      return {
        ...employee,
        department: department?.Desc_Direccion || 'Sin departamento',
        cargoDescription: cargoDescription || 'Cargo no disponible',
        profesionDescription: profesionDescription || 'Profesión no disponible',
        municipioDescription: municipioDescription || 'Municipio no disponible'
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

  // Obtener descripción de la profesión
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

  // Obtener descripción del municipio
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