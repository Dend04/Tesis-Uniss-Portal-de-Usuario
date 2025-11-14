// services/pin.services.ts - Versión completa con el nuevo método
import { Client, Change, SearchEntry, Attribute } from "ldapjs";
import { createLDAPClient, bindAsync, unifiedLDAPSearch, unifiedLDAPSearchImproved } from "../utils/ldap.utils";
// ✅ AGREGAR el servicio de encriptación
import { encryptionService } from "./EncryptionService";
import { passwordService } from "./password.services";

interface LDAPError extends Error {
  code?: number;
  dn?: string;
  lde_message?: string;
}

interface UserData {
  sAMAccountName: string;
  employeeID: string;
  displayName: string;
  mail: string;
}

interface UserSearchResult {
  success: boolean;
  error?: string;
  userDN?: string;
  userData?: UserData;
}

export class PinService {
  private client: Client;

  constructor() {
    this.client = createLDAPClient(process.env.LDAP_URL!);
  }

  /**
   * Guarda o actualiza el PIN de seguridad en el campo serialNumber
   */
  async saveUserPin(sAMAccountName: string, pin: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🔐 Intentando guardar PIN para usuario: ${sAMAccountName}`);
      
      await this.authenticate();
      
      // Buscar el DN del usuario por sAMAccountName
      const userDN = await this.findUserDNBySAMAccountName(sAMAccountName);
      if (!userDN) {
        return { 
          success: false, 
          error: "Usuario no encontrado en el directorio LDAP" 
        };
      }

      // Validar formato del PIN
      if (!this.isValidPin(pin)) {
        return {
          success: false,
          error: "El PIN debe tener exactamente 6 dígitos numéricos"
        };
      }

      // ✅ CIFRAR el PIN antes de guardarlo
      const encryptedPin = encryptionService.encrypt(pin);
      console.log(`🔒 PIN cifrado: ${encryptedPin.substring(0, 10)}...`);

      // Actualizar el campo serialNumber con el PIN cifrado
      await this.updateSerialNumber(userDN, encryptedPin);
      
      console.log(`✅ PIN guardado exitosamente para: ${sAMAccountName}`);
      return { success: true };
      
    } catch (error: unknown) {
      const ldapError = error as LDAPError;
      console.error("❌ Error al guardar PIN:", ldapError);
      
      return {
        success: false,
        error: ldapError.message || "Error desconocido al guardar el PIN"
      };
    } finally {
      this.safeUnbind();
    }
  }

  /**
   * ✅ CORREGIDO: Elimina el PIN del usuario (establece campo serialNumber con un espacio)
   */
  async removeUserPin(sAMAccountName: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🗑️ Intentando eliminar PIN para usuario: ${sAMAccountName}`);
      
      await this.authenticate();
      
      const userDN = await this.findUserDNBySAMAccountName(sAMAccountName);
      if (!userDN) {
        return { 
          success: false, 
          error: "Usuario no encontrado" 
        };
      }

      // ✅ CORRECCIÓN: Establecer serialNumber con un espacio en lugar de vacío
      await this.updateSerialNumber(userDN, " ");
      
