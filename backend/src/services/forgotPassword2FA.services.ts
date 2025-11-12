import { TOTP } from 'otpauth';
import { searchLDAPUserForEmail, unifiedLDAPSearch } from '../utils/ldap.utils';

export interface CheckUserResult {
  success: boolean;
  user?: {
    email?: string;
    displayName?: string;
    sAMAccountName?: string;
    employeeID?: string;
    userPrincipalName?: string;
    dn: string;
    accountStatus?: string;
    has2FA: boolean;
    employeeNumber?: string;
    userParameters?: string;
  };
  error?: string;
}

interface VerifyCodeResult {
  success: boolean;
  message?: string;
  error?: string;
}

export class ForgotPassword2FAService {
  /**
   * ✅ MÉTODO CORREGIDO: Buscar usuario y verificar estado 2FA
   */
  async checkUser(identifier: string): Promise<CheckUserResult> {
    try {
      console.log('🔐 Verificando usuario para recuperación 2FA:', identifier);

      // ✅ USAR LA FUNCIÓN CORRECTA PARA BUSCAR USUARIOS
      const user = await this.findUserByIdentifier(identifier);

      if (!user) {
        return { 
          success: false, 
          error: 'Usuario no encontrado' 
        };
      }

      console.log('✅ Usuario encontrado - Detalles completos:', {
        mail: user.mail,
        sAMAccountName: user.sAMAccountName,
        displayName: user.displayName,
        employeeID: user.employeeID,
        employeeNumber: user.employeeNumber,
        userParameters: user.userParameters,
        userPrincipalName: user.userPrincipalName,
        distinguishedName: user.distinguishedName
      });

      // ✅ VERIFICAR 2FA USANDO LOS CAMPOS CORRECTOS
      const has2FA = await this.check2FAStatus(user);

      const result = {
        success: true,
        user: {
          email: user.mail || user.userPrincipalName,
          displayName: user.displayName,
          sAMAccountName: user.sAMAccountName,
          employeeID: user.employeeID,
          userPrincipalName: user.userPrincipalName,
          dn: user.distinguishedName,
          accountStatus: this.determineAccountStatus(user),
          has2FA,
          employeeNumber: user.employeeNumber,
          userParameters: user.userParameters
        }
      };

      console.log('📊 Resultado de checkUser:', result);
      return result;

    } catch (error) {
      console.error('❌ Error en checkUser:', error);
      return { 
        success: false, 
        error: 'Error del servidor al buscar usuario' 
      };
    }
  }

  /**
   * ✅ MÉTODO CORREGIDO: Buscar usuario por identificador
   */
  private async findUserByIdentifier(identifier: string): Promise<any> {
    try {
      const filter = `(|(sAMAccountName=${this.escapeLDAPValue(identifier)})(employeeID=${this.escapeLDAPValue(identifier)})(userPrincipalName=${this.escapeLDAPValue(identifier)}))`;
      const attributes = [
        'mail',
        'sAMAccountName',
        'displayName',
        'employeeID',
        'employeeNumber',
        'userParameters',
        'userPrincipalName',
        'distinguishedName',
        'userAccountControl',
        'lockoutTime',
        'pwdLastSet',
        'company'
      ];

      console.log('🔍 Realizando búsqueda LDAP con filtro:', filter);
      console.log('📋 Atributos solicitados:', attributes);

      // ✅ USAR searchLDAPUserForEmail QUE ES MÁS CONFIABLE
      const users = await searchLDAPUserForEmail(filter, attributes);

      if (users.length === 0) {
        console.log('❌ No se encontraron usuarios con el filtro:', filter);
        return null;
      }

      const user = users[0];
      console.log('✅ Usuario encontrado en LDAP:', {
        sAMAccountName: user.sAMAccountName,
        employeeID: user.employeeID,
        displayName: user.displayName,
        mail: user.mail,
        userPrincipalName: user.userPrincipalName,
        employeeNumber: user.employeeNumber ? 'PRESENTE' : 'AUSENTE',
        userParameters: user.userParameters ? 'PRESENTE' : 'AUSENTE',
        distinguishedName: user.distinguishedName
      });

      return user;

    } catch (error) {
      console.error('❌ Error en findUserByIdentifier:', error);
      throw error;
    }
  }

