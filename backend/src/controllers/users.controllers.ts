import { Request, Response } from "express";
import { escapeLDAPValue, unifiedLDAPSearch } from "../utils/ldap.utils";
import ldap from "ldapjs";
import { TokenPayload } from "../utils/jwt.utils";

// Definir una interfaz para los atributos LDAP
interface LdapAttribute {
  type: string;
  values: string[];
}

// Mapeo de grupos a descripciones
const mapGroupToDescription = (group: string): string => {
  switch (group) {
    case "CN=internet_est,OU=_Grupos,DC=uniss,DC=edu,DC=cu":
      return "Acceso a internet modalidad estudiante";
    case "CN=internet_prof_vip,OU=_Grupos,DC=uniss,DC=edu,DC=cu":
      return "Acceso a internet modalidad profesor";
    case "CN=wifi_users,OU=_Grupos,DC=uniss,DC=edu,DC=cu":
      return "Usuario de la WiFi institucional";
    case "CN=correo_nac,OU=_Grupos,DC=uniss,DC=edu,DC=cu":
      return "Acceso a correo nacional";
    default:
      return "Grupo desconocido";
  }
};

// Función para convertir timestamp LDAP a milisegundos
function ldapTimestampToMs(timestamp: string): number | null {
  if (!timestamp || timestamp === '0') return null;
  try {
    const ldapTimestamp = BigInt(timestamp);
    const windowsEpoch = BigInt(116444736000000000);
    const unixTimestamp = Number((ldapTimestamp - windowsEpoch) / BigInt(10000));
    return unixTimestamp;
  } catch (error) {
    console.error("Error converting LDAP timestamp:", error);
    return null;
  }
}

// Función para formatear el tiempo restante en días o meses
function formatTimeRemaining(days: number): string {
  if (days >= 30) {
    const months = Math.floor(days / 30);
    return `Vence en ${months} ${months === 1 ? 'mes' : 'meses'}`;
  } else if (days > 0) {
    return `Vence en ${days} ${days === 1 ? 'día' : 'días'}`;
  } else if (days === 0) {
    return 'Vence hoy';
  } else {
    return 'Expirada';
  }
}

// Función para formatear timestamps de LDAP
function formatLdapTimestamp(timestamp: string): string {
  if (!timestamp || timestamp === '0') return 'Nunca';
  
  try {
    const ldapTimestamp = BigInt(timestamp);
    const windowsEpoch = BigInt(116444736000000000);
    const unixTimestamp = Number((ldapTimestamp - windowsEpoch) / BigInt(10000000));
    
    return new Date(unixTimestamp * 1000).toLocaleString('es-ES');
  } catch (error) {
    return 'Fecha no válida';
  }
}

