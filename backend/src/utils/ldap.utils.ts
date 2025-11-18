// src/utils/ldap.utils.ts
import ldap, {
  Change,
  Client,
  SearchEntry as LdapSearchEntry,
  SearchCallbackResponse,
  createClient,
} from "ldapjs";
import { LdapTreeNode } from "../interface/ldap-tree.interface";

/**
 * Interfaz para el pool de conexiones LDAP que permite:
 * - Obtener una conexión del pool
 * - Liberar una conexión para reutilización
 * - Cerrar todas las conexiones
 */
export interface LDAPConnectionPool {
  getConnection(): Promise<LDAPClient>;
  releaseConnection(client: LDAPClient): void;
  closeAll(): void;
}

export interface LdapAttribute {
  type: string;
  values: string | string[];
}

/**
 * Implementación de un pool simple de conexiones LDAP
 * que gestiona y reutiliza conexiones para mejorar el rendimiento
 * y evitar errores de conexión
 */
class SimpleLDAPPool implements LDAPConnectionPool {
  private pool: LDAPClient[] = [];
  private maxPoolSize: number;
  private currentSize = 0;

  constructor(private config: LDAPConfig, maxPoolSize: number = 5) {
    this.maxPoolSize = maxPoolSize;
  }

  /**
   * Obtiene una conexión LDAP del pool o crea una nueva si es necesario
   */
  async getConnection(): Promise<LDAPClient> {
    // Si hay conexiones disponibles en el pool, devuélvelas
    if (this.pool.length > 0) {
      const client = this.pool.pop() as LDAPClient;
      try {
        // Verificar que la conexión esté activa
        const isActive = await checkConnection(client);
        if (isActive) {
          return client;
        } else {
          // Si no está activa, cerrarla y crear una nueva
          client.unbind();
          this.currentSize--;
        }
      } catch (error) {
        // Si hay error al verificar, cerrar la conexión
        client.unbind();
        this.currentSize--;
      }
    }
    // Si no hay conexiones pero podemos crear más, crea una nueva
    if (this.currentSize < this.maxPoolSize) {
      this.currentSize++;
      const client = createLDAPClient(this.config.url);
      try {
        await bindAsync(client, this.config.bindDN, this.config.password);
        return client;
      } catch (error) {
        this.currentSize--;
        client.unbind();
        throw error;
      }
    }
    // Si el pool está lleno, espera un momento y reintenta
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.getConnection();
  }

  /**
   * Libera una conexión LDAP para su reutilización en el pool
   */
  releaseConnection(client: LDAPClient): void {
    // Verifica si la conexión sigue siendo válida antes de devolverla al pool
    if (client && (client as any).connected) {
      this.pool.push(client);
    } else {
      this.currentSize--;
    }
  }

  /**
   * Cierra todas las conexiones LDAP en el pool
   */
  closeAll(): void {
    this.pool.forEach(client => {
      try {
        client.unbind();
      } catch (error) {
        console.error("Error cerrando conexión LDAP:", error);
      }
    });
    this.pool = [];
    this.currentSize = 0;
  }
}

// Variable global para el pool de conexiones LDAP
let globalPool: SimpleLDAPPool | null = null;

/**
 * Obtiene la instancia global del pool de conexiones LDAP
 */
export const getLDAPPool = (): LDAPConnectionPool => {
  if (!globalPool) {
    const config = getLDAPConfig();
    globalPool = new SimpleLDAPPool(config, 10); // Pool de 10 conexiones
  }
  return globalPool;
};

/**
 * Interfaz que representa un usuario LDAP con sus atributos principales
 */
export interface LDAPUser {
  samAccountName: string;
  uid: string;
  employeeID: string;
  nombreCompleto: string;
  email: string;
  nombre: string;
  apellido: string;
  displayName: string;
  cargo?: string;
  departamento?: string;
  userPrincipalName: string;
}

/**
 * Crea un cliente LDAP con configuración segura
 * @param url URL del servidor LDAP
 * @returns Cliente LDAP configurado
 */
