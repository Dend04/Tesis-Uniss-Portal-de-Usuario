// src/services/ldap-account-removal.services.ts
import { Client, SearchOptions, SearchEntry } from "ldapjs";
import { createLDAPClient, bindAsync } from "../utils/ldap.utils";
import dotenv from "dotenv";

dotenv.config();

export class LDAPAccountRemovalService {
  private client: Client;
    constructor() {
      this.client = createLDAPClient(process.env.LDAP_URL!);
    }
  
    async removeAccount(identifier: string): Promise<boolean> {
      try {
        await this.authenticate();
  
        // Búsqueda por employeeID o sAMAccountName
        const entries = await this.searchByIdentifier(identifier);
  
        console.log('Resultados de la búsqueda LDAP:', entries);
  
        if (entries.length === 0) {
          throw new Error(`No se encontró usuario con employeeID o sAMAccountName: ${identifier}`);
        }
  
        if (entries.length > 1) {
          throw new Error(`Múltiples resultados para: ${identifier}`);
        }
  
        const userDN = entries[0].dn;
        const displayName = entries[0].pojo.attributes.find(attr => attr.type === 'displayName')?.values[0];
        const userIdentifier = entries[0].pojo.attributes.find(attr => 
          attr.type === 'employeeID' || attr.type === 'sAMAccountName'
        )?.values[0];
  
        await this.deleteEntry(userDN);
  
        console.log(`Se eliminó la cuenta de: ${displayName} (${userIdentifier})`);
        return true;
      } catch (error: any) {
        console.error('Error al eliminar cuenta:', error);
        throw new Error(`Error al eliminar cuenta: ${error.message}`);
      } finally {
        this.safeUnbind();
      }
    }
  
    private async searchByIdentifier(identifier: string): Promise<SearchEntry[]> {
      const baseDN = process.env.LDAP_BASE_DN!;
      const safeIdentifier = escape(identifier);
      
      const searchOptions: SearchOptions = {
        scope: 'sub',
        filter: `(|(employeeID=${safeIdentifier})(sAMAccountName=${safeIdentifier}))`,
        attributes: ['dn', 'displayName', 'employeeID', 'sAMAccountName']
      };
  
      return new Promise((resolve, reject) => {
        const entries: SearchEntry[] = [];
        this.client.search(baseDN, searchOptions, (err, res) => {
          if (err) return reject(err);
  
          res.on('searchEntry', (entry: SearchEntry) => {
            entries.push(entry);
          });
  
          res.on('error', reject);
          res.on('end', () => resolve(entries));
        });
      });
    }

  private async searchByEmployeeID(employeeID: string): Promise<SearchEntry[]> {
    const baseDN = process.env.LDAP_BASE_DN!;
    const searchOptions: SearchOptions = {
      scope: 'sub',
      filter: `(employeeID=${employeeID})`,
      attributes: ['dn', 'displayName'] // Incluir displayName en los atributos buscados
    };

    return new Promise((resolve, reject) => {
      const entries: SearchEntry[] = [];
      this.client.search(baseDN, searchOptions, (err, res) => {
        if (err) return reject(err);

        res.on('searchEntry', (entry: SearchEntry) => {
          entries.push(entry);
        });

        res.on('error', reject);
        res.on('end', () => resolve(entries));
      });
    });
  }

  private async deleteEntry(dn: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.del(dn, (err) => {
        err ? reject(err) : resolve();
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

  private safeUnbind(): void {
    try {
      this.client.unbind();
    } catch (error) {
      console.error("Error cerrando conexión:", error);
    }
  }
}
