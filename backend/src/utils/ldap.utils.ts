// src/utils/ldap.utils.ts
import ldap, {
  Client,
  SearchEntry as LdapSearchEntry,
  Attribute,
  createClient,
} from "ldapjs";
import { Request, Response } from "express";
import { LdapTreeNode } from "../interface/ldap-tree.interface";
import { Worker } from "worker_threads";
import path from "path";
import { ClientOptions } from "ldapts";
import NodeCache from "node-cache";
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

export function escapeLDAPValue(value: string): string {
  return value
    .replace(/\\/g, '\\5c')
    .replace(/\*/g, '\\2a')
    .replace(/\(/g, '\\28')
    .replace(/\)/g, '\\29')
    .replace(/\u0000/g, '\\00')
    .replace(/\//g, '\\2f')
    .replace(/(^ | $)/g, (m) => `\\${m.charCodeAt(0).toString(16)}`);
}

const cache: { [key: string]: ldap.SearchEntry[] } = {}; // Objeto de caché
const userDnCache = new NodeCache({ stdTTL: 3600 }); // 1 hora de cache

export interface SearchEntry extends LdapSearchEntry {
  parsedAttributes: Record<string, any>;
}

export type LDAPClient = ldap.Client;

// Conexión LDAP: Crea y configura cliente con manejo de reconexión
export function createLDAPClient(url: string): Client {
  // Forzar conexión LDAPS
  const secureUrl = url.startsWith('ldap://') 
    ? url.replace('ldap://', 'ldaps://') 
    : url.startsWith('ldaps://') 
      ? url 
      : `ldaps://${url}`;
  
  return createClient({
    url: secureUrl,
    tlsOptions: {
      rejectUnauthorized: false // Solo para desarrollo
    },
    timeout: 30000,
    connectTimeout: 10000
  });
}


// Autenticación: Promisifica método bind para uso con async/await
export const bindAsync = (
  client: LDAPClient,
  username: string,
  password: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    client.bind(username, password, (err) => {
      err ? reject(err) : resolve();
    });
  });
};

// Seguridad: Cambia contraseña usuario validando entorno y usando admin
export const ldapChangePassword = async (
  username: string,
  newPassword: string
): Promise<void> => {
  if (
    !process.env.LDAP_URL ||
    !process.env.LDAP_ADMIN_DN ||
    !process.env.LDAP_ADMIN_PASSWORD
  ) {
    throw new Error("Configuración LDAP incompleta");
  }

  const client = createLDAPClient(process.env.LDAP_URL);

  try {
    // Autenticación como admin
    await bindAsync(
      client,
      process.env.LDAP_ADMIN_DN,
      process.env.LDAP_ADMIN_PASSWORD
    );

    const userDN = `uid=${username},ou=users,dc=uniss,dc=edu,dc=cu`;

    // Codificación correcta para Active Directory
    const encodedPassword = Buffer.from(`"${newPassword}"`, "utf16le");

    const modification = new ldap.Attribute({
      type: "userPassword",
      values: [newPassword], // Sin buffers
    });

    const change = new ldap.Change({
      operation: "replace",
      modification: modification,
    });

    await new Promise<void>((resolve, reject) => {
      client.modify(userDN, change, (err: Error | null) => {
        err ? reject(new Error(`Error LDAP: ${err.message}`)) : resolve();
      });
    });
  } finally {
    client.unbind();
  }
};

// Autenticación: Valida credenciales contra servidor LDAP
// [!] Considerar migrar a estrategia passport-ldap
export const authenticateUser = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!process.env.LDAP_URL) {
    throw new Error("Configuración LDAP no disponible");
  }

  const client = createLDAPClient(process.env.LDAP_URL);

  try {
    const userPrincipalName = username.includes("@")
      ? username
      : `${username}@uniss.edu.cu`;

    await bindAsync(client, userPrincipalName, password);
  } finally {
    client.unbind();
  }
};

// Auditoría: Registra acción en estructura LDAP específica para logs
export const addLogEntry = async (
  username: string,
  action: string,
  details: string
): Promise<void> => {
  if (
    !process.env.LDAP_URL ||
    !process.env.LDAP_ADMIN_DN ||
    !process.env.LDAP_ADMIN_PASSWORD
  ) {
    throw new Error("Configuración LDAP incompleta");
  }

  const client = createLDAPClient(process.env.LDAP_URL);

  try {
    await bindAsync(
      client,
      process.env.LDAP_ADMIN_DN,
      process.env.LDAP_ADMIN_PASSWORD
    );

    const logEntry = {
      cn: `${username}-${Date.now()}`,
      objectClass: "logEntry",
      action: action,
      timestamp: new Date().toISOString(),
      userDN: `uid=${username},ou=users,dc=uniss,dc=edu,dc=cu`,
      details: details,
    };

    const logDN = `cn=${logEntry.cn},ou=logs,dc=uniss,dc=edu,dc=cu`;

    await new Promise<void>((resolve, reject) => {
      // Ahora TypeScript reconocerá el método add
      client.add(logDN, logEntry, (err: Error | null) => {
        if (err) {
          console.error("Error escribiendo log:", err);
          reject(err);
          return;
        }
        resolve();
      });
    });
  } finally {
    client.unbind();
  }
};

// Búsqueda: Promisifica búsqueda LDAP con manejo de resultados/errores
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

