import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 465,
  secure: true, // SSL
  auth: {
    user: process.env.ZOHO_EMAIL, // Ej: usuario@tudominio.com
    pass: process.env.ZOHO_PASSWORD, // Contraseña de aplicación si usas 2FA :cite[2]
  },
});

export default transporter;