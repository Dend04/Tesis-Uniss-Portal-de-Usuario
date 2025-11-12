import { Request, Response } from "express";
import { 
  sendVerificationCodeGmail, 
  checkGmailAvailability,
  getGmailStats,
  resetGmailCounter,
  sendWelcomeEmailGmail 
} from "../services/emailServiceGoogle";
import { findUserBySAMOrEmployeeID } from "../services/emailService";
import { verificationStorage } from "../services/verificationStorage";

const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ✅ VERIFICAR DISPONIBILIDAD DE GMAIL
export const checkGmailService = async (req: Request, res: Response): Promise<void> => {
  try {
    const availability = await checkGmailAvailability();
    
    res.status(200).json({
      success: true,
      ...availability,
      stats: getGmailStats()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al verificar servicio Gmail",
      error: error.message
    });
  }
};

// ✅ RECUPERACIÓN DE CONTRASEÑA CON GMAIL
export const handleForgotPasswordGmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userIdentifier } = req.body;

    if (!userIdentifier) {
      res.status(400).json({
        success: false,
        message: "Se requiere el nombre de usuario (sAMAccountName) o carnet de identidad (employeeID)",
      });
      return;
    }

    console.log(`🔐 [GMAIL] Solicitud de recuperación para: ${userIdentifier}`);

    // ✅ VERIFICAR DISPONIBILIDAD ANTES DE PROCESAR
    const availability = await checkGmailAvailability();
    if (!availability.available) {
      res.status(503).json({
        success: false,
        message: "Servicio de correos no disponible en este momento",
        reason: availability.message,
        stats: getGmailStats()
      });
      return;
    }

    const user = await findUserBySAMOrEmployeeID(userIdentifier);
    
    const verificationCode = generateVerificationCode();
    verificationStorage.setCode(user.email, verificationCode, 10 * 60 * 1000);
    
    console.log(`📧 [GMAIL] CÓDIGO DE VERIFICACIÓN enviado a ${user.email}: ${verificationCode}`);
    console.log(`👤 [GMAIL] Usuario: ${user.displayName || user.sAMAccountName}`);
    
    const info = await sendVerificationCodeGmail(
      user.email,
      user.displayName || "Usuario",
      verificationCode
    );

    console.log(`✅ [GMAIL] Correo enviado exitosamente a: ${user.email}`);
    console.log(`📊 [GMAIL] Estadísticas: ${getGmailStats().usageMessage}`);

    res.status(200).json({
      success: true,
      message: "Código de verificación enviado con éxito (vía Gmail)",
      servicio: "gmail",
      email: user.email,
      displayName: user.displayName,
      sAMAccountName: user.sAMAccountName,
      employeeID: user.employeeID,
      userPrincipalName: user.userPrincipalName,
      dn: user.dn,
      accountStatus: user.accountStatus,
      gmailStats: getGmailStats(),
      emailStats: {
        count: getGmailStats().count,
        remaining: getGmailStats().remaining,
        dailyLimit: getGmailStats().dailyLimit,
        usageMessage: getGmailStats().usageMessage,
      },
    });

  } catch (error: any) {
    console.error("❌ [GMAIL] Error en recuperación de contraseña:", error);
    
    let mensajeError = error.message;
    let codigoEstado = 500;

    if (error.message.includes('Límite diario')) {
      codigoEstado = 503;
      mensajeError = "Límite diario de Gmail alcanzado. Por favor, use el servicio principal o intente mañana.";
    } else if (error.message.includes('Configuración')) {
      codigoEstado = 503;
      mensajeError = "Servicio Gmail no configurado correctamente.";
    }

    res.status(codigoEstado).json({
      success: false,
      message: mensajeError,
      servicio: "gmail",
      stats: getGmailStats()
    });
  }
};

// ✅ OBTENER ESTADÍSTICAS DE GMAIL
export const getGmailStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      servicio: "gmail",
      stats: getGmailStats(),
      availability: await checkGmailAvailability()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al obtener estadísticas de Gmail",
      error: error.message
    });
  }
};