      console.log(`✅ PIN eliminado exitosamente para: ${sAMAccountName}`);
      return { success: true };
      
    } catch (error: unknown) {
      const ldapError = error as LDAPError;
      console.error("❌ Error al eliminar PIN:", ldapError);
      
      return {
        success: false,
        error: ldapError.message || "Error desconocido al eliminar el PIN"
      };
    } finally {
      this.safeUnbind();
    }
  }

  /**
   * Verifica si un usuario ya tiene PIN configurado
   */
  async hasUserPin(sAMAccountName: string): Promise<{ 
    hasPin: boolean; 
    error?: string 
  }> {
    try {
      await this.authenticate();
      
      const userDN = await this.findUserDNBySAMAccountName(sAMAccountName);
      if (!userDN) {
        return { 
          hasPin: false, 
          error: "Usuario no encontrado" 
        };
      }

      const serialNumber = await this.getSerialNumber(userDN);
      // ✅ VERIFICAR si el PIN está cifrado y es válido (excluyendo el espacio)
      const hasPin = !!serialNumber && 
                    serialNumber.trim().length > 0 && 
                    serialNumber !== " " && 
                    this.isEncryptedPin(serialNumber);
      
      return { hasPin };
      
    } catch (error: unknown) {
      const ldapError = error as LDAPError;
      console.error("Error verificando PIN:", ldapError);
      
      return {
        hasPin: false,
        error: ldapError.message
      };
    } finally {
      this.safeUnbind();
    }
  }

  /**
   * Verifica el PIN de un usuario para recuperación de contraseña
   * Busca por sAMAccountName o employeeID
   */
  async verifyUserPin(identifier: string, pin: string): Promise<{ 
    success: boolean; 
    error?: string;
    userDN?: string;
    userData?: UserData;
  }> {
    try {
      console.log(`🔍 Verificando PIN para identificador: ${identifier}`);
      
      await this.authenticate();
      
      // Buscar usuario por sAMAccountName o employeeID
      const userResult = await this.findUserByIdentifier(identifier);
      if (!userResult.success) {
        return { 
          success: false, 
          error: userResult.error
        };
      }

      if (!userResult.userDN || !userResult.userData) {
        return {
          success: false,
          error: "Error al obtener información del usuario"
        };
      }

      const { userDN, userData } = userResult;

      const storedEncryptedPin = await this.getSerialNumber(userDN);
      
      // ✅ DESCIFRAR y verificar el PIN (excluyendo el espacio)
      if (!storedEncryptedPin || storedEncryptedPin === " " || !this.isEncryptedPin(storedEncryptedPin)) {
        return {
          success: false,
          error: "No se encontró un PIN válido para este usuario"
        };
      }

      try {
        const decryptedPin = encryptionService.decrypt(storedEncryptedPin);
        const isValid = decryptedPin === pin;
        
        if (!isValid) {
          return {
            success: false,
            error: "PIN incorrecto"
          };
        }

        console.log(`✅ PIN verificado correctamente para: ${userData.sAMAccountName}`);
        return {
          success: true,
          userDN,
          userData
        };

      } catch (decryptError) {
        console.error("❌ Error al descifrar PIN:", decryptError);
        return {
          success: false,
          error: "Error al verificar el PIN"
        };
      }
      
    } catch (error: unknown) {
      const ldapError = error as LDAPError;
      console.error("❌ Error verificando PIN:", ldapError);
      
      return {
        success: false,
        error: ldapError.message || "Error al verificar el PIN"
      };
    } finally {
      this.safeUnbind();
    }
  }

 /**
   * ✅ CORREGIDO: Restablece la contraseña usando el PasswordService probado
   */
  async resetPasswordWithPIN(userIdentifier: string, newPassword: string): Promise<{ 
    success: boolean; 
    error?: string;
    message?: string;
  }> {
    try {
      console.log(`🔐 Iniciando reset de contraseña con PIN para: ${userIdentifier}`);

      // Buscar el usuario
      const userResult = await this.findUserByIdentifier(userIdentifier);
      
      if (!userResult.success || !userResult.userDN || !userResult.userData) {
        return { 
          success: false, 
          error: userResult.error || "Usuario no encontrado"
        };
      }

      const { userDN, userData } = userResult;

      console.log(`🔍 Usuario encontrado: ${userData.sAMAccountName}, DN: ${userDN}`);

      // ✅ USAR EL PASSWORD SERVICE EXISTENTE en lugar de cambiar directamente
      try {
        console.log(`🔄 Cambiando contraseña usando PasswordService...`);
        await passwordService.resetPassword(userDN, newPassword);

        console.log(`✅ Contraseña cambiada exitosamente para: ${userData.sAMAccountName}`);

        return {
          success: true,
          message: "Contraseña restablecida exitosamente"
        };

      } catch (passwordError: any) {
        console.error('❌ Error en passwordService.resetPassword:', passwordError);
        
        // ✅ MANEJO ESPECÍFICO DE ERRORES DE AD
        let errorMessage = 'Error al cambiar la contraseña';
        
        if (passwordError.message.includes('Políticas de contraseña')) {
          errorMessage = passwordError.message;
        } else if (passwordError.message.includes('historial')) {
          errorMessage = 'La nueva contraseña no puede ser igual a una contraseña anterior';
        } else if (passwordError.code === 53 || passwordError.lde_message?.includes('constraint')) {
          errorMessage = 'La contraseña no cumple con los requisitos de complejidad del dominio. Asegúrese de usar una combinación de mayúsculas, minúsculas, números y caracteres especiales.';
        } else if (passwordError.code === 50) {
          errorMessage = 'Política de contraseña insuficiente. La contraseña podría ser demasiado corta o no cumplir con los requisitos de historial.';
        } else if (passwordError.code === 19) {
          errorMessage = 'Violación de políticas de contraseña. La contraseña no cumple con los requisitos de complejidad establecidos.';
        } else if (passwordError.message.includes('denegado') || passwordError.code === 52) {
          errorMessage = 'No se tienen los permisos necesarios para cambiar esta contraseña. Contacte al administrador del sistema.';
        }

        return {
          success: false,
          error: errorMessage
        };
      }

    } catch (error: any) {
      console.error("❌ Error en resetPasswordWithPIN:", error);
      
      return {
        success: false,
        error: "Error interno del servidor al restablecer la contraseña"
      };
    }
  }
  /**
   * ✅ NUEVO: Cambia la contraseña del usuario en AD
   */
