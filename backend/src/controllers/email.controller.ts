import { Request, Response } from "express";
import { emailCounter } from "../services/emailCounter";
import {
  sendPasswordExpiryAlert,
  sendWelcomeEmail,
  sendVerificationCode as sendVerificationCodeService,
  sendEmailNew,
} from "../services/emailService";
import { verificationStorage } from "../services/verificationStorage";
import { passwordExpiryService } from "../services/passwordExpiryService";
import { cacheService } from "../utils/cache.utils";

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
      to,           // ← correo de respaldo
      username,      // ← nombre de usuario
      userPrincipalName, // ← correo institucional
      fullName,      // ← nombre completo
      userType       // ← tipo de usuario
    } = req.body;

    if (!to) {
      res.status(400).json({
        success: false,
        message: "El correo electrónico es requerido",
      });
      return;
    }

    // Usa el nuevo servicio en lugar de sendWelcomeEmail
    const info = await sendWelcomeEmail(
      to,           // email destino
      fullName,     // nombre para el saludo
      userType,     // tipo de usuario
      username,     // nombre de usuario
      userPrincipalName // correo institucional
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
    // Generar un código de verificación aleatorio de 6 dígitos
    const verificationCode = generateVerificationCode();
    // Guardar el código con fecha de expiración (10 minutos)
    verificationStorage.setCode(email, verificationCode, 10 * 60 * 1000);
    // Enviar el código por correo usando el servicio
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
      code: verificationCode, // Solo para depuración, no en producción
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

    // ✅ AGREGAR: Determinar el tipo de alerta basado en daysLeft
    const getAlertTypeFromDays = (days: number): string => {
      if (days === 7) return 'primera-alerta';
      if (days === 3) return 'alerta-urgente';
      if (days === 1) return 'alerta-final';
      if (days === 0) return 'cuenta-suspendida';
      return 'primera-alerta'; // valor por defecto
    };

    const alertType = getAlertTypeFromDays(daysLeft || 5);

    // ✅ CORREGIR: Pasar los 4 argumentos requeridos
    const info = await sendPasswordExpiryAlert(
      email,
      userName || "Usuario",
      daysLeft || 5,
      alertType // ← ESTE ERA EL PARÁMETRO FALTANTE
    );

    res.status(200).json({
      success: true,
      message: "Alerta de contraseña enviada",
      email: email,
      userName: userName || "Usuario",
      daysLeft: daysLeft || 5,
      alertType: alertType, // ← También devolver en la respuesta
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

// Función auxiliar para determinar el tipo de alerta
function getAlertTypeFromDays(daysLeft: number): string {
  if (daysLeft === 7) return 'primera-alerta';
  if (daysLeft === 3) return 'alerta-urgente';
  if (daysLeft === 1) return 'alerta-final';
  if (daysLeft === 0) return 'cuenta-suspendida';
  return 'primera-alerta'; // valor por defecto
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

    // Guardar el código con fecha de expiración (10 minutos)
    verificationStorage.setCode(email, verificationCode, 10 * 60 * 1000);

    // Enviar el código por correo usando el servicio
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

export const verifyCode = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({
        success: false,
        message: "El correo electrónico y el código son requeridos",
      });
      return;
    }

    // Buscar el código de verificación
    const storedData = verificationStorage.getCode(email);

    if (!storedData) {
      res.status(400).json({
        success: false,
        message: "No se encontró un código de verificación para este correo o ha expirado",
      });
      return;
    }

    // Verificar si el código coincide
    if (storedData.code !== code) {
      res.status(400).json({
        success: false,
        message: "El código de verificación es incorrecto",
      });
      return;
    }

    // Código verificado correctamente
    verificationStorage.deleteCode(email);

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

// En tu archivo de controlador (email.controller.ts)
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
    console.log('📊 Generando reporte manual de expiración...');
    
    // ✅ AHORA TypeScript reconoce el tipo ReporteExpiración
    const reporte = await passwordExpiryService.generarReporteExpiración();
    
    // Guardar en caché cada grupo de usuarios
    cacheService.guardarUsuarios('rango7Dias', reporte.rango7Dias);
    cacheService.guardarUsuarios('rango3Dias', reporte.rango3Dias);
    cacheService.guardarUsuarios('rango1Dia', reporte.rango1Dia);
    cacheService.guardarUsuarios('expirados', reporte.expirados);
    
    res.status(200).json({
      success: true,
      message: "Reporte de expiración generado exitosamente",
      reporte: reporte.resumen,
      detalles: {
        rango7Dias: reporte.rango7Dias.length,
        rango3Dias: reporte.rango3Dias.length,
        rango1Dia: reporte.rango1Dia.length,
        expirados: reporte.expirados.length
      },
      cacheEstado: cacheService.obtenerEstadoCache(),
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
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
    const { grupos } = req.body; // ['rango7Dias', 'rango3Dias', 'rango1Dia', 'expirados']
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