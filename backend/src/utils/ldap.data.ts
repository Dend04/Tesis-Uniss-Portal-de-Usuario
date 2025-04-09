// src/utils/ldap.data.ts
import axios from 'axios';
import NodeCache from 'node-cache';
import { LDAPUser } from './ldap.utils'; // Ahora está correctamente importado

const CACHE_TTL = 3600;
const dataCache = new NodeCache({ stdTTL: CACHE_TTL });

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

// En el archivo ldap.data.ts, modifica la función fetchStructureData:

export const fetchStructureData = async (): Promise<{
  faculties: Faculty[];
  careers: Career[];
  courseTypes: CourseType[];
}> => {
  const cacheKey = 'ldapStructureData';
  const cached = dataCache.get(cacheKey);
  if (cached) return cached as any;

  // Verificar que existen las variables de entorno
  if (!process.env.SIGENU_API_USER || !process.env.SIGENU_API_PASSWORD) {
    throw new Error('Faltan credenciales de API en variables de entorno');
  }

  // Crear autenticación Basic
  const auth = {
    username: process.env.SIGENU_API_USER,
    password: process.env.SIGENU_API_PASSWORD
  };

  try {
    console.log('Obteniendo datos de la API SIGENU...');
    const [courseTypesRes, careersRes] = await Promise.all([
      axios.get<CourseType[]>('http://sigenu.uniss.edu.cu/sigenu-rest/dss/getcoursetype', {
        auth: auth // <- Agregar autenticación aquí
      }),
      axios.get<Career[]>('http://sigenu.uniss.edu.cu/sigenu-rest/dss/getcareermodel', {
        auth: auth // <- Y aquí
      })
    ]);

    const faculties = await fetchFacultiesDetails(careersRes.data);

    const result = {
      faculties: faculties,
      careers: careersRes.data,
      courseTypes: courseTypesRes.data
    };

    dataCache.set(cacheKey, result);
    console.log('Datos de la API SIGENU obtenidos y cacheados exitosamente');
    return result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Error en API SIGENU: ${error.response?.status} - ${error.response?.data}`);
    }
    throw new Error('Error desconocido al obtener datos de estructura');
  }
};

const fetchFacultiesDetails = async (careers: Career[]): Promise<Faculty[]> => {
  try {
    const auth = {
      username: process.env.SIGENU_API_USER!,
      password: process.env.SIGENU_API_PASSWORD!
    };

    // Obtener facultades reales desde el endpoint correcto
    const facultiesRes = await axios.get<Faculty[]>(
      'http://sigenu.uniss.edu.cu/sigenu-rest/dss/getfaculty',
      { auth }
    );

    // Mapear la respuesta a la estructura Faculty
    return facultiesRes.data.map(f => ({
      IdFacultad: f.IdFacultad.toString(),
      nombre: f.nombre.trim(),
      nombreDecano: f.nombreDecano,
      nombreSecretario: f.nombreSecretario,
      telf: f.telf
    }));
    
  } catch (error) {
    console.error('Error obteniendo facultades:', error);
    throw new Error('No se pudieron obtener los datos de facultades');
  }
};

export interface Faculty {
  IdFacultad: string;
  nombre: string;
  
}