// src/services/user.service.ts
import { createLDAPClient, bindAsync, searchAsync, unifiedLDAPSearch, getLDAPPool } from "../utils/ldap.utils";
import { LDAPClient } from "../utils/ldap.utils";
import { Attribute, SearchOptions } from "ldapjs";
import { userDnCache } from "../utils/cache.utils";
import { auditService } from './audit.services';
import ldap from "ldapjs";

// ✅ INTERFAZ EXPANDIDA CON company Y title
export interface UserData {
  sAMAccountName: string;
  dn: string;
  nombreCompleto: string;
  email: string;
  employeeID: string;
  userPrincipalName: string;
  mail: string;
  displayName: string;
  givenName?: string;
  sn?: string;
  uid?: string;
  company?: string; // ✅ AGREGAR company
  title?: string;   // ✅ AGREGAR title
}

export const getUserProfile = async (username: string): Promise<any> => {
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
    const searchOptions: SearchOptions = {
      filter: `(uid=${username})`,
      scope: "sub",
      attributes: [
        "cn", 
        "uid", 
        "mail", 
        "givenName", 
        "sn", 
        "displayName",
        "company", // ✅ AGREGAR company
        "title"    // ✅ AGREGAR title
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
    const getLdapAttribute = (entry: any, name: string): string => {
      const attributes = entry.attributes as unknown as Attribute[];
      const attr = attributes.find((a) => a.type === name);
      if (!attr || !attr.values || attr.values.length === 0) {
        return "";
      }
      return String(attr.values[0]);
    };
    
    const userData = {
      username: getLdapAttribute(entries[0], "uid"),
      nombreCompleto: getLdapAttribute(entries[0], "cn"),
      email: getLdapAttribute(entries[0], "mail"),
      nombre: getLdapAttribute(entries[0], "givenName"),
      apellido: getLdapAttribute(entries[0], "sn"),
      displayName: getLdapAttribute(entries[0], "displayName"),
      company: getLdapAttribute(entries[0], "company"), // ✅ AGREGAR company
      title: getLdapAttribute(entries[0], "title")      // ✅ AGREGAR title
    };
    
    await auditService.addLogEntry(username, "PROFILE_ACCESS", "Consulta de perfil exitosa");
    return userData;
  } finally {
    if (client) client.unbind();
  }
};

export class UserService {
  
  async getUserData(username: string): Promise<UserData> {
    const cacheKey = `userDn-${username}`;
    const cachedDn = userDnCache.get(cacheKey);
    
    if (cachedDn && this.isValidUserData(cachedDn)) {
      console.log('✅ Datos obtenidos desde caché');
      return cachedDn as UserData;
    }

    const pool = getLDAPPool();
    let client: LDAPClient | null = null;

    try {
      client = await pool.getConnection();
      await bindAsync(client, process.env.LDAP_ADMIN_DN!, process.env.LDAP_ADMIN_PASSWORD!);

      console.log('🔍 Buscando datos de usuario en LDAP');

      const searchFilter = `(|(sAMAccountName=${username})(userPrincipalName=${username}@uniss.edu.cu)(userPrincipalName=${username}))`;
      const searchOptions: ldap.SearchOptions = {
        filter: searchFilter,
        scope: "sub",
        attributes: [
          "sAMAccountName", 
          "cn", 
          "mail", 
          "displayName", 
          "userPrincipalName", 
          "employeeID", 
          "dn",
          "givenName",
          "sn",
          "uid",
          "company", // ✅ AGREGAR company
          "title"    // ✅ AGREGAR title
        ],
      };

      const baseDN = "dc=uniss,dc=edu,dc=cu";
      const entries = await searchAsync(client, baseDN, searchOptions);

      if (entries.length === 0) {
        console.error('❌ Usuario no encontrado en el directorio');
        throw new Error("Usuario no encontrado en el directorio");
      }

      const entry = entries[0];
      console.log('✅ Datos de usuario encontrados');

      // Extraer DN de manera segura
      let userDn: string = 'DN-no-encontrado';
      if ((entry as any).dn) {
        userDn = String((entry as any).dn);
      } else {
        userDn = `CN=${username},OU=UNISS_Users,DC=uniss,DC=edu,DC=cu`;
      }

      // Extraer atributos
      const extractAttr = (attrName: string): string => {
        try {
          const attrs = (entry as any).attributes || [];
          const attr = attrs.find((a: any) => a.type === attrName);
          return attr && attr.values && attr.values[0] ? String(attr.values[0]) : '';
        } catch {
          return '';
        }
      };

      // ✅ OBJETO COMPLETO CON company Y title
      const userData: UserData = {
        sAMAccountName: extractAttr('sAMAccountName') || username,
        dn: userDn,
        nombreCompleto: extractAttr('cn') || extractAttr('displayName') || username,
        email: extractAttr('mail') || extractAttr('userPrincipalName') || `${username}@uniss.edu.cu`,
        employeeID: extractAttr('employeeID') || '',
        userPrincipalName: extractAttr('userPrincipalName') || `${username}@uniss.edu.cu`,
        mail: extractAttr('mail') || extractAttr('userPrincipalName') || `${username}@uniss.edu.cu`,
        displayName: extractAttr('displayName') || extractAttr('cn') || username,
        givenName: extractAttr('givenName') || '',
        sn: extractAttr('sn') || '',
        uid: extractAttr('uid') || username,
        company: extractAttr('company') || '', // ✅ AGREGAR company
        title: extractAttr('title') || ''      // ✅ AGREGAR title
      };
      
      userDnCache.set(cacheKey, userData);
      return userData;

    } catch (error) {
      console.error('❌ Error obteniendo datos de usuario:', error);
      throw error;
    } finally {
      if (client) {
        pool.releaseConnection(client);
      }
    }
  }

  private isValidUserData(obj: any): obj is UserData {
    return obj && 
           typeof obj === 'object' &&
           'sAMAccountName' in obj &&
           'dn' in obj &&
           'nombreCompleto' in obj &&
           'email' in obj &&
           'employeeID' in obj;
  }

  async checkUserExists(username: string): Promise<boolean> {
    try {
      const filter = `(sAMAccountName=${username})`;
      const entries = await unifiedLDAPSearch(filter);
      return entries.length > 0;
    } catch (error) {
      console.error("Error verificando existencia de usuario:", error);
      throw new Error("Error al verificar existencia del usuario");
    }
  }

  extractUsernameFromDN(userDN: string): string {
    const usernameMatch = userDN.match(/CN=([^,]+)/);
    return usernameMatch ? usernameMatch[1] : 'unknown';
  }
}

export const userService = new UserService();