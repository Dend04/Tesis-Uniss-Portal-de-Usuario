// src/services/ldap-email-update.service.ts
import { Client } from "ldapjs";
import { createLDAPClient, bindAsync } from "../utils/ldap.utils";

interface LDAPError extends Error {
  code?: number;
  dn?: string;
  lde_message?: string;
}

export class LDAPEmailUpdateService {
  private client: Client;

  constructor() {
    this.client = createLDAPClient(process.env.LDAP_URL!);
  }

  /**
   * Actualiza el campo company (correo de respaldo) de un usuario en LDAP
   */
  async updateUserEmail(employeeID: string, newEmail: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.authenticate();
      
      console.log(`🎯 INICIANDO ACTUALIZACIÓN - Usuario: ${employeeID}, Nuevo company: ${newEmail}`);
      
      // Buscar el DN del usuario por employeeID
      const userDN = await this.findUserDNByEmployeeID(employeeID);
      
      if (!userDN) {
        return {
          success: false,
          message: "Usuario no encontrado"
        };
      }

      // Actualizar el atributo company
      await this.updateLDAPAttribute(userDN, 'company', newEmail);

      console.log(`✅ ACTUALIZACIÓN COMPLETADA - Usuario: ${employeeID}`);
      return {
        success: true,
        message: "Correo actualizado exitosamente en LDAP"
      };

    } catch (error: unknown) {
      const ldapError = error as LDAPError;
      console.error("Error al actualizar correo en LDAP:", ldapError);
      return {
        success: false,
        message: `Error al actualizar correo: ${ldapError.message}`
      };
    } finally {
      this.safeUnbind();
    }
  }

  /**
   * Encuentra el DN de un usuario por employeeID
   */
  private async findUserDNByEmployeeID(employeeID: string): Promise<string | null> {
    const baseDN = "dc=uniss,dc=edu,dc=cu";
    const filter = `(sAMAccountName=${this.escapeLDAPValue(employeeID)})`;
    
    try {
      const entries = await this.searchLDAP(baseDN, filter, ["dn"]);
      return entries.length > 0 ? entries[0].objectName : null;
    } catch (error) {
      console.error("Error buscando usuario por employeeID:", error);
      return null;
    }
  }

  /**
   * Actualiza un atributo específico en LDAP
   */
  private async updateLDAPAttribute(dn: string, attribute: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const change = {
        operation: 'replace',
        modification: {
          type: attribute,
          values: [value]
        }
      };

      this.client.modify(dn, change, (err) => {
        if (err) {
          reject(new Error(`Error LDAP (${err.code}): ${err.message}`));
        } else {
          console.log(`✅ Atributo ${attribute} actualizado exitosamente para: ${dn}`);
          resolve();
        }
      });
    });
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
      console.error("⚠️ Error al cerrar conexión:", error);
    }
  }

  private escapeLDAPValue(value: string): string {
    return value
      .replace(/\\/g, "\\5c")
      .replace(/,/g, "\\2c")
      .replace(/"/g, "\\22")
      .replace(/</g, "\\3c")
      .replace(/>/g, "\\3e")
      .replace(/;/g, "\\3b")
      .replace(/\//g, "\\2f")
      .substring(0, 64);
  }

  private async searchLDAP(baseDN: string, filter: string, attributes: string[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const entries: any[] = [];
      this.client.search(
        baseDN,
        {
          scope: "sub",
          filter,
          attributes,
        },
        (err, res) => {
          if (err) {
            return reject(err);
          }
          res.on("searchEntry", (entry) => {
            entries.push(entry);
          });
          res.on("error", (error) => {
            reject(error);
          });
          res.on("end", () => {
            resolve(entries);
          });
        }
      );
    });
  }
}