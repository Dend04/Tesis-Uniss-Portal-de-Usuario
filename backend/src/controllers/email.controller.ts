import { Request, Response } from "express";
import { emailCounter } from "../services/emailCounter";
import {

  sendPasswordExpiryAlert,
  sendWelcomeEmail,
  sendVerificationCode,
  sendVerificationCode as sendVerificationCodeService,
  sendEmailNew
} from "../services/emailService";

// Almacenamiento temporal de códigos de verificación
const verificationCodes = new Map<string, { code: string, expiresAt: number }>();

// Generar código de verificación de 6 dígitos
const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendTestEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const testEmail = "enamoradodairon@yahoo.com";
    const info = await sendWelcomeEmail(testEmail);

    res.status(200).json({
      success: true,
      message: "Correo de bienvenida enviado exitosamente",
      email: testEmail,
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
    const testEmail = "enamoradodairon@yahoo.com";
    const userName = "Usuario de Prueba UNISS";
    // Generar un código de verificación aleatorio de 6 dígitos
    const verificationCode = generateVerificationCode();

    const info = await sendVerificationCode(testEmail, userName, verificationCode);

    res.status(200).json({
      success: true,
      message: "Código de verificación enviado",
      email: testEmail,
      userName,
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
    const testEmail = "enamoradodairon@yahoo.com";
    const userName = "Usuario de Prueba UNISS";
    const daysLeft = 5;

    const info = await sendPasswordExpiryAlert(testEmail, userName, daysLeft);

    res.status(200).json({
      success: true,
      message: "Alerta de contraseña enviada",
      email: testEmail,
      userName,
      daysLeft,
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

export const sendVerificationCodeChangeEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body; // Obtener el email del cuerpo de la solicitud
    
    if (!email) {
      res.status(400).json({
        success: false,
        message: "El correo electrónico es requerido",
      });
      return;
    }

    const userName = "Usuario";
    const verificationCode = generateVerificationCode();
    
    // Guardar el código con fecha de expiración (10 minutos)
    verificationCodes.set(email, {
      code: verificationCode,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutos
    });

    // Enviar el código por correo usando el servicio
    const info = await sendEmailNew(email, userName, verificationCode);

    res.status(200).json({
      success: true,
      message: "Código de verificación enviado",
      email: email,
      userName,
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
    const storedCode = verificationCodes.get(email);
    
    if (!storedCode) {
      res.status(400).json({
        success: false,
        message: "No se encontró un código de verificación para este correo",
      });
      return;
    }

    // Verificar si el código ha expirado
    if (Date.now() > storedCode.expiresAt) {
      verificationCodes.delete(email);
      res.status(400).json({
        success: false,
        message: "El código de verificación ha expirado",
      });
      return;
    }

    // Verificar si el código coincide
    if (storedCode.code !== code) {
      res.status(400).json({
        success: false,
        message: "El código de verificación es incorrecto",
      });
      return;
    }

    // Código verificado correctamente
    verificationCodes.delete(email);
    
    // Aquí iría la lógica para actualizar el email en la base de datos
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