  /**
   * ✅ MÉTODO MEJORADO: Verificar estado 2FA con análisis completo
   */
  private async check2FAStatus(user: any): Promise<boolean> {
    try {
      console.log('🔍 Analizando campos para 2FA:', {
        userParameters: user.userParameters || '[VACÍO]',
        employeeNumber: user.employeeNumber || '[VACÍO]'
      });

      // ✅ VERIFICAR userParameters PRIMERO
      const has2FAInUserParams = user.userParameters ? 
        this.is2FAEnabledInUserParameters(user.userParameters) : false;

      // ✅ VERIFICAR employeeNumber PARA SECRETO TOTP
      let hasValidTOTPSecret = false;
      if (user.employeeNumber) {
        const cleanSecret = this.cleanTOTPSecret(user.employeeNumber.toString());
        if (this.isValidTOTPSecret(cleanSecret)) {
          hasValidTOTPSecret = true;
          console.log('🔓 Secreto TOTP válido encontrado en employeeNumber');
        } else {
          console.log('ℹ️  employeeNumber no contiene secreto TOTP válido');
        }
      }

      // ✅ VERIFICAR OTRAS FORMAS DE 2FA (backward compatibility)
      const has2FAInOtherForms = await this.checkAlternative2FAMethods(user.sAMAccountName);

      const finalResult = has2FAInUserParams || hasValidTOTPSecret || has2FAInOtherForms;

      console.log('📊 Resultado verificación 2FA mejorada:', {
        has2FAInUserParams,
        hasValidTOTPSecret,
        has2FAInOtherForms,
        finalResult
      });

      return finalResult;

    } catch (error) {
      console.error('❌ Error en check2FAStatus:', error);
      return false;
    }
  }

  /**
   * ✅ VERIFICAR SI userParameters INDICA 2FA ACTIVADO
   */
  private is2FAEnabledInUserParameters(userParameters: string): boolean {
    const userParamsStr = userParameters.toString();
    return userParamsStr === '2FA ENABLED' || 
           userParamsStr === '2FA ACTIVADO' ||
           userParamsStr.includes('2FA=ENABLED') ||
           userParamsStr.includes('TOTP:ENABLED');
  }

  /**
   * ✅ VERIFICAR MÉTODOS ALTERNATIVOS DE 2FA
   */
  private async checkAlternative2FAMethods(sAMAccountName: string): Promise<boolean> {
    try {
      if (!sAMAccountName) return false;

      // Buscar en otros atributos que puedan contener información de 2FA
      const filter = `(sAMAccountName=${this.escapeLDAPValue(sAMAccountName)})`;
      const attributes = [
        'comment',
        'description',
        'info',
        'extensionAttribute1',
        'extensionAttribute2',
        'extensionAttribute15'
      ];

      const users = await unifiedLDAPSearch(filter, attributes);
      
      if (users.length === 0) return false;

      const user = users[0];
      let has2FA = false;

      // Verificar cada atributo para indicadores de 2FA
      user.attributes.forEach((attr: any) => {
        if (attr.values && attr.values[0]) {
          const value = attr.values[0].toString().toLowerCase();
          if (value.includes('2fa') || value.includes('totp') || value.includes('google authenticator')) {
            has2FA = true;
            console.log(`🔍 2FA encontrado en atributo ${attr.type}: ${value}`);
          }
        }
      });

      return has2FA;

    } catch (error) {
      console.error('❌ Error en checkAlternative2FAMethods:', error);
      return false;
    }
  }

  /**
   * ✅ DETERMINAR ESTADO DE LA CUENTA
   */
  private determineAccountStatus(user: any): string {
    const userAccountControl = user.userAccountControl || 0;
    
    if (userAccountControl & 0x0002) {
      return 'disabled';
    }

    const lockoutTime = user.lockoutTime || 0;
    if (lockoutTime > 0) {
      return 'locked';
    }

    const pwdLastSet = user.pwdLastSet || 0;
    if (pwdLastSet === 0) {
      return 'expired';
    }

    return 'active';
  }

