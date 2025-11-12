import { Request, Response } from "express";
import { emailCounter } from "../services/emailCounter";
import {
  sendPasswordExpiryAlert,
  sendWelcomeEmail,
  sendVerificationCode as sendVerificationCodeService,
  sendEmailNew,
  sendChangeEmailVerification,
  findUserBySAMOrEmployeeID,
  verifyUserExists
} from "../services/emailService";
import { verificationStorage } from "../services/verificationStorage";
import { passwordExpiryService } from "../services/passwordExpiryService";
import { cacheService } from "../utils/cache.utils";

import { LDAPEmailUpdateService } from "../services/ldap-email-update.services";
import { searchLDAPUserForEmail } from "../utils/ldap.utils";
import { passwordService } from "../services/password.services";
import { AuthenticatedRequest } from "../types/express";

// Almacenamiento temporal de códigos de verificación
const verificationCodes = new Map<
  string,
  { code: string; expiresAt: number }
>();

// Generar código de verificación de 6 dígitos
const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendWelcomeEmailToUser = async (
  req: Request,
  res: Response
): Promise<void> => {
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

    const info = await sendWelcomeEmail(
      to,
      fullName,
      userType,
      username,
      userPrincipalName
    );

    res.status(200).json({
      success: true,
      message: "Correo de bienvenida enviado exitosamente",
      email: to,
      userName: fullName,
      userType,
      response: info.response,
      emailStats: {
        count: emailCounter.getCount(),
        remaining: emailCounter.getRemaining(),
        dailyLimit: emailCounter.getRemaining() + emailCounter.getCount(),
        usageMessage: emailCounter.getUsageMessage(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al enviar el correo de bienvenida",
      error: error.message,
    });
  }
};

export const getEmailStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  res.status(200).json({
    success: true,
    stats: {
      count: emailCounter.getCount(),
      remaining: emailCounter.getRemaining(),
      dailyLimit: emailCounter.getRemaining() + emailCounter.getCount(),
      usageMessage: emailCounter.getUsageMessage(),
    },
  });
};

export const sendVerificationCodeEmailPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, userName } = req.body;
    if (!email) {
      res.status(400).json({
        success: false,
        message: "El correo electrónico es requerido",
      });
      return;
    }
    
    const verificationCode = generateVerificationCode();
    verificationStorage.setCode(email, verificationCode, 10 * 60 * 1000);
    
    // ✅ MOSTRAR CÓDIGO EN CONSOLA PARA DESARROLLO
    console.log(`📧 CÓDIGO DE VERIFICACIÓN enviado a ${email}: ${verificationCode}`);
    console.log(`👤 Usuario: ${userName || "No especificado"}`);
    console.log(`⏰ Expira: 10 minutos`);
    
    const info = await sendVerificationCodeService(
      email,
      userName || "Usuario",
      verificationCode
    );
    
    res.status(200).json({
      success: true,
      message: "Código de verificación enviado",
      email: email,
      userName: userName || "Usuario",
      code: verificationCode,
      emailStats: {
        count: emailCounter.getCount(),
        remaining: emailCounter.getRemaining(),
        dailyLimit: emailCounter.getRemaining() + emailCounter.getCount(),
        usageMessage: emailCounter.getUsageMessage(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al enviar código de verificación",
      error: error.message,
    });
  }
};

export const sendPasswordAlert = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, userName, daysLeft } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "El correo electrónico es requerido",
      });
      return;
    }

    const getAlertTypeFromDays = (days: number): string => {
      if (days === 7) return 'primera-alerta';
      if (days === 3) return 'alerta-urgente';
      if (days === 1) return 'alerta-final';
      if (days === 0) return 'cuenta-suspendida';
      return 'primera-alerta';
    };

    const alertType = getAlertTypeFromDays(daysLeft || 5);

    const info = await sendPasswordExpiryAlert(
      email,
      userName || "Usuario",
      daysLeft || 5,
      alertType
    );

    res.status(200).json({
      success: true,
      message: "Alerta de contraseña enviada",
      email: email,
      userName: userName || "Usuario",
      daysLeft: daysLeft || 5,
      alertType: alertType,
      emailStats: {
        count: emailCounter.getCount(),
        remaining: emailCounter.getRemaining(),
        dailyLimit: emailCounter.getRemaining() + emailCounter.getCount(),
        usageMessage: emailCounter.getUsageMessage(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al enviar alerta de contraseña",
      error: error.message,
    });
  }
};