export function createLDAPClient(url: string): Client {
  // Forzar conexión LDAPS para mayor seguridad
  const secureUrl = url.startsWith('ldap://') 
    ? url.replace('ldap://', 'ldaps://') 
    : url.startsWith('ldaps://') 
      ? url 
      : `ldaps://${url}`;
  
  const client = createClient({
    url: secureUrl,
    tlsOptions: {
      rejectUnauthorized: false // Solo para desarrollo, en producción debería ser true
    },
    timeout: 30000, // Timeout de operaciones
    connectTimeout: 10000, // Timeout de conexión
    reconnect: true, // Habilitar reconexión automática
    idleTimeout: 30000, // Desconectar después de 30 segundos de inactividad
  });

  // Manejadores de eventos para depuración y manejo de errores
  client.on('error', (err) => {
    console.error('LDAP Client Error:', err);
  });

  client.on('connect', () => {
    console.log('LDAP Client Connected');
  });

  client.on('close', () => {
    console.log('LDAP Connection Closed');
  });

  return client;
}

/**
 * Promisifica el método bind de LDAP para uso con async/await
 * @param client Cliente LDAP
 * @param username Nombre de usuario para autenticación
 * @param password Contraseña del usuario
 * @returns Promesa que se resuelve cuando la autenticación es exitosa
 */
export const bindAsync = (
  client: Client,
  username: string,
  password: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('LDAP bind operation timed out'));
    }, 10000);

    client.bind(username, password, (err) => {
      clearTimeout(timeout);
      if (err) {
        // Si hay error de conexión, intenta reconectar
        if (err.name === 'ConnectionError') {
          console.error('LDAP Connection Error during bind:', err);
          client.unbind();
        }
        reject(err);
      } else {
        resolve();
      }
    });
  });
};


/**
 * Promisifica la búsqueda LDAP con manejo de resultados/errores
 * @param client Cliente LDAP
 * @param base DN base para la búsqueda
 * @param options Opciones de búsqueda LDAP
 * @returns Promesa con las entradas encontradas
 */
export const searchAsync = (
  client: LDAPClient,
  base: string,
  options: ldap.SearchOptions
): Promise<ldap.SearchEntry[]> => {
  return new Promise((resolve, reject) => {
    const entries: ldap.SearchEntry[] = [];
    client.search(base, options, (err, res) => {
      if (err) return reject(err);

      res.on("searchEntry", (entry) => entries.push(entry));
      res.on("error" as any, (err) => reject(err));
      res.on("end", (result) => {
        if (!result) {
          return reject(new Error("LDAP search failed: No result received"));
        }

        result.status === 0
          ? resolve(entries)
          : reject(new Error(`LDAP search failed: Status ${result.status}`));
      });
    });
  });
};

/**
 * Promisifica la operación de modificación LDAP
 * @param client Cliente LDAP
 * @param dn DN de la entrada a modificar
 * @param change Cambio a aplicar
 * @returns Promesa que se resuelve cuando la modificación es exitosa
 */
export async function modifyAsync(
  client: LDAPClient,
  dn: string,
  change: ldap.Change
): Promise<void> {
  return new Promise((resolve, reject) => {
    client.modify(dn, change, (err) => {
      err ? reject(err) : resolve();
    });
  });
}

/**
 * Promisifica la operación de añadir entradas LDAP
 * @param client Cliente LDAP
 * @param dn DN de la nueva entrada
 * @param entry Atributos de la nueva entrada
 * @returns Promesa que se resuelve cuando la adición es exitosa
 */
