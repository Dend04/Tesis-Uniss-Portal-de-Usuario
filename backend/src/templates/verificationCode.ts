// templates/verificationCode.ts
export const getVerificationCodeHTML = (userName: string, verificationCode: string) => `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Código de Verificación - UNISS</title>
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
            color: #004a8d;
            margin-top: 0;
            text-align: center;
            font-size: 24px;
        }
        .verification-code {
            font-size: 42px;
            letter-spacing: 8px;
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background-color: #f8f9fa;
            border: 2px dashed #004a8d;
            border-radius: 8px;
            font-weight: bold;
            color: #004a8d;
        }
        .highlight {
            background-color: #e6f7ff;
            padding: 15px;
            border-left: 4px solid #004a8d;
            margin: 20px 0;
            border-radius: 0 4px 4px 0;
        }
        .info-box {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin: 25px 0;
            border: 1px solid #eee;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 0.85em;
            color: #777;
            line-height: 1.4;
        }
        .security-icon {
            display: block;
            text-align: center;
            font-size: 40px;
            margin: 15px 0;
            color: #004a8d;
        }
        .note {
            text-align: center;
            font-style: italic;
            color: #d9534f;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>Portal de Usuario UNISS</h2>
    </div>
    
    <div class="content">
        <h1>Código de Verificación de Cuenta</h1>
        
        <p>Estimado(a) ${userName},</p>
        
        <p>Hemos recibido una solicitud para restablecer tu contraseña en el Portal de Usuario de la Universidad de Sancti Spíritus "José Martí Pérez".</p>
        
        <div class="highlight">
            <p>Utiliza el siguiente código de verificación para completar el proceso de restablecimiento de contraseña:</p>
        </div>
        
        <div class="verification-code">${verificationCode}</div>
        
        <div class="security-icon">🔐</div>
        
        <div class="note">Este código es válido por 15 minutos</div>
        
        <div class="info-box">
            <p><strong>Importante:</strong></p>
            <ul>
                <li>No compartas este código con nadie</li>
                <li>El equipo de soporte de UNISS nunca te pedirá este código</li>
                <li>Si no solicitaste este cambio, contacta inmediatamente a soporte</li>
            </ul>
        </div>
        
        <p>Si tienes problemas con el código o no solicitaste este cambio, por favor contacte a nuestro equipo de soporte técnico:</p>
        
        
        <p class="footer">
            © ${new Date().getFullYear()} Universidad de Sancti Spíritus "José Martí Pérez"<br>
            Seguridad y confidencialidad de tu cuenta son nuestra prioridad<br>
            Este es un mensaje automático. Por favor no responda a este correo.
        </p>
    </div>
</body>
</html>
`;