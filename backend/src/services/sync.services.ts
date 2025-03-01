import User from '../models/User';
import { IUser } from '../models/User';
import { createLDAPClient, ldapChangePassword } from '../utils/ldap.utils';

class SyncService {
  // Sincronizar contraseña en ambos sistemas
  async syncPassword(user: IUser, newPassword: string): Promise<void> {
    try {
      // Actualizar en LDAP
      const ldapClient = createLDAPClient();
      await ldapChangePassword(ldapClient, user.username, newPassword);
      
      // Actualizar en MongoDB
      user.password = newPassword;
      user.ldapSynced = true;
      await user.save();
      
    } catch (ldapError) {
      // Marcar como no sincronizado y guardar en MongoDB
      user.ldapSynced = false;
      await user.save();
      throw new Error('Error sincronizando con LDAP');
    }
  }

  // Sincronizar usuarios existentes
  async syncExistingUsers(): Promise<void> {
    try {
      const users = await User.find({ ldapSynced: false });
      
      for (const user of users) {
        try {
          const ldapClient = createLDAPClient();
          await ldapChangePassword(ldapClient, user.username, user.password);
          
          user.ldapSynced = true;
          await user.save();
          
        } catch (error) {
          console.error(`Error sincronizando usuario ${user.username}:`, error);
        }
      }
    } catch (error) {
      console.error('Error en sincronización masiva:', error);
    }
  }
}

export default new SyncService();