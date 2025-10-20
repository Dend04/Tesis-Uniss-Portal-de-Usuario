// services/EncryptionService.ts
import crypto from 'crypto';

export class EncryptionService {
  private algorithm = 'aes-256-cbc'; // Cambiamos a CBC que es más simple
  private key: Buffer;

  constructor() {
    // Generar clave desde environment variable
    const encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars-long!';
    this.key = crypto.scryptSync(encryptionKey, 'salt', 32);
  }

  /**
   * ✅ Encriptar secreto - SIMPLIFICADO
   */
  encrypt(plainText: string): string {
    try {
      // Generar IV único
      const iv = crypto.randomBytes(16);
      
      // Crear cipher con IV
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      // Encriptar
      let encrypted = cipher.update(plainText, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Combinar: IV + texto encriptado
      const combined = Buffer.concat([
        iv, 
        Buffer.from(encrypted, 'hex')
      ]);
      
      return combined.toString('base64');
      
    } catch (error) {
      console.error('❌ Error encriptando:', error);
      throw new Error('Error encriptando el secreto');
    }
  }

  /**
   * ✅ Desencriptar secreto - SIMPLIFICADO
   */
  decrypt(encryptedText: string): string {
    try {
      // Decodificar desde base64
      const combined = Buffer.from(encryptedText, 'base64');
      
      // Extraer componentes (IV: 16 bytes, resto: encrypted)
      const iv = combined.slice(0, 16);
      const encrypted = combined.slice(16);
      
      // Crear decipher con IV
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      
      // Desencriptar
      let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
      
    } catch (error) {
      console.error('❌ Error desencriptando:', error);
      throw new Error('Error desencriptando el secreto');
    }
  }

  /**
   * ✅ Validar formato Base32 del secreto TOTP
   */
  validateTOTPSecret(secret: string): boolean {
    // Remover espacios y validar formato Base32
    const cleanedSecret = secret.replace(/\s/g, '').toUpperCase();
    const base32Regex = /^[A-Z2-7]+=*$/;
    
    const isValid = base32Regex.test(cleanedSecret) && 
                   (cleanedSecret.length === 16 || cleanedSecret.length === 32);
    
    console.log('🔍 Validación secreto TOTP:', {
      original: secret,
      cleaned: cleanedSecret,
      length: cleanedSecret.length,
      isValid: isValid
    });
    
    return isValid;
  }

  /**
   * ✅ Normalizar secreto TOTP (remover espacios, asegurar mayúsculas)
   */
  normalizeTOTPSecret(secret: string): string {
    return secret.replace(/\s/g, '').toUpperCase();
  }

  // ==================== MÉTODOS PARA employeeNumber ====================

  /**
   * ✅ Generar formato para employeeNumber
   */
  formatForEmployeeNumber(encryptedData: string): string {
    return `2FA:${encryptedData}`;
  }

  /**
   * ✅ Extraer datos encriptados desde employeeNumber
   */
  extractFromEmployeeNumber(employeeNumberValue: string): string | null {
    if (employeeNumberValue.startsWith('2FA:')) {
      return employeeNumberValue.substring(4); // Remover "2FA:"
    }
    return null;
  }

  /**
   * ✅ Verificar si employeeNumber contiene datos 2FA
   */
  is2FASecretInEmployeeNumber(employeeNumberValue: string): boolean {
    return employeeNumberValue.startsWith('2FA:');
  }

  /**
   * ✅ Obtener employeeNumber original (si existe) separado del 2FA
   */
  getOriginalEmployeeNumber(employeeNumberValue: string): string | null {
    if (this.is2FASecretInEmployeeNumber(employeeNumberValue)) {
      return null; // El campo está siendo usado para 2FA
    }
    return employeeNumberValue; // Devuelve el valor original
  }

  // ==================== MÉTODOS PARA userParameters ====================

  /**
   * ✅ Generar formato para userParameters
   */
  formatForUserParameters(): string {
    return "2FA ENABLED";
  }

  /**
   * ✅ Formato para deshabilitado
   */
  getDisabledUserParameters(): string {
    return "2FA DISABLED";
  }

  /**
   * ✅ Verificar si userParameters indica 2FA activo
   */
  is2FAEnabled(userParametersValue: string): boolean {
    return userParametersValue === "2FA ENABLED";
  }

  // ==================== MÉTODOS DE DIAGNÓSTICO ====================

  /**
   * ✅ Verificar la funcionalidad de encriptación
   */
  testEncryption(): boolean {
    try {
      const testText = "test_secret_123";
      const encrypted = this.encrypt(testText);
      const decrypted = this.decrypt(encrypted);
      
      const success = testText === decrypted;
      console.log('🧪 Test de encriptación:', success ? '✅ ÉXITO' : '❌ FALLO');
      
      return success;
    } catch (error) {
      console.error('❌ Test de encriptación falló:', error);
      return false;
    }
  }
}

export const encryptionService = new EncryptionService();