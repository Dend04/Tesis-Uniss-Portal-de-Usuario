// templates/passwordExpiryAlert.ts
export const getPasswordExpiryAlertHTML = (userName: string, daysLeft: number) => `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alerta de Contraseña - UNISS</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .header {
            background: linear-gradient(135deg, #004a8d, #00264d);
            color: white;
            padding: 25px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .logo-container {
            display: flex;
            justify-content: center;
            margin-bottom: 15px;
        }
        .logo {
            max-width: 120px;
            height: auto;
        }
        .content {
            background-color: white;
            padding: 30px;
            border-radius: 0 0 8px 8px;
            box-shadow: 0 3px 15px rgba(0,0,0,0.1);
        }
        h1 {
            color: #d9534f;
            margin-top: 0;
            text-align: center;
            font-size: 24px;
        }
        .alert-badge {
            background-color: #d9534f;
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            font-weight: bold;
            display: inline-block;
            margin: 10px 0;
        }
        .highlight {
            background-color: #fffde7;
            padding: 15px;
            border-left: 4px solid #ffc107;
            margin: 20px 0;
            border-radius: 0 4px 4px 0;
        }
        .button {
            display: block;
            width: 70%;
            margin: 25px auto;
            text-align: center;
            background: linear-gradient(to right, #004a8d, #0066cc);
            color: white !important;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            font-size: 18px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
        }
        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 8px rgba(0,0,0,0.15);
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 0.85em;
            color: #777;
            line-height: 1.4;
        }
        .contact-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin: 25px 0;
            text-align: center;
            border: 1px solid #eee;
        }
        .days-left {
            font-size: 28px;
            font-weight: bold;
            color: #d9534f;
            text-align: center;
            margin: 15px 0;
        }
        .security-icon {
            display: block;
            text-align: center;
            font-size: 40px;
            margin: 15px 0;
            color: #004a8d;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>Portal de Usuario UNISS</h2>
    </div>
    
    <div class="content">
        <h1>Alerta de Cambio de Contraseña</h1>
        
        <p>Estimado(a) ${userName},</p>
        
        <p>Por razones de seguridad, el sistema de contraseñas del Portal de Usuario UNISS requiere que actualices tu contraseña periódicamente.</p>
        
        <div class="highlight">
            <p>Tu contraseña actual <strong>vencerá en ${daysLeft} días</strong>. Para evitar interrupciones en tu acceso a los servicios universitarios, te recomendamos cambiarla lo antes posible.</p>
        </div>
        
        <div class="days-left">${daysLeft} días restantes</div>
        
        <div class="security-icon">🔒</div>
        
        <a href="${process.env.BASE_URL}/cambiar-contrasena" class="button">Cambiar Contraseña Ahora</a>
        
        <div class="contact-info">
            <p><strong>Soporte Técnico UNISS</strong><br>
            Teléfono: +53 41 123456<br>
            Email: soporte@uniss.edu.cu<br>
            Horario: Lunes a Viernes, 8:00 AM - 5:00 PM</p>
        </div>
        
        <p>Si tienes dificultades para cambiar tu contraseña o necesitas asistencia, no dudes en contactar a nuestro equipo de soporte técnico.</p>
        
        <p class="footer">
            © ${new Date().getFullYear()} Universidad de Sancti Spíritus "José Martí Pérez"<br>
            Este es un mensaje automático. Por favor no responda a este correo.<br>
            Protegiendo tu acceso a los servicios universitarios
        </p>
    </div>
</body>
</html>
`;