// ✅ NUEVA FUNCIÓN: Obtener información exacta de expiración de contraseña
function getPasswordExpirationInfo(entry: any): any {
  const getAttributeValue = (attrName: string): string => {
    const attribute = entry.attributes.find((attr: any) => attr.type === attrName);
    return attribute && attribute.values && attribute.values.length > 0 
      ? String(attribute.values[0]) 
      : '';
  };

  const userAccountControlValue = parseInt(getAttributeValue('userAccountControl') || '0');
  const passwordNeverExpires = (userAccountControlValue & 0x10000) !== 0; // 65536 = 0x10000

  // Si la contraseña nunca expira
  if (passwordNeverExpires) {
    return {
      passwordExpira: 'No expira',
      diasHastaVencimiento: null,
      tiempoHastaVencimiento: 'No expira',
      fechaExpiracion: 'Nunca',
      expirada: false,
      expiraProximamente: false
    };
  }

  // ✅ Obtener la fecha exacta de expiración calculada por AD
  const passwordExpiryTimeComputed = getAttributeValue('msDS-UserPasswordExpiryTimeComputed');
  
  if (passwordExpiryTimeComputed && passwordExpiryTimeComputed !== '0') {
    try {
      // Convertir el timestamp de AD a fecha
      const expiryTicks = BigInt(passwordExpiryTimeComputed);
      const ticksPerMillisecond = 10000n;
      const millisecondsSince1601 = expiryTicks / ticksPerMillisecond;
      const millisecondsSince1970 = millisecondsSince1601 - 11644473600000n;
      const expiryDate = new Date(Number(millisecondsSince1970));
      
      const ahora = new Date();
      const diasHastaVencimiento = Math.ceil((expiryDate.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        passwordExpira: expiryDate.toLocaleDateString('es-ES'),
        diasHastaVencimiento,
        tiempoHastaVencimiento: formatTimeRemaining(diasHastaVencimiento),
        fechaExpiracion: expiryDate.toISOString(),
        expirada: diasHastaVencimiento <= 0,
        expiraProximamente: diasHastaVencimiento > 0 && diasHastaVencimiento <= 7
      };
    } catch (error) {
      console.error('Error procesando msDS-UserPasswordExpiryTimeComputed:', error);
    }
  }

  // ✅ Fallback: cálculo basado en pwdLastSet (tu método actual)
  const pwdLastSetValue = getAttributeValue('pwdLastSet');
  const pwdLastSetMs = pwdLastSetValue && pwdLastSetValue !== '0' 
    ? ldapTimestampToMs(pwdLastSetValue) 
    : null;

  if (pwdLastSetMs) {
    // Usar la política del dominio (90 días por defecto)
    const MAX_PASSWORD_AGE_DAYS = 90; // Esto deberías obtenerlo de la política real
    const MAX_PASSWORD_AGE_MS = MAX_PASSWORD_AGE_DAYS * 24 * 60 * 60 * 1000;
    
    const passwordExpiraMs = pwdLastSetMs + MAX_PASSWORD_AGE_MS;
    const ahoraMs = Date.now();
    const diasHastaVencimiento = Math.floor((passwordExpiraMs - ahoraMs) / (1000 * 60 * 60 * 24));
    const expiryDate = new Date(passwordExpiraMs);
    
    return {
      passwordExpira: expiryDate.toLocaleDateString('es-ES'),
      diasHastaVencimiento,
      tiempoHastaVencimiento: formatTimeRemaining(diasHastaVencimiento),
      fechaExpiracion: expiryDate.toISOString(),
      expirada: diasHastaVencimiento <= 0,
      expiraProximamente: diasHastaVencimiento > 0 && diasHastaVencimiento <= 7,
      calculado: true // Indica que fue calculado, no obtenido directamente
    };
  }

  // Si no hay información suficiente
  return {
    passwordExpira: 'Desconocido',
    diasHastaVencimiento: null,
    tiempoHastaVencimiento: 'Desconocido',
    fechaExpiracion: null,
    expirada: false,
    expiraProximamente: false
  };
}

// Función auxiliar para formatear datos de usuario
function formatUserData(entry: any): any {
  const getAttributeValue = (attrName: string): string => {
    const attribute = entry.attributes.find((attr: any) => attr.type === attrName);
    return attribute && attribute.values && attribute.values.length > 0 
      ? String(attribute.values[0]) 
      : '';
  };

  // ✅ Obtener información de expiración usando la nueva función
  const passwordInfo = getPasswordExpirationInfo(entry);

  return {
    sAMAccountName: getAttributeValue('sAMAccountName'),
    uid: getAttributeValue('uid'),
    nombreCompleto: getAttributeValue('cn'),
    email: getAttributeValue('mail'),
    nombre: getAttributeValue('givenName'),
    apellido: getAttributeValue('sn'),
    displayName: getAttributeValue('displayName'),
    userPrincipalName: getAttributeValue('userPrincipalName'),
    employeeID: getAttributeValue('employeeID'),
    telefono: getAttributeValue('telephoneNumber'),
    direccion: getAttributeValue('streetAddress'),
    localidad: getAttributeValue('l'),
    provincia: getAttributeValue('st'),
    descripcion: getAttributeValue('description'),
    titulo: getAttributeValue('title'),
    añoAcademico: getAttributeValue('departmentNumber'),
    tipoEmpleado: getAttributeValue('employeeType'),
    facultad: getAttributeValue('ou'),
    carrera: getAttributeValue('department'),
    cuentaHabilitada: (parseInt(getAttributeValue('userAccountControl') || '0') & 2) === 0, // 2 = ACCOUNTDISABLE
    fechaCreacion: getAttributeValue('whenCreated'),
    fechaModificacion: getAttributeValue('whenChanged'),
    ultimoInicioSesion: formatLdapTimestamp(getAttributeValue('lastLogon')),
    ultimoCambioPassword: formatLdapTimestamp(getAttributeValue('pwdLastSet')),
    
    // ✅ NUEVA INFORMACIÓN MEJORADA DE EXPIRACIÓN
    userAccountControl: parseInt(getAttributeValue('userAccountControl') || '0'),
    passwordExpira: passwordInfo.passwordExpira,
    diasHastaVencimiento: passwordInfo.diasHastaVencimiento,
    tiempoHastaVencimiento: passwordInfo.tiempoHastaVencimiento,
    fechaExpiracion: passwordInfo.fechaExpiracion,
    passwordExpirada: passwordInfo.expirada,
    passwordExpiraProximamente: passwordInfo.expiraProximamente,
    passwordNuncaExpira: passwordInfo.tiempoHastaVencimiento === 'No expira',
    calculado: passwordInfo.calculado || false
  };
}

export const searchUsers = async (
  req: Request<{}, {}, { searchTerm: string }>,
  res: Response
): Promise<void> => {
  try {
    const { searchTerm } = req.body;

    if (!searchTerm) {
      res.status(400).json({ error: "Campo searchTerm requerido" });
      return;
    }

    const entries = await unifiedLDAPSearch(searchTerm);

    if (entries.length === 0) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    const userData = entries[0].attributes.reduce(
      (acc: Record<string, any>, attr: LdapAttribute) => {
        acc[attr.type] = attr.values?.length === 1 ? attr.values[0] : attr.values;
        return acc;
      },
      {} as Record<string, any>
    );

    userData.dn = entries[0].dn;

    res.json(userData);
  } catch (error: any) {
    res.status(500).json({
      error: "Error en búsqueda",
      details: error.message,
    });
  }
};

export const getUserDetails = async (
  req: Request<{}, {}, { searchTerm: string }>,
  res: Response
): Promise<void> => {
  try {
    const { searchTerm } = req.body;

    if (!searchTerm) {
      res.status(400).json({ error: "Campo searchTerm requerido" });
      return;
    }

    // ✅ INCLUIR EL NUEVO ATRIBUTO EN LA BÚSQUEDA
    const entries = await unifiedLDAPSearch(searchTerm, [
      'msDS-UserPasswordExpiryTimeComputed', // ✅ NUEVO ATRIBUTO
      'accountExpires',
      'sAMAccountName',
      'mail',
      'displayName',
      'userAccountControl',
      'pwdLastSet',
      'lockoutTime',
      'studeninfo',
      'logonCount',
      'memberOf'
    ]);

    if (entries.length === 0) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    // ✅ OBTENER INFORMACIÓN DE EXPIRACIÓN EXACTA
    const passwordInfo = getPasswordExpirationInfo(entries[0]);

    const getAttributeValue = (attrName: string): string => {
      const attribute = entries[0].attributes.find((attr: any) => attr.type === attrName);
      return attribute && attribute.values && attribute.values.length > 0 
        ? String(attribute.values[0]) 
        : '';
    };

    const accountExpiresValue = getAttributeValue("accountExpires");

    const userData = {
      username: getAttributeValue('sAMAccountName'),
      email: getAttributeValue('mail'),
      displayName: getAttributeValue('displayName'),
      accountEnabled: (parseInt(getAttributeValue('userAccountControl') || '0') & 2) === 0,
      lastPasswordChange: formatLdapTimestamp(getAttributeValue('pwdLastSet')),
      accountLocked: getAttributeValue('lockoutTime') !== "0",
      accountExpires: accountExpiresValue === "0" || accountExpiresValue === "9223372036854775807"
        ? "Nunca"
        : formatLdapTimestamp(accountExpiresValue),
      groups: entries[0].attributes
        .filter((attr: LdapAttribute) => attr.type === "memberOf")
        .flatMap((attr: LdapAttribute) => attr.values)
        .map(mapGroupToDescription) || [],
      lastLogon: formatLdapTimestamp(getAttributeValue('studeninfo') || "0"),
      logonCount: getAttributeValue('logonCount') || 0,
      
      // ✅ NUEVA INFORMACIÓN DE EXPIRACIÓN DE CONTRASEÑA
      passwordExpiration: {
        fechaExpiracion: passwordInfo.fechaExpiracion,
        diasHastaVencimiento: passwordInfo.diasHastaVencimiento,
        estado: passwordInfo.tiempoHastaVencimiento,
        expirada: passwordInfo.expirada,
        expiraProximamente: passwordInfo.expiraProximamente,
        nuncaExpira: passwordInfo.tiempoHastaVencimiento === 'No expira'
      }
    };

    res.json(userData);
  } catch (error: any) {
    res.status(500).json({
      error: "Error al obtener los detalles del usuario",
      details: error.message,
    });
  }
};

export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const sAMAccountName = (req as any).user.sAMAccountName;
    
    if (!sAMAccountName) {
      res.status(401).json({ error: "Usuario no autenticado" });
      return;
    }

    const safeUsername = escapeLDAPValue(sAMAccountName);
    const filter = `(|(sAMAccountName=${safeUsername})(uid=${safeUsername}))`;
    
    // ✅ INCLUIR EL NUEVO ATRIBUTO EN LA BÚSQUEDA DEL PERFIL
    const attributes = [
      'cn',
      'sAMAccountName', 
      'uid',
      'mail',
      'givenName',
      'sn',
      'displayName',
      'userPrincipalName',
      'employeeID',
      'telephoneNumber',
      'streetAddress',
      'l',
      'st',
      'description',
      'title',
      'departmentNumber',
      'employeeType',
      'ou',
      'department',
      'userAccountControl',
      'whenCreated',
      'whenChanged',
      'lastLogon',
      'pwdLastSet',
      'msDS-UserPasswordExpiryTimeComputed' // ✅ NUEVO ATRIBUTO CLAVE
    ];

    const entries = await unifiedLDAPSearch(filter, attributes);

    if (entries.length === 0) {
      res.status(404).json({ message: "Usuario no encontrado en LDAP" });
      return;
    }

    const userData = formatUserData(entries[0]);
    
    res.json({
      success: true,
      user: userData
    });
    
  } catch (error: any) {
    console.error("Error al obtener perfil de usuario:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ NUEVO ENDPOINT: Obtener específicamente información de expiración de contraseña
export const getPasswordExpiration = async (req: Request, res: Response): Promise<void> => {
  try {
    const sAMAccountName = (req as any).user?.sAMAccountName || req.body.username;
    
    if (!sAMAccountName) {
      res.status(400).json({ error: "Nombre de usuario requerido" });
      return;
    }

    const safeUsername = escapeLDAPValue(sAMAccountName);
    const filter = `(|(sAMAccountName=${safeUsername})(uid=${safeUsername}))`;
    
    const attributes = [
      'sAMAccountName',
      'displayName',
      'userAccountControl',
      'pwdLastSet',
      'msDS-UserPasswordExpiryTimeComputed'
    ];

    const entries = await unifiedLDAPSearch(filter, attributes);

    if (entries.length === 0) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    const passwordInfo = getPasswordExpirationInfo(entries[0]);
    
    res.json({
      success: true,
      username: sAMAccountName,
      displayName: entries[0].attributes.find((attr: any) => attr.type === 'displayName')?.values[0] || '',
      passwordExpiration: passwordInfo
    });
    
  } catch (error: any) {
    console.error("Error al obtener expiración de contraseña:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ FUNCIÓN MODIFICADA: Obtener trazas y logs del usuario desde el token
export const getUserAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    // Obtener el usuario del token (ya verificado por el middleware)
    const user = (req as any).user as TokenPayload;
    const sAMAccountName = user?.sAMAccountName;

    if (!sAMAccountName) {
      res.status(400).json({ error: "Nombre de usuario no encontrado en el token" });
      return;
    }

    const safeUsername = escapeLDAPValue(sAMAccountName);
    const filter = `(|(sAMAccountName=${safeUsername})(uid=${safeUsername}))`;
    
    // Atributos relacionados con logs y auditoría
    const attributes = [
      'sAMAccountName',
      'displayName',
      'lastLogon',
      'lastLogonTimestamp',
      'lastLogoff',
      'logonCount',
      'badPasswordTime',
      'badPwdCount',
      'lockoutTime',
      'pwdLastSet',
      'whenCreated',
      'whenChanged',
      'accountExpires',
      'userAccountControl',
      'msDS-UserPasswordExpiryTimeComputed'
    ];

    const entries = await unifiedLDAPSearch(filter, attributes);

    if (entries.length === 0) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    const getAttributeValue = (attrName: string): string => {
      const attribute = entries[0].attributes.find((attr: any) => attr.type === attrName);
      return attribute && attribute.values && attribute.values.length > 0 
        ? String(attribute.values[0]) 
        : '';
    };

    // Obtener información de expiración
    const passwordInfo = getPasswordExpirationInfo(entries[0]);

    // Formatear los logs del usuario
    const userLogs = {
      // Información básica
      username: sAMAccountName,
      displayName: getAttributeValue('displayName'),
      employeeID: user.employeeID, // Del token
      nombreCompleto: user.nombreCompleto, // Del token
      email: user.email, // Del token
      
      // Logs de autenticación
      authentication: {
        lastSuccessfulLogon: formatLdapTimestamp(getAttributeValue('lastLogon')),
        lastLogonTimestamp: formatLdapTimestamp(getAttributeValue('lastLogonTimestamp')),
        lastLogoff: formatLdapTimestamp(getAttributeValue('lastLogoff')),
        totalLogons: parseInt(getAttributeValue('logonCount') || '0'),
        failedLogonTime: formatLdapTimestamp(getAttributeValue('badPasswordTime')),
        failedLogonCount: parseInt(getAttributeValue('badPwdCount') || '0'),
        accountLocked: getAttributeValue('lockoutTime') !== "0" && getAttributeValue('lockoutTime') !== "",
        lockoutTime: getAttributeValue('lockoutTime') !== "0" ? formatLdapTimestamp(getAttributeValue('lockoutTime')) : 'No bloqueada'
      },
      
      // Logs de contraseña
      password: {
        lastChange: formatLdapTimestamp(getAttributeValue('pwdLastSet')),
        expiration: {
          fechaExpiracion: passwordInfo.fechaExpiracion,
          diasHastaVencimiento: passwordInfo.diasHastaVencimiento,
          estado: passwordInfo.tiempoHastaVencimiento,
          expirada: passwordInfo.expirada,
          expiraProximamente: passwordInfo.expiraProximamente
        },
        neverExpires: passwordInfo.tiempoHastaVencimiento === 'No expira'
      },
      
      // Información de la cuenta
      account: {
        created: formatLdapTimestamp(getAttributeValue('whenCreated')),
        lastModified: formatLdapTimestamp(getAttributeValue('whenChanged')),
        expires: getAttributeValue('accountExpires') === "0" || 
                 getAttributeValue('accountExpires') === "9223372036854775807"
          ? "Nunca" 
          : formatLdapTimestamp(getAttributeValue('accountExpires')),
        enabled: (parseInt(getAttributeValue('userAccountControl') || '0') & 2) === 0,
        passwordRequired: (parseInt(getAttributeValue('userAccountControl') || '0') & 32) === 0
      },
      
      // Estadísticas resumen
      statistics: {
        daysSinceLastLogon: calculateDaysSince(getAttributeValue('lastLogon')),
        daysSincePasswordChange: calculateDaysSince(getAttributeValue('pwdLastSet')),
        accountAgeDays: calculateDaysSince(getAttributeValue('whenCreated')),
        securityStatus: getSecurityStatus(
          parseInt(getAttributeValue('badPwdCount') || '0'),
          getAttributeValue('lockoutTime') !== "0",
          passwordInfo.expirada
        )
      }
    };

    res.json({
      success: true,
      logs: userLogs,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error("Error al obtener logs del usuario:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Función auxiliar para calcular días desde un timestamp LDAP
function calculateDaysSince(ldapTimestamp: string): number | null {
  if (!ldapTimestamp || ldapTimestamp === '0') return null;
  
  try {
    const timestampMs = ldapTimestampToMs(ldapTimestamp);
    if (!timestampMs) return null;
    
    const now = Date.now();
    const diffMs = now - timestampMs;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  } catch (error) {
    return null;
  }
}

// Función para determinar el estado de seguridad
function getSecurityStatus(
  failedAttempts: number, 
  isLocked: boolean, 
  isExpired: boolean
): string {
  if (isLocked) return 'CRITICAL';
  if (isExpired) return 'HIGH';
  if (failedAttempts > 5) return 'MEDIUM';
  if (failedAttempts > 0) return 'LOW';
  return 'NORMAL';
}

// ✅ FUNCIÓN PARA ADMINISTRADORES: Obtener logs de cualquier usuario
export const getUserAuditLogsAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params; // Desde parámetro de ruta
    const currentUser = (req as any).user as TokenPayload; // Usuario que hace la solicitud
    
    // Verificar permisos de administrador (aquí debes implementar tu lógica)
    if (!isAdmin(currentUser)) {
      res.status(403).json({ error: "No tiene permisos de administrador" });
      return;
    }

    if (!username) {
      res.status(400).json({ error: "Nombre de usuario requerido" });
      return;
    }

    // ... resto del código igual que getUserAuditLogs pero con el username del parámetro
    const safeUsername = escapeLDAPValue(username);
    // ... (misma lógica que getUserAuditLogs)
    
  } catch (error: any) {
    console.error("Error al obtener logs del usuario (admin):", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Función auxiliar para verificar permisos de administrador
function isAdmin(user: TokenPayload): boolean {
  // Implementa tu lógica de verificación de administrador
  // Por ejemplo, verificar contra una lista de administradores o un atributo LDAP
  const adminUsers = ['admin1', 'admin2']; // Lista de administradores
  return adminUsers.includes(user.sAMAccountName);
}