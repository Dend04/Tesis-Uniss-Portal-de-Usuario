import nodemailer, { Transporter } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { emailCounter } from "./emailCounter";
import { getWelcomeEmailHTML } from "../templates/welcome.email";
import { getVerificationCodeHTML } from "../templates/verificationCode";
import { getNewEmailHTML } from "../templates/newEmail";
import { getPasswordExpiryAlertHTML } from "../templates/alertTemplates";
import { getChangeEmailHTML } from "../templates/changeEmail";

const validateEmail = (email: string): void => {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new Error('Dirección de correo inválida');
  }
};

// Configuración del transporte SMTP local
const createEmailTransport = (): Transporter => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "10.16.1.5",
    port: parseInt(process.env.SMTP_PORT || "25"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3',
    },
    ignoreTLS: false,
    requireTLS: false
  } as SMTPTransport.Options);
};

export const sendWelcomeEmail = async (email: string, userName: string, userType: string, username: string,
  userPrincipalName: string) => {
  const transporter = createEmailTransport();
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Bienvenido/a al Portal de Usuario de la UNISS",
    html: getWelcomeEmailHTML(userName, userType, username, userPrincipalName),
  };

  return transporter.sendMail(mailOptions);
};

export const sendPasswordExpiryAlert = async (
  to: string, 
  userName: string, 
  daysLeft: number, 
  alertType: string
): Promise<any> => {
  try {
    validateEmail(to);
    
    const transportador = createEmailTransport();
    const contenidoHtml = getPasswordExpiryAlertHTML(userName, daysLeft, alertType);

    const opcionesCorreo = {
      from: process.env.SMTP_FROM,
      to,
      subject: `Alerta de contraseña - ${daysLeft} días restantes`,
      html: contenidoHtml,
    };

    const info = await transportador.sendMail(opcionesCorreo);
    emailCounter.increment();
    return info;
  } catch (error) {
    throw new Error(`Error al enviar alerta de contraseña: ${(error as Error).message}`);
  }
};

export const sendVerificationCode = async (
  to: string,
  userName: string,
  verificationCode: string
): Promise<SMTPTransport.SentMessageInfo> => {
  try {
    validateEmail(to);
    
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('Configuración de email incompleta');
    }

    const transportador = createEmailTransport();
    const contenidoHtml = getVerificationCodeHTML(userName, verificationCode);

    const opcionesCorreo = {
      from: process.env.SMTP_FROM,
      to,
      subject: 'Código de verificación para restablecer contraseña',
      html: contenidoHtml,
    };

    const info = await transportador.sendMail(opcionesCorreo);
    emailCounter.increment();
    return info;
  } catch (error) {
    throw new Error(`Error al enviar código de verificación: ${(error as Error).message}`);
  }
};

export const sendEmailNew = async (
  email: string,
  userName: string,
  verificationCode: string
): Promise<SMTPTransport.SentMessageInfo> => {
  try {
    validateEmail(email);
    
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('Configuración de email incompleta');
    }

    const transportador = createEmailTransport();
    const contenidoHtml = getNewEmailHTML(verificationCode, userName);

    const opcionesCorreo = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Código de Verificación - UNISS',
      html: contenidoHtml,
    };

    const info = await transportador.sendMail(opcionesCorreo);
    emailCounter.increment();
    return info;
  } catch (error) {
    throw new Error(`Error al enviar correo de verificación: ${(error as Error).message}`);
  }
};

export const sendChangeEmailVerification = async (
  email: string,        // ✅ Ahora este es el NUEVO correo (destino)
  userName: string,
  verificationCode: string,
  newEmail: string      // ✅ Este es el mismo nuevo correo (para mostrar en el template)
): Promise<SMTPTransport.SentMessageInfo> => {
  try {
    validateEmail(email);
    
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('Configuración de email incompleta');
    }

    const transportador = createEmailTransport();
    const contenidoHtml = getChangeEmailHTML(userName, verificationCode, newEmail);

    const opcionesCorreo = {
      from: process.env.SMTP_FROM,
      to: email,        // ✅ Se envía al NUEVO correo
      subject: 'Código de Verificación - Cambio de Correo UNISS',
      html: contenidoHtml,
    };

    const info = await transportador.sendMail(opcionesCorreo);
    emailCounter.increment();
    return info;
  } catch (error) {
    throw new Error(`Error al enviar código de verificación para cambio de correo: ${(error as Error).message}`);
  }
};
// Agregar esta función a tu archivo existente

 