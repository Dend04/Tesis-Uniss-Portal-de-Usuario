import { createLDAPClient, bindAsync } from "../utils/ldap.utils";
import ldap from "ldapjs";
import { auditService } from "./audit.services";
import { userService } from "./user.services";

export class PasswordService {
  private readonly maxRetries = 2;

  async changePassword(userDN: string, newPassword: string): Promise<void> {
    let lastError;
    const username = userService.extractUsernameFromDN(userDN);

    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      const client = createLDAPClient(process.env.LDAP_URL!);
      
      try {
        console.log(`🔄 Intento ${attempt} de cambio de contraseña`);

        await auditService.addLogEntry(username, 'change_password_attempt', 'started', {
          attempt: attempt,
          timestamp: new Date().toISOString()
        });

        await bindAsync(client, process.env.LDAP_ADMIN_DN!, process.env.LDAP_ADMIN_PASSWORD!);

        // Verificar historial de contraseñas
        const passwordHistory = await this.getPasswordHistory(userDN, client);
        console.log(`📊 Historial de contraseñas: ${passwordHistory.length} entradas`);

        // Validar políticas de contraseña
        await this.validatePasswordPolicy(newPassword, username);

        const change = {
          operation: "replace",
          modification: {
            type: "unicodePwd",
            values: [this.encodePassword(newPassword)]
          }
        };

        await new Promise<void>((resolve, reject) => {
          client.modify(userDN, change, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });

        console.log(`✅ Contraseña cambiada exitosamente`);
        
        await auditService.logPasswordChange(username, true, {
          attempt: attempt,
          timestamp: new Date().toISOString(),
          retriesUsed: attempt - 1
        });
        
        return; 

      } catch (error: any) {
        lastError = error;
        console.warn(`⚠️ Intento ${attempt} fallido:`, error.message);

        await auditService.addLogEntry(username, 'change_password_attempt', 'failed', {
          attempt: attempt,
          error: error.message,
          errorCode: error.code,
          timestamp: new Date().toISOString(),
          isConnectionError: error.code === 80
        });

        if (error.code === 80 && attempt <= this.maxRetries) {
          console.log('⏳ Reintentando...');
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        } else {
          break;
        }
      } finally {
        if (client && typeof client.unbind === 'function') {
          client.unbind(() => { 
            console.log(`🔒 Conexión LDAP cerrada`);
          });
        }
      }
    }

    console.error(`💥 Error en cambio de contraseña después de ${this.maxRetries + 1} intentos`);
    
    await auditService.logPasswordChange(username, false, {
      finalError: lastError.message,
      errorCode: lastError.code,
      totalAttempts: this.maxRetries + 1,
      timestamp: new Date().toISOString()
    });
    
    throw lastError;
  }

  async validatePasswordPolicy(password: string, username: string): Promise<void> {
    const errors: string[] = [];

    console.log(`🔍 Validando contraseña: "${password}"`);

    // 1. Longitud mínima
    if (password.length < 8) {
      errors.push('La contraseña debe tener al menos 8 caracteres');
    }

    // 2. Análisis detallado de complejidad
    const complexity = this.analyzePasswordComplexity(password);
    
    console.log(`📊 Análisis de complejidad:`, {
      longitud: password.length,
      minusculas: complexity.hasLowerCase,
      mayusculas: complexity.hasUpperCase,
      numeros: complexity.hasNumbers,
      simbolos: complexity.hasSymbols,
      fuerza: complexity.strengthScore + '/4'
    });

    if (!complexity.hasLowerCase) {
      errors.push('Debe contener al menos una letra minúscula (a-z)');
    }

    if (!complexity.hasUpperCase) {
      errors.push('Debe contener al menos una letra mayúscula (A-Z)');
    }

    if (!complexity.hasNumbers) {
      errors.push('Debe contener al menos un número (0-9)');
    }

    if (!complexity.hasSymbols) {
      errors.push('Debe contener al menos un símbolo especial');
    }

    // 3. Verificar caracteres no permitidos (emojis)
    const invalidChars = this.checkInvalidCharacters(password);
    if (invalidChars.length > 0) {
      errors.push(`Caracteres no permitidos detectados: ${invalidChars.join(', ')}`);
    }

    // 4. Información personal
    if (this.containsPersonalInfo(password, username, '')) {
      errors.push('La contraseña no puede contener información personal');
    }

    if (errors.length > 0) {
      console.log(`❌ Contraseña rechazada. Errores:`, errors);
      throw new Error(`Políticas de contraseña no cumplidas: ${errors.join(', ')}`);
    }

    console.log('✅ Contraseña cumple con todas las políticas de seguridad');
  }

