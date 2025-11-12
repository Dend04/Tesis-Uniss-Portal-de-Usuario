import nodemailer, { Transporter } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { emailCounter } from "./emailCounter";
import { getWelcomeEmailHTML } from "../templates/welcome.email";
import { getVerificationCodeHTML } from "../templates/verificationCode";
import { getNewEmailHTML } from "../templates/newEmail";
import { getPasswordExpiryAlertHTML } from "../templates/alertTemplates";
import { getChangeEmailHTML } from "../templates/changeEmail";

const validateEmail = (email: string): void => {
  if (!email || typeof email !== "string" || !email.includes("@")) {
    throw new Error("Dirección de correo inválida");
  }
};

type GmailSentMessageInfo = SMTPTransport.SentMessageInfo & { 
  servicio: string;
  gmailStats?: {
    count: number;
    remaining: number;
    dailyLimit: number;
    usageMessage: string;
    available?: boolean;
  };
};

// ✅ CONTADOR ESPECÍFICO PARA GMAIL (para no mezclar con el servicio principal)
class GmailCounter {
  private count: number = 0;
  private readonly dailyLimit: number = 100; // Límite de Gmail

  increment(): void {
    if (this.count < this.dailyLimit) {
      this.count++;
    }
  }

  getCount(): number {
    return this.count;
  }

  getRemaining(): number {
    return this.dailyLimit - this.count;
  }

  getDailyLimit(): number {
    return this.dailyLimit;
  }

  getUsageMessage(): string {
    return `Gmail: ${this.count}/${this.dailyLimit} correos enviados hoy`;
  }

  canSend(): boolean {
    return this.count < this.dailyLimit;
  }

  reset(): void {
    this.count = 0;
  }
}

export const gmailCounter = new GmailCounter();

// ✅ CONFIGURACIÓN ESPECÍFICA PARA GMAIL
const createGmailTransport = (): Transporter => {
  console.log(`🔧 CONFIGURANDO TRANSPORTE SMTP PARA GMAIL`);
  console.log(`   Host: smtp.gmail.com`);
  console.log(`   Port: 587`);
  console.log(`   User: ${process.env.GMAIL_USER ? 'CONFIGURADO' : 'NO CONFIGURADO'}`);
  console.log(`   From: ${process.env.GMAIL_FROM || process.env.GMAIL_USER}`);
  console.log(`   Límite diario: ${gmailCounter.getDailyLimit()} correos`);
  console.log(`   Usados hoy: ${gmailCounter.getCount()}`);
  console.log(`   Disponibles: ${gmailCounter.getRemaining()}`);

  // ✅ VERIFICAR SI AÚN TENEMOS CUPO
  if (!gmailCounter.canSend()) {
    throw new Error("Límite diario de Gmail alcanzado. Máximo 100 correos por día.");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true para 465, false para otros puertos
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD, // Contraseña de aplicación de Gmail
    },
    tls: {
      rejectUnauthorized: true, // Gmail requiere certificados válidos
      ciphers: "SSLv3"
    },
    debug: true,
    logger: {
      debug: (message: string) => {
        console.log(`🐛 GMAIL Debug: ${message}`);
      },
      info: (message: string) => {
        console.log(`📨 GMAIL Info: ${message}`);
      },
      warn: (message: string) => {
        console.log(`⚠️ GMAIL Warn: ${message}`);
      },
      error: (message: string) => {
        console.error(`💥 GMAIL Error: ${message}`);
      }
    }
  } as SMTPTransport.Options);

  transporter.on('error', (error: Error) => {
    console.error(`💥 GMAIL Connection Error: ${error.message}`);
  });

  return transporter;
};

// ✅ VERIFICAR DISPONIBILIDAD DE GMAIL
export const checkGmailAvailability = async (): Promise<{
  available: boolean;
  remaining: number;
  message: string;
}> => {
  try {
    if (!gmailCounter.canSend()) {
      return {
        available: false,
        remaining: 0,
        message: "Límite diario de Gmail alcanzado"
      };
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return {
        available: false,
        remaining: gmailCounter.getRemaining(),
        message: "Configuración de Gmail incompleta"
      };
    }

    const transporter = createGmailTransport();
    await transporter.verify();

    return {
      available: true,
      remaining: gmailCounter.getRemaining(),
      message: "Servicio Gmail disponible"
    };
  } catch (error: any) {
    return {
      available: false,
      remaining: gmailCounter.getRemaining(),
      message: `Gmail no disponible: ${error.message}`
    };
  }
};

