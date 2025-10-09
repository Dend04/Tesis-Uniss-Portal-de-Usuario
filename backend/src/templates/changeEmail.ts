// src/templates/changeEmail.ts
export const getChangeEmailHTML = (userName: string, verificationCode: string, newEmail: string): string => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <style>
              body {
                  font-family: 'Arial', sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
              }
              .header {
                  background: linear-gradient(135deg, #1e40af, #3b82f6);
                  color: white;
                  padding: 30px;
                  text-align: center;
                  border-radius: 10px 10px 0 0;
              }
              .content {
                  background: #f8fafc;
                  padding: 30px;
                  border-radius: 0 0 10px 10px;
                  border: 1px solid #e2e8f0;
              }
              .verification-code {
                  background: #1e40af;
                  color: white;
                  font-size: 32px;
                  font-weight: bold;
                  text-align: center;
                  padding: 20px;
                  margin: 20px 0;
                  border-radius: 8px;
                  letter-spacing: 8px;
              }
              .warning {
                  background: #fef3c7;
                  border: 1px solid #f59e0b;
                  padding: 15px;
                  border-radius: 8px;
                  margin: 20px 0;
              }
              .footer {
                  text-align: center;
                  margin-top: 30px;
                  padding-top: 20px;
                  border-top: 1px solid #e2e8f0;
                  color: #64748b;
                  font-size: 12px;
              }
              .button {
                  display: inline-block;
                  background: #1e40af;
                  color: white;
                  padding: 12px 24px;
                  text-decoration: none;
                  border-radius: 6px;
                  margin: 10px 0;
              }
              .info-box {
                  background: #dbeafe;
                  border: 1px solid #3b82f6;
                  padding: 15px;
                  border-radius: 8px;
                  margin: 15px 0;
              }
          </style>
      </head>
      <body>
          <div class="header">
              <h1>🔐 Cambio de Correo Electrónico</h1>
              <p>Portal de Usuario UNISS</p>
          </div>
          
          <div class="content">
              <h2>Hola ${userName},</h2>
              
              <p>Has solicitado cambiar tu correo de respaldo en el Portal de Usuario de la UNISS.</p>
              
              <div class="info-box">
                  <strong>Nuevo correo:</strong> ${newEmail}<br>
                  <strong>Código de verificación:</strong>
              </div>
              
              <div class="verification-code">
                  ${verificationCode}
              </div>
              
              <div class="warning">
                  <strong>⚠️ Importante:</strong>
                  <ul>
                      <li>Este código expirará en 10 minutos</li>
                      <li>No compartas este código con nadie</li>
                      <li>Si no solicitaste este cambio, ignora este mensaje</li>
                  </ul>
              </div>
              
              <p>Ingresa este código en el portal para completar el cambio de tu correo electrónico.</p>
              
              <p><strong>¿Necesitas ayuda?</strong><br>
              Si tienes problemas con el código, puedes solicitar uno nuevo desde el portal.</p>
          </div>
          
          <div class="footer">
              <p>© ${new Date().getFullYear()} Universidad de Sancti Spíritus "José Martí Pérez"</p>
              <p>Portal de Usuario UNISS - Todos los derechos reservados</p>
              <p>Este es un mensaje automático, por favor no respondas a este correo</p>
          </div>
      </body>
      </html>
    `;
  };