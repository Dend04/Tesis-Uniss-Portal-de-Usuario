// src/services/updateAccount.services.ts
import { Client } from "ldapjs";
import { createLDAPClient, bindAsync, unifiedLDAPSearch } from "../utils/ldap.utils";

interface LDAPError extends Error {
  lde_message?: string;
  lde_dn?: string;
  code?: string;
}

interface LDAPAttribute {
  type: string;
  values: string[];
}

export class UpdateAccountService {
  private client: Client;

  constructor() {
    this.client = createLDAPClient(process.env.LDAP_URL!);
  }

  /**
   * Autentica el cliente LDAP
   */
  private async authenticate(): Promise<void> {
    try {
      await bindAsync(
        this.client,
        process.env.LDAP_ADMIN_DN!,
        process.env.LDAP_ADMIN_PASSWORD!
      );
      console.log('✅ Cliente LDAP autenticado correctamente');
    } catch (error) {
      console.error('💥 Error autenticando cliente LDAP:', error);
      throw error;
    }
  }

  /**
   * Actualiza el employeeID (CI) de un usuario en LDAP
   */
  async updateUserEmployeeID(username: string, employeeID: string): Promise<void> {
    try {
      console.log(`🔄 Actualizando EmployeeID para usuario: ${username}`);
      await this.authenticate();
      await this.findAndModifyUser(username, "employeeID", employeeID);
      console.log(`✅ EmployeeID actualizado exitosamente para ${username}`);
    } catch (error) {
      console.error(`💥 Error crítico al actualizar employeeID:`, error);
      throw error;
    } finally {
      this.safeUnbind();
    }
  }

  /**
   * Busca y modifica el usuario en una sola operación
   */
  private async findAndModifyUser(username: string, attribute: string, value: string): Promise<void> {
    try {
      console.log(`🔍 Buscando usuario: ${username}`);

      const filter = `(&(objectClass=user)(sAMAccountName=${this.escapeLDAPValue(username)}))`;
      const entries = await unifiedLDAPSearch(filter, ["dn"], process.env.LDAP_BASE_DN!);

      if (entries.length === 0) {
        throw new Error(`Usuario ${username} no encontrado en LDAP`);
      }

      const rawUserDN = String(entries[0].dn);
      console.log(`✅ DN encontrado (RAW): ${rawUserDN}`);
      
      // ✅ NORMALIZAR el DN - Remover tildes y caracteres especiales
      const userDN = this.normalizeDN(rawUserDN);
      console.log(`✅ DN normalizado (sin tildes): ${userDN}`);
      
      console.log(`🔧 Modificando ${attribute} a: ${value}`);
      await this.modifyUserAttribute(userDN, attribute, value);
      
    } catch (error) {
      console.error(`💥 Error en findAndModifyUser:`, error);
      throw error;
    }
  }

  /**
   * Normaliza el DN removiendo tildes y caracteres especiales
   */
  private normalizeDN(dn: string): string {
    console.log(`🔧 Normalizando DN: ${dn}`);
    
    let normalized = dn;
    
    // Primero: Convertir escapes Unicode a caracteres normales
    normalized = normalized.replace(/\\c3\\a9/g, 'é');
    normalized = normalized.replace(/\\c3\\ad/g, 'í');
    normalized = normalized.replace(/\\c3\\b3/g, 'ó');
    normalized = normalized.replace(/\\c3\\a1/g, 'á');
    normalized = normalized.replace(/\\c3\\ba/g, 'ú');
    normalized = normalized.replace(/\\c3\\b1/g, 'ñ');
    
    // Segundo: Remover tildes y diacríticos
    normalized = normalized
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/[ñ]/g, 'n')  // También la ñ por n para mayor compatibilidad
      .replace(/[ÁÀÄÂ]/g, 'A')
      .replace(/[ÉÈËÊ]/g, 'E')
      .replace(/[ÍÌÏÎ]/g, 'I')
      .replace(/[ÓÒÖÔ]/g, 'O')
      .replace(/[ÚÙÜÛ]/g, 'U')
      .replace(/[Ñ]/g, 'N');
    
    console.log(`🔧 DN normalizado: ${normalized}`);
    return normalized;
  }

  /**
   * Modifica un atributo de usuario
   */
  private async modifyUserAttribute(userDN: string, attribute: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const change = {
        operation: "replace" as "replace",
        modification: {
          type: attribute,
          values: [value],
        },
      };

      console.log(`🔄 Enviando modificación para: ${userDN}`);

      this.client.modify(userDN, change, (err: any) => {
        if (err) {
          console.error(`💥 Error modificando ${attribute}:`, err);
          
          if (err.lde_dn) {
            console.log(`🔍 DN del error: ${err.lde_dn}`);
            console.log(`🔍 Comparación con nuestro DN: ${userDN}`);
            console.log(`🔍 ¿Son iguales?: ${err.lde_dn === userDN}`);
          }
          
          reject(err);
        } else {
          console.log(`✅ ${attribute} actualizado exitosamente`);
          resolve();
        }
      });
    });
  }

  /**
   * Escapa valores para búsqueda LDAP
   */
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

  /**
   * Cierra conexión LDAP de forma segura
   */
  private safeUnbind() {
    try {
      this.client.unbind();
      console.log('🔒 Conexión LDAP cerrada correctamente');
    } catch (error) {
      console.error("Error al cerrar conexión LDAP:", error);
    }
  }

  // Mantén tus otros métodos actualizados de la misma manera
  async updateUserCompany(username: string, company: string): Promise<void> {
    try {
      console.log(`🔄 Actualizando Company para usuario: ${username}`);
      await this.authenticate();
      await this.findAndModifyUser(username, "company", company);
      console.log(`✅ Company actualizado exitosamente para ${username}`);
    } catch (error) {
      console.error(`💥 Error crítico al actualizar company:`, error);
      throw error;
    } finally {
      this.safeUnbind();
    }
  }

  async getUserData(username: string): Promise<any> {
    try {
      await this.authenticate();

      const filter = `(&(objectClass=user)(sAMAccountName=${this.escapeLDAPValue(username)}))`;
      const attributes = [
        "employeeID", "company", "displayName", "telephoneNumber", 
        "streetAddress", "title", "sAMAccountName", "mail", 
        "userPrincipalName", "department", "physicalDeliveryOfficeName",
        "givenName", "sn", "l", "st", "employeeType", "ou", "employeeNumber"
      ];

      const entries = await unifiedLDAPSearch(filter, attributes, process.env.LDAP_BASE_DN!);

      if (entries.length === 0) {
        throw new Error(`Usuario ${username} no encontrado en LDAP`);
      }

      return this.formatUserData(entries[0]);
    } catch (error) {
      console.error(`💥 Error al obtener datos del usuario:`, error);
      throw error;
    } finally {
      this.safeUnbind();
    }
  }

  private formatUserData(entry: any): any {
    const userData: any = {};
    if (entry.attributes) {
      entry.attributes.forEach((attr: LDAPAttribute) => {
        if (attr.values && attr.values.length > 0) {
          userData[attr.type] = attr.values[0];
        }
      });
    }
    return userData;
  }
}

export const updateAccountService = new UpdateAccountService();