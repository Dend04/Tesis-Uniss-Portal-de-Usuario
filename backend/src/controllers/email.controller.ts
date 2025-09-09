import { Request, Response } from "express";
import { emailCounter } from "../services/emailCounter";
import {
  sendPasswordExpiryAlert,
  sendWelcomeEmail,
  sendVerificationCode as sendVerificationCodeService,
  sendEmailNew,
} from "../services/emailService";
import { verificationStorage } from "../services/verificationStorage";

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
    const { email, userName, userType } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "El correo electrónico es requerido",
      });
      return;
    }

    // Usar la plantilla actualizada con nombre y tipo de usuario
    const info = await sendWelcomeEmail(email, userName, userType);

    res.status(200).json({
      success: true,
      message: "Correo de bienvenida enviado exitosamente",
      email: email,
      userName,
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

    const info = await sendPasswordExpiryAlert(
      email,
      userName || "Usuario",
      daysLeft || 5
    );

    res.status(200).json({
      success: true,
      message: "Alerta de contraseña enviada",
      email: email,
      userName: userName || "Usuario",
      daysLeft: daysLeft || 5,
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