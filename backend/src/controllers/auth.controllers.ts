// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import {unifiedLDAPSearch,} from "../utils/ldap.utils";
import { generateTokens, TokenPayload, verifyToken } from "../utils/jwt.utils";
import { CustomSearchEntry } from "../interface/ildapInterface";
import NodeCache from "node-cache";
import { addLogEntry, authenticateUser, getUserData, ldapChangePassword } from "../services/auth.services";

const userDnCache = new NodeCache({
  stdTTL: 3600, // 1 hora en segundos
  checkperiod: 600, // Verificar caducidad cada 10 minutos
});

// 2. Tipar la entrada LDAP
/* const ldapUser = entries[0] as unknown as LDAPUser; // Conversión de tipo
 */
// 3. Acceder al employeeID
/* const employeeID = ldapUser.employeeID; */

// src/controllers/auth.controller.ts
export const loginController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      res.status(400).json({
        success: false,
        message: "Usuario y contraseña son requeridos"
      });
      return;
    }

    await authenticateUser(username, password);
    const ldapUser = await getUserData(username);
    
    // Validar que tenemos los campos requeridos
    if (!ldapUser.employeeID) {
      console.warn(`Usuario ${username} no tiene employeeID asignado`);
      // Decidir si es un error crítico o continuar con valor vacío
      // throw new Error("El usuario no tiene employeeID asignado");
    }

    // Preparar el payload del token
    const tokenPayload: TokenPayload = {
      sAMAccountName: ldapUser.sAMAccountName,
      username: username.trim() || ldapUser.sAMAccountName,
      employeeID: ldapUser.employeeID || '',
      nombreCompleto: ldapUser.nombreCompleto,
      email: ldapUser.email,
    };

    const tokens = generateTokens(tokenPayload);

    res.json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { 
        ...ldapUser, 
        username: username.trim() || ldapUser.sAMAccountName,
        employeeID: ldapUser.employeeID 
      },
    });
  } catch (error: any) {
    console.error("Error en loginController:", error.message);
    
    if (error.message.includes("no encontrado") || error.message.includes("no existe")) {
      res.status(404).json({ success: false, message: "Usuario no encontrado" });
    } else if (error.message.includes("Credenciales inválidas")) {
      res.status(401).json({ success: false, message: "Credenciales inválidas" });
    } else {
      res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
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


