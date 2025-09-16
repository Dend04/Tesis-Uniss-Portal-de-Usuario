import { createLDAPClient, bindAsync, searchAsync, LDAPClient, getLDAPPool, unifiedLDAPSearch } from "../utils/ldap.utils";
import ldap, {
    Attribute,
  } from "ldapjs";
import { userDnCache } from "../utils/cache.utils";


// Autenticación: Valida credenciales contra servidor LDAP
// [!] Considerar migrar a estrategia passport-ldap
export const authenticateUser = async (username: string, password: string): Promise<void> => {
  const pool = getLDAPPool();
  let client: LDAPClient | null = null;

  try {
    client = await pool.getConnection();
    
    // Intentar diferentes formatos de nombre de usuario
    const authAttempts = [
      username, // sAMAccountName
      `${username}@uniss.edu.cu`, // UPN
      `UNISS\\${username}`, // formato NT (DOMAIN\username)
      // Agregar formato de dominio completo como última opción
      `uniss.edu.cu\\${username}` // Formato con dominio completo
    ];

    for (const authName of authAttempts) {
      try {
        console.log(`Intentando autenticar como: ${authName}`);
        await bindAsync(client, authName, password);
        console.log(`Autenticación exitosa como: ${authName}`);
        return;
      } catch (attemptError) {
        // Verificar el tipo de error antes de acceder a .message
        const errorMessage = attemptError instanceof Error 
          ? attemptError.message 
          : String(attemptError);
        console.log(`Falló autenticación como ${authName}:`, errorMessage);
        // Continuar con el siguiente intento
      }
    }

    // Si todos los intentos fallan
    throw new Error("Todos los métodos de autenticación fallaron");
    
  } catch (authError: any) {
    console.log("Autenticación fallida:", authError.message);
    
    // Verificar si el usuario existe
    const userExists = await checkUserExists(username);
    if (!userExists) {
      throw new Error("Usuario no encontrado");
    }
    
    // Obtener detalles del usuario para diagnóstico
    try {
      const userData = await getUserData(username);
      console.log("Datos del usuario para diagnóstico:", {
        dn: userData.dn,
        sAMAccountName: userData.sAMAccountName,
        userPrincipalName: userData.userPrincipalName,
        employeeID: userData.employeeID
      });
    } catch (diagError) {
      // Verificar el tipo de error antes de acceder a .message
      const errorMessage = diagError instanceof Error 
        ? diagError.message 
        : String(diagError);
      console.log("Error obteniendo datos para diagnóstico:", errorMessage);
    }
    
    throw new Error(`Credenciales inválidas: ${authError.message}`);
  } finally {
    if (client) {
      pool.releaseConnection(client);
    }
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
        fromCache: true,
      };
    }
  
    let client: LDAPClient | null = null;
    try {
      if (!process.env.LDAP_URL || !process.env.LDAP_ADMIN_DN || !process.env.LDAP_ADMIN_PASSWORD) {
        throw new Error("Configuración LDAP incompleta");
      }
  
      client = createLDAPClient(process.env.LDAP_URL);
      await bindAsync(client, process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);
  
      // Determinar el formato de búsqueda basado en el username
      let searchFilter: string;
      if (username.includes('@')) {
        // Si ya es un UPN, buscar por userPrincipalName
        searchFilter = `(userPrincipalName=${username})`;
      } else {
        // Si no, buscar por sAMAccountName y también por UPN con el dominio agregado
        searchFilter = `(|(sAMAccountName=${username})(userPrincipalName=${username}@uniss.edu.cu))`;
      }
  
      const searchOptions: ldap.SearchOptions = {
        filter: searchFilter,
        scope: "sub",
        attributes: [
          "cn", "sAMAccountName", "uid", "mail", "givenName", 
          "sn", "displayName", "userPrincipalName", "employeeID"
        ],
      };
  
      // Buscar en la base DN correcta (ajusta según tu estructura)
      const baseDN = "dc=uniss,dc=edu,dc=cu"; // O la OU específica donde están tus usuarios
      const entries = await searchAsync(client, baseDN, searchOptions);
  
      if (entries.length === 0) {
        throw new Error("Usuario no encontrado");
      }
  
      const getLdapAttribute = (entry: ldap.SearchEntry, name: string): string => {
        const attributes = entry.attributes as unknown as Attribute[];
        const attr = attributes.find((a) => a.type === name);
        return attr && attr.values && attr.values.length > 0 ? String(attr.values[0]) : "";
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
        employeeID: getLdapAttribute(entries[0], "employeeID"),
      };
  
      // Guardar en caché
      userDnCache.set(`userDn-${sAMAccountName}`, userData);
      userDnCache.set(cacheKey, userData);
  
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

  /**
 * Verifica si un usuario existe en LDAP usando sAMAccountName
 * @param username Nombre de usuario (sAMAccountName)
 * @returns Promesa que resuelve a true si el usuario existe, false si no
 */
export const checkUserExists = async (username: string): Promise<boolean> => {
  try {
    const filter = `(sAMAccountName=${username})`;
    const entries = await unifiedLDAPSearch(filter);
    return entries.length > 0;
  } catch (error) {
    console.error("Error al buscar usuario en LDAP:", error);
    throw new Error("Error al verificar existencia del usuario en LDAP");
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