private async changeUserPassword(userDN: string, newPassword: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // ✅ CORRECCIÓN: Usar la misma codificación que en LDAPAccountService
    const encodedPassword = this.encodePassword(newPassword);
    
    const change = new Change({
      operation: "replace",
      modification: {
        type: "unicodePwd",
        values: [encodedPassword]
      }
    });

    console.log(`🔄 Cambiando contraseña para: ${userDN}`);
    console.log(`🔐 Contraseña codificada correctamente para AD`);

    this.client.modify(userDN, change, (err) => {
      if (err) {
        console.error('❌ Error al cambiar contraseña:', err);
        
        // ✅ Manejar errores específicos de AD
        if (err.code === 53) {
          reject(new Error("La contraseña no cumple con los requisitos de complejidad del dominio"));
        } else if (err.code === 19) {
          reject(new Error("La contraseña no cumple con la política de contraseñas del dominio"));
        } else if (err.code === 50) {
          reject(new Error("Acceso denegado. No tiene permisos para cambiar esta contraseña"));
        } else {
          reject(new Error(`Error al cambiar contraseña: ${err.message} (Código: ${err.code})`));
        }
      } else {
        console.log('✅ Contraseña cambiada exitosamente');
        resolve();
      }
    });
  });
}

  /**
   * ✅ NUEVO: Codifica la contraseña para LDAP (formato unicodePwd)
   */
private encodePassword(password: string): Buffer {
  const passwordString = `"${password}"`;
  const passwordBuffer = Buffer.from(passwordString, 'utf16le');
  
  console.log(`🔐 Codificando contraseña:`, {
    originalLength: password.length,
    encodedLength: passwordBuffer.length,
    encodedHex: passwordBuffer.toString('hex').substring(0, 32) + '...'
  });
  
  return passwordBuffer;
}

  /**
   * Busca usuario por sAMAccountName o employeeID
   */
async findUserByIdentifier(identifier: string): Promise<UserSearchResult> {
  try {
    console.log(`🔍 [PIN SERVICE] Buscando usuario con identificador: ${identifier}`);
    
    // Primero intentar buscar por sAMAccountName
    let filter = `(sAMAccountName=${this.escapeLDAPValue(identifier)})`;
    let attributes = ['dn', 'sAMAccountName', 'employeeID', 'displayName', 'mail', 'userPrincipalName'];
    
    // ✅ USAR LA VERSIÓN MEJORADA
    let entries = await unifiedLDAPSearchImproved(filter, attributes);
    
    // Si no se encuentra, buscar por employeeID
    if (entries.length === 0) {
      console.log(`🔍 [PIN SERVICE] No encontrado por sAMAccountName, buscando por employeeID...`);
      filter = `(employeeID=${this.escapeLDAPValue(identifier)})`;
      entries = await unifiedLDAPSearchImproved(filter, attributes);
    }

    console.log(`📊 [PIN SERVICE] Resultados de búsqueda: ${entries.length} entradas`);

    if (entries.length === 0) {
      return {
        success: false,
        error: "Usuario no encontrado. Verifique su nombre de usuario o carnet de identidad"
      };
    }

    const entry = entries[0];
    let userDN = entry.dn;
    
    if (!userDN) {
      return {
        success: false,
        error: "Error al obtener información del usuario"
      };
    }

    // ✅ NORMALIZAR EL DN - ELIMINAR TILDES
    userDN = this.normalizeDN(userDN);
    console.log(`🔧 [PIN SERVICE] DN normalizado para operaciones: ${userDN}`);

    // ✅ MEJORAR LA EXTRACCIÓN DE DATOS
    const userData = this.extractUserDataFromImproved(entry);
    
    if (!userData.sAMAccountName) {
      return {
        success: false,
        error: "No se pudo obtener la información completa del usuario"
      };
    }
    
    console.log(`✅ [PIN SERVICE] Usuario encontrado:`, userData);
    
    return {
      success: true,
      userDN,
      userData
    };
    
  } catch (error) {
    console.error("❌ [PIN SERVICE] Error en búsqueda de usuario:", error);
    return {
      success: false,
      error: "Error al buscar usuario en el sistema"
    };
  }
}