  /**
   * ✅ VERIFICAR CÓDIGO TOTP
   */
  async verifyCode(identifier: string, code: string): Promise<VerifyCodeResult> {
    try {
      console.log('🔢 Verificando código TOTP para:', identifier);

      if (!identifier || !code) {
        return { 
          success: false, 
          error: 'Identificador y código son requeridos' 
        };
      }

      if (!/^\d{6}$/.test(code)) {
        return { success: false, error: 'El código debe tener 6 dígitos' };
      }

      // Buscar usuario para obtener el secreto
      const user = await this.findUserByIdentifier(identifier);
      if (!user) {
        return { 
          success: false, 
          error: 'Usuario no encontrado' 
        };
      }

      // Verificar que el usuario tenga 2FA activo
      const has2FA = await this.check2FAStatus(user);
      if (!has2FA) {
        return { 
          success: false, 
          error: 'El usuario no tiene 2FA configurado' 
        };
      }

      // Obtener el secreto TOTP desde employeeNumber
      const secret = await this.extractTOTPSecret(user);
      if (!secret) {
        return { 
          success: false, 
          error: 'No se encontró configuración 2FA para este usuario' 
        };
      }

      console.log(`🔑 Verificando código con secreto 2FA para: ${user.sAMAccountName}`, {
        secret: `${secret.substring(0, 8)}...`,
        code: code
      });

      // Verificar el código usando TOTP
      const totp = new TOTP({
        issuer: 'Credenciales Uniss',
        label: user.sAMAccountName || user.mail || identifier,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secret,
      });

      const isValid = totp.validate({ token: code, window: 2 }) !== null;

      if (isValid) {
        console.log(`✅ Código 2FA verificado para: ${user.sAMAccountName}`);
        return { 
          success: true, 
          message: 'Código verificado correctamente' 
        };
      } else {
        console.log(`❌ Código 2FA inválido para: ${user.sAMAccountName}`);
        return { 
          success: false, 
          error: 'Código incorrecto o expirado' 
        };
      }

    } catch (error) {
      console.error('❌ Error en verifyCode:', error);
      return { 
        success: false, 
        error: 'Error del servidor al verificar código' 
      };
    }
  }

  /**
   * ✅ EXTRAER SECRETO TOTP DEL USUARIO
   */
  private async extractTOTPSecret(user: any): Promise<string | null> {
    try {
      // Intentar obtener desde employeeNumber primero
      if (user.employeeNumber) {
        const cleanSecret = this.cleanTOTPSecret(user.employeeNumber.toString());
        if (this.isValidTOTPSecret(cleanSecret)) {
          console.log('🔓 Secreto TOTP extraído de employeeNumber');
          return cleanSecret;
        }
      }

      // Buscar en otros atributos como fallback
      if (user.sAMAccountName) {
        const alternativeSecret = await this.findAlternativeTOTPSecret(user.sAMAccountName);
        if (alternativeSecret) {
          return alternativeSecret;
        }
      }

      return null;

    } catch (error) {
      console.error('❌ Error extrayendo secreto TOTP:', error);
      return null;
    }
  }

  /**
   * ✅ BUSCAR SECRETO TOTP EN ATRIBUTOS ALTERNATIVOS
   */
  private async findAlternativeTOTPSecret(sAMAccountName: string): Promise<string | null> {
    try {
      const filter = `(sAMAccountName=${this.escapeLDAPValue(sAMAccountName)})`;
      const attributes = [
        'info',
        'comment',
        'description',
        'extensionAttribute1',
        'extensionAttribute2',
        'extensionAttribute15'
      ];

      const users = await unifiedLDAPSearch(filter, attributes);
      
      if (users.length === 0) return null;

      const user = users[0];
      
      // Buscar en cada atributo por un secreto TOTP
      for (const attr of user.attributes) {
        if (attr.values && attr.values[0]) {
          const value = attr.values[0].toString();
          // Verificar si parece un secreto TOTP (Base32)
          if (this.looksLikeTOTPSecret(value)) {
            console.log(`🔍 Posible secreto TOTP encontrado en ${attr.type}`);
            const cleanSecret = this.cleanTOTPSecret(value);
            if (this.isValidTOTPSecret(cleanSecret)) {
              return cleanSecret;
            }
          }
        }
      }

      return null;

    } catch (error) {
      console.error('❌ Error en findAlternativeTOTPSecret:', error);
      return null;
    }
  }

  /**
   * ✅ VERIFICAR SI UNA CADENA PARECE UN SECRETO TOTP
   */
  private looksLikeTOTPSecret(value: string): boolean {
    // Un secreto TOTP típico es Base32 (solo A-Z, 2-7, = para padding)
    const base32Regex = /^[A-Z2-7]+=*$/i;
    return base32Regex.test(value) && value.length >= 16;
  }

  /**
   * ✅ LIMPIAR SECRETO TOTP
   */
  private cleanTOTPSecret(secret: string): string {
    return secret.replace(/[\s\-_=]/g, '').toUpperCase();
  }

  /**
   * ✅ VALIDAR SECRETO TOTP
   */
  private isValidTOTPSecret(secret: string): boolean {
    const base32Regex = /^[A-Z2-7]{16,64}$/;
    return base32Regex.test(secret);
  }

  /**
   * ✅ ESCAPAR VALORES LDAP
   */
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

// ✅ EXPORTAR INSTANCIA PARA USO EN CONTROLADORES
export const forgotPassword2FAService = new ForgotPassword2FAService();