// ✅ SERVICIO PRINCIPAL DE ENVÍO CON GMAIL
export const sendVerificationCodeGmail = async (
  to: string,
  userName: string,
  verificationCode: string
): Promise<GmailSentMessageInfo> => {
  try {
    console.log(`📧 [GMAIL] INICIANDO ENVÍO DE CÓDIGO DE VERIFICACIÓN`);
    console.log(`   Para: ${to}`);
    console.log(`   Usuario: ${userName}`);
    console.log(`   Código: ${verificationCode}`);
    console.log(`   Correos disponibles hoy: ${gmailCounter.getRemaining()}/${gmailCounter.getDailyLimit()}`);

    validateEmail(to);

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('❌ [GMAIL] ERROR: Configuración de Gmail incompleta');
      throw new Error("Configuración de Gmail incompleta. Verifique GMAIL_USER y GMAIL_APP_PASSWORD.");
    }

    if (!gmailCounter.canSend()) {
      console.error('❌ [GMAIL] ERROR: Límite diario alcanzado');
      throw new Error("Límite diario de Gmail alcanzado. Máximo 100 correos por día.");
    }

    console.log(`✅ [GMAIL] Configuración válida - Correos restantes: ${gmailCounter.getRemaining()}`);
    
    const transportador = createGmailTransport();
    
    console.log(`🔍 [GMAIL] Verificando conexión SMTP...`);
    await transportador.verify();
    console.log(`✅ [GMAIL] Conexión SMTP verificada - servidor listo`);

    const contenidoHtml = getVerificationCodeHTML(userName, verificationCode);
    console.log(`✅ [GMAIL] HTML del correo generado`);

    const opcionesCorreo = {
      from: process.env.GMAIL_FROM || process.env.GMAIL_USER,
      to,
      subject: "Código de verificación para restablecer contraseña - UNISS",
      html: contenidoHtml,
    };

    console.log(`📨 [GMAIL] Enviando correo a través de Gmail SMTP...`);
    
    const info = await transportador.sendMail(opcionesCorreo);
    
    // ✅ INCREMENTAR CONTADOR DE GMAIL
    gmailCounter.increment();
    
    console.log(`✅ [GMAIL] CORREO ENVIADO EXITOSAMENTE`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);
    console.log(`   Accepted: ${info.accepted}`);
    console.log(`   Rejected: ${info.rejected}`);
    console.log(`   Correos usados: ${gmailCounter.getCount()}/${gmailCounter.getDailyLimit()}`);
    console.log(`   Correos restantes: ${gmailCounter.getRemaining()}`);
    
    if (info.accepted && info.accepted.length > 0) {
      console.log(`🎯 [GMAIL] Correo aceptado por Gmail para: ${info.accepted.join(', ')}`);
    } else {
      console.warn(`⚠️ [GMAIL] Correo NO fue aceptado por Gmail`);
    }
    
    if (info.rejected && info.rejected.length > 0) {
      console.error(`❌ [GMAIL] Correo rechazado por Gmail para: ${info.rejected.join(', ')}`);
    }
    
    // ✅ TAMBIÉN INCREMENTAR EL CONTADOR PRINCIPAL (OPCIONAL)
    emailCounter.increment();
    console.log(`📊 [GMAIL] Contador principal: ${emailCounter.getCount()}`);
    
    return {
      ...info,
      servicio: 'gmail',
      gmailStats: getGmailStats()
    };
  } catch (error) {
    console.error(`💥 [GMAIL] ERROR CRÍTICO AL ENVIAR CORREO:`, error);
    console.error(`   Destinatario: ${to}`);
    console.error(`   Código que no se envió: ${verificationCode}`);
    console.error(`   Correos disponibles: ${gmailCounter.getRemaining()}`);
    throw new Error(
      `Error al enviar código de verificación con Gmail: ${(error as Error).message}`
    );
  }
};

