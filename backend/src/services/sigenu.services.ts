// src/services/sigenu.services.ts
import https from "https";
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import dotenv from "dotenv";
import {
  AcademicStatus,
  ApiResponse,
  RawStudentData,
  StudentCompleteData,
  StudentMainData,
  StudentPhoto,
} from "../interface/student.interface";

dotenv.config();

const API_BASE_URL = "https://sigenu.uniss.edu.cu/sigenu-rest";
const DEFAULT_TIMEOUT = 15000;

export class SigenuService {
  private static careerCache: Record<string, string> = {};
  // Configuración principal del servicio

  private static getConfig(): AxiosRequestConfig {
    return {
      timeout: DEFAULT_TIMEOUT,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
        keepAlive: true,
        maxSockets: 10,
      }),
      headers: {
        Authorization: `Basic ${this.getAuthCredentials()}`,
        Accept: "application/json",
        "X-Request-Source": "student-portal-api",
      },
    };
  }

  // Método principal para obtener todos los datos
  static async getStudentData(
    ci: string
  ): Promise<ApiResponse<StudentCompleteData>> {
    try {
      await this.fetchCareerData();
      const [main, photo, status] = await Promise.all([
        this.getMainStudentData(ci),
        this.getStudentPhoto(ci),
        this.getStudentStatusList(),
      ]);

      if (!main.success || !photo.success || !status.success) {
        return this.handlePartialErrors(main, photo, status);
      }

      return {
        success: true,
        data: {
          mainData: main.data,
          photoData: photo.data,
          statusData: status.data,
        },
      };
    } catch (error: any) {
      return this.handleError(error, `getStudentData for CI: ${ci}`);
    }
  }

  // Obtener datos principales del estudiante
  static async getMainStudentData(
    ci: string
  ): Promise<ApiResponse<StudentMainData>> {
    try {
      const url = `${API_BASE_URL}/student/fileStudent/getStudentAllData/${ci}`;
      const response = await axios.get(url, this.getConfig());

      if (!response.data?.[0]) {
        return {
          success: false,
          error: "Estructura de datos principal inválida",
        };
      }

      return {
        success: true,
        data: this.transformMainData(response.data[0]),
      };
    } catch (error) {
      return this.handleError(error, "getMainStudentData");
    }
  }

  // Obtener foto del estudiante con reintentos
  static async getStudentPhoto(ci: string): Promise<ApiResponse<StudentPhoto>> {
    try {
      if (!this.validateCI(ci)) {
        return {
          success: false,
          error: "Formato de CI inválido",
        };
      }

      const url = `${API_BASE_URL}/student/${ci}/photo-base64`;
      const response = await axios.get(url, this.getConfig());

      if (!response.data || typeof response.data !== "string") {
        return {
          success: false,
          error: "La foto no está disponible",
        };
      }

      return {
        success: true,
        data: { photoBase64: response.data },
      };
    } catch (error) {
      return this.handleErrorWithRetry(error, ci);
    }
  }

  // Obtener lista de estados académicos
  static async getStudentStatusList(): Promise<ApiResponse<AcademicStatus[]>> {
    try {
      const url = `${API_BASE_URL}/dss/getstudentstatus`;
      const response = await axios.get(url, this.getConfig());

      if (!Array.isArray(response.data)) {
        return {
          success: false,
          error: "Formato de estados inválido",
        };
      }

      return {
        success: true,
        data: this.mapStatusData(response.data),
      };
    } catch (error) {
      return this.handleError(error, "getStudentStatusList");
    }
  }

  // Transformación de datos principales
  private static transformMainData(rawData: RawStudentData): StudentMainData {
    const personal = rawData.personalData || {};
    const docent = rawData.docentData || {};

    return {
      personalData: {
        fullName: [personal.name, personal.middleName, personal.lastName]
          .filter(Boolean)
          .join(" ")
          .trim(),
        identification: personal.identification || "No disponible",
        birthDate: this.formatDate(personal.birthDate),
        address: this.cleanAddress(personal.address || ""),
        contact: personal.phone || "No registrado",
        origin: [personal.nativeOf, personal.province]
          .filter(Boolean)
          .join(", "),
      },
      academicData: {
        faculty: docent.faculty || "Facultad no especificada",
        career: this.mapCareerCode(docent.career),
        year: `${docent.year || "N/A"}° Año`,
        status: docent.academicSituation || "Estado desconocido",
        academicIndex: docent.academicIndex?.toFixed(2) || "0.00",
      },
      familyData: {
        mother: this.formatParentData(rawData.motherData),
        father: this.formatParentData(rawData.fatherData),
      },
      rawData,
    };
  }

  // Mapeo de estados académicos
  private static mapStatusData(data: any[]): AcademicStatus[] {
    return data.map((s) => ({
      id: s.idEstatus?.toString() || "unknown",
      name: s.nombreEstatus || "Sin nombre",
      description: s.descripcion || "",
    }));
  }

  // Manejo de errores parciales
  private static handlePartialErrors(
    main: ApiResponse<StudentMainData>,
    photo: ApiResponse<StudentPhoto>,
    status: ApiResponse<AcademicStatus[]>
  ): ApiResponse<never> {
    const errors = [
      main.success ? null : `Principal: ${main.error}`,
      photo.success ? null : `Foto: ${photo.error}`,
      status.success ? null : `Estados: ${status.error}`,
    ].filter(Boolean);

    return {
      success: false,
      error:
        errors.length > 0
          ? `Errores en:\n${errors.join("\n")}`
          : "Error desconocido",
    };
  }

  // Manejo de errores con reintentos
  private static async handleErrorWithRetry(
    error: any,
    ci: string,
    retries = 2
  ): Promise<ApiResponse<StudentPhoto>> {
    if (retries > 0 && axios.isAxiosError(error)) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * (3 - retries)));
      return this.getStudentPhoto(ci);
    }
    return this.handleError(
      error,
      "getStudentPhoto"
    ) as ApiResponse<StudentPhoto>;
  }

  // Formateo de fecha
  private static formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleDateString("es-CU", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Fecha inválida";
    }
  }

  // Limpieza de dirección
  private static cleanAddress(address: string): string {
    return address
      .replace(/\s+/g, " ")
      .replace(/(#\d+)/g, (_, match) => match.toUpperCase())
      .trim();
  }

  // Nuevo método para obtener y cachear las carreras
  // 1. Método para obtener carreras (cache)
// 1. Modificar el método fetchCareerData para debuggear y asegurar el formato
private static async fetchCareerData(): Promise<void> {
  try {
    if (Object.keys(this.careerCache).length > 0) return;

    const url = `${API_BASE_URL}/dss/getcareermodel`;
    const response = await axios.get(url, this.getConfig());
    
    // Debug: Ver respuesta cruda
    console.log('Respuesta completa de carreras:', JSON.stringify(response.data, null, 2));

    // Asegurar que estamos accediendo al array correcto (ajusta según estructura real)
    const carreras = response.data.data || response.data; // Dependiendo de la estructura
    
    if (Array.isArray(carreras)) {
      this.careerCache = carreras.reduce((acc: Record<string, string>, carrera) => {
        // Asegurar acceso al campo correcto y formato
        const rawId = carrera.idCarrera?.toString() || '';
        const id = rawId.padStart(5, '0');
        
        // Debug: Ver IDs y nombres
        console.log(`Registrando carrera: ${rawId} -> ${id} = ${carrera.nombre}`);
        
        acc[id] = carrera.nombre;
        return acc;
      }, {});

      // Debug: Ver muestra del cache
      console.log('Career Cache Sample:', 
        Object.entries(this.careerCache).slice(0, 3));
    }
  } catch (error) {
    console.error('Error cargando carreras:', error);
    this.careerCache = {};
  }
}

// 2. Mejorar el mapeo con validación completa
private static mapCareerCode(code: string): string {
  if (!code) return 'Carrera no especificada';
  
  // Debug: Valor original recibido
  console.log(`Código original recibido: ${code} (tipo: ${typeof code})`);

  // Normalización robusta
  const baseCode = code.toString().replace(/\D/g, ''); // Eliminar todo lo que no sea dígito
  const normalizedCode = baseCode.padStart(5, '0');

  // Debug: Búsqueda en cache
  console.log(`Buscando: ${normalizedCode} en cache. Existente?: ${!!this.careerCache[normalizedCode]}`);
  
  return this.careerCache[normalizedCode] || `Carrera (${code})`;
}
  // Formateo de datos de padres
  private static formatParentData(parent: any): string {
    const parts = [];
    if (parent?.name) parts.push(parent.name);
    if (parent?.ocupation) parts.push(parent.ocupation);
    if (parent?.level) parts.push(`(${parent.level})`);

    return parts.length > 0 ? parts.join(" - ") : "No registrado";
  }

  // Validación de CI
  private static validateCI(ci: string): boolean {
    return /^\d{11}$/.test(ci);
  }

  // Obtención de credenciales
  private static getAuthCredentials(): string {
    const user = process.env.SIGENU_API_USER;
    const pass = process.env.SIGENU_API_PASSWORD;

    if (!user || !pass) {
      throw new Error("Configuración incompleta: Faltan credenciales SIGENU");
    }

    return Buffer.from(`${user}:${pass}`).toString("base64");
  }

  // Manejo genérico de errores
  private static handleError<T = never>(
    error: unknown,
    context: string
  ): ApiResponse<T> {
    const errorMessage = axios.isAxiosError(error)
      ? `[${context}] Error ${error.response?.status || "DESCONOCIDO"}: ${
          error.message
        }`
      : error instanceof Error
      ? `[${context}] ${error.message}`
      : `[${context}] Error desconocido`;

    console.error("Error SIGENU:", errorMessage);

    return {
      success: false,
      error: errorMessage,
    } as ApiResponse<T>;
  }
}
