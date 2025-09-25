import { getLDAPPool } from "../utils/ldap.utils";
import { LDAPClient } from "../utils/ldap.utils";
import { bindAsync } from "../utils/ldap.utils";
import { userService } from "./user.services";
import { auditService } from "./audit.services";

export class AuthService {
  
  async authenticateUser(username: string, password: string): Promise<any> {
    const pool = getLDAPPool();
    let client: LDAPClient | null = null;

    try {
      client = await pool.getConnection();
      
      const authAttempts = [
        username,
        `${username}@uniss.edu.cu`,
        `UNISS\\${username}`,
        `uniss.edu.cu\\${username}`
      ];

      for (const authName of authAttempts) {
        try {
          console.log(`🔐 Intentando autenticación para usuario`);
          await bindAsync(client, authName, password);
          console.log(`✅ Autenticación exitosa`);
          
          const userData = await userService.getUserData(username);
          await auditService.logAuthenticationAttempt(username, true);
          return userData;
          
        } catch (attemptError) {
          console.log(`❌ Intento de autenticación fallido`);
        }
      }

      throw new Error("Todos los métodos de autenticación fallaron");
      
    } catch (authError: any) {
      console.error("❌ Error en autenticación:", authError.message);
      
      const userExists = await userService.checkUserExists(username);
      if (!userExists) {
        await auditService.logAuthenticationAttempt(username, false, { error: 'Usuario no encontrado' });
        throw new Error("Usuario no encontrado");
      }
      
      await auditService.logAuthenticationAttempt(username, false, { error: authError.message });
      throw new Error(`Credenciales inválidas: ${authError.message}`);
    } finally {
      if (client) {
        pool.releaseConnection(client);
      }
    }
  }

  async validateUserCredentials(username: string, password: string): Promise<boolean> {
    try {
      await this.authenticateUser(username, password);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const authService = new AuthService();