function getAlertTypeFromDays(daysLeft: number): string {
  if (daysLeft === 7) return 'primera-alerta';
  if (daysLeft === 3) return 'alerta-urgente';
  if (daysLeft === 1) return 'alerta-final';
  if (daysLeft === 0) return 'cuenta-suspendida';
  return 'primera-alerta';
}

export const sendVerificationCodeChangeEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, userName } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "El correo electrónico es requerido",
      });
      return;
    }

    const verificationCode = generateVerificationCode();
    verificationStorage.setCode(email, verificationCode, 10 * 60 * 1000);

    // ✅ MOSTRAR CÓDIGO EN CONSOLA PARA DESARROLLO
    console.log(`📧 CÓDIGO DE VERIFICACIÓN (cambio email) enviado a ${email}: ${verificationCode}`);
    console.log(`👤 Usuario: ${userName || "No especificado"}`);
    console.log(`⏰ Expira: 10 minutos`);

    const info = await sendEmailNew(email, userName || "Usuario", verificationCode);

    res.status(200).json({
      success: true,
      message: "Código de verificación enviado",
      email: email,
      userName: userName || "Usuario",
      emailStats: {
        count: emailCounter.getCount(),
        remaining: emailCounter.getRemaining(),
        dailyLimit: emailCounter.getRemaining() + emailCounter.getCount(),
        usageMessage: emailCounter.getUsageMessage(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al enviar código de verificación",
      error: error.message,
    });
  }
};

export const verifyCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({
        success: false,
        message: "El correo electrónico y el código son requeridos",
      });
      return;
    }

    const storedData = verificationStorage.getCode(email);

    if (!storedData) {
      res.status(400).json({
        success: false,
        message: "No se encontró un código de verificación para este correo o ha expirado",
      });
      return;
    }

    // ✅ ACEPTAR el código sin importar qué servicio lo generó
    if (storedData.code !== code) {
      res.status(400).json({
        success: false,
        message: "El código de verificación es incorrecto",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Código verificado correctamente",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al verificar el código",
      error: error.message,
    });
  }
};

export const debugVerificationCodes = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const allCodes = verificationStorage.getAllCodes();
    
    res.status(200).json({
      success: true,
      message: "Estado del almacenamiento de códigos",
      count: allCodes.length,
      codes: allCodes,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al obtener códigos de verificación",
      error: error.message,
    });
  }
};

export const generarReporteExpiración = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { baseDN } = req.query;
    console.log(`📊 Generando reporte manual usando baseDN: ${baseDN}`);
    
    const reporte = await passwordExpiryService.generarReporteExpiración(baseDN as string);
    
    cacheService.guardarUsuarios('rango7Dias', reporte.rango7Dias);

    res.status(200).json({
      success: true,
      message: "Reporte de expiración generado exitosamente",
      baseDNUtilizada: baseDN,
      reporte: reporte.resumen,
      cacheEstado: cacheService.obtenerEstadoCache(),
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error(`❌ Error generando reporte con baseDN ${req.query.baseDN}:`, error);
    res.status(500).json({
      success: false,
      message: "Error al generar reporte de expiración",
      error: error.message,
    });
  }
};

export const verEstadoCache = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const estado = cacheService.obtenerEstadoCache();
    const estadisticas = cacheService.obtenerEstadisticas();
    
    res.status(200).json({
      success: true,
      message: "Estado actual del cache",
      cache: estado,
      estadisticas,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al obtener estado del cache",
      error: error.message,
    });
  }
};

