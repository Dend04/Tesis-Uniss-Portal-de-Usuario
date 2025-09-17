// src/services/segenu.services.ts
import https from "https";
import axios, { AxiosRequestConfig } from "axios";
import dotenv from "dotenv";
import {
  ApiResponse,
  RawStudentData,
  StudentCompleteData,
  StudentMainData,
} from "../interface/student.interface";
import NodeCache from "node-cache";

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL_SIGENU;
const DEFAULT_TIMEOUT = 15000;

const cache = new NodeCache({ stdTTL: 10800 });

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
      // Configuración del proxy si es necesario
      proxy: process.env.HTTP_PROXY ? {
        host: 'proxy2.uniss.edu.cu',
        port: 3128,
        auth: {
          username: process.env.PROXY_USER || 'denamorado',
          password: process.env.PROXY_PASS || 'abcd.1234'
        }
      } : false,
      headers: {
        Authorization: `Basic ${this.getAuthCredentials()}`,
        Accept: "application/json",
        "X-Request-Source": "student-portal-api",
      },
    };
  }  

  // Método para obtener las credenciales de autenticación
  private static getAuthCredentials(): string {
    const user = process.env.SIGENU_API_USER;
    const pass = process.env.SIGENU_API_PASSWORD;

    if (!user || !pass) {
      throw new Error("Configuración incompleta: Faltan credenciales SIGENU");
    }

    return Buffer.from(`${user}:${pass}`).toString("base64");
  }

  // Función para obtener las carreras nacionales y almacenarlas en caché
  public static async getNationalCareers() {
    try {
      const response = await axios.get(
        `http://sigenu.uniss.edu.cu/sigenu-rest/dss/getcareermodel`,
        {
          ...this.getConfig(),
          // Aseguramos que la respuesta sea tratada como JSON
          responseType: 'json'
        }
      );
  
      // Verificamos si la respuesta tiene la estructura esperada
      let careersData = response.data;
  
      // Si la respuesta está envuelta en un objeto con propiedad 'data'
      if (careersData && careersData.data && Array.isArray(careersData.data)) {
        careersData = careersData.data;
      }
      // Si la respuesta es directamente un array
      else if (!Array.isArray(careersData)) {
        console.error('La respuesta no es un array:', careersData);
        throw new Error('Formato de respuesta inesperado');
      }
  
      // Limpiamos la caché anterior
      this.careerCache = {};
  
      // Llenamos la caché con los nuevos datos
      careersData.forEach((career: { idCarrera: string; nombre: string }) => {
        const normalizedId = career.idCarrera?.toString().padStart(5, "0") || "00000";
        this.careerCache[normalizedId] = career.nombre || `Carrera ${normalizedId}`;
      });
  
      // Guardamos en la caché de NodeCache
      cache.set("nationalCareers", careersData, 3600000);
      return careersData;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Error obteniendo carreras nacionales:",
          error.response?.status,
          error.response?.data || error.message
        );
      } else {
        console.error(
          "Error desconocido al obtener carreras nacionales:",
          error
        );
      }
      return [];
    }
  }
  
  // Precargar la caché de carreras al iniciar (opcional pero recomendado)
  public static async preloadCareerCache(): Promise<void> {
    try {
      await this.getNationalCareers();
      console.log('Caché de carreras precargada exitosamente.');
    } catch (error) {
      console.error('Error precargando caché de carreras:', error);
      throw error;
    }
  }

  private static async getNationalCareerFromCache() {
    const careers = cache.get("nationalCareers");
    if (!careers) {
      return this.getNationalCareers();
    }
    return careers;
  }

  

  public static async getNationalCareerName(careerCode: string): Promise<string> {
    const careers = await this.getNationalCareerFromCache();
    const career = careers.find((c: { idCarrera: string }) => c.idCarrera === careerCode);
    if (career) {
      return career.nombre;
    }
    return careerCode;
  }

  // Método principal para obtener todos los datos
  public static async getStudentData(ci: string): Promise<ApiResponse<StudentCompleteData>> {
    try {
      const cachedData = cache.get<StudentCompleteData>(ci);
      if (cachedData) {
        console.log(`Datos obtenidos de la caché para CI: ${ci}`);
        return {
          success: true,
          data: cachedData,
        };
      }

      await this.fetchCareerData();
      const main = await this.getMainStudentData(ci);
      if (!main.success) {
        return this.handlePartialErrors(main);
      }

      cache.set(ci, {
        mainData: main.data,
      });

      return {
        success: true,
        data: {
          mainData: main.data,
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

      const studentData = response.data[0];
      const careerName = await this.getNationalCareerName(studentData.career); // Obtener el nombre de la carrera

      return {
        success: true,
        data: this.transformMainData({
          ...studentData,
          career: careerName, // Reemplazar el código de carrera con el nombre
        }),
      };
    } catch (error) {
      return this.handleError(error, "getMainStudentData");
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

  // Manejo de errores parciales
  private static handlePartialErrors(
    main: ApiResponse<StudentMainData>
  ): ApiResponse<never> {
    // TypeScript ahora entiende que si success es false, error existe
    if (!main.success) {
      return {
        success: false,
        error: `Error en datos principales: ${main.error}`,
      };
    }

    // Caso inalcanzable pero necesario para TypeScript
    return {
      success: false,
      error: "Error desconocido en datos principales",
    };
  }

  // Manejo de errores con reintentos

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
  private static async fetchCareerData(): Promise<void> {
    try {
      if (Object.keys(this.careerCache).length > 0) return;

      const url = `${API_BASE_URL}/dss/getcareermodel`;
      const response = await axios.get(url, this.getConfig());

      // Asegurar que estamos accediendo al array correcto
      const carreras = response.data.data || response.data; // Dependiendo de la estructura

      if (Array.isArray(carreras)) {
        this.careerCache = carreras.reduce(
          (acc: Record<string, string>, carrera) => {
            const rawId = carrera.idCarrera?.toString() || "";
            const id = rawId.padStart(5, "0");
            acc[id] = carrera.nombre;
            return acc;
          },
          {}
        );
      }
    } catch (error) {
      console.error("Error cargando carreras:", error);
      this.careerCache = {};
    }
  }

  // Mapeo de código de carrera
  private static mapCareerCode(code: string): string {
    if (!code) return "Carrera no especificada";

    const baseCode = code.toString().replace(/\D/g, ""); // Eliminar todo lo que no sea dígito
    const normalizedCode = baseCode.padStart(5, "0");

    // Debug: Ver qué código se está buscando
    console.log(`Buscando carrera con código normalizado: ${normalizedCode}`);

    // Buscar en la caché de carreras
    const careerName = this.careerCache[normalizedCode];

    // Debug: Ver el resultado de la búsqueda
    if (careerName) {
      console.log(`Carrera encontrada: ${careerName}`);
    } else {
      console.log(`Carrera no encontrada para el código: ${normalizedCode}`);
    }

    return careerName || `Carrera (${code})`; // Si no se encuentra, devolver el código original
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
/*   private static validateCI(ci: string): boolean {
    return /^\d{11}$/.test(ci);
  } */

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
