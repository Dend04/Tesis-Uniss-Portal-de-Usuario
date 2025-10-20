// services/2faStorage.service.ts
class TwoFAStorageService {
  /**
   * ✅ Guardar datos 2FA en backend (encriptados)
   */
  async save2FAData(sAMAccountName: string, secret: string, backupCodes: string[]): Promise<void> {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      
      console.log('💾 Guardando datos 2FA en backend...');

      const response = await fetch(`${API_URL}/2fa/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sAMAccountName,
          secret,
          backupCodes
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Error guardando datos 2FA');
      }
      
      console.log('✅ Datos 2FA guardados exitosamente en backend');

      // ✅ También guardar localmente como fallback
      this.saveLocalFallback(sAMAccountName, secret, backupCodes);
      
    } catch (error) {
      console.error('❌ Error guardando datos 2FA en backend:', error);
      
      // Fallback: guardar solo localmente
      console.warn('🔄 Usando almacenamiento local como fallback');
      this.saveLocalFallback(sAMAccountName, secret, backupCodes);
      
      throw error;
    }
  }

  /**
   * ✅ Recuperar secreto 2FA desde backend
   */
  async get2FASecret(sAMAccountName: string): Promise<string | null> {
    try {
      // Primero intentar desde el backend
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      
      const response = await fetch(`${API_URL}/2fa/secret/${encodeURIComponent(sAMAccountName)}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.secret) {
          console.log('✅ Secreto recuperado desde backend');
          return result.secret;
        }
      }

      // Fallback: intentar desde almacenamiento local
      return this.getLocalFallback(sAMAccountName);
      
    } catch (error) {
      console.error('❌ Error obteniendo secreto desde backend:', error);
      return this.getLocalFallback(sAMAccountName);
    }
  }

  /**
   * ✅ Verificar estado 2FA
   */
  async check2FAStatus(sAMAccountName: string): Promise<{enabled: boolean; hasSecret: boolean}> {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      
      const response = await fetch(`${API_URL}/2fa/status/${encodeURIComponent(sAMAccountName)}`);
      
      if (response.ok) {
        const result = await response.json();
        return {
          enabled: result.enabled || false,
          hasSecret: result.hasSecret || false
        };
      }
      
      return { enabled: false, hasSecret: false };
      
    } catch (error) {
      console.error('❌ Error verificando estado 2FA:', error);
      return { enabled: false, hasSecret: false };
    }
  }

  private saveLocalFallback(sAMAccountName: string, secret: string, backupCodes: string[]): void {
    try {
      localStorage.setItem(`2fa_secret_${sAMAccountName}`, secret);
      localStorage.setItem(`2fa_backup_codes_${sAMAccountName}`, JSON.stringify(backupCodes));
      localStorage.setItem(`2fa_enabled_${sAMAccountName}`, 'true');
    } catch (error) {
      console.error('❌ Error guardando en localStorage:', error);
    }
  }

  private getLocalFallback(sAMAccountName: string): string | null {
    try {
      return localStorage.getItem(`2fa_secret_${sAMAccountName}`);
    } catch (error) {
      console.error('❌ Error leyendo desde localStorage:', error);
      return null;
    }
  }
}

export const twoFAStorageService = new TwoFAStorageService();