// Perfil: Obtiene datos básicos usuario por UID
// [!] Validar existencia de atributos requeridos
export const getUserData = async (username: string): Promise<any> => {
  const cacheKey = `userDn-${username}`;
  const cachedDn = userDnCache.get(cacheKey);
  if (cachedDn) {
    return {
      ...cachedDn,
      fromCache: true, // Para debug
    };
  }
  let client: LDAPClient | null = null;
  try {
    if (
      !process.env.LDAP_URL ||
      !process.env.LDAP_ADMIN_DN ||
      !process.env.LDAP_ADMIN_PASSWORD
    ) {
      throw new Error("Configuración LDAP incompleta");
    }

    client = createLDAPClient(process.env.LDAP_URL);
    await bindAsync(
      client,
      process.env.LDAP_ADMIN_DN,
      process.env.LDAP_ADMIN_PASSWORD
    );

    const searchOptions: ldap.SearchOptions = {
      filter: `(|(sAMAccountName=${username})(userPrincipalName=${username}))`,
      scope: "sub",
      attributes: [
        "cn",
        "sAMAccountName",
        "uid",
        "mail",
        "givenName",
        "sn",
        "displayName",
        "userPrincipalName",
        "employeedID",
      ],
    };

    const entries = await searchAsync(
      client,
      "ou=UNISS_Users,dc=uniss,dc=edu,dc=cu",
      searchOptions
    );

    if (entries.length === 0) {
      throw new Error("Usuario no encontrado");
    }

    const getLdapAttribute = (
      entry: ldap.SearchEntry,
      name: string
    ): string => {
      const attributes = entry.attributes as unknown as Attribute[];
      const attr = attributes.find((a) => a.type === name);

      if (!attr || !attr.values || attr.values.length === 0) {
        return "";
      }

      return String(attr.values[0]);
    };
    const userDn = entries[0].dn;
    const sAMAccountName = getLdapAttribute(entries[0], "sAMAccountName");
    const userData = {
      sAMAccountName,
      dn: userDn,
      username: getLdapAttribute(entries[0], "uid"),
      nombreCompleto: getLdapAttribute(entries[0], "cn"),
      email: getLdapAttribute(entries[0], "mail"),
      nombre: getLdapAttribute(entries[0], "givenName"),
      apellido: getLdapAttribute(entries[0], "sn"),
      displayName: getLdapAttribute(entries[0], "displayName"),
      employeeID: getLdapAttribute(entries[0], "employeeID"), // Corregir typo
    };

    // Guardar en caché usando sAMAccountName como clave principal
    userDnCache.set(`userDn-${sAMAccountName}`, userData);
    userDnCache.set(cacheKey, userData); // Guardar también con username original

    return userData;
  } finally {
    if (client) client.unbind();
  }
};



// Estructura: Genera árbol jerárquico de nodos LDAP (recursivo)
// [!] Limitar profundidad máxima en producción
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

export async function unifiedLDAPSearch(filter: string, baseDN: string = process.env.LDAP_BASE_DN!): Promise<any[]> {
  // Verificar que las variables de entorno estén definidas
  if (!process.env.LDAP_URL || !process.env.LDAP_ADMIN_DN || !process.env.LDAP_ADMIN_PASSWORD) {
    throw new Error("Configuración LDAP incompleta");
  }

  const client = createLDAPClient(process.env.LDAP_URL);
  
  try {
    await bindAsync(client, process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);
    
    return new Promise((resolve, reject) => {
      const entries: any[] = [];
      
      client.search(baseDN, {
        scope: 'sub',
        filter,
        attributes: ['sAMAccountName', 'uid']
      }, (err, res) => {
        if (err) {
          return reject(err);
        }
        
        res.on('searchEntry', (entry) => {
          entries.push(entry);
        });
        
        res.on('error', (error) => {
          reject(error);
        });
        
        res.on('end', () => {
          resolve(entries);
        });
      });
    });
  } finally {
    client.unbind();
  }
}

export const addAsync = (client: Client, dn: string, entry: object): Promise<void> => {
  return new Promise((resolve, reject) => {
    client.add(dn, entry, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};
//***************************************************************************************************************************************
//***************************************************************************************************************************************
//***************************************************************************************************************************************
//***************************************************************************************************************************************
//***************************************************************************************************************************************
//***************************************************************************************************************************************
//***************************************************************************************************************************************
//***************************************************************************************************************************************
//***************************************************************************************************************************************
//***************************************************************************************************************************************
//***************************************************************************************************************************************
//***************************************************************************************************************************************
//***************************************************************************************************************************************
//***************************************************************************************************************************************
//***************************************************************************************************************************************
//***************************************************************************************************************************************
//***************************************************************************************************************************************
//***************************************************************************************************************************************
//***************************************************************************************************************************************
//***************************************************************************************************************************************
//***************************************************************************************************************************************

export interface LDAPConfig {
  url: string;
  bindDN: string;
  password: string;
  baseDN: string;
  timeout?: number;
}

export const getLDAPConfig = (): LDAPConfig => ({
  url: process.env.LDAP_URL || "ldaps://10.16.13.8:636",
  bindDN:
    process.env.LDAP_ADMIN_DN ||
    "CN=api-user,OU=ServiceAccounts,DC=uniss,DC=edu,DC=cu",
  password: process.env.LDAP_ADMIN_PASSWORD || "securePassword123",
  baseDN: "DC=uniss,DC=edu,DC=cu",
  timeout: 30000,
});

export const createConnection = (config: LDAPConfig): LDAPClient => {
  // Asegurarse de que la URL es una cadena válida
  const url = config.url || process.env.LDAP_URL;
  
  if (!url) {
    throw new Error("LDAP URL no está configurada");
  }

  const client = createClient({
    url: url, // Ahora es siempre string
    reconnect: true,
    tlsOptions: { rejectUnauthorized: false }
  });

  client.on("error", (err) => {
    console.error("LDAP Connection Error:", err);
    client.unbind();
  });

  return client;
};
