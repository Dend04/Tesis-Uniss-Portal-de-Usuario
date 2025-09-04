import nodemailer, { Transporter } from "nodemailer";
import { HttpsProxyAgent } from "https-proxy-agent";
import SMTPTransport from "nodemailer/lib/smtp-transport";

import { emailCounter } from "./emailCounter";
import { getWelcomeEmailHTML } from "../templates/welcome.email";
import { getVerificationCodeHTML } from "../templates/verificationCode";
import { getPasswordExpiryAlertHTML } from "../templates/passwordExpiryAlert";
import { getNewEmailHTML } from "../templates/newEmail";
import transporter from "../config/mailers";

const validateEmail = (email: string): void => {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new Error('Dirección de correo inválida');
  }
};

// Configuración del servidor SMTP local
const SMTP_CONFIG = {
  host: "10.16.1.5",       // Servidor SMTP local
  port: 25,                // Puerto SMTP sin SSL
  secure: false,           // Conexión no segura (sin SSL/TLS)
  requireTLS: true,        // Forzar uso de STARTTLS
  tls: {
    rejectUnauthorized: false // Permitir certificados autofirmados
  }
};

const createEmailTransport = (
  emailUser: string,
  emailPass: string
): Transporter => {
  const smtpOptions: SMTPTransport.Options = {
    ...SMTP_CONFIG,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  };

  return nodemailer.createTransport(smtpOptions);
};

export const sendWelcomeEmail = async (email: string, userName: string, userType: string) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Bienvenido/a al Portal de Usuario de la UNISS",
    html: getWelcomeEmailHTML(userName, userType),
  };

  return transporter.sendMail(mailOptions);
};

export const sendPasswordExpiryAlert = async (
  to: string,
  userName: string,
  daysLeft: number
): Promise<SMTPTransport.SentMessageInfo> => {
  try {
    validateEmail(to);
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    
    if (!emailUser || !emailPass) {
      throw new Error('Configuración de email incompleta');
    }

    const transportador = createEmailTransport(emailUser, emailPass);
    const contenidoHtml = getPasswordExpiryAlertHTML(userName, daysLeft);

    const opcionesCorreo = {
      from: `"Seguridad UNISS" <${emailUser}>`,
      to,
      subject: `URGENTE: Cambio de contraseña requerido - ${daysLeft} días restantes`,
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
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    
    if (!emailUser || !emailPass) {
      throw new Error('Configuración de email incompleta');
    }

    const transportador = createEmailTransport(emailUser, emailPass);
    const contenidoHtml = getVerificationCodeHTML(userName, verificationCode);

    const opcionesCorreo = {
      from: `"Seguridad UNISS" <${emailUser}>`,
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
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    
    if (!emailUser || !emailPass) {
      throw new Error('Configuración de email incompleta');
    }

    const transportador = createEmailTransport(emailUser, emailPass);
    const contenidoHtml = getNewEmailHTML(verificationCode, userName);

    const opcionesCorreo = {
      from: `"Seguridad UNISS" <${emailUser}>`,
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

 

 /* import nodemailer, { Transporter } from "nodemailer";
import { HttpsProxyAgent } from "https-proxy-agent";
import SMTPTransport from "nodemailer/lib/smtp-transport";

import { emailCounter } from "./emailCounter";
import { getWelcomeEmailHTML } from "../templates/welcome.email";
import { getVerificationCodeHTML } from "../templates/verificationCode";
import { getPasswordExpiryAlertHTML } from "../templates/passwordExpiryAlert";
import { getNewEmailHTML } from "../templates/newEmail";
import transporter from "../config/mailers";

const validateEmail = (email: string): void => {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new Error('Dirección de correo inválida');
  }
};

// En el servicio emailService.ts
export const sendWelcomeEmail = async (email: string, userName: string, userType: string) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Bienvenido/a al Portal de Usuario de la UNISS",
    html: getWelcomeEmailHTML(userName, userType),
  };

  return transporter.sendMail(mailOptions);
};

const createEmailTransport = (
  emailUser: string,
  emailPass: string
): Transporter => {
  const proxyUrl = "http://10.16.1.2";

  try {
    const proxyAgent = new HttpsProxyAgent(proxyUrl);

    const smtpOptions: SMTPTransport.Options = {
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      // @ts-expect-error: El tipo de agent es compatible
      agent: proxyAgent,
    };

    console.log("Usando proxy para enviar correo.");
    return nodemailer.createTransport(smtpOptions);
  } catch (proxyError) {
    console.error("Error configurando proxy:", proxyError);

    const smtpOptions: SMTPTransport.Options = {
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    };

    console.log("Enviando correo directamente.");
    return nodemailer.createTransport(smtpOptions);
  }
};
export const sendPasswordExpiryAlert = async (
  to: string,
  userName: string,
  daysLeft: number
): Promise<SMTPTransport.SentMessageInfo> => {
  try {
    validateEmail(to);
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    
    if (!emailUser || !emailPass) {
      throw new Error('Configuración de email incompleta');
    }

    const transportador = createEmailTransport(emailUser, emailPass);
    const contenidoHtml = getPasswordExpiryAlertHTML(userName, daysLeft);

    const opcionesCorreo = {
      from: `"Seguridad UNISS" <${emailUser}>`,
      to,
      subject: `URGENTE: Cambio de contraseña requerido - ${daysLeft} días restantes`,
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
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    
    if (!emailUser || !emailPass) {
      throw new Error('Configuración de email incompleta');
    }

    const transportador = createEmailTransport(emailUser, emailPass);
    const contenidoHtml = getVerificationCodeHTML(userName, verificationCode);

    const opcionesCorreo = {
      from: `"Seguridad UNISS" <${emailUser}>`,
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

export const sendEmailNew = async (email: string, userName: string, verificationCode: string) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  const emailUser = process.env.EMAIL_USER;

  const opcionesCorreo = {
    from:   `"Seguridad UNISS" <${emailUser}>`,
    to: email,
    subject: 'Código de Verificación - UNISS',
    html: getNewEmailHTML(verificationCode, userName),
  };

  return transporter.sendMail(opcionesCorreo);
};
  */