  private analyzePasswordComplexity(password: string): {
    hasLowerCase: boolean;
    hasUpperCase: boolean;
    hasNumbers: boolean;
    hasSymbols: boolean;
    strengthScore: number;
  } {
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    // ✅ SÍMBOLOS AMPLIADOS - Casi todos los caracteres especiales ASCII
    // Incluye: !"#$%&'()*+,-./:;<=>?@[\]^_`{|}~¡¿ y espacios
    const hasSymbols = /[^a-zA-Z0-9]/.test(password);

    // Calcular puntuación de fortaleza (0-4)
    const strengthScore = [hasLowerCase, hasUpperCase, hasNumbers, hasSymbols]
      .filter(Boolean).length;

    return {
      hasLowerCase,
      hasUpperCase,
      hasNumbers,
      hasSymbols,
      strengthScore
    };
  }

  private checkInvalidCharacters(password: string): string[] {
    const invalidChars: string[] = [];
    
    // ✅ PERMITIR casi todos los caracteres ASCII imprimibles (32-126)
    // y caracteres extendidos del español (áéíóúñüÁÉÍÓÚÑÜ¡¿)
    const allowedChars = /^[\x20-\x7EáéíóúñüÁÉÍÓÚÑÜ¡¿]+$/;
    
    if (!allowedChars.test(password)) {
      // Encontrar caracteres específicos no permitidos
      for (const char of password) {
        const charCode = char.charCodeAt(0);
        // Si no está en el rango permitido, es un carácter no válido
        if (!this.isCharacterAllowed(char)) {
          invalidChars.push(`'${char}' (U+${charCode.toString(16).toUpperCase()})`);
        }
      }
    }
    
    return invalidChars;
  }

  private isCharacterAllowed(char: string): boolean {
    const charCode = char.charCodeAt(0);
    
    // ✅ Caracteres ASCII imprimibles (32-126): espacio hasta ~
    if (charCode >= 32 && charCode <= 126) return true;
        
    return false;
  }

  private containsPersonalInfo(password: string, username: string, fullName: string): boolean {
    const normalizeText = (text: string) => {
      return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, ''); // Eliminar espacios para mejor detección
    };

    const normalizedPassword = normalizeText(password);
    
    // Verificar nombre de usuario (sin espacios)
    if (username && normalizedPassword.includes(normalizeText(username))) {
      console.log(`❌ Contraseña contiene nombre de usuario: ${username}`);
      return true;
    }
    
    // Verificar partes del nombre completo
    if (fullName) {
      const nameParts = fullName.split(' ');
      for (const part of nameParts) {
        if (part.length > 2 && normalizedPassword.includes(normalizeText(part))) {
          console.log(`❌ Contraseña contiene parte del nombre: ${part}`);
          return true;
        }
      }
    }
    
    return false;
  }

  private encodePassword(password: string): Buffer {
    return Buffer.from(`"${password}"`, 'utf16le');
  }

  private async getPasswordHistory(userDN: string, client: ldap.Client): Promise<string[]> {
    return new Promise((resolve) => {
      const searchOptions: ldap.SearchOptions = {
        scope: 'base',
        filter: '(objectClass=*)',
        attributes: ['pwdHistory', 'pwdLastSet', 'badPasswordTime', 'lastLogon']
      };

      console.log(`🔍 Consultando historial de seguridad`);
      
      client.search(userDN, searchOptions, (err: Error | null, res: ldap.SearchCallbackResponse) => {
        if (err) {
          console.log('ℹ️ Historial no disponible');
          resolve([]);
          return;
        }

        let passwordHistory: string[] = [];

        res.on('searchEntry', (entry: any) => {
          if (entry.attributes) {
            for (const attr of entry.attributes) {
              if (attr.type === 'pwdHistory' && attr.values) {
                passwordHistory = Array.isArray(attr.values) ? attr.values : [attr.values];
                break;
              }
            }
          }
        });

        res.on('error', (err: Error) => {
          console.log('⚠️ Error consultando historial');
          resolve([]);
        });

        res.on('end', () => {
          console.log('✅ Consulta de historial completada');
          resolve(passwordHistory);
        });
      });
    });
  }

  async checkPasswordAgainstHistory(username: string, newPassword: string): Promise<boolean> {
    console.log('🔍 Verificando historial de contraseñas');
    // Implementación futura con historial manual
    return false;
  }
}

export const passwordService = new PasswordService();