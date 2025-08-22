// templates/newEmail.ts
export const getNewEmailHTML = (verificationCode: string, userName: string) => `
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
            background-color: #004a8d;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: white;
            padding: 30px;
            border-radius: 0 0 8px 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #004a8d;
            margin-top: 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 0.9em;
            color: #666;
        }
        .code {
            background-color: #f5f5f5;
            border: 2px dashed #004a8d;
            padding: 15px;
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 5px;
            margin: 20px 0;
        }
        .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 10px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>Portal de Usuario de la Universidad</h2>
    </div>
    
    <div class="content">
        <h1>Código de Verificación</h1>
        
        <p>Estimado/a ${userName},</p>
        
        <p>Has solicitado cambiar tu dirección de correo electrónico asociada a tu cuenta en el Portal de Usuario de la Universidad de Sancti Spíritus "José Martí Pérez".</p>
        
        <p>Utiliza el siguiente código de verificación para completar el proceso:</p>
        
        <div class="code">${verificationCode}</div>
        
        <div class="warning">
            <p><strong>Importante:</strong> Este código expirará en 10 minutos. Si no has solicitado este cambio, por favor ignora este mensaje y contacta con nuestro equipo de soporte inmediatamente.</p>
        </div>
        
        <p>Atentamente,</p>
        <p><strong>Equipo de Desarrollo TI</strong><br>
        Universidad de Sancti Spíritus "José Martí Pérez"</p>
    </div>
    
    <div class="footer">
        <p>© ${new Date().getFullYear()} Universidad de Sancti Spíritus "José Martí Pérez". Todos los derechos reservados.</p>
        <p>Este es un mensaje automático, por favor no responda a este correo.</p>
    </div>
</body>
</html>
`;