// ✅ RESET MANUAL DEL CONTADOR (SOLO DESARROLLO)
export const resetGmailCount = async (req: Request, res: Response): Promise<void> => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      res.status(403).json({
        success: false,
        message: "Esta operación solo está permitida en entorno de desarrollo"
      });
      return;
    }

    resetGmailCounter();
    
    res.status(200).json({
      success: true,
      message: "Contador de Gmail reiniciado",
      stats: getGmailStats()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al reiniciar contador de Gmail",
      error: error.message
    });
  }
};

// ✅ ENVIAR CÓDIGO DE VERIFICACIÓN CON GMAIL PARA CORREO DE RESPALDO
export const sendBackupEmailVerificationGmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "El correo electrónico es requerido",
      });
      return;
    }

    console.log(`📧 [GMAIL-BACKUP] Enviando código de verificación a: ${email}`);

    const verificationCode = generateVerificationCode();
    verificationStorage.setCode(email, verificationCode, 10 * 60 * 1000);

    const info = await sendVerificationCodeGmail(
      email,
      "Usuario",
      verificationCode
    );

    console.log(`✅ [GMAIL-BACKUP] Código enviado exitosamente a: ${email}`);
    console.log(`🔢 [GMAIL-BACKUP] Código: ${verificationCode}`);

    res.status(200).json({
      success: true,
      message: "Código de verificación enviado con éxito (vía Gmail)",
      servicio: "gmail",
      email: email,
      gmailStats: info.gmailStats || {
        count: 0,
        remaining: 0,
        dailyLimit: 100,
        usageMessage: "Gmail: 0/100"
      },
    });

  } catch (error: any) {
    console.error(`❌ [GMAIL-BACKUP] Error enviando código: ${error.message}`);
    
    let mensajeError = error.message;
    let codigoEstado = 500;

    if (error.message.includes('Límite diario')) {
      codigoEstado = 503;
      mensajeError = "Límite diario de Gmail alcanzado. Por favor, intente mañana.";
    } else if (error.message.includes('Configuración')) {
      codigoEstado = 503;
      mensajeError = "Servicio Gmail no configurado correctamente.";
    }

    res.status(codigoEstado).json({
      success: false,
      message: mensajeError,
      servicio: "gmail"
    });
  }
};

// ✅ NUEVO CONTROLADOR: REENVIAR CORREO DE BIENVENIDA CON GMAIL
export const resendWelcomeEmailGmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      to,
      username,
      userPrincipalName,
      fullName,
      userType 
    } = req.body;

    if (!to) {
      res.status(400).json({
        success: false,
        message: "El correo electrónico es requerido",
      });
      return;
    }

    console.log(`📧 [GMAIL-RESEND] Reenviando correo de bienvenida a: ${to}`);
    console.log(`👤 [GMAIL-RESEND] Usuario: ${fullName}`);
    console.log(`🔑 [GMAIL-RESEND] Username: ${username}`);
    console.log(`📨 [GMAIL-RESEND] UserPrincipalName: ${userPrincipalName}`);
    console.log(`👥 [GMAIL-RESEND] Tipo: ${userType}`);

    // ✅ VERIFICAR DISPONIBILIDAD DE GMAIL
    const availability = await checkGmailAvailability();
    if (!availability.available) {
      res.status(503).json({
        success: false,
        message: "Servicio Gmail no disponible en este momento",
        reason: availability.message,
        stats: getGmailStats()
      });
      return;
    }

    const info = await sendWelcomeEmailGmail(
      to,
      fullName,
      userType,
      username,
      userPrincipalName
    );

    console.log(`✅ [GMAIL-RESEND] Correo de bienvenida reenviado exitosamente a: ${to}`);
    console.log(`📊 [GMAIL-RESEND] Estadísticas: ${getGmailStats().usageMessage}`);

    res.status(200).json({
      success: true,
      message: "Correo de bienvenida reenviado con éxito (vía Gmail)",
      servicio: "gmail",
      email: to,
      userName: fullName,
      userType,
      gmailStats: info.gmailStats || getGmailStats(),
    });

  } catch (error: any) {
    console.error(`❌ [GMAIL-RESEND] Error reenviando correo de bienvenida: ${error.message}`);
    
    let mensajeError = error.message;
    let codigoEstado = 500;

    if (error.message.includes('Límite diario')) {
      codigoEstado = 503;
      mensajeError = "Límite diario de Gmail alcanzado. No se pudo reenviar el correo.";
    } else if (error.message.includes('Configuración')) {
      codigoEstado = 503;
      mensajeError = "Servicio Gmail no configurado correctamente.";
    }

    res.status(codigoEstado).json({
      success: false,
      message: mensajeError,
      servicio: "gmail",
      stats: getGmailStats()
    });
  }
};

export const resendChangeEmailVerificationGmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      email,
      newEmail,
      userName 
    } = req.body;

    if (!newEmail) {
      res.status(400).json({
        success: false,
        message: "El nuevo correo electrónico es requerido",
      });
      return;
    }

    console.log(`📧 [GMAIL-RESEND-CHANGE] Reenviando código de verificación para cambio de correo a: ${newEmail}`);
    console.log(`👤 [GMAIL-RESEND-CHANGE] Usuario: ${userName || "No especificado"}`);
    console.log(`📨 [GMAIL-RESEND-CHANGE] Correo actual: ${email}`);
    console.log(`📬 [GMAIL-RESEND-CHANGE] Nuevo correo: ${newEmail}`);

    // ✅ VERIFICAR DISPONIBILIDAD DE GMAIL
    const availability = await checkGmailAvailability();
    if (!availability.available) {
      res.status(503).json({
        success: false,
        message: "Servicio Gmail no disponible en este momento",
        reason: availability.message,
        stats: getGmailStats()
      });
      return;
    }

    // ✅ GENERAR NUEVO CÓDIGO O REUTILIZAR EXISTENTE
    let verificationCode: string;
    const existingCode = verificationStorage.getCode(newEmail);
    
    if (existingCode && existingCode.code) {
      // ✅ REUTILIZAR el código existente
      verificationCode = existingCode.code;
      console.log(`🔄 [GMAIL-RESEND-CHANGE] Reutilizando código existente: ${verificationCode}`);
      
      // Extender el tiempo de expiración
      verificationStorage.setCode(newEmail, verificationCode, 10 * 60 * 1000);
    } else {
      // ✅ GENERAR NUEVO CÓDIGO si no existe
      verificationCode = generateVerificationCode();
      verificationStorage.setCode(newEmail, verificationCode, 10 * 60 * 1000);
      console.log(`🆕 [GMAIL-RESEND-CHANGE] Generado nuevo código: ${verificationCode}`);
    }

    const info = await sendVerificationCodeGmail(
      newEmail,
      userName || "Usuario",
      verificationCode
    );

    console.log(`✅ [GMAIL-RESEND-CHANGE] Código de verificación reenviado exitosamente a: ${newEmail}`);
    console.log(`🔢 [GMAIL-RESEND-CHANGE] Código: ${verificationCode}`);
    console.log(`📊 [GMAIL-RESEND-CHANGE] Estadísticas: ${getGmailStats().usageMessage}`);

    res.status(200).json({
      success: true,
      message: "Código de verificación reenviado con éxito (vía Gmail)",
      servicio: "gmail",
      email: newEmail,
      userName: userName,
      codeReused: !!existingCode,
      gmailStats: info.gmailStats || getGmailStats(),
    });

  } catch (error: any) {
    console.error(`❌ [GMAIL-RESEND-CHANGE] Error reenviando código de verificación: ${error.message}`);
    
    let mensajeError = error.message;
    let codigoEstado = 500;

    if (error.message.includes('Límite diario')) {
      codigoEstado = 503;
      mensajeError = "Límite diario de Gmail alcanzado. No se pudo reenviar el código.";
    } else if (error.message.includes('Configuración')) {
      codigoEstado = 503;
      mensajeError = "Servicio Gmail no configurado correctamente.";
    }

    res.status(codigoEstado).json({
      success: false,
      message: mensajeError,
      servicio: "gmail",
      stats: getGmailStats()
    });
  }
};