// ✅ SERVICIOS ADICIONALES PARA GMAIL
export const sendWelcomeEmailGmail = async (
  email: string,
  userName: string,
  userType: string,
  username: string,
  userPrincipalName: string
) => {
  if (!gmailCounter.canSend()) {
    throw new Error("Límite diario de Gmail alcanzado");
  }

  const transporter = createGmailTransport();
  const mailOptions = {
    from: process.env.GMAIL_FROM || process.env.GMAIL_USER,
    to: email,
    subject: "Bienvenido/a al Portal de Usuario de la UNISS",
    html: getWelcomeEmailHTML(userName, userType, username, userPrincipalName),
  };

  const info = await transporter.sendMail(mailOptions);
  gmailCounter.increment();
  emailCounter.increment();
  
  return {
    ...info,
    servicio: 'gmail'
  };
};

export const sendPasswordExpiryAlertGmail = async (
  to: string,
  userName: string,
  daysLeft: number,
  alertType: string
): Promise<any> => {
  try {
    if (!gmailCounter.canSend()) {
      throw new Error("Límite diario de Gmail alcanzado");
    }

    validateEmail(to);

    const transportador = createGmailTransport();
    const contenidoHtml = getPasswordExpiryAlertHTML(userName, daysLeft, alertType);

    const opcionesCorreo = {
      from: process.env.GMAIL_FROM || process.env.GMAIL_USER,
      to,
      subject: `Alerta de contraseña - ${daysLeft} días restantes - UNISS`,
      html: contenidoHtml,
    };

    const info = await transportador.sendMail(opcionesCorreo);
    gmailCounter.increment();
    emailCounter.increment();
    
    return {
      ...info,
      servicio: 'gmail'
    };
  } catch (error) {
    throw new Error(
      `Error al enviar alerta de contraseña con Gmail: ${(error as Error).message}`
    );
  }
};

export const sendEmailNewGmail = async (
  email: string,
  userName: string,
  verificationCode: string
) => {
  if (!gmailCounter.canSend()) {
    throw new Error("Límite diario de Gmail alcanzado");
  }

  const transportador = createGmailTransport();
  const contenidoHtml = getNewEmailHTML(verificationCode, userName);

  const opcionesCorreo = {
    from: process.env.GMAIL_FROM || process.env.GMAIL_USER,
    to: email,
    subject: "Código de Verificación - UNISS",
    html: contenidoHtml,
  };

  const info = await transportador.sendMail(opcionesCorreo);
  gmailCounter.increment();
  emailCounter.increment();
  
  return {
    ...info,
    servicio: 'gmail'
  };
};

export const sendChangeEmailVerificationGmail = async (
  email: string,
  userName: string,
  verificationCode: string,
  newEmail: string
) => {
  if (!gmailCounter.canSend()) {
    throw new Error("Límite diario de Gmail alcanzado");
  }

  const transportador = createGmailTransport();
  const contenidoHtml = getChangeEmailHTML(userName, verificationCode, newEmail);

  const opcionesCorreo = {
    from: process.env.GMAIL_FROM || process.env.GMAIL_USER,
    to: email,
    subject: "Código de Verificación - Cambio de Correo UNISS",
    html: contenidoHtml,
  };

  const info = await transportador.sendMail(opcionesCorreo);
  gmailCounter.increment();
  emailCounter.increment();
  
  return {
    ...info,
    servicio: 'gmail'
  };
};

// ✅ ESTADÍSTICAS DE GMAIL
export const getGmailStats = () => {
  return {
    count: gmailCounter.getCount(),
    remaining: gmailCounter.getRemaining(),
    dailyLimit: gmailCounter.getDailyLimit(),
    usageMessage: gmailCounter.getUsageMessage(),
    available: gmailCounter.canSend()
  };
};

// ✅ RESET DIARIO (podrías llamar esta función cada 24h)
export const resetGmailCounter = (): void => {
  gmailCounter.reset();
  console.log('🔄 Contador de Gmail reiniciado');
};