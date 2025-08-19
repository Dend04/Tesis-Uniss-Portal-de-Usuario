import { Request, Response } from 'express';
import nodemailer, { Transporter } from 'nodemailer';
import dotenv from 'dotenv';
import { HttpsProxyAgent } from 'https-proxy-agent';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

dotenv.config();

export const enviarCorreoBienvenida = async (req: Request, res: Response) => {
    console.log('Inicio de enviarCorreoBienvenida');
    
    // Validar variables de entorno
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    
    if (!emailUser || !emailPass) {
        return res.status(500).json({
            success: false,
            message: 'Configuración de email incompleta',
            error: 'Faltan EMAIL_USER o EMAIL_PASS en .env'
        });
    }

    const testEmail = 'enamoradodairon@yahoo.com';
    const contenidoHtml = `
        <h1>¡Bienvenido a Nuestro Portal!</h1>
        <p>Gracias por registrarte. Estamos encantados de tenerte con nosotros.</p>
        <p>Disfruta de todos nuestros servicios y funcionalidades.</p>
    `;

    let transportador: Transporter;
    const proxyUrl = 'http://10.16.1.2';

    try {
        const proxyAgent = new HttpsProxyAgent(proxyUrl);
        
        // Configuración con tipos explícitos
        const smtpOptions: SMTPTransport.Options = {
            host: 'smtp.gmail.com',
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
            agent: proxyAgent
        };

        transportador = nodemailer.createTransport(smtpOptions);
        console.log('Usando proxy para enviar correo.');
    } catch (proxyError) {
        console.error('Error configurando proxy:', proxyError);
        
        const smtpOptions: SMTPTransport.Options = {
            host: 'smtp.gmail.com',
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

        transportador = nodemailer.createTransport(smtpOptions);
        console.log('Enviando correo directamente.');
    }

    const opcionesCorreo = {
        from: `"Portal de Usuario" <${emailUser}>`,
        to: testEmail,
        subject: '¡Bienvenido a Nuestra Plataforma!',
        html: contenidoHtml,
    };

    try {
        const info = await transportador.sendMail(opcionesCorreo);
        console.log('Correo enviado:', info.response);
        return res.status(200).json({ 
            success: true,
            message: 'Correo enviado exitosamente',
            email: testEmail
        });
    } catch (error: any) {
        console.error('Error al enviar:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Error al enviar el correo',
            error: error.message
        });
    }
};