export const enviarAlertasManuales = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { grupos } = req.body;
    const gruposAEnviar = grupos || ['rango7Dias', 'rango3Dias', 'rango1Dia', 'expirados'];
    
    console.log('📧 Iniciando envío manual de alertas...', gruposAEnviar);

    let totalEnviados = 0;
    let totalErrores = 0;
    const resultados: any[] = [];

    for (const grupo of gruposAEnviar) {
      const usuarios = cacheService.obtenerUsuarios(grupo);
      
      if (!usuarios || usuarios.length === 0) {
        resultados.push({ 
          grupo, 
          estado: 'sin_datos', 
          enviados: 0,
          mensaje: `No hay usuarios en caché para el grupo ${grupo}`
        });
        continue;
      }

      let enviadosGrupo = 0;
      let erroresGrupo = 0;
      const erroresDetallados: string[] = [];

      for (const usuario of usuarios) {
        try {
          await sendPasswordExpiryAlert(
            usuario.email,
            usuario.userName,
            usuario.daysLeft,
            usuario.alertType
          );
          enviadosGrupo++;
          totalEnviados++;
          console.log(`✅ Correo enviado a ${usuario.email} (${usuario.daysLeft} días)`);
        } catch (error: any) {
          console.error(`❌ Error enviando a ${usuario.email}:`, error.message);
          erroresGrupo++;
          totalErrores++;
          erroresDetallados.push(`${usuario.email}: ${error.message}`);
        }
      }

      resultados.push({
        grupo,
        estado: erroresGrupo === 0 ? 'completado' : 'con_errores',
        total: usuarios.length,
        enviados: enviadosGrupo,
        errores: erroresGrupo,
        erroresDetallados: erroresDetallados.length > 0 ? erroresDetallados : undefined
      });
    }

    res.status(200).json({
      success: true,
      message: `Envío manual completado. ${totalEnviados} correos enviados, ${totalErrores} errores.`,
      resultados,
      resumen: {
        totalEnviados,
        totalErrores,
        gruposProcesados: gruposAEnviar.length
      },
      emailStats: {
        count: emailCounter.getCount(),
        remaining: emailCounter.getRemaining(),
        dailyLimit: emailCounter.getRemaining() + emailCounter.getCount(),
        usageMessage: emailCounter.getUsageMessage(),
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error en envío manual de alertas:', error);
    res.status(500).json({
      success: false,
      message: "Error en envío manual de alertas",
      error: error.message,
    });
  }
};

export const sendChangeEmailVerificationCode = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, userName, newEmail } = req.body;

    if (!email || !newEmail) {
      res.status(400).json({
        success: false,
        message: "El correo actual y el nuevo correo son requeridos",
      });
      return;
    }

    if (newEmail.toLowerCase().endsWith('@uniss.edu.cu')) {
      res.status(400).json({
        success: false,
        message: "No puedes utilizar un correo institucional @uniss. Por seguridad, usa un correo personal.",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      res.status(400).json({
        success: false,
        message: "El formato del nuevo correo electrónico no es válido",
      });
      return;
    }

    const verificationCode = generateVerificationCode();
    verificationStorage.setCode(newEmail, verificationCode, 10 * 60 * 1000);

    // ✅ MOSTRAR CÓDIGO EN CONSOLA PARA DESARROLLO
    console.log(`📧 CÓDIGO DE VERIFICACIÓN (cambio email) enviado a ${newEmail}: ${verificationCode}`);
    console.log(`👤 Usuario: ${userName || "No especificado"}`);
    console.log(`📨 Correo actual: ${email}`);
    console.log(`📬 Nuevo correo: ${newEmail}`);
    console.log(`⏰ Expira: 10 minutos`);

    const info = await sendChangeEmailVerification(
      newEmail,
      userName || "Usuario", 
      verificationCode,
      newEmail
    );

    res.status(200).json({
      success: true,
      message: "Código de verificación enviado para cambio de correo",
      email: email,
      newEmail: newEmail,
      userName: userName || "Usuario",
      emailStats: {
        count: emailCounter.getCount(),
        remaining: emailCounter.getRemaining(),
        dailyLimit: emailCounter.getRemaining() + emailCounter.getCount(),
        usageMessage: emailCounter.getUsageMessage(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al enviar código de verificación para cambio de correo",
      error: error.message,
    });
  }
};

export const verifyAndUpdateEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { newEmail, code } = req.body;

    // ✅ SOLUCIÓN: Usar la extensión global de Express que ya definiste
    // TypeScript ya debería reconocer req.user gracias a tu declare global
    const userId = req.user?.sAMAccountName;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      });
      return;
    }
    
    // ✅ PRIMERO verificar el código
    const storedData = verificationStorage.getCode(newEmail);
    if (!storedData || storedData.code !== code) {
      res.status(400).json({
        success: false,
        message: "Código de verificación inválido o expirado",
      });
      return;
    }

    let ldapUsers;
    try {
      // Buscar usuario en LDAP
      const filter = `(&(objectClass=user)(sAMAccountName=${userId}))`;
      const attributes = ['distinguishedName', 'sAMAccountName', 'mail', 'userPrincipalName'];
      
      ldapUsers = await searchLDAPUserForEmail(filter, attributes);
      
      if (ldapUsers.length === 0) {
        res.status(404).json({
          success: false,
          message: "Usuario no encontrado en el directorio",
        });
        return;
      }
      
      // ✅ ACTUALIZAR EL CORREO EN LDAP
      const ldapUpdateService = new LDAPEmailUpdateService();
      const updateResult = await ldapUpdateService.updateUserEmail(userId, newEmail);

      if (!updateResult.success) {
        res.status(500).json({
          success: false,
          message: updateResult.message,
        });
        return;
      }

      // ✅ ELIMINAR CÓDIGO SOLO DESPUÉS DE ÉXITO
      verificationStorage.deleteCode(newEmail);

      res.status(200).json({
        success: true,
        message: "Correo actualizado exitosamente",
        newEmail: newEmail,
      });

    } catch (ldapError: any) {
      res.status(500).json({
        success: false,
        message: "Error al buscar usuario en el directorio",
        error: ldapError.message,
      });
      return;
    }

  } catch (error: any) {
    console.error("💥 Error en verifyAndUpdateEmail:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar el correo",
      error: error.message,
    });
  }
};

