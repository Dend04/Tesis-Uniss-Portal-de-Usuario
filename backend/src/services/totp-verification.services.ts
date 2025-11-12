import { TOTP } from 'otpauth';
import { searchLDAPUserForEmail, unifiedLDAPSearch } from '../utils/ldap.utils';
import { encryptionService } from './EncryptionService';

interface TOTPVerificationResult {
  success: boolean;
  message?: string;
  error?: string;
  user?: {
    sAMAccountName?: string;
    displayName?: string;
    email?: string;
  };
}

interface TOTPUserInfoResult {
  success: boolean;
  user?: {
    sAMAccountName?: string;
    displayName?: string;
    email?: string;
    has2FA: boolean;
  };
  error?: string;
}

export class TOTPVerificationService {
  /**
   * ✅ VERIFICAR CÓDIGO TOTP - COMPATIBLE CON TU ENCRYPTION SERVICE
   */
  async verifyTOTPCode(identifier: string, code: string): Promise<TOTPVerificationResult> {
    try {
      console.log('🔢 Verificando código TOTP para:', identifier);

      if (!identifier || !code) {
        return { success: false, error: 'Identificador y código son requeridos' };
      }

      if (!/^\d{6}$/.test(code)) {
        return { success: false, error: 'El código debe tener 6 dígitos' };
      }

      // ✅ BUSCAR USUARIO
      const user = await this.findUserByIdentifier(identifier);
      if (!user) {
        return { success: false, error: 'Usuario no encontrado' };
      }

      console.log('🔍 Usuario encontrado para verificación TOTP:', {
        sAMAccountName: user.sAMAccountName,
        hasEmployeeNumber: !!user.employeeNumber,
        userParameters: user.userParameters,
        employeeNumberFormat: user.employeeNumber ? 'ENCRIPTADO' : 'NO ENCRIPTADO'
      });

      // ✅ VERIFICAR QUE EL USUARIO TENGA 2FA ACTIVO
      const has2FA = await this.check2FAStatus(user);
      if (!has2FA) {
        return { success: false, error: 'El usuario no tiene 2FA configurado' };
      }

      // ✅ OBTENER EL SECRETO TOTP (COMPATIBLE CON TU FORMATO)
      const secret = await this.extractTOTPSecret(user);
      if (!secret) {
        console.log('❌ No se pudo extraer/desencriptar el secreto TOTP');
        return { success: false, error: 'No se encontró configuración de autenticación de dos factores' };
      }

      console.log('🔑 Verificando código con secreto TOTP para:', user.sAMAccountName, {
        secretPreview: `${secret.substring(0, 8)}...`,
        secretLength: secret.length,
        code: code
      });

      // ✅ VERIFICAR EL CÓDIGO TOTP
      const totp = new TOTP({
        issuer: 'Credenciales Uniss',
        label: user.sAMAccountName || user.mail || identifier,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secret,
      });

      const isValid = totp.validate({ token: code, window: 2 }) !== null;

      if (!isValid) {
        console.log('❌ Código TOTP inválido para:', user.sAMAccountName);
        return { success: false, error: 'Código incorrecto o expirado' };
      }

      console.log('✅ Código TOTP verificado para:', user.sAMAccountName);
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
      console.error('❌ Error en verifyTOTPCode:', error);
      return { success: false, error: 'Error del servidor al verificar código' };
    }
  }

  /**
   * ✅ OBTENER INFORMACIÓN TOTP DEL USUARIO
   */
  async getUserTOTPInfo(identifier: string): Promise<TOTPUserInfoResult> {
    try {
      console.log('🔍 Obteniendo información TOTP para:', identifier);

      // ✅ BUSCAR USUARIO
      const user = await this.findUserByIdentifier(identifier);
      if (!user) {
        return { success: false, error: 'Usuario no encontrado' };
      }

      // ✅ VERIFICAR ESTADO 2FA
      const has2FA = await this.check2FAStatus(user);

      return {
        success: true,
        user: {
          sAMAccountName: user.sAMAccountName,
          displayName: user.displayName,
          email: user.mail,
          has2FA
        }
      };

    } catch (error) {
      console.error('❌ Error en getUserTOTPInfo:', error);
      return { success: false, error: 'Error del servidor al obtener información del usuario' };
    }
  }

