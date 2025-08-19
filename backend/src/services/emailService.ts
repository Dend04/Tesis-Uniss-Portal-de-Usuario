import nodemailer, { Transporter } from "nodemailer";
import { HttpsProxyAgent } from "https-proxy-agent";
import SMTPTransport from "nodemailer/lib/smtp-transport";

import { emailCounter } from "./emailCounter";
import { getWelcomeEmailHTML } from "../templates/welcome.email";
import { getVerificationCodeHTML } from "../templates/verificationCode";
import { getPasswordExpiryAlertHTML } from "../templates/passwordExpiryAlert";

const validateEmail = (email: string): void => {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new Error('Dirección de correo inválida');
  }
};

export const sendWelcomeEmail = async (
  to: string
): Promise<SMTPTransport.SentMessageInfo> => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    throw new Error(
      "Configuración de email incompleta: Faltan EMAIL_USER o EMAIL_PASS en .env"
    );
  }

  const transportador = createEmailTransport(emailUser, emailPass);
  const contenidoHtml = getWelcomeEmailHTML();

  const opcionesCorreo = {
    from: `"Portal de Usuario UNISS" <${emailUser}>`,
    to,
    subject: "Bienvenido al Portal de Usuario de la UNISS",
    html: contenidoHtml,
  };

  try {
    const info = await transportador.sendMail(opcionesCorreo);
    emailCounter.increment();
    return info;
  } catch (error) {
    throw new Error(`Error al enviar correo: ${(error as Error).message}`);
  }
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
