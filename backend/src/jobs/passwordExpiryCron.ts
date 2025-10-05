// jobs/passwordExpiryCron.ts
import cron from 'node-cron';
import { passwordExpiryService } from '../services/passwordExpiryService';
import { sendPasswordExpiryAlert } from '../services/emailService';

// Programar ejecución diaria a las 8:00 AM
cron.schedule('0 8 * * *', async (): Promise<void> => {
  console.log('🔍 Iniciando verificación de expiración de contraseñas...');
  
  try {
    const usuariosParaNotificar = await passwordExpiryService.getUsersWithExpiringPasswords([7, 3, 1, 0]);
    console.log(`📧 Encontrados ${usuariosParaNotificar.length} usuarios para notificar de la pronta expiracion de su contraseña`);
    
    for (const usuario of usuariosParaNotificar) {
      try {
        await sendPasswordExpiryAlert(
          usuario.email, 
          usuario.userName, 
          usuario.daysLeft, 
          usuario.alertType
        );
        console.log(`✅ Alerta ${usuario.alertType} enviada a ${usuario.email} (${usuario.daysLeft} días restantes)`);
      } catch (error) {
        console.error(`❌ Error enviando a ${usuario.email}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Error en el cron job:', error);
  }
}, {
  timezone: "America/Havana"
});

console.log('⏰ Cron job de alertas de contraseña programado');