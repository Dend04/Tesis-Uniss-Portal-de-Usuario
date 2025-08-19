import { Request, Response } from "express";

import { emailCounter } from "../services/emailCounter";
import {
  sendPasswordExpiryAlert,
  sendVerificationCode,
  sendWelcomeEmail,
} from "../services/emailService";

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

export const sendVerificationCodeEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const testEmail = "enamoradodairon@yahoo.com";
    const userName = "Usuario de Prueba UNISS";
    // Generar un código de verificación aleatorio de 6 dígitos
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

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