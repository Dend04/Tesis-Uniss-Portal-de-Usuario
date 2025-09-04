// En el servicio emailService, modificar la función getWelcomeEmailHTML
export const getWelcomeEmailHTML = (userName: string, userType: string) => `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenido a la UNISS</title>
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
        .logo {
            max-width: 150px;
            margin-bottom: 15px;
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
        .highlight {
            background-color: #fffde7;
            padding: 10px;
            border-left: 4px solid #ffc107;
            margin: 15px 0;
        }
        .user-info {
            background-color: #f0f7ff;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>Portal de Usuario de la Universidad</h2>
    </div>
    
    <div class="content">
        <h1>¡Bienvenido/a ${userName} al Portal de Usuario de la UNISS!</h1>
        
        <p>Estimado/a ${userName},</p>
        
        <p>Le damos la más cordial bienvenida al Portal de Usuario de la Universidad de Sancti Spíritus "José Martí Pérez".</p>
        
        <div class="user-info">
            <p><strong>Información de su cuenta:</strong></p>
            <ul>
                <li><strong>Tipo de usuario:</strong> ${userType === 'student' ? 'Estudiante' : 'Trabajador'}</li>
                <li><strong>Correo electrónico registrado:</strong> [EMAIL]</li>
            </ul>
        </div>
        
        <div class="highlight">
            <p><strong>Su correo electrónico ha sido registrado</strong> y será utilizado para:</p>
            <ul>
                <li>Recuperar su cuenta en caso de olvido de contraseña</li>
                <li>Restablecer credenciales cuando estas venzan</li>
                <li>Recibir notificaciones importantes del sistema</li>
            </ul>
        </div>
        
        <p>Le recomendamos mantener este correo activo y seguro para garantizar el acceso permanente a los servicios universitarios.</p>
        
        <p>Para cualquier consulta o asistencia, no dude en contactar a nuestro equipo de soporte:</p>
        <p><strong>Soporte Técnico:</strong> soporte@uniss.edu.cu<br>
        <strong>Teléfono:</strong> +53 41 123456</p>
        
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