export const handleForgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🚀 handleForgotPassword INICIADO');
    console.log('📨 Body recibido:', req.body);
    
    const { userIdentifier } = req.body;

    if (!userIdentifier) {
      console.log('❌ ERROR: userIdentifier no proporcionado');
      res.status(400).json({
        success: false,
        message: "Se requiere el nombre de usuario (sAMAccountName) o carnet de identidad (employeeID)",
      });
      return;
    }

    console.log(`🔐 Procesando recuperación para: ${userIdentifier}`);

    console.log('🔍 Buscando usuario en LDAP...');
    const user = await findUserBySAMOrEmployeeID(userIdentifier);
    console.log('✅ Usuario encontrado:', user);
    
    const verificationCode = generateVerificationCode();
    console.log(`🔢 Código generado: ${verificationCode}`);
    
    verificationStorage.setCode(user.email, verificationCode, 10 * 60 * 1000);
    console.log(`💾 Código almacenado para: ${user.email}`);
    
    console.log(`📧 Intentando enviar correo a: ${user.email}`);
    
    const info = await sendVerificationCodeService(
      user.email,
      user.displayName || "Usuario",
      verificationCode
    );

    console.log(`✅ Correo enviado exitosamente`);
    console.log(`📨 Info SMTP:`, info);

    res.status(200).json({
      success: true,
      message: "Código de verificación enviado con éxito",
      email: user.email,
      displayName: user.displayName,
      sAMAccountName: user.sAMAccountName,
      employeeID: user.employeeID,
      userPrincipalName: user.userPrincipalName,
      dn: user.dn,
      accountStatus: user.accountStatus,
      emailStats: {
        count: emailCounter.getCount(),
        remaining: emailCounter.getRemaining(),
        dailyLimit: emailCounter.getRemaining() + emailCounter.getCount(),
        usageMessage: emailCounter.getUsageMessage(),
      },
    });

  } catch (error: any) {
    console.error("💥 ERROR en handleForgotPassword:", error);
    console.error("📋 Stack trace:", error.stack);
    res.status(500).json({
      success: false,
      message: error.message || "Error al procesar la solicitud de recuperación de contraseña",
    });
  }
};

export const verifyCodeAndResetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userIdentifier, code, newPassword } = req.body;
    
    const user = await findUserBySAMOrEmployeeID(userIdentifier);
    const storedData = verificationStorage.getCode(user.email);
    
    if (!storedData || storedData.code !== code) {
      res.status(400).json({
        success: false,
        message: "Código de verificación no encontrado o ha expirado"
      });
      return;
    }
    
    await passwordService.resetPassword(user.dn, newPassword);
    
    verificationStorage.deleteCode(user.email);
    
    res.status(200).json({
      success: true,
      message: "Contraseña restablecida exitosamente"
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al restablecer contraseña",
      error: error.message
    });
  }
};

// Controlador para verificar si un usuario existe
export const checkUserExists = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier } = req.params;

    if (!identifier) {
      res.status(400).json({
        success: false,
        message: "Se requiere un identificador de usuario"
      });
      return;
    }

    const result = await verifyUserExists(identifier);

    if (!result.exists) {
      res.status(404).json({
        success: false,
        message: result.error || "Usuario no encontrado"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Usuario encontrado",
      user: result.user
    });

  } catch (error: any) {
    console.error("Error en checkUserExists:", error);
    res.status(500).json({
      success: false,
      message: "Error al verificar usuario",
      error: error.message
    });
  }
};