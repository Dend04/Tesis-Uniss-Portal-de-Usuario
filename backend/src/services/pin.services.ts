import { Client, Change, SearchEntry, Attribute } from "ldapjs";
import { createLDAPClient, bindAsync, unifiedLDAPSearch } from "../utils/ldap.utils";
// ✅ AGREGAR el servicio de encriptación
import { encryptionService } from "./EncryptionService";

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
   * Elimina el PIN del usuario (establece campo serialNumber vacío)
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

      // Establecer serialNumber vacío
      await this.updateSerialNumber(userDN, "");
      
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
      // ✅ VERIFICAR si el PIN está cifrado y es válido
      const hasPin = !!serialNumber && serialNumber.trim().length > 0 && this.isEncryptedPin(serialNumber);
      
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
      
      // ✅ DESCIFRAR y verificar el PIN
      if (!storedEncryptedPin || !this.isEncryptedPin(storedEncryptedPin)) {
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
   * Busca usuario por sAMAccountName o employeeID
   */
  async findUserByIdentifier(identifier: string): Promise<UserSearchResult> {
    try {
      // Primero intentar buscar por sAMAccountName
      let filter = `(sAMAccountName=${this.escapeLDAPValue(identifier)})`;
      let attributes = ['dn', 'sAMAccountName', 'employeeID', 'displayName', 'mail'];
      
      let entries = await unifiedLDAPSearch(filter, attributes);
      
      // Si no se encuentra, buscar por employeeID
      if (entries.length === 0) {
        filter = `(employeeID=${this.escapeLDAPValue(identifier)})`;
        entries = await unifiedLDAPSearch(filter, attributes);
      }

      if (entries.length === 0) {
        return {
          success: false,
          error: "Usuario no encontrado. Verifique su nombre de usuario o carnet de identidad"
        };
      }

      const entry = entries[0];
      const userDN = entry.objectName ? entry.objectName.toString() : null;
      
      if (!userDN) {
        return {
          success: false,
          error: "Error al obtener información del usuario"
        };
      }

      // Extraer datos del usuario
      const userData = this.extractUserData(entry);
      
      if (!userData.sAMAccountName) {
        return {
          success: false,
          error: "No se pudo obtener la información completa del usuario"
        };
      }
      
      return {
        success: true,
        userDN,
        userData
      };
      
    } catch (error) {
      console.error("Error en búsqueda de usuario:", error);
      return {
        success: false,
        error: "Error al buscar usuario en el sistema"
      };
    }
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

      console.log(`🔄 Actualizando serialNumber para ${userDN}:`, {
        operation: 'replace',
        attribute: 'serialNumber',
        valueLength: pin.length,
        valuePreview: pin ? `${pin.substring(0, 10)}...` : '[VACÍO]'
      });

      this.client.modify(userDN, change, (err) => {
        if (err) {
          // Si el error es porque el atributo no existe, intentamos agregarlo
          if (err.code === 16) { // No such attribute
            console.log('ℹ️  Atributo serialNumber no existe, intentando agregar...');
            this.addSerialNumberAttribute(userDN, pin)
              .then(resolve)
              .catch(reject);
          } else {
            console.error('❌ Error en modify:', err);
            reject(err);
          }
        } else {
          console.log('✅ serialNumber actualizado exitosamente');
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

      console.log(`➕ Agregando atributo serialNumber para ${userDN}`);

      this.client.modify(userDN, change, (err) => {
        if (err) {
          console.error('❌ Error en add:', err);
          reject(err);
        } else {
          console.log('✅ serialNumber agregado exitosamente');
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
   * Verifica si el PIN está cifrado (basado en el formato de encriptación)
   */
  private isEncryptedPin(pin: string): boolean {
    // Verificar si tiene el formato de un texto cifrado (base64, etc.)
    return pin.length > 10 && /^[A-Za-z0-9+/=]+$/.test(pin);
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

export const pinService = new PinService();