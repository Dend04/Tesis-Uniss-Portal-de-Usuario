import { getLDAPPool } from "../utils/ldap.utils";
import { LDAPClient } from "../utils/ldap.utils";
import { bindAsync } from "../utils/ldap.utils";
import { userService } from "./user.services";
import { auditService } from "./audit.services";

export class AuthService {
  // Cache para usuarios verificados recientemente
  private userExistenceCache: Map<string, { exists: boolean; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  private clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.userExistenceCache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.userExistenceCache.delete(key);
      }
    }
  }

  async checkUserExists(username: string): Promise<boolean> {
    // Limpiar cache expirado
    this.clearExpiredCache();

    // Verificar si tenemos en cache
    const cached = this.userExistenceCache.get(username);
    if (cached) {
      console.log(`📦 Usuario encontrado en cache: ${username}`);
      return cached.exists;
    }

    try {
      const userData = await userService.getUserData(username);
      const exists = !!userData && !!userData.sAMAccountName;
      
      // Guardar en cache
      this.userExistenceCache.set(username, { 
        exists, 
        timestamp: Date.now() 
      });
      
      return exists;
    } catch (error) {
      console.log(`❌ Usuario no encontrado: ${username}`);
      // Guardar en cache incluso el resultado negativo
      this.userExistenceCache.set(username, { 
        exists: false, 
        timestamp: Date.now() 
      });
      return false;
    }
  }

  async authenticateUser(username: string, password: string): Promise<any> {
    const pool = getLDAPPool();
    let client: LDAPClient | null = null;
    let userExists: boolean | null = null; // Para evitar verificaciones múltiples

    try {
      client = await pool.getConnection();
      
      const authAttempts = [
        username,
        `${username}@uniss.edu.cu`,
        `UNISS\\${username}`,
        `uniss.edu.cu\\${username}`
      ];

      // Intentar autenticación sin verificar existencia primero
      for (const authName of authAttempts) {
        try {
          console.log(`🔐 Intentando autenticación para: ${authName}`);
          await bindAsync(client, authName, password);
          console.log(`✅ Autenticación exitosa`);
          
          const userData = await userService.getUserData(username);
          await auditService.logAuthenticationAttempt(username, true);
          return userData;
          
        } catch (attemptError) {
          console.log(`❌ Intento de autenticación fallido para: ${authName}`);
        }
      }

      // Si llegamos aquí, todas las autenticaciones fallaron
      // Ahora verificamos si el usuario existe para dar un mensaje específico
      console.log(`🔍 Verificando existencia del usuario después del fallo: ${username}`);
      userExists = await this.checkUserExists(username);

      if (!userExists) {
        await auditService.logAuthenticationAttempt(username, false, { 
          error: 'Usuario no encontrado',
          step: 'user_existence_check_after_failure'
        });
        throw new Error("Usuario no encontrado");
      }

      await auditService.logAuthenticationAttempt(username, false, { 
        error: 'Contraseña incorrecta',
        step: 'password_verification_failed'
      });
      throw new Error("Contraseña incorrecta");
      
    } catch (authError: any) {
      console.error("❌ Error en autenticación:", authError.message);
      
      // Relanzar el error con el mensaje específico
      throw authError;
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

  // Método para limpiar cache manualmente (útil para testing)
  clearCache(): void {
    this.userExistenceCache.clear();
  }
}

export const authService = new AuthService();