import { Request, Response } from "express";
import { generateTokens, TokenPayload } from "../utils/jwt.utils";
import { authService } from "../services/auth.services";
import { userService } from "../services/user.services";
import { auditService } from "../services/audit.services";
import { passwordService } from "../services/password.services";
import { databaseLogService, LogData } from "../services/database-log.services";

export const loginController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const logData: LogData = {
    accion: 'LOGIN',
    username: req.body.username || 'unknown',
    exitoso: false,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    dispositivo: 'web'
  };

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      logData.detalles = 'Faltan credenciales';
      await databaseLogService.guardarLog(logData);
      
      res.status(400).json({
        success: false,
        message: "Usuario y contraseña son requeridos",
      });
      return;
    }

    logData.username = username;

    // Autenticación
    await authService.authenticateUser(username, password);
    const ldapUser = await userService.getUserData(username);

    if (!ldapUser.employeeID) {
      logData.detalles = 'Login exitoso pero sin employeeID';
    } else {
      logData.detalles = 'Login exitoso';
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

    // ✅ LOG EXITOSO
    logData.exitoso = true;
    await databaseLogService.guardarLog(logData);

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

    // ✅ LOG DE ERROR
    logData.detalles = `Error: ${error.message}`;
    logData.error = error.message;
    await databaseLogService.guardarLog(logData);

    if (error.message.includes("no encontrado")) {
      res.status(404).json({ 
        success: false, 
        message: "Usuario no encontrado" 
      });
    } else if (error.message.includes("Contraseña incorrecta")) {
      res.status(401).json({ 
        success: false, 
        message: "Contraseña incorrecta" 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: "Error interno del servidor" 
      });
    }
  }
};

export const changePasswordController = async (
  req: Request,
  res: Response
): Promise<void> => {
  let user: { sAMAccountName: string } | null = null;

  // ✅ LOG PARA CAMBIO DE CONTRASEÑA
  const logData: LogData = {
    accion: 'PASSWORD_CHANGE', // Usar constante consistente
    username: 'unknown',
    exitoso: false,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    dispositivo: 'web'
  };

  try {
    user = (req as any).user as { sAMAccountName: string };
    const { currentPassword, newPassword } = req.body;

    if (!user?.sAMAccountName) {
      logData.detalles = 'Usuario no autenticado';
      await databaseLogService.guardarLog(logData);
      
      res.status(401).json({
        success: false,
        error: "Usuario no autenticado",
      });
      return;
    }

    // Actualizar username en logData
    logData.username = user.sAMAccountName;

    if (!currentPassword || !newPassword) {
      logData.detalles = 'Faltan contraseña actual o nueva contraseña';
      await databaseLogService.guardarLog(logData);
      
      res.status(400).json({
        success: false,
        error: "Contraseña actual y nueva contraseña son requeridas",
      });
      return;
    }

    console.log(`🔄 Iniciando cambio de contraseña para: ${user.sAMAccountName}`);

    // ✅ VERIFICAR CONTRASEÑA ACTUAL
    try {
      await authService.authenticateUser(user.sAMAccountName, currentPassword);
      console.log("✅ Contraseña actual verificada correctamente");
    } catch (authError) {
      console.error("❌ Contraseña actual incorrecta");
      
      logData.detalles = 'Contraseña actual incorrecta';
      await databaseLogService.guardarLog(logData);
      
      res.status(401).json({
        success: false,
        error: "La contraseña actual es incorrecta",
      });
      return;
    }

    const ldapUser = await userService.getUserData(user.sAMAccountName);
    if (!ldapUser.dn || ldapUser.dn.includes("no-encontrado")) {
      logData.detalles = 'Usuario no encontrado en directorio';
      await databaseLogService.guardarLog(logData);
      
      res.status(400).json({ 
        success: false,
        error: "Usuario no encontrado en el directorio" 
      });
      return;
    }

    // ✅ Validar que la nueva contraseña sea diferente
    if (currentPassword === newPassword) {
      logData.detalles = 'La nueva contraseña es igual a la actual';
      await databaseLogService.guardarLog(logData);
      
      res.status(400).json({
        success: false,
        error: "La nueva contraseña debe ser diferente a la actual",
      });
      return;
    }

    // ✅ EJECUTAR CAMBIO DE CONTRASEÑA
    await passwordService.changePassword(ldapUser.dn, newPassword, currentPassword);

    // ✅ AUDITORÍA Y LOG EXITOSO
    await auditService.logPasswordChange(user.sAMAccountName, true, {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
      passwordChanged: true,
      currentPasswordVerified: true,
    });

    logData.exitoso = true;
    logData.detalles = 'Contraseña cambiada exitosamente';
    await databaseLogService.guardarLog(logData);

    console.log("✅ Cambio de contraseña exitoso");
    res.json({
      success: true,
      message: "Contraseña cambiada correctamente",
    });

  } catch (error: any) {
    console.error("💥 Error cambiando contraseña:", error.message);

    // ✅ USAR user SOLO SI ESTÁ DEFINIDO
    const username = user?.sAMAccountName || "unknown";
    logData.username = username;

    // Auditoría de fallo
    await auditService.logPasswordChange(username, false, {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
      error: error.message,
      userAvailable: !!user,
    });

    // ✅ LOG DE ERROR
    logData.detalles = `Error: ${error.message}`;
    logData.error = error.message;
    await databaseLogService.guardarLog(logData);

    // Manejo de errores específicos
    if (error.message.includes("historial") || error.message.includes("history")) {
      res.status(400).json({
        success: false,
        error: "La contraseña ya ha sido utilizada anteriormente",
      });
    } else if (error.message.includes("políticas") || error.message.includes("policy")) {
      res.status(400).json({
        success: false,
        error: "La contraseña no cumple con las políticas de seguridad",
      });
    } else if (error.message.includes("Credenciales inválidas")) {
      res.status(401).json({
        success: false,
        error: "Error de autenticación",
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  }
};

export const checkPasswordHistoryController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const logData: LogData = {
    accion: 'CHECK_PASSWORD_HISTORY',
    username: req.body.username || 'unknown',
    exitoso: false,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    dispositivo: 'web'
  };

  try {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      logData.detalles = 'Faltan usuario o contraseña';
      await databaseLogService.guardarLog(logData);
      
      res.status(400).json({
        success: false,
        error: "Usuario y nueva contraseña son requeridos",
      });
      return;
    }

    logData.username = username;

    const isInHistory = await passwordService.checkPasswordAgainstHistory(
      username,
      newPassword
    );

    // ✅ LOG EXITOSO
    logData.exitoso = true;
    logData.detalles = `Verificación completada - En historial: ${isInHistory}`;
    await databaseLogService.guardarLog(logData);

    res.json({
      success: true,
      isInHistory,
      message: isInHistory
        ? "Esta contraseña ha sido utilizada recientemente"
        : "Contraseña válida (no está en el historial)",
    });
  } catch (error: any) {
    console.error("❌ Error verificando historial:", error);
    
    // ✅ LOG DE ERROR
    logData.detalles = `Error: ${error.message}`;
    logData.error = error.message;
    await databaseLogService.guardarLog(logData);

    res.status(500).json({
      success: false,
      error: "Error al verificar historial de contraseñas",
    });
  }
};