// ✅ AGREGAR ESTE MÉTODO PARA MANEJAR LA NUEVA ESTRUCTURA
private extractUserDataFromImproved(entry: any): UserData {
  console.log("📋 Extrayendo datos de entrada:", entry);
  
  return {
    sAMAccountName: entry.sAMAccountName ? 
      (Array.isArray(entry.sAMAccountName) ? entry.sAMAccountName[0] : entry.sAMAccountName) : '',
    employeeID: entry.employeeID ? 
      (Array.isArray(entry.employeeID) ? entry.employeeID[0] : entry.employeeID) : '',
    displayName: entry.displayName ? 
      (Array.isArray(entry.displayName) ? entry.displayName[0] : entry.displayName) : '',
    mail: entry.mail ? 
      (Array.isArray(entry.mail) ? entry.mail[0] : entry.mail) : 
      (entry.userPrincipalName ? 
        (Array.isArray(entry.userPrincipalName) ? entry.userPrincipalName[0] : entry.userPrincipalName) : '')
  };
}

  /**
   * Busca el DN del usuario por sAMAccountName usando búsqueda unificada
   */
  private async findUserDNBySAMAccountName(sAMAccountName: string): Promise<string | null> {
    try {
      const result = await this.findUserByIdentifier(sAMAccountName);
      return result.success && result.userDN ? result.userDN : null;
    } catch (error) {
      console.error("Error buscando usuario por sAMAccountName:", error);
      throw error;
    }
  }

  /**
   * Extrae datos del usuario desde la entrada LDAP
   */
  private extractUserData(entry: any): UserData {
    const getAttributeValue = (attrName: string): string => {
      const attr = entry.attributes.find((attr: any) => attr.type === attrName);
      if (attr && attr.values && attr.values.length > 0) {
        const value = Array.isArray(attr.values) ? attr.values[0] : attr.values;
        return value || '';
      }
      return '';
    };

    return {
      sAMAccountName: getAttributeValue('sAMAccountName'),
      employeeID: getAttributeValue('employeeID'),
      displayName: getAttributeValue('displayName'),
      mail: getAttributeValue('mail')
    };
  }

  /**
   * Obtiene el valor actual del campo serialNumber
   */
  private async getSerialNumber(userDN: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.client.search(
        userDN,
        {
          scope: "base",
          attributes: ["serialNumber"],
        },
        (err, res) => {
          if (err) {
            reject(err);
            return;
          }

          let serialNumber = "";
          
          res.on("searchEntry", (entry: SearchEntry) => {
            const attr = entry.attributes.find((attr: Attribute) => 
              attr.type === "serialNumber"
            );
            
            if (attr && attr.vals && attr.vals.length > 0) {
              serialNumber = attr.vals[0];
            } else if (attr && attr.values && attr.values.length > 0) {
              const values = Array.isArray(attr.values) ? attr.values : [attr.values];
              serialNumber = values[0] || "";
            }
          });
          
          res.on("error", (error) => {
            reject(error);
          });
          
          res.on("end", () => {
            resolve(serialNumber);
          });
        }
      );
    });
  }

  /**
   * ✅ CORREGIDO: Actualiza el campo serialNumber en LDAP
   */
