import { Request, Response } from "express";
import { createLDAPClient, bindAsync, searchAsync, LDAPClient } from "../utils/ldap.utils";
import ldap, {
    Attribute,
  } from "ldapjs";
import { userDnCache } from "../utils/cache.utils";


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