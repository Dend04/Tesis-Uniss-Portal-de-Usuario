// src/utils/ldap.data.ts
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import NodeCache from 'node-cache';
import https from 'https';

const CACHE_TTL = 3600;
const dataCache = new NodeCache({ stdTTL: CACHE_TTL });

// Interfaces
export interface Faculty {
  IdFacultad: string;
  nombre: string;
  nombreDecano: string;
  nombreSecretario: string;
  telf: string;
}

export interface Career {
  idCarrera: string;
  nombre: string;
  facultad: string;
}

export interface CourseType {
  IdCurso: string;
  nombre: string;
  short_name?: string;
}

// Configuración base de Axios
const createAxiosConfig = (): AxiosRequestConfig => ({
  timeout: 10000,
  httpsAgent: new https.Agent({
    rejectUnauthorized: process.env.NODE_ENV === 'production' // Acepta certificados no válidos en desarrollo
  }),
  proxy: process.env.HTTP_PROXY ? {
    host: 'proxy2.uniss.edu.cu',
    port: 3128
  } : false,
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'UNISS-Portal/1.0'
  }
});

// Función principal
export const fetchStructureData = async (): Promise<{
  faculties: Faculty[];
  careers: Career[];
  courseTypes: CourseType[];
}> => {
  const cacheKey = 'ldapStructureData';
  const cached = dataCache.get(cacheKey);
  if (cached) return cached as any;

  if (!process.env.SIGENU_API_USER || !process.env.SIGENU_API_PASSWORD) {
    throw new Error('Faltan credenciales de API en variables de entorno');
  }

  const auth = {
    username: process.env.SIGENU_API_USER,
    password: process.env.SIGENU_API_PASSWORD
  };

  try {
    console.log('Obteniendo datos de la API SIGENU...');

    const baseConfig = createAxiosConfig();

    const [courseTypesRes, careersRes] = await Promise.all([
      axios.get<CourseType[]>('http://sigenu.uniss.edu.cu/sigenu-rest/dss/getcoursetype', {
        ...baseConfig,
        auth
      }),
      axios.get<Career[]>('http://sigenu.uniss.edu.cu/sigenu-rest/dss/getcareermodel', {
        ...baseConfig,
        auth
      })
    ]);

    const faculties = await fetchFacultiesDetails(auth);
    const result = {
      faculties,
      careers: careersRes.data,
      courseTypes: courseTypesRes.data
    };

    dataCache.set(cacheKey, result);
    console.log('Datos de la API SIGENU obtenidos y cacheados exitosamente');
    return result;
  } catch (error) {
    console.error('Error en fetchStructureData:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Error en API SIGENU: ${error.response?.status || 'Sin respuesta'} -
        ${error.response?.data ? JSON.stringify(error.response.data).substring(0, 200) : error.message}`);
    }
    throw new Error('Error desconocido al obtener datos de estructura');
  }
};

// Función para obtener facultades con manejo mejorado de errores
const formatResponseLog = (response: AxiosResponse): string => {
  const timestamp = new Date().toLocaleTimeString();
  const status = response.status;
  const statusText = response.statusText;
  const contentType = response.headers['content-type'] || 'unknown';
  const dataType = typeof response.data;
  const dataLength = Array.isArray(response.data) 
    ? `${response.data.length} items` 
    : 'unknown';

  // Usar colores ANSI para hacer el log más visual (opcional)
  const green = '\x1b[32m';
  const blue = '\x1b[34m';
  const yellow = '\x1b[33m';
  const reset = '\x1b[0m';

  return `
${green}✅ [${timestamp}] Solicitud a API de facultades exitosa${reset}
   ${blue}Status:${reset} ${status} ${statusText}
   ${blue}Content-Type:${reset} ${contentType}
   ${blue}Tipo de datos:${reset} ${dataType}
   ${blue}Longitud de datos:${reset} ${dataLength}
  `.trim();
};

// Función para obtener facultades con manejo mejorado de errores
const fetchFacultiesDetails = async (auth: { username: string; password: string }): Promise<Faculty[]> => {
  const config: AxiosRequestConfig = {
    ...createAxiosConfig(),
    auth,
    responseType: 'json'
  };

  try {
    console.log('\x1b[36m%s\x1b[0m', `⏳ [${new Date().toLocaleTimeString()}] Realizando solicitud a API de facultades...`);

    const response: AxiosResponse = await axios.get(
      'http://sigenu.uniss.edu.cu/sigenu-rest/dss/getfaculty',
      config
    );

    // Usar el formateador mejorado para el log
    console.log(formatResponseLog(response));

    // Validación de la respuesta
    if (!response.data) {
      throw new Error('Respuesta de API vacía');
    }

    if (!Array.isArray(response.data)) {
      throw new Error(`Formato de respuesta inesperado. Tipo recibido: ${typeof response.data}`);
    }

    // Mapeo seguro de los datos
    return response.data.map((item: any) => ({
      IdFacultad: item.IdFacultad?.toString() || '',
      nombre: item.nombre?.toString().trim() || 'Sin nombre',
      nombreDecano: item.nombreDecano?.toString().trim() || '',
      nombreSecretario: item.nombreSecretario?.toString().trim() || '',
      telf: item.telf?.toString().trim() || ''
    }));

  } catch (error) {
    console.error('Error detallado en fetchFacultiesDetails:', error);

    if (axios.isAxiosError(error)) {
      const errorDetails = {
        status: error.response?.status,
        data: error.response?.data ? (
          typeof error.response.data === 'string' ?
          error.response.data.substring(0, 500) :
          JSON.stringify(error.response.data).substring(0, 500)
        ) : 'Sin datos',
        headers: error.response?.headers
      };

      if (error.response) {
        // Error con respuesta del servidor (4xx, 5xx)
        if (error.response.headers['content-type']?.includes('text/html')) {
          throw new Error(`La API devolvió HTML en lugar de JSON. Posible error de autenticación o endpoint incorrecto.
            Status: ${error.response.status}. Contenido: ${errorDetails.data}`);
        } else {
          throw new Error(`Error ${error.response.status} en la API: ${errorDetails.data}`);
        }
      } else if (error.request) {
        // No se recibió respuesta
        throw new Error('No se recibió respuesta del servidor. Verifica conectividad y proxy.');
      }
    }

    throw new Error(`Error al obtener facultades: ${(error as Error).message}`);
  }
};
