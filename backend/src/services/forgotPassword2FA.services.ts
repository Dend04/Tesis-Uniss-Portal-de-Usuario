// services/forgot-password-2fa.service.ts - VERSIÓN CORREGIDA
import { TOTP } from 'otpauth';
import { unifiedLDAPSearch } from '../utils/ldap.utils';

export class ForgotPassword2FAService {
  private ldapConfig = {
    url: process.env.LDAP_URL || 'ldap://localhost:389',
    bindDN: process.env.LDAP_BIND_DN || '',
    bindCredentials: process.env.LDAP_BIND_PASSWORD || '',
    searchBase: process.env.LDAP_SEARCH_BASE || '',
  };

  async checkUser(identifier: string) {
    try {
      console.log(`🔍 Buscando usuario: ${identifier}`);
      
      const filter = `(|(mail=${this.escapeLDAPValue(identifier)})(sAMAccountName=${this.escapeLDAPValue(identifier)})(userPrincipalName=${this.escapeLDAPValue(identifier)})(employeeID=${this.escapeLDAPValue(identifier)}))`;
      
      const attributes = [
        'mail', 
        'sAMAccountName', 
        'displayName', 
        'employeeID', 
        'employeeNumber', 
        'dn', 
        'userParameters',
        'userPrincipalName',
        'accountStatus'
      ];
      
      const entries = await unifiedLDAPSearch(filter, attributes);
      
      if (!entries || entries.length === 0) {
        console.log(`❌ Usuario no encontrado: ${identifier}`);
        return { success: false, error: 'Usuario no encontrado' };
      }

      const user = entries[0];
      
      console.log(`✅ Usuario encontrado - Detalles completos:`, {
        mail: user.mail,
        sAMAccountName: user.sAMAccountName,
        displayName: user.displayName,
        employeeID: user.employeeID,
        employeeNumber: user.employeeNumber,
        userParameters: user.userParameters,
        userPrincipalName: user.userPrincipalName,
        accountStatus: user.accountStatus,
        dn: user.dn
      });

      // ✅ CORREGIDO: Usar la nueva lógica mejorada para verificar 2FA
      const has2FA = this.check2FAStatusImproved(user);
      
      console.log(`🔐 Estado 2FA para ${user.sAMAccountName}:`, {
        has2FA: has2FA,
        userParameters: user.userParameters,
        employeeNumber: user.employeeNumber
      });

      return {
        success: true,
        user: {
          email: user.mail,
          displayName: user.displayName,
          sAMAccountName: user.sAMAccountName,
          employeeID: user.employeeID,
          userPrincipalName: user.userPrincipalName,
          dn: user.dn,
          accountStatus: user.accountStatus,
          has2FA,
          employeeNumber: user.employeeNumber,
          userParameters: user.userParameters
        }
      };

    } catch (error) {
      console.error('❌ Error verificando usuario:', error);
      return { 
        success: false, 
        error: 'Error del servidor al buscar usuario' 
      };
    }
  }

  // ✅ NUEVO MÉTODO MEJORADO: Verificar 2FA de múltiples formas
  private check2FAStatusImproved(user: any): boolean {
    try {
      const userParameters = user.userParameters ? user.userParameters.toString() : '';
      const employeeNumber = user.employeeNumber ? user.employeeNumber.toString() : '';

      console.log(`🔍 Analizando campos para 2FA:`, {
        userParameters: userParameters,
        employeeNumber: employeeNumber
      });

      // ✅ MÚLTIPLES FORMAS DE VERIFICAR SI TIENE 2FA ACTIVO:
      
      // 1. userParameters contiene "2FA ENABLED"
      const has2FAInUserParams = userParameters.includes('2FA ENABLED');
      
      // 2. employeeNumber contiene un secreto TOTP válido
      const hasValidTOTPSecret = this.isValidTOTPSecret(this.cleanTOTPSecret(employeeNumber));
      
      // 3. Otras posibles formas de indicar 2FA activo
      const has2FAInOtherForms = 
        userParameters.includes('TOTP') ||
        userParameters.includes('2FA:ENABLED') ||
        userParameters.includes('2FA=ENABLED') ||
        userParameters.includes('2FA ACTIVE') ||
        userParameters.includes('TWO_FACTOR_ENABLED');

      // ✅ CONSIDERAR QUE TIENE 2FA SI CUMPLE ALGUNA CONDICIÓN
      const has2FA = has2FAInUserParams || hasValidTOTPSecret || has2FAInOtherForms;
      
      console.log(`📊 Resultado verificación 2FA mejorada:`, {
        has2FAInUserParams,
        hasValidTOTPSecret,
        has2FAInOtherForms,
        finalResult: has2FA
      });

      return has2FA;
    } catch (error) {
      console.error('Error en check2FAStatusImproved:', error);
      return false;
    }
  }

