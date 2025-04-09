// src/controllers/auth.controller.ts
import { Request, RequestHandler, Response } from "express";
import {
  authenticateUser,
  createLDAPClient,
  bindAsync,
  ldapChangePassword,
  addLogEntry,
  searchAsync,
  LDAPClient,
  getUserData,
  unifiedLDAPSearch,
} from "../utils/ldap.utils"; // Agregar las importaciones faltantes
import { generateTokens, TokenPayload, verifyToken } from "../utils/jwt.utils";
import * as ldap from "ldapjs";
import { Attribute } from "ldapts";
import { CustomSearchEntry } from "../interface/ildapInterface";
import NodeCache from "node-cache";

const userDnCache = new NodeCache({
  stdTTL: 3600, // 1 hora en segundos
  checkperiod: 600, // Verificar caducidad cada 10 minutos
});

// 1. Definir interfaz para el usuario LDAP
interface LDAPUser {
  sAMAccountName: string;
  employeeID?: string; // Atributo opcional
  // Agrega otros atributos que necesites
  cn?: string;
  mail?: string;
}

// 2. Tipar la entrada LDAP
/* const ldapUser = entries[0] as unknown as LDAPUser; // Conversión de tipo
 */
// 3. Acceder al employeeID
/* const employeeID = ldapUser.employeeID; */

export const loginController = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    await authenticateUser(req, res);
    const ldapUser = await getUserData(username);

    // Asegurar que username siempre tenga valor
    const effectiveUsername =
      username.trim() !== "" ? username : ldapUser.sAMAccountName;

    const tokens = generateTokens({
      sAMAccountName: ldapUser.sAMAccountName, // Campo clave para el token
      username: effectiveUsername,
    });

    res.json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        ...ldapUser,
        username: effectiveUsername, // Forzar campo en respuesta
      },
    });
  } catch (error) {
    console.error("Error en loginController:", error);
    res.status(500).json({ success: false, message: "Error interno" });
  }
};

// Función para agregar EmployedID a LDAP
export const checkAndUpdateEmployeeID = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as { username?: string };

    if (!user?.username) {
      res.status(401).json({ error: "Usuario no autenticado" });
      return;
    }

    // Usa la interfaz para tipar las entradas
    const entries: CustomSearchEntry[] = await unifiedLDAPSearch(user.username);

    if (entries.length === 0) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    const ldapUser = entries[0];
    const employeeID = ldapUser.employeeID;

    if (employeeID) {
      res.status(400).json({ message: "El campo employeeID ya existe." });
    } else {
      res.status(200).json({ message: "Por favor, complete su employeeID." });
    }
  } catch (error) {
    console.error("Error en checkAndUpdateEmployeeID:", error);
    res.status(500).json({ success: false, message: "Error interno" });
  }
};

// Añadir helper modifyAsync en ldap.utils.ts
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
export const changePasswordController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // 1. Obtener sAMAccountName del token
    const user = (req as any).user as { sAMAccountName: string };
    const sAMAccountName = user?.sAMAccountName;

    if (!sAMAccountName) {
      res
        .status(401)
        .json({ error: "Token inválido o usuario no identificado" });
      return;
    }

    // 2. Obtener DN desde cache o LDAP
    let userDN: string;
    const cachedData = userDnCache.get(`user-${sAMAccountName}`) as {
      dn?: string;
    };

    if (cachedData?.dn) {
      userDN = cachedData.dn;
    } else {
      // Buscar en LDAP si no está en caché
      const ldapUser = await getUserData(sAMAccountName);
      userDN = ldapUser.dn;
      userDnCache.set(`user-${sAMAccountName}`, ldapUser);
    }

    // 3. Validar nueva contraseña
    const { newPassword } = req.body;
    const errors: string[] = [];

    // Ejemplo de validaciones

    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    // 4. Cambiar contraseña
    try {
      await ldapChangePassword(userDN, newPassword);

      // Actualizar caché
      userDnCache.del(`user-${sAMAccountName}`);

      await addLogEntry(sAMAccountName, "PASSWORD_CHANGE", "Cambio exitoso");
      res.status(200).json({
        success: true,
        message: `¡Contraseña actualizada para ${sAMAccountName}!`,
      });
    } catch (error) {
      userDnCache.del(`user-${sAMAccountName}`);
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      res.status(500).json({
        error: "Error al actualizar contraseña",
        details: message,
      });
    }
  } catch (error) {
    console.error("Error en changePasswordController:", error);
    const message = error instanceof Error ? error.message : "Error interno";
    res.status(500).json({
      success: false,
      error: message,
    });
  }
};
export const getUserProfileController = async (
  req: Request,
  res: Response
): Promise<void> => {
  // <-- Añadir tipo de retorno explícito
  let client: LDAPClient | null = null;

  try {
    // 1. Obtener usuario del token
    const user = (req as any).user as TokenPayload;
    if (!user?.username) {
      res.status(401).json({ error: "No autorizado" });
      return; // <-- Solo enviar respuesta sin retornar valor
    }

    // 2. Validar configuración LDAP
    if (
      !process.env.LDAP_URL ||
      !process.env.LDAP_ADMIN_DN ||
      !process.env.LDAP_ADMIN_PASSWORD
    ) {
      throw new Error("Configuración LDAP incompleta");
    }

    // 3. Conectar y autenticar como admin
    client = createLDAPClient(process.env.LDAP_URL);
    await bindAsync(
      client,
      process.env.LDAP_ADMIN_DN,
      process.env.LDAP_ADMIN_PASSWORD
    );

    // 4. Buscar usuario en LDAP
    const searchOptions: ldap.SearchOptions = {
      filter: `(uid=${user.username})`,
      scope: "sub",
      attributes: ["cn", "uid", "mail", "givenName", "sn", "displayName"],
    };

    const entries = await searchAsync(
      client,
      "ou=UNISS_Users,dc=uniss,dc=edu,dc=cu",
      searchOptions
    );

    if (entries.length === 0) {
      res.status(404).json({ error: "Usuario no encontrado" }); // <-- Sin return
      return; // <-- Añadir return vacío
    }

    // 5. Mapear datos del usuario
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

    // Cambia la línea de obtención de atributos por:
    const attributes = (entries[0] as any).attributes; // Esto debería funcionar ahora

    const userData = {
      username: getLdapAttribute(entries[0], "uid"),
      nombreCompleto: getLdapAttribute(entries[0], "cn"),
      email: getLdapAttribute(entries[0], "mail"),
      nombre: getLdapAttribute(entries[0], "givenName"),
      apellido: getLdapAttribute(entries[0], "sn"),
      displayName: getLdapAttribute(entries[0], "displayName"),
    };

    // 6. Registrar acceso
    await addLogEntry(
      user.username,
      "PROFILE_ACCESS",
      "Consulta de perfil exitosa"
    );

    res.json(userData);
  } catch (error: any) {
    console.error("Error obteniendo perfil:", error);
    res.status(500).json({
      error: error.message || "Error obteniendo datos del usuario",
    });
  } finally {
    if (client) client.unbind();
  }
};
