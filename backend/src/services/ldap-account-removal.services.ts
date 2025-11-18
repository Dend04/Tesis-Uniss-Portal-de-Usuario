// src/services/ldap-account-removal.services.ts
import { Client, SearchOptions, SearchEntry } from "ldapjs";
import { createLDAPClient, bindAsync } from "../utils/ldap.utils";
import { PrismaClient } from ".prisma/client_portal";
import dotenv from "dotenv";

dotenv.config();

export class LDAPAccountRemovalService {
  private client: Client;
  private prisma: PrismaClient;

  constructor() {
    this.client = createLDAPClient(process.env.LDAP_URL!);
    this.prisma = new PrismaClient();
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
      
      // ✅ CORRECCIÓN: Obtener sAMAccountName específicamente y validar que no sea undefined
      const sAMAccountName = entries[0].pojo.attributes.find(attr => attr.type === 'sAMAccountName')?.values[0];
      const employeeID = entries[0].pojo.attributes.find(attr => attr.type === 'employeeID')?.values[0];
      
      // ✅ Usar el identificador que seguro existe
      const userIdentifier = sAMAccountName || employeeID || identifier;

      if (!userIdentifier) {
        throw new Error('No se pudo obtener un identificador válido del usuario');
      }

      // ✅ NUEVO: Eliminar dispositivos asociados al usuario
      await this.deleteUserDevices(userIdentifier);

      await this.deleteEntry(userDN);

      console.log(`Se eliminó la cuenta de: ${displayName} (${userIdentifier})`);
      return true;
    } catch (error: any) {
      console.error('Error al eliminar cuenta:', error);
      throw new Error(`Error al eliminar cuenta: ${error.message}`);
    } finally {
      this.safeUnbind();
      await this.prisma.$disconnect();
    }
  }

  // ✅ NUEVO MÉTODO: Eliminar dispositivos del usuario
  private async deleteUserDevices(userIdentifier: string): Promise<void> {
    try {
      console.log(`🗑️ [DEVICE_REMOVAL] Buscando dispositivos para usuario: ${userIdentifier}`);
      
      // Buscar dispositivos por username (que corresponde al sAMAccountName)
      const userDevices = await this.prisma.dispositivo.findMany({
        where: { 
          username: userIdentifier
        }
      });

      console.log(`📱 [DEVICE_REMOVAL] Encontrados ${userDevices.length} dispositivos para el usuario ${userIdentifier}`);

      if (userDevices.length > 0) {
        // Eliminar todos los dispositivos del usuario
        await this.prisma.dispositivo.deleteMany({
          where: { 
            username: userIdentifier
          }
        });
        
        console.log(`✅ [DEVICE_REMOVAL] ${userDevices.length} dispositivos eliminados para el usuario ${userIdentifier}`);
        
        // Opcional: Registrar en logs la eliminación
        await this.prisma.log.create({
          data: {
            accion: 'ELIMINACION_DISPOSITIVOS',
            username: userIdentifier,
            exitoso: true,
            detalles: `Se eliminaron ${userDevices.length} dispositivos asociados a la cuenta`
          }
        });
      } else {
        console.log(`ℹ️ [DEVICE_REMOVAL] No se encontraron dispositivos para el usuario ${userIdentifier}`);
      }
      
    } catch (dbError) {
      console.error(`❌ [DEVICE_REMOVAL] Error eliminando dispositivos:`, dbError);
      // No lanzamos el error para no interrumpir el proceso principal de eliminación
      // Solo logueamos el error y continuamos
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