  // ✅ MÉTODO verifyCode ACTUALIZADO PARA USAR LA NUEVA VERIFICACIÓN
  async verifyCode(identifier: string, code: string) {
    try {
      console.log(`🔢 Verificando código 2FA para: ${identifier}`);
      
      if (!/^\d{6}$/.test(code)) {
        return { success: false, error: 'El código debe tener 6 dígitos' };
      }

      const filter = `(|(mail=${this.escapeLDAPValue(identifier)})(sAMAccountName=${this.escapeLDAPValue(identifier)})(userPrincipalName=${this.escapeLDAPValue(identifier)})(employeeID=${this.escapeLDAPValue(identifier)}))`;
      const attributes = ['sAMAccountName', 'mail', 'employeeNumber', 'userParameters'];
      
      const entries = await unifiedLDAPSearch(filter, attributes);
      
      if (!entries || entries.length === 0) {
        return { success: false, error: 'Usuario no encontrado' };
      }

      const user = entries[0];
      
      console.log(`🔍 Campos del usuario encontrados:`, {
        sAMAccountName: user.sAMAccountName,
        employeeNumber: user.employeeNumber,
        userParameters: user.userParameters
      });

      // ✅ USAR LA NUEVA VERIFICACIÓN MEJORADA
      const has2FA = this.check2FAStatusImproved(user);
      
      if (!has2FA) {
        console.log(`❌ Usuario no tiene 2FA configurado según verificación mejorada`);
        console.log(`📝 Detalles:`, {
          userParameters: user.userParameters,
          employeeNumber: user.employeeNumber,
          hasSecret: !!user.employeeNumber
        });
        return { success: false, error: 'El usuario no tiene 2FA configurado' };
      }

      // ✅ EL SECRETO ESTÁ EN employeeNumber
      if (!user.employeeNumber) {
        console.log(`❌ No se encontró secreto en employeeNumber`);
        return { success: false, error: 'No se encontró el secreto 2FA en employeeNumber' };
      }

      const secret = user.employeeNumber.toString();
      const cleanSecret = this.cleanTOTPSecret(secret);
      
      if (!this.isValidTOTPSecret(cleanSecret)) {
        console.log(`❌ Secreto TOTP inválido en employeeNumber: ${cleanSecret}`);
        return { success: false, error: 'Secreto 2FA inválido en el sistema' };
      }

      console.log(`🔑 Verificando código con secreto 2FA para: ${user.sAMAccountName}`, {
        secret: cleanSecret,
        code: code
      });

      const totp = new TOTP({
        issuer: 'Credenciales Uniss',
        label: user.sAMAccountName || user.mail || identifier,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: cleanSecret,
      });

      const isValid = totp.validate({ token: code, window: 2 }) !== null;

      if (!isValid) {
        console.log(`❌ Código 2FA inválido para: ${user.sAMAccountName}`);
        return { success: false, error: 'Código incorrecto' };
      }

      console.log(`✅ Código 2FA verificado para: ${user.sAMAccountName}`);
      return {
        success: true,
        message: 'Código verificado correctamente'
      };

    } catch (error) {
      console.error('❌ Error verificando código:', error);
      return { success: false, error: 'Error del servidor al verificar código' };
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