  /**
   * ✅ EXTRAER SECRETO TOTP - COMPATIBLE CON TU FORMATO DE ENCRIPCIÓN
   */
  private async extractTOTPSecret(user: any): Promise<string | null> {
    try {
      // ✅ PRIMERO: Intentar desencriptar desde employeeNumber
      if (user.employeeNumber) {
        const employeeNumberValue = user.employeeNumber.toString();
        
        console.log('🔍 Procesando employeeNumber:', {
          value: employeeNumberValue.substring(0, 50) + '...',
          isEncrypted: encryptionService.is2FASecretInEmployeeNumber(employeeNumberValue)
        });

        // ✅ VERIFICAR SI ESTÁ ENCRIPTADO CON TU FORMATO "2FA:"
        if (encryptionService.is2FASecretInEmployeeNumber(employeeNumberValue)) {
          // ✅ EXTRAER LOS DATOS ENCRIPTADOS (remueve "2FA:")
          const encryptedData = encryptionService.extractFromEmployeeNumber(employeeNumberValue);
          
          if (encryptedData) {
            console.log('🔐 Datos encriptados extraídos, longitud:', encryptedData.length);
            
            try {
              // ✅ DESENCRIPTAR USANDO TU MÉTODO
              const decryptedSecret = encryptionService.decrypt(encryptedData);
              
              if (decryptedSecret) {
                console.log('🔓 Secreto TOTP desencriptado exitosamente');
                
                // Validar que el secreto desencriptado sea Base32 válido
                const cleanSecret = this.cleanTOTPSecret(decryptedSecret);
                if (this.isValidTOTPSecret(cleanSecret)) {
                  console.log('✅ Secreto TOTP válido después de desencriptación');
                  return cleanSecret;
                } else {
                  console.error('❌ Secreto desencriptado no es Base32 válido:', {
                    original: decryptedSecret,
                    cleaned: cleanSecret,
                    length: cleanSecret.length
                  });
                  
                  // ✅ INTENTAR USAR EL SECRETO DESENCRIPTADO DIRECTAMENTE (por si acaso)
                  console.log('🔄 Intentando usar secreto desencriptado directamente...');
                  return decryptedSecret;
                }
              } else {
                console.error('❌ La desencriptación devolvió null/undefined');
              }
            } catch (decryptError) {
              console.error('❌ Error durante la desencriptación:', decryptError);
              
              // ✅ FALLBACK: Verificar si los datos "encriptados" son en realidad Base32
              console.log('🔄 Intentando interpretar como Base32 directo...');
              const cleanSecret = this.cleanTOTPSecret(encryptedData);
              if (this.isValidTOTPSecret(cleanSecret)) {
                console.log('✅ Los datos encriptados eran Base32 directo');
                return cleanSecret;
              }
            }
          } else {
            console.error('❌ No se pudieron extraer datos del employeeNumber');
          }
        } else {
          // ✅ SI NO ESTÁ ENCRIPTADO, USAR DIRECTAMENTE
          console.log('ℹ️  employeeNumber no está encriptado, usando directamente');
          const cleanSecret = this.cleanTOTPSecret(employeeNumberValue);
          if (this.isValidTOTPSecret(cleanSecret)) {
            return cleanSecret;
          } else {
            console.log('❌ employeeNumber no contiene secreto Base32 válido');
          }
        }
      }

      // ✅ SEGUNDO: Buscar en otros atributos como fallback
      if (user.sAMAccountName) {
        const alternativeSecret = await this.findAlternativeTOTPSecret(user.sAMAccountName);
        if (alternativeSecret) {
          return alternativeSecret;
        }
      }

      console.log('❌ No se pudo extraer ningún secreto TOTP válido');
      return null;

    } catch (error) {
      console.error('❌ Error extrayendo secreto TOTP:', error);
      return null;
    }
  }

  /**
   * ✅ VERIFICAR ESTADO 2FA - MEJORADO
   */
  private async check2FAStatus(user: any): Promise<boolean> {
    try {
      console.log('🔍 [TOTP] Analizando campos para 2FA:', {
        userParameters: user.userParameters || '[VACÍO]',
        employeeNumber: user.employeeNumber ? 'PRESENTE' : '[VACÍO]',
        employeeNumberPreview: user.employeeNumber ? 
          user.employeeNumber.toString().substring(0, 30) + '...' : 'N/A'
      });

      // ✅ VERIFICAR userParameters CON TU MÉTODO
      const has2FAInUserParams = user.userParameters ? 
        encryptionService.is2FAEnabled(user.userParameters) : false;

      // ✅ VERIFICAR employeeNumber (indica 2FA si existe y tiene formato 2FA:)
      const hasEmployeeNumberWith2FA = !!user.employeeNumber && 
        encryptionService.is2FASecretInEmployeeNumber(user.employeeNumber.toString());

      // ✅ VERIFICAR SI PODEMOS EXTRAER UN SECRETO VÁLIDO
      let hasValidTOTPSecret = false;
      if (user.employeeNumber) {
        const secret = await this.extractTOTPSecret(user);
        hasValidTOTPSecret = !!secret;
      }

      const finalResult = has2FAInUserParams || hasEmployeeNumberWith2FA || hasValidTOTPSecret;

      console.log('📊 [TOTP] Resultado verificación 2FA:', {
        has2FAInUserParams,
        hasEmployeeNumberWith2FA,
        hasValidTOTPSecret,
        finalResult
      });

      return finalResult;

    } catch (error) {
      console.error('❌ [TOTP] Error en check2FAStatus:', error);
      return false;
    }
  }

  /**
   * ✅ BUSCAR USUARIO POR IDENTIFICADOR
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
        'distinguishedName'
      ];

      console.log('🔍 [TOTP] Realizando búsqueda LDAP con filtro:', filter);

      const users = await searchLDAPUserForEmail(filter, attributes);

      if (users.length === 0) {
        console.log('❌ [TOTP] No se encontraron usuarios con el filtro:', filter);
        return null;
      }

      const user = users[0];
      console.log('✅ [TOTP] Usuario encontrado:', {
        sAMAccountName: user.sAMAccountName,
        employeeNumber: user.employeeNumber ? 'PRESENTE' : 'AUSENTE',
        userParameters: user.userParameters ? 'PRESENTE' : 'AUSENTE',
        employeeNumberPreview: user.employeeNumber ? 
          user.employeeNumber.toString().substring(0, 40) + '...' : 'N/A',
        userParametersValue: user.userParameters || 'N/A'
      });

      return user;

    } catch (error) {
      console.error('❌ [TOTP] Error en findUserByIdentifier:', error);
      throw error;
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
      
      for (const attr of user.attributes) {
        if (attr.values && attr.values[0]) {
          const value = attr.values[0].toString();
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
   * ✅ VERIFICAR SI UNA CADENA PARECE UN SECRETO TOTP
   */
  private looksLikeTOTPSecret(value: string): boolean {
    const base32Regex = /^[A-Z2-7]+=*$/i;
    return base32Regex.test(value) && value.length >= 16;
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

// ✅ EXPORTAR INSTANCIA
export const totpVerificationService = new TOTPVerificationService();