export const addAsync = (client: Client, dn: string, entry: object): Promise<void> => {
  return new Promise((resolve, reject) => {
    client.add(dn, entry, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

/**
 * Escapa valores especiales para su uso en filtros LDAP
 * @param value Valor a escapar
 * @returns Valor escapado seguro para LDAP
 */
export function escapeLDAPValue(value: string): string {
  if (!value) return '';
  
  // Primero normalizar el texto para eliminar tildes y caracteres especiales
  const normalizedValue = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar tildes
    .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Solo permitir letras, números, espacios, guiones y guiones bajos
    .replace(/\s+/g, ' ') // Reemplazar múltiples espacios por uno solo
    .trim();
  
  // Luego escapar caracteres especiales LDAP
  return normalizedValue
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/=/g, '\\=')
    .replace(/\+/g, '\\+')
    .replace(/</g, '\\<')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/;/g, '\\;')
    .replace(/"/g, '\\"')
    .substring(0, 64); // Limitar longitud
}

export function escapeDNValue(value: string): string {
  if (!value) return '';
  
  // Normalizar más agresivamente para DN
  const normalizedValue = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar tildes
    .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Solo caracteres seguros
    .replace(/\s+/g, ' ')
    .trim();
  
  return normalizedValue
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/=/g, '\\=')
    .replace(/\+/g, '\\+')
    .replace(/</g, '\\<')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/;/g, '\\;')
    .replace(/"/g, '\\"')
    .substring(0, 64);
}

// Caché simple para resultados de búsqueda LDAP
const cache: { [key: string]: ldap.SearchEntry[] } = {};

/**
 * Interfaz extendida para entradas de búsqueda LDAP con atributos parseados
 */
export interface SearchEntry extends LdapSearchEntry {
  parsedAttributes: Record<string, any>;
}

export type LDAPClient = ldap.Client;

/**
 * Genera árbol jerárquico de nodos LDAP (recursivo)
 * @param client Cliente LDAP
 * @param baseDN DN base para la búsqueda
 * @param maxDepth Profundidad máxima de recursión
 * @param currentDepth Profundidad actual de recursión
 * @returns Promesa con la estructura de árbol LDAP
 */
export const getLdapStructure = async (
  client: LDAPClient,
  baseDN: string,
  maxDepth: number = 3,
  currentDepth: number = 0
): Promise<LdapTreeNode[]> => {
  if (currentDepth > maxDepth) return [];
  const result: LdapTreeNode[] = [];

  const searchOptions: ldap.SearchOptions = {
    scope: "one",
    filter: "(objectClass=*)",
    attributes: ["objectClass", "cn", "ou", "sn", "dn", "givenName", "mail"],
  };

  const entries = await searchAsync(client, baseDN, searchOptions);

  for (const entry of entries) {
    const node: LdapTreeNode = {
      dn: entry.dn,
      name:
        (entry.attributes.find((a) => a.type === "cn" || a.type === "ou")
          ?.values?.[0] as string) || entry.dn,
      type: entry.attributes
        .find((a) => a.type === "objectClass")
        ?.values?.includes("organizationalUnit")
        ? "folder"
        : "item",
      children: [],
      attributes: {
        sn: entry.attributes.find((a) => a.type === "sn")?.values?.[0] as
          | string
          | undefined,
        givenName: entry.attributes.find((a) => a.type === "givenName")
          ?.values?.[0] as string | undefined,
        mail: entry.attributes.find((a) => a.type === "mail")?.values?.[0] as
          | string
          | undefined,
        objectClass: entry.attributes.find((a) => a.type === "objectClass")
          ?.values as string[] | undefined,
      },
    };

    if (node.type === "folder") {
      node.children = await getLdapStructure(
        client,
        entry.dn,
        maxDepth,
        currentDepth + 1
      );
    }

    result.push(node);
  }

  return result;
};

/**
 * Realiza una búsqueda unificada en LDAP con autenticación administrativa
 * @param filter Filtro de búsqueda LDAP
 * @param baseDN DN base para la búsqueda (opcional)
 * @returns Promesa con los resultados de la búsqueda
 */
export async function unifiedLDAPSearch(
  filter: string, 
  attributes: string[] = ['*'], // Por defecto todos los atributos
  baseDN: string = process.env.LDAP_BASE_DN!
): Promise<any[]> {
  if (!process.env.LDAP_URL || !process.env.LDAP_ADMIN_DN || !process.env.LDAP_ADMIN_PASSWORD) {
    throw new Error("Configuración LDAP incompleta");
  }
  
  const pool = getLDAPPool();
  let client: LDAPClient | null = null;
  
  try {
    client = await pool.getConnection();
    return new Promise((resolve, reject) => {
      const entries: any[] = [];
      client!.search(baseDN, {
        scope: 'sub',
        filter,
        attributes: attributes // Usar los atributos proporcionados
      }, (err: Error | null, res: SearchCallbackResponse) => {
        if (err) {
          return reject(err);
        }
        res.on('searchEntry', (entry: ldap.SearchEntry) => {
          entries.push(entry);
        });
        res.on('error', (error: Error) => {
          reject(error);
        });
        res.on('end', () => {
          resolve(entries);
        });
      });
    });
  } finally {
    if (client) {
      try {
        pool.releaseConnection(client);
      } catch (e) {
        console.error("Error al liberar conexión LDAP:", e);
      }
    }
  }
}

/**
 * Función mejorada para unifiedLDAPSearch que maneja mejor la estructura de datos
 */
export async function unifiedLDAPSearchImproved(
  filter: string, 
  attributes: string[] = ['*'],
  baseDN: string = process.env.LDAP_BASE_DN!
): Promise<any[]> {
  if (!process.env.LDAP_URL || !process.env.LDAP_ADMIN_DN || !process.env.LDAP_ADMIN_PASSWORD) {
    throw new Error("Configuración LDAP incompleta");
  }
  
  const pool = getLDAPPool();
  let client: LDAPClient | null = null;
  
  try {
    client = await pool.getConnection();
    return new Promise((resolve, reject) => {
      const entries: any[] = [];
      client!.search(baseDN, {
        scope: 'sub',
        filter,
        attributes: attributes
      }, (err: Error | null, res: SearchCallbackResponse) => {
        if (err) {
          return reject(err);
        }
        
        res.on('searchEntry', (entry: ldap.SearchEntry) => {
          const entryObject: any = {
            dn: entry.dn.toString()
          };
          
          // ✅ MEJOR MANEJO DE ATRIBUTOS
          if (entry.attributes) {
            entry.attributes.forEach((attr: any) => {
              if (attr.type && attr.values !== undefined) {
                // Convertir siempre a array para consistencia
                entryObject[attr.type] = Array.isArray(attr.values) 
                  ? attr.values 
                  : [attr.values];
              }
            });
          }
          
          console.log(`🔍 [LDAP] Entrada encontrada:`, { 
            dn: entryObject.dn, 
            attributes: Object.keys(entryObject) 
          });
          entries.push(entryObject);
        });
        
        res.on('error', (error: Error) => {
          reject(error);
        });
        
        res.on('end', () => {
          console.log(`📊 [LDAP] Búsqueda completada. Encontrados: ${entries.length} usuarios`);
          resolve(entries);
        });
      });
    });
  } finally {
    if (client) {
      try {
        pool.releaseConnection(client);
      } catch (e) {
        console.error("Error al liberar conexión LDAP:", e);
      }
    }
  }
}



export async function searchLDAPUserForEmail(
  filter: string, 
  attributes: string[] = ['*'],
  baseDN: string = process.env.LDAP_BASE_DN!
): Promise<any[]> {
  if (!process.env.LDAP_URL || !process.env.LDAP_ADMIN_DN || !process.env.LDAP_ADMIN_PASSWORD) {
    throw new Error("Configuración LDAP incompleta");
  }
  
  const pool = getLDAPPool();
  let client: LDAPClient | null = null;
  
  try {
    client = await pool.getConnection();
    return new Promise((resolve, reject) => {
      const entries: any[] = [];
      client!.search(baseDN, {
        scope: 'sub',
        filter,
        attributes: attributes
      }, (err: Error | null, res: SearchCallbackResponse) => {
        if (err) {
          return reject(err);
        }
        
        res.on('searchEntry', (entry: ldap.SearchEntry) => {
          // ✅ Extraer correctamente los atributos
          const userObject: any = {
            dn: entry.dn.toString()
          };
          
          // Extraer todos los atributos solicitados
          if (entry.attributes) {
            entry.attributes.forEach((attr: any) => {
              if (attr.values && attr.values.length > 0) {
                userObject[attr.type] = attr.values.length === 1 ? attr.values[0] : attr.values;
              }
            });
          }
          
          console.log("🔍 Atributos extraídos del usuario:", userObject);
          entries.push(userObject);
        });
        
        res.on('error', (error: Error) => {
          reject(error);
        });
        
        res.on('end', () => {
          console.log(`📊 Búsqueda LDAP completada. Encontrados: ${entries.length} usuarios`);
          resolve(entries);
        });
      });
    });
  } finally {
    if (client) {
      try {
        pool.releaseConnection(client);
      } catch (e) {
        console.error("Error al liberar conexión LDAP:", e);
      }
    }
  }
}
/**
 * Interfaz para la configuración LDAP
 */
export interface LDAPConfig {
  url: string;
  bindDN: string;
  password: string;
  baseDN: string;
  timeout?: number;
}

/**
 * Obtiene la configuración LDAP desde variables de entorno
 * @returns Configuración LDAP
 */
export const getLDAPConfig = (): LDAPConfig => {
  const ldapAdminDN = process.env.LDAP_ADMIN_DN;
  const ldapAdminPassword = process.env.LDAP_ADMIN_PASSWORD;
  const ldapUrl = process.env.LDAP_URL;

  if (!ldapAdminDN || !ldapAdminPassword || !ldapUrl) {
    throw new Error("❌ Configuración LDAP incompleta en variables de entorno");
  }


  return {
    url: ldapUrl,
    bindDN: ldapAdminDN, // ✅ MISMO USUARIO QUE CREACIÓN
    password: ldapAdminPassword, // ✅ MISMA CONTRASEÑA
    baseDN: process.env.LDAP_BASE_DN_Propio || "DC=uniss,DC=edu,DC=cu",
    timeout: 30000,
  };
};

/**
 * Crea una conexión LDAP con la configuración proporcionada
 * @param config Configuración LDAP
 * @returns Cliente LDAP configurado
 */
export const createConnection = (config: LDAPConfig): LDAPClient => {
  // Asegurarse de que la URL es una cadena válida
  const url = config.url || process.env.LDAP_URL;
  
  if (!url) {
    throw new Error("LDAP URL no está configurada");
  }

  const client = createClient({
    url: url,
    reconnect: true,
    tlsOptions: { rejectUnauthorized: false }
  });

  client.on("error", (err) => {
    console.error("LDAP Connection Error:", err);
    client.unbind();
  });

  return client;
};

/**
 * Verifica el estado de una conexión LDAP
 * @param client Cliente LDAP a verificar
 * @returns Promesa que resuelve a true si la conexión está activa
 */
export const checkConnection = async (client: Client): Promise<boolean> => {
  try {
    // Intenta una operación simple para verificar la conexión
    await new Promise<void>((resolve, reject) => {
      client.search("", { scope: 'base', filter: '(objectClass=*)', attributes: [] }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Verifica si un usuario ya es miembro de un grupo LDAP
 * @param userDN DN del usuario
 * @param groupDN DN del grupo
 * @returns Promesa que resuelve a true si el usuario es miembro del grupo
 */
export async function isUserInGroup(userDN: string, groupDN: string): Promise<boolean> {
  const pool = getLDAPPool();
  let client: LDAPClient | null = null;
  
  try {
    client = await pool.getConnection();
    
    return new Promise((resolve, reject) => {
      client!.search(groupDN, {
        scope: 'base',
        filter: '(objectClass=group)',
        attributes: ['member']
      }, (err, res) => {
        if (err) {
          return reject(err);
        }

        let isMember = false;
        
        res.on('searchEntry', (entry) => {
          const memberAttr = entry.attributes.find((attr: LdapAttribute) => attr.type === 'member');
          if (memberAttr && memberAttr.values) {
            // ✅ CORREGIDO: Manejar tanto string como string[]
            const members = Array.isArray(memberAttr.values) 
              ? memberAttr.values 
              : [memberAttr.values];
            
            isMember = members.some((member: string) => 
              member.toLowerCase() === userDN.toLowerCase()
            );
          }
        });
        
        res.on('error', (error) => {
          reject(error);
        });
        
        res.on('end', () => {
          resolve(isMember);
        });
      });
    });
  } finally {
    if (client) {
      pool.releaseConnection(client);
    }
  }
}

/**
 * Agrega un usuario a un grupo LDAP - REPLICA EXACTA de ldap-account.services.ts
 * @param userDN DN del usuario a agregar
 * @param groupDN DN del grupo destino
 * @returns Promesa que se resuelve cuando la operación es completada
 */
export async function addUserToGroup(userDN: string, groupDN: string): Promise<void> {
  // ✅ REPLICAR EXACTAMENTE el comportamiento de ldap-account.services.ts
  const client = createLDAPClient(process.env.LDAP_URL!);
  
  try {
    // Autenticar como en ldap-account.services.ts
    await bindAsync(client, process.env.LDAP_ADMIN_DN!, process.env.LDAP_ADMIN_PASSWORD!);
    
    return new Promise((resolve, reject) => {
      const change = {
        operation: "add",
        modification: {
          type: "member",
          values: [userDN],
        },
      };

      console.log(`🔧 [LDAP] Replicando estructura de ldap-account.services.ts`);

      client.modify(groupDN, change, (err) => {
        if (err) {
          if (err.name === "ConstraintViolationError" || (err as any).code === 20) {
            console.log(`✅ [LDAP] Usuario ya era miembro (ConstraintViolation)`);
            resolve();
          } else {
            console.error(`❌ [LDAP] Error: ${err.message}`);
            reject(new Error(`Error LDAP (${(err as any).code}): ${err.message}`));
          }
        } else {
          console.log(`✅ [LDAP] Usuario agregado al grupo exitosamente`);
          resolve();
        }
      });
    });
  } finally {
    client.unbind();
  }
}
