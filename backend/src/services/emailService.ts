import nodemailer, { Transporter } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { emailCounter } from "./emailCounter";
import { getWelcomeEmailHTML } from "../templates/welcome.email";
import { getVerificationCodeHTML } from "../templates/verificationCode";
import { getNewEmailHTML } from "../templates/newEmail";
import { getPasswordExpiryAlertHTML } from "../templates/alertTemplates";
import { getChangeEmailHTML } from "../templates/changeEmail";
import { searchLDAPUserForEmail } from "../utils/ldap.utils";
import { unifiedLDAPSearch } from "../utils/ldap.utils";

const validateEmail = (email: string): void => {
  if (!email || typeof email !== "string" || !email.includes("@")) {
    throw new Error("Dirección de correo inválida");
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
      ciphers: "SSLv3",
    },
    ignoreTLS: false,
    requireTLS: false,
  } as SMTPTransport.Options);
};

export const sendWelcomeEmail = async (
  email: string,
  userName: string,
  userType: string,
  username: string,
  userPrincipalName: string
) => {
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
    const contenidoHtml = getPasswordExpiryAlertHTML(
      userName,
      daysLeft,
      alertType
    );

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
    throw new Error(
      `Error al enviar alerta de contraseña: ${(error as Error).message}`
    );
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
      throw new Error("Configuración de email incompleta");
    }

    const transportador = createEmailTransport();
    const contenidoHtml = getVerificationCodeHTML(userName, verificationCode);

    const opcionesCorreo = {
      from: process.env.SMTP_FROM,
      to,
      subject: "Código de verificación para restablecer contraseña",
      html: contenidoHtml,
    };

    const info = await transportador.sendMail(opcionesCorreo);
    emailCounter.increment();
    return info;
  } catch (error) {
    throw new Error(
      `Error al enviar código de verificación: ${(error as Error).message}`
    );
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
      throw new Error("Configuración de email incompleta");
    }

    const transportador = createEmailTransport();
    const contenidoHtml = getNewEmailHTML(verificationCode, userName);

    const opcionesCorreo = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Código de Verificación - UNISS",
      html: contenidoHtml,
    };

    const info = await transportador.sendMail(opcionesCorreo);
    emailCounter.increment();
    return info;
  } catch (error) {
    throw new Error(
      `Error al enviar correo de verificación: ${(error as Error).message}`
    );
  }
};

export const sendChangeEmailVerification = async (
  email: string,
  userName: string,
  verificationCode: string,
  newEmail: string
): Promise<SMTPTransport.SentMessageInfo> => {
  try {
    validateEmail(email);

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error("Configuración de email incompleta");
    }

    const transportador = createEmailTransport();
    const contenidoHtml = getChangeEmailHTML(
      userName,
      verificationCode,
      newEmail
    );

    const opcionesCorreo = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Código de Verificación - Cambio de Correo UNISS",
      html: contenidoHtml,
    };

    const info = await transportador.sendMail(opcionesCorreo);
    emailCounter.increment();
    return info;
  } catch (error) {
    throw new Error(
      `Error al enviar código de verificación para cambio de correo: ${
        (error as Error).message
      }`
    );
  }
};

// Servicio para buscar usuario por sAMAccountName o employeeID
export const findUserBySAMOrEmployeeID = async (identifier: string): Promise<{
  email: string;
  displayName?: string;
  sAMAccountName?: string;
  employeeID?: string;
  userPrincipalName?: string;
  dn: string;
  accountStatus: "active" | "expired" | "locked" | "disabled";
}> => {
  try {
    const filter = `(|(sAMAccountName=${identifier})(employeeID=${identifier}))`;

    const attributes = [
      "company",
      "displayName",
      "sAMAccountName",
      "employeeID",
      "userPrincipalName",
      "mail",
      "distinguishedName",
      "userAccountControl",
      "lockoutTime",
      "pwdLastSet",
    ];

    const users = await searchLDAPUserForEmail(filter, attributes);

    if (users.length === 0) {
      throw new Error("Usuario no encontrado.");
    }

    const user = users[0];

    const accountStatus = determineAccountStatus(user);

    if (accountStatus === "disabled") {
      throw new Error(
        "La cuenta está deshabilitada permanentemente. Contacte a soporte."
      );
    }

    if (accountStatus === "locked") {
      throw new Error(
        "La cuenta está bloqueada temporalmente. Espere 30 minutos o contacte a soporte."
      );
    }

    return {
      email: user.company,
      displayName: user.displayName,
      sAMAccountName: user.sAMAccountName,
      employeeID: user.employeeID,
      userPrincipalName: user.userPrincipalName,
      dn: user.distinguishedName,
      accountStatus,
    };
  } catch (error) {
    console.error("Error en findUserBySAMOrEmployeeID:", error);
    throw error;
  }
};

// Función para determinar el estado de la cuenta
function determineAccountStatus(
  user: any
): "active" | "expired" | "locked" | "disabled" {
  const userAccountControl = user.userAccountControl || 0;
  if (userAccountControl & 0x0002) {
    return "disabled";
  }

  const lockoutTime = user.lockoutTime || 0;
  if (lockoutTime > 0) {
    return "locked";
  }

  const pwdLastSet = user.pwdLastSet || 0;
  if (pwdLastSet === 0) {
    return "expired";
  }

  return "active";
}

// Servicio para verificar si un usuario existe usando búsqueda unificada
export const verifyUserExists = async (identifier: string): Promise<{
  exists: boolean;
  user?: {
    displayName?: string;
    sAMAccountName?: string;
    employeeID?: string;
    userPrincipalName?: string;
    email?: string;
    dn: string;
  };
  error?: string;
}> => {
  try {
    const filter = `(|(sAMAccountName=${identifier})(employeeID=${identifier}))`;
    const attributes = [
      "displayName",
      "sAMAccountName",
      "employeeID",
      "userPrincipalName",
      "company",
      "distinguishedName"
    ];

    const users = await unifiedLDAPSearch(filter, attributes);

    if (users.length === 0) {
      return {
        exists: false,
        error: "Usuario no encontrado"
      };
    }

    const user = users[0];
    return {
      exists: true,
      user: {
        displayName: user.displayName,
        sAMAccountName: user.sAMAccountName,
        employeeID: user.employeeID,
        userPrincipalName: user.userPrincipalName,
        email: user.company,
        dn: user.distinguishedName
      }
    };
  } catch (error) {
    console.error("Error en verifyUserExists:", error);
    return {
      exists: false,
      error: `Error al buscar usuario: ${(error as Error).message}`
    };
  }
}