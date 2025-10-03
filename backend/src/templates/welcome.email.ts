// templates/newEmail.ts
export const getWelcomeEmailHTML = (
    userName: string, 
    userType: string, 
    username: string,
    userPrincipalName: string
  ) => `
  <!DOCTYPE html>
  <html lang="es">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bienvenido a la UNISS</title>
      <style>
          /* Tus estilos CSS existentes aquí */
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
          /* Añade más estilos según necesites */
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
                  <li><strong>Nombre de usuario:</strong> ${username}</li>
                  <li><strong>Correo institucional:</strong> ${userPrincipalName}</li>
                  <li><strong>Tipo de usuario:</strong> ${userType === 'student' ? 'Estudiante' : 'Trabajador'}</li>
              </ul>
          </div>
          
          <div class="highlight">
              <p><strong>Su cuenta ha sido activada exitosamente</strong> y ya puede:</p>
              <ul>
                  <li>Iniciar sesión en el sistema universitario</li>
                  <li>Acceder a todos los servicios disponibles</li>
                  <li>Utilizar su correo institucional ${userPrincipalName}</li>
              </ul>
          </div>
          
          <p>Para iniciar sesión, utilice su nombre de usuario <strong>${username}</strong> o su correo institucional <strong>${userPrincipalName}</strong> junto con la contraseña que estableció.</p>
          
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