import { Request, Response } from "express";
import { generateTokens, TokenPayload } from "../utils/jwt.utils";
import { CustomSearchEntry } from "../interface/ildapInterface";
import { authService } from "../services/auth.services";

import { userService } from "../services/user.services";
import { auditService } from "../services/audit.services";
import { unifiedLDAPSearch } from "../utils/ldap.utils";
import { passwordService } from "../services/password.services";

export const loginController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({
        success: false,
        message: "Usuario y contraseña son requeridos",
      });
      return;
    }

    // Intentar autenticación directamente
    await authService.authenticateUser(username, password);
    const ldapUser = await userService.getUserData(username);

    if (!ldapUser.employeeID) {
      console.warn("⚠️ Usuario sin employeeID asignado");
    }

    const tokenPayload: TokenPayload = {
      sAMAccountName: ldapUser.sAMAccountName,
      username: username.trim() || ldapUser.sAMAccountName,
      employeeID: ldapUser.employeeID || "",
      displayName: ldapUser.nombreCompleto,
      dn: ldapUser.dn,
      title: ldapUser.title,
    };

    const tokens = generateTokens(tokenPayload);

    console.log("✅ Login exitoso");
    res.json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        ...ldapUser,
        username: username.trim() || ldapUser.sAMAccountName,
        employeeID: ldapUser.employeeID,
      },
    });
  } catch (error: any) {
    console.error("❌ Error en login:", error.message);

    // Mensajes específicos basados en el error
    if (error.message.includes("no encontrado")) {
      res.status(404).json({ 
        success: false, 
        message: "Usuario no encontrado. Verifique su nombre de usuario." 
      });
    } else if (error.message.includes("Contraseña incorrecta")) {
      res.status(401).json({ 
        success: false, 
        message: "Contraseña incorrecta. Verifique sus credenciales." 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: "Error interno del servidor" 
      });
    }
  }
};

export const checkAndUpdateEmployeeID = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as { username?: string };

    if (!user?.username) {
      res.status(401).json({ error: "Usuario no autenticado" });
      return;
    }

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
    console.error("❌ Error verificando employeeID:", error);
    res.status(500).json({ success: false, message: "Error interno" });
  }
};

export const changePasswordController = async (
  req: Request,
  res: Response
): Promise<void> => {
  // ✅ DECLARAR user FUERA DEL TRY PARA QUE ESTÉ DISPONIBLE EN EL CATCH
  let user: { sAMAccountName: string } | null = null;

  try {
    user = (req as any).user as { sAMAccountName: string };
    const { currentPassword, newPassword } = req.body;

    if (!user?.sAMAccountName || !currentPassword || !newPassword) {
      res
        .status(400)
        .json({
          error: "Usuario, contraseña actual y nueva contraseña son requeridos",
        });
      return;
    }

    // ✅ VERIFICAR PRIMERO QUE LA CONTRASEÑA ACTUAL SEA CORRECTA
    try {
      await authService.authenticateUser(user.sAMAccountName, currentPassword);
      console.log("✅ Contraseña actual verificada correctamente");
    } catch (authError) {
      console.error("❌ Contraseña actual incorrecta");
      res.status(401).json({
        error: "La contraseña actual es incorrecta",
      });
      return;
    }

    const ldapUser = await userService.getUserData(user.sAMAccountName);
    if (!ldapUser.dn || ldapUser.dn.includes("no-encontrado")) {
      res.status(400).json({ error: "Usuario no encontrado en el directorio" });
      return;
    }

    // ✅ Validar que la nueva contraseña sea diferente a la actual
    if (currentPassword === newPassword) {
      res.status(400).json({
        error: "La nueva contraseña debe ser diferente a la actual",
      });
      return;
    }

    await passwordService.changePassword(ldapUser.dn, newPassword);

    await auditService.logPasswordChange(user.sAMAccountName, true, {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
      passwordChanged: true,
      currentPasswordVerified: true,
    });

    console.log("✅ Cambio de contraseña exitoso");
    res.json({
      success: true,
      message: "Contraseña cambiada correctamente",
    });
  } catch (error: any) {
    console.error("💥 Error cambiando contraseña:", error.message);

    // ✅ USAR user SOLO SI ESTÁ DEFINIDO
    const username = user?.sAMAccountName || "unknown";

    await auditService.logPasswordChange(username, false, {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
      error: error.message,
      userAvailable: !!user, // ✅ Indicar si user estaba disponible
    });

    if (
      error.message.includes("historial") ||
      error.message.includes("history")
    ) {
      res.status(400).json({
        error:
          "La contraseña ya ha sido utilizada anteriormente. Por favor, elija una diferente.",
      });
    } else if (
      error.message.includes("políticas") ||
      error.message.includes("policy")
    ) {
      res.status(400).json({
        error: "La contraseña no cumple con las políticas de seguridad",
      });
    } else if (error.message.includes("Credenciales inválidas")) {
      res.status(401).json({
        error: "Error de autenticación",
      });
    } else {
      res.status(500).json({
        error: "Error interno del servidor",
      });
    }
  }
};

export const checkPasswordHistoryController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      res.status(400).json({
        success: false,
        error: "Usuario y nueva contraseña son requeridos",
      });
      return;
    }

    const isInHistory = await passwordService.checkPasswordAgainstHistory(
      username,
      newPassword
    );

    res.json({
      success: true,
      isInHistory,
      message: isInHistory
        ? "Esta contraseña ha sido utilizada recientemente"
        : "Contraseña válida (no está en el historial)",
    });
  } catch (error: any) {
    console.error("❌ Error verificando historial:", error);
    res.status(500).json({
      success: false,
      error: "Error al verificar historial de contraseñas",
    });
  }
};
