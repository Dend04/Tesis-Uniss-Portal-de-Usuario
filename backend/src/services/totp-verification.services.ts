// services/totp-verification.service.ts
import { TOTP } from 'otpauth';
import { unifiedLDAPSearch } from '../utils/ldap.utils';

export class TOTPVerificationService {
  /**
   * ✅ VERIFICAR CÓDIGO TOTP - ENFOQUE DIRECTO
   * Solo verifica el código, asume que el usuario ya tiene 2FA activado
   */
  async verifyTOTPCode(identifier: string, code: string) {
    try {
      console.log(`🔢 Verificando código TOTP para: ${identifier}`);
      
      // Validación básica del código
      if (!/^\d{6}$/.test(code)) {
        return { success: false, error: 'El código debe tener 6 dígitos' };
      }

      // Buscar usuario para obtener el secreto TOTP
      const filter = `(|(mail=${this.escapeLDAPValue(identifier)})(sAMAccountName=${this.escapeLDAPValue(identifier)})(userPrincipalName=${this.escapeLDAPValue(identifier)})(employeeID=${this.escapeLDAPValue(identifier)}))`;
      const attributes = ['sAMAccountName', 'mail', 'employeeNumber', 'displayName'];
      
      const entries = await unifiedLDAPSearch(filter, attributes);
      
      if (!entries || entries.length === 0) {
        return { success: false, error: 'Usuario no encontrado' };
      }

      const user = entries[0];
      
      console.log(`🔍 Usuario encontrado para verificación TOTP:`, {
        sAMAccountName: user.sAMAccountName,
        hasEmployeeNumber: !!user.employeeNumber
      });

      // ✅ EL SECRETO TOTP DEBE ESTAR EN employeeNumber
      if (!user.employeeNumber) {
        console.log(`❌ No se encontró secreto TOTP en employeeNumber`);
        return { success: false, error: 'No se encontró configuración de autenticación de dos factores' };
      }

      const secret = user.employeeNumber.toString();
      const cleanSecret = this.cleanTOTPSecret(secret);
      
      // Validar formato del secreto
      if (!this.isValidTOTPSecret(cleanSecret)) {
        console.log(`❌ Secreto TOTP inválido: ${cleanSecret}`);
        return { success: false, error: 'Configuración de seguridad inválida' };
      }

      console.log(`🔑 Verificando código TOTP para: ${user.sAMAccountName}`, {
        secret: `${cleanSecret.substring(0, 8)}...`,
        code: code
      });

      // Crear instancia TOTP y verificar código
      const totp = new TOTP({
        issuer: 'Sistema UNISS',
        label: user.sAMAccountName || user.mail || identifier,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: cleanSecret,
      });

      // Verificar código con ventana de 2 periodos (60 segundos)
      const isValid = totp.validate({ token: code, window: 2 }) !== null;

      if (!isValid) {
        console.log(`❌ Código TOTP inválido para: ${user.sAMAccountName}`);
        return { success: false, error: 'Código incorrecto. Verifique que la hora de su dispositivo esté sincronizada.' };
      }

      console.log(`✅ Código TOTP verificado exitosamente para: ${user.sAMAccountName}`);
      return {
        success: true,
        message: 'Código verificado correctamente',
        user: {
          sAMAccountName: user.sAMAccountName,
          displayName: user.displayName,
          email: user.mail
        }
      };

    } catch (error) {
      console.error('❌ Error verificando código TOTP:', error);
      return { success: false, error: 'Error del servidor al verificar código' };
    }
  }

  /**
   * ✅ OBTENER INFORMACIÓN DEL USUARIO PARA 2FA (sin verificar estado)
   */
  async getUserTOTPInfo(identifier: string) {
    try {
      console.log(`🔍 Obteniendo información TOTP para: ${identifier}`);
      
      const filter = `(|(mail=${this.escapeLDAPValue(identifier)})(sAMAccountName=${this.escapeLDAPValue(identifier)})(userPrincipalName=${this.escapeLDAPValue(identifier)})(employeeID=${this.escapeLDAPValue(identifier)}))`;
      const attributes = ['mail', 'sAMAccountName', 'displayName', 'employeeID', 'employeeNumber', 'dn'];
      
      const entries = await unifiedLDAPSearch(filter, attributes);
      
      if (!entries || entries.length === 0) {
        return { success: false, error: 'Usuario no encontrado' };
      }

      const user = entries[0];
      
      // Verificar si tiene secreto TOTP
      const hasTOTPSecret = !!user.employeeNumber && this.isValidTOTPSecret(this.cleanTOTPSecret(user.employeeNumber.toString()));
      
      return {
        success: true,
        user: {
          email: user.mail,
          displayName: user.displayName,
          sAMAccountName: user.sAMAccountName,
          employeeID: user.employeeID,
          dn: user.dn,
          hasTOTPSecret
        }
      };

    } catch (error) {
      console.error('❌ Error obteniendo información TOTP:', error);
      return { success: false, error: 'Error del servidor al buscar usuario' };
    }
  }

  private cleanTOTPSecret(secret: string): string {
    return secret.replace(/[\s\-_=]/g, '').toUpperCase();
  }

  private isValidTOTPSecret(secret: string): boolean {
    const base32Regex = /^[A-Z2-7]{16,64}$/;
    return base32Regex.test(secret);
  }

  private escapeLDAPValue(value: string): string {
    if (!value) return '';
    return value
      .replace(/\\/g, "\\\\")
      .replace(/,/g, "\\,")
      .replace(/"/g, '\\"')
      .replace(/</g, "\\<")
      .replace(/>/g, "\\>")
      .replace(/;/g, "\\;")
      .replace(/=/g, "\\=")
      .replace(/\+/g, "\\+")
      .replace(/\#/g, "\\#")
      .replace(/\r/g, "")
      .replace(/\n/g, "");
  }
}