private async updateSerialNumber(userDN: string, pin: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // ✅ CORRECCIÓN: Usar la estructura correcta para el cambio LDAP
    const change = new Change({
      operation: "replace",
      modification: new Attribute({
        type: "serialNumber",
        values: [pin]
      })
    });

    console.log(`🔄 [PIN SERVICE] Actualizando serialNumber para ${userDN}:`, {
      operation: 'replace',
      attribute: 'serialNumber',
      valueLength: pin.length,
      valuePreview: pin === " " ? '[ESPACIO]' : (pin ? `${pin.substring(0, 10)}...` : '[VACÍO]')
    });

    this.client.modify(userDN, change, (err) => {
      if (err) {
        console.error('❌ [PIN SERVICE] Error en modify:', err);
        
        // Manejo específico de errores
        if (err.code === 32) {
          reject(new Error(`Objeto no encontrado (DN incorrecto): ${userDN}`));
        } else if (err.code === 50) {
          reject(new Error(`Permisos insuficientes para modificar en esta OU`));
        } else if (err.code === 53) {
          reject(new Error(`El servidor no permite esta operación`));
        } else if (err.code === 16) { // No such attribute
          console.log('ℹ️ [PIN SERVICE] Atributo serialNumber no existe, intentando agregar...');
          this.addSerialNumberAttribute(userDN, pin)
            .then(resolve)
            .catch(reject);
        } else {
          reject(new Error(`Error LDAP (${err.code}): ${err.message}`));
        }
      } else {
        console.log('✅ [PIN SERVICE] serialNumber actualizado exitosamente');
        resolve();
      }
    });
  });
}

  /**
   * ✅ CORREGIDO: Agrega el atributo serialNumber si no existe
   */
private async addSerialNumberAttribute(userDN: string, pin: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // ✅ CORRECCIÓN: Usar la estructura correcta
    const change = new Change({
      operation: "add",
      modification: new Attribute({
        type: "serialNumber",
        values: [pin]
      })
    });

    console.log(`➕ [PIN SERVICE] Agregando atributo serialNumber para ${userDN}`);

    this.client.modify(userDN, change, (err) => {
      if (err) {
        console.error('❌ [PIN SERVICE] Error en add:', err);
        
        // Manejo específico de errores
        if (err.code === 32) {
          reject(new Error(`Objeto no encontrado (DN incorrecto): ${userDN}`));
        } else if (err.code === 50) {
          reject(new Error(`Permisos insuficientes para agregar atributos en esta OU`));
        } else if (err.code === 53) {
          reject(new Error(`El servidor no permite agregar este atributo`));
        } else {
          reject(new Error(`Error LDAP (${err.code}): ${err.message}`));
        }
      } else {
        console.log('✅ [PIN SERVICE] serialNumber agregado exitosamente');
        resolve();
      }
    });
  });
}


  /**
   * Valida el formato del PIN
   */
  private isValidPin(pin: string): boolean {
    return /^\d{6}$/.test(pin);
  }

  /**
   * ✅ CORREGIDO: Verifica si el PIN está cifrado (basado en el formato de encriptación)
   */
  private isEncryptedPin(pin: string): boolean {
    // Verificar si tiene el formato de un texto cifrado (base64, etc.) y no es un espacio
    return pin !== " " && pin.length > 10 && /^[A-Za-z0-9+/=]+$/.test(pin);
  }

  private async authenticate(): Promise<void> {
    await bindAsync(
      this.client,
      process.env.LDAP_ADMIN_DN!,
      process.env.LDAP_ADMIN_PASSWORD!
    );
  }

  private safeUnbind() {
    try {
      this.client.unbind();
    } catch (error) {
      console.error("Error al cerrar conexión LDAP:", error);
    }
  }

  private escapeLDAPValue(value: string): string {
    if (!value) return "";



    // Primero normalizar
    const normalized = value.toString().trim();


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

   /**
   * ✅ NORMALIZAR DN - Eliminar tildes y caracteres especiales (MISMA SOLUCIÓN)
   */
  private normalizeDN(dn: string): string {
    console.log(`🔧 [PIN SERVICE] Normalizando DN: ${dn}`);
    
    // Reemplazar caracteres con tildes
    let normalized = dn
      .replace(/á/g, 'a')
      .replace(/é/g, 'e')
      .replace(/í/g, 'i')
      .replace(/ó/g, 'o')
      .replace(/ú/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/Á/g, 'A')
      .replace(/É/g, 'E')
      .replace(/Í/g, 'I')
      .replace(/Ó/g, 'O')
      .replace(/Ú/g, 'U')
      .replace(/Ñ/g, 'N')
      // También manejar caracteres escapados que ves en los logs
      .replace(/\\c3\\a9/g, 'e')  // é escapado
      .replace(/\\c3\\b3/g, 'o')  // ó escapado
      .replace(/\\c3\\a1/g, 'a')  // á escapado
      .replace(/\\c3\\ad/g, 'i')  // í escapado
      .replace(/\\c3\\ba/g, 'u')  // ú escapado
      .replace(/\\c3\\b1/g, 'n'); // ñ escapado

    console.log(`🔧 [PIN SERVICE] DN normalizado: ${normalized}`);
    return normalized;
  }

}

export const pinService = new PinService();