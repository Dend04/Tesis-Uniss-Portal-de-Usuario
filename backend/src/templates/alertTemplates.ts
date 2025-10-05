// templates/alertTemplates.ts
export interface ConfigAlerta {
    titulo: string;
    colorHeader: string;
    urgencia: string;
    mensaje: string;
  }
  
  export const getPasswordExpiryAlertHTML = (userName: string, daysLeft: number, alertType: string): string => {
    const configs: { [key: string]: ConfigAlerta } = {
      'primera-alerta': {
        titulo: 'Recordatorio: Tu contraseña expirará pronto',
        colorHeader: '#004a8d',
        urgencia: 'Primera Alerta',
        mensaje: `Tu contraseña actual <strong>vencerá en ${daysLeft} días</strong>. Te recomendamos cambiarla pronto para evitar interrupciones.`
      },
      'alerta-urgente': {
        titulo: 'ALERTA URGENTE: Contraseña próxima a expirar',
        colorHeader: '#ff9800',
        urgencia: 'Alerta Urgente',
        mensaje: `Tu contraseña actual <strong>vencerá en ${daysLeft} días</strong>. Debes cambiarla inmediatamente para mantener el acceso.`
      },
      'alerta-final': {
        titulo: 'ÚLTIMA ALERTA: Tu contraseña expira MAÑANA',
        colorHeader: '#d9534f',
        urgencia: 'Alerta Final',
        mensaje: `Tu contraseña actual <strong>vencerá MAÑANA</strong>. Si no la cambias hoy, perderás acceso a los servicios universitarios.`
      },
      'cuenta-suspendida': {
        titulo: 'CUENTA SUSPENDIDA: Contraseña expirada',
        colorHeader: '#000000',
        urgencia: 'Cuenta Suspendida',
        mensaje: `Tu contraseña <strong>HA EXPIRADO</strong> y tu cuenta ha sido <strong>SUSPENDIDA</strong>. Contacta urgentemente a soporte técnico.`
      }
    };
    
    const config = configs[alertType];
    
    return `<!DOCTYPE html>
  <html lang="es">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${config.titulo}</title>
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
              background: ${config.colorHeader};
              color: white;
              padding: 25px;
              text-align: center;
              border-radius: 8px 8px 0 0;
          }
          .content {
              background-color: white;
              padding: 30px;
              border-radius: 0 0 8px 8px;
              box-shadow: 0 3px 15px rgba(0,0,0,0.1);
          }
          h1 {
              color: ${config.colorHeader};
              margin-top: 0;
              text-align: center;
              font-size: 24px;
          }
          .alert-badge {
              background-color: ${config.colorHeader};
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
              border-left: 4px solid ${config.colorHeader};
              margin: 20px 0;
              border-radius: 0 4px 4px 0;
          }
          .button {
              display: block;
              width: 70%;
              margin: 25px auto;
              text-align: center;
              background: ${config.colorHeader};
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
              color: ${config.colorHeader};
              text-align: center;
              margin: 15px 0;
          }
          .security-icon {
              display: block;
              text-align: center;
              font-size: 40px;
              margin: 15px 0;
              color: ${config.colorHeader};
          }
      </style>
  </head>
  <body>
      <div class="header">
          <h2>Portal de Usuario UNISS</h2>
          <div class="alert-badge">${config.urgencia}</div>
      </div>
      
      <div class="content">
          <h1>${config.titulo}</h1>
          
          <p>Estimado(a) ${userName},</p>
          
          <div class="highlight">
              <p>${config.mensaje}</p>
          </div>
          
          ${daysLeft >= 0 ? `<div class="days-left">${daysLeft} días restantes</div>` : ''}
          
          <div class="security-icon">🔒</div>
          
          ${alertType !== 'cuenta-suspendida' ? 
              `<a href="${process.env.PORTAL_URL}/cambiar-contrasena" class="button">Cambiar Contraseña Ahora</a>` :
              `<a href="${process.env.PORTAL_URL}/contactar-soporte" class="button">Contactar Soporte Técnico</a>`
          }
          
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
  </html>`;
  };