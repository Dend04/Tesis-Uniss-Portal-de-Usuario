// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import {
  authenticateUser,
  createLDAPClient,
  bindAsync,
  ldapChangePassword,
  addLogEntry,
  searchAsync,
  LDAPClient,
} from "../utils/ldap.utils"; // Agregar las importaciones faltantes
import { generateTokens, TokenPayload, verifyToken } from "../utils/jwt.utils";
import * as ldap from "ldapjs";
import { Attribute } from "ldapts";

export const loginController = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Autenticar contra LDAP
    await authenticateUser(req, res);

    // Si la autenticación fue exitosa, generar tokens
    const tokens = generateTokens({ username });

    res.json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { username },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

export const changePasswordController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // 1. Obtener usuario del token (seguro)
    const user = (req as any).user as { username: string } | undefined;
    
    if (!user?.username) {
      res.status(401).json({ error: "Usuario no autenticado" });
      return;
    }

    // 2. Validar nueva contraseña
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
      return;
    }

    // 3. Lógica central de cambio
    await ldapChangePassword(user.username, newPassword);

    // 4. Registrar en logs
    await addLogEntry(
      user.username,
      "PASSWORD_CHANGE",
      `Cambio exitoso - ${new Date().toLocaleString()}`
    );

    // 5. Respuesta detallada
    res.status(200).json({
      success: true,
      message: `¡Contraseña actualizada para ${user.username}!`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // 6. Manejo de errores específico
    const errorMessage = error instanceof Error 
      ? `Error: ${error.message}`
      : "Error desconocido en el servidor";

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: "Verifica los logs del servidor para más información"
    });
  }
};

export const getUserProfileController = async (
  req: Request,
  res: Response
): Promise<void> => { // <-- Añadir tipo de retorno explícito
  let client: LDAPClient | null = null;
  
  try {
    // 1. Obtener usuario del token
    const user = (req as any).user as TokenPayload;
    if (!user?.username) {
      res.status(401).json({ error: "No autorizado" });
      return; // <-- Solo enviar respuesta sin retornar valor
    }

    // 2. Validar configuración LDAP
    if (!process.env.LDAP_URL || !process.env.LDAP_ADMIN_DN || !process.env.LDAP_ADMIN_PASSWORD) {
      throw new Error("Configuración LDAP incompleta");
    }

    // 3. Conectar y autenticar como admin
    client = createLDAPClient(process.env.LDAP_URL);
    await bindAsync(client, process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);

    // 4. Buscar usuario en LDAP
    const searchOptions: ldap.SearchOptions = {
      filter: `(uid=${user.username})`,
      scope: "sub",
      attributes: ['cn', 'uid', 'mail', 'givenName', 'sn', 'displayName']
    };

    const entries = await searchAsync(
      client,
      'ou=users,dc=uniss,dc=edu,dc=cu',
      searchOptions
    );

    if (entries.length === 0) {
      res.status(404).json({ error: "Usuario no encontrado" }); // <-- Sin return
      return; // <-- Añadir return vacío
    }

    // 5. Mapear datos del usuario
    const getLdapAttribute = (entry: ldap.SearchEntry, name: string): string => {
      const attributes = entry.attributes as unknown as Attribute[];
      const attr = attributes.find(a => a.type === name);
      
      if (!attr || !attr.values || attr.values.length === 0) {
        return '';
      }
      
      return String(attr.values[0]);
    };
    

    // Cambia la línea de obtención de atributos por:
const attributes = (entries[0] as any).attributes; // Esto debería funcionar ahora

    
    const userData = {
      username: getLdapAttribute(entries[0], 'uid'),
      nombreCompleto: getLdapAttribute(entries[0], 'cn'),
      email: getLdapAttribute(entries[0], 'mail'),
      nombre: getLdapAttribute(entries[0], 'givenName'),
      apellido: getLdapAttribute(entries[0], 'sn'),
      displayName: getLdapAttribute(entries[0], 'displayName')
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
      error: error.message || "Error obteniendo datos del usuario"
    });
  } finally {
    if (client) client.unbind();
  }
};
