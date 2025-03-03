import https from 'https';
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

// Configuración reutilizable
const API_BASE_URL = "https://sigenu.uniss.edu.cu/sigenu-rest";
const DEFAULT_TIMEOUT = 5000;

export class SigenuService {
  static async getStudentData(
    ci: string
  ): Promise<ApiResponse<StudentCompleteData>> {
    try {
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

  private static async getStudentPhoto(
    ci: string
  ): Promise<ApiResponse<StudentPhoto>> {
    try {
      const url = `${API_BASE_URL}/student/${ci}/photo-base64`;
      const response = await axios.get(url, this.getConfig());
      
      if (typeof response.data !== "string") {
        return {
          success: false,
          error: "Formato de foto inválido"
        };
      }

      return {
        success: true,
        data: { photoBase64: response.data },
      };
    } catch (error) {
      return this.handleError(error, "getStudentPhoto");
    }
  }

  private static async getStudentStatusList(): Promise<ApiResponse<AcademicStatus[]>> {
    try {
      const url = `${API_BASE_URL}/dss/getstudentstatus`;
      const response = await axios.get(url, this.getConfig());
      
      if (!Array.isArray(response.data)) {
        return {
          success: false,
          error: "Formato de estados académicos inválido"
        };
      }

      const mappedData = response.data.map(s => ({
        id: s.idEstatus?.toString() || "unknown",
        name: s.nombreEstatus || "Sin nombre",
        description: s.descripcion || ""
      }));

      return {
        success: true,
        data: mappedData
      };
    } catch (error) {
      return this.handleError(error, "getStudentStatusList");
    }
  }

  private static async getMainStudentData(
    ci: string
  ): Promise<ApiResponse<StudentMainData>> {
    try {
      const url = `${API_BASE_URL}/student/fileStudent/getStudentAllData/${ci}`;
      const response = await axios.get(url, this.getConfig());

      if (!response.data?.[0]) {
        return { 
          success: false, 
          error: "Estructura de datos principal inválida" 
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

  private static handlePartialErrors(
  main: ApiResponse<StudentMainData>,
  photo: ApiResponse<StudentPhoto>,
  status: ApiResponse<AcademicStatus[]>
): ApiResponse<never> {
  // Filtrar solo los errores reales
  const errors = [
    main.success ? null : `Principal: ${main.error}`,
    photo.success ? null : `Foto: ${photo.error}`,
    status.success ? null : `Estados: ${status.error}`
  ].filter(Boolean);

  return {
    success: false,
    error: errors.length > 0 
      ? `Errores en:\n${errors.join('\n')}`
      : 'Error desconocido en múltiples endpoints'
  };
}

 // Modificar el método getConfig() en SigenuService
private static getConfig(): AxiosRequestConfig {
  const httpsAgent = new https.Agent({ 
    rejectUnauthorized: false, // Ignora certificados inválidos
    checkServerIdentity: () => undefined // Elimina validación de hostname
  });

  return {
    timeout: DEFAULT_TIMEOUT,
    httpsAgent,
    headers: {
      Authorization: `Basic ${this.getAuthCredentials()}`,
      Accept: "application/json",
    },
    validateStatus: (status) => status >= 200 && status < 300,
  };
}

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

  private static cleanAddress(address: string): string {
    return address
      .replace(/\s+/g, " ")
      .replace(/(#\d+)/g, (_, match) => match.toUpperCase())
      .trim();
  }

  private static mapCareerCode(code: string): string {
    const careers = this.getCareerMapping();
    return careers[code] || `Carrera (${code})`;
  }

  private static getCareerMapping(): Record<string, string> {
    return {
      "00101": "Ingeniería en Ciencias Informáticas",
      // Agregar más mapeos desde configuración externa
    };
  }

  private static formatParentData(parent: any): string {
    const parts = [];
    if (parent?.name) parts.push(parent.name);
    if (parent?.ocupation) parts.push(parent.ocupation);
    if (parent?.level) parts.push(`(${parent.level})`);
    
    return parts.length > 0 
      ? parts.join(" - ")
      : "No registrado";
  }

  private static getAuthCredentials(): string {
    const user = process.env.SIGENU_API_USER;
    const pass = process.env.SIGENU_API_PASSWORD;

    if (!user || !pass) {
      throw new Error("Configuración incompleta: Faltan credenciales SIGENU");
    }

    return Buffer.from(`${user}:${pass}`).toString("base64");
  }

  private static handleError(error: unknown, context: string): ApiResponse<never> {
    const errorMessage = axios.isAxiosError(error)
      ? `[${context}] Error ${error.response?.status || "DESCONOCIDO"}: ${error.message}`
      : error instanceof Error
      ? `[${context}] ${error.message}`
      : `[${context}] Error desconocido`;

    console.error("Error SIGENU:", errorMessage, error);

    return {
      success: false,
      error: errorMessage,
    };
  }
}