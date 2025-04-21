import { Client } from "ldapjs";
import { createLDAPClient, bindAsync, escapeLDAPValue } from "./ldap.utils";
import { SearchEntry } from "ldapjs";
import dotenv from "dotenv";

dotenv.config();

export class AssetStructureBuilder {
  private client: Client;
  private assetCodeCounter: number = 1000;
    baseDN: string = process.env.LDAP_BASE_DN!;
    

  constructor() {
    this.client = createLDAPClient(process.env.LDAP_URL!);
  }

  async buildAssetStructure() {
    try {
      console.log("🚀 Iniciando creación de estructura ASSETS");
      await this.authenticate();
      
      const assetsDN = `OU=ASSETS,${this.baseDN}`;
      
      // Crear OU raíz ASSETS
      await this.createAssetOU(this.baseDN, "ASSETS");
      
      // Estructura completa
      const structure = {
        name: "Centro Universitario UNISS",
        children: [
          { name: "Administracion" },
          { name: "Departamento" },
          { name: "Docente" },
          { 
            name: "No Docente",
            children: [
              { name: "Educ Prescolar" },
              { name: "Lic Comunic Soc" },
              { name: "Lic en Educ Marxismo Leninismo" },
              { name: "Ninguna" },
              { name: "Profesion no Definida" }
            ]
          },
          {
            name: "Ptp",
            children: [
              { name: "Docentes" }
            ]
          }
        ]
      };

      await this.createNestedStructure(assetsDN, structure);
      console.log("✅ Estructura ASSETS creada exitosamente");
    } catch (error) {
      console.error("💥 Error crítico:", error);
      throw error;
    } finally {
      this.safeUnbind();
    }
  }

  private async createNestedStructure(parentDN: string, node: any) {
    const newDN = await this.createAssetOU(parentDN, node.name);
    
    if (node.children) {
      for (const child of node.children) {
        await this.createNestedStructure(newDN, child);
      }
    }
  }

  protected async createAssetOU(
    parentDN: string,
    ouName: string,
    attributes?: any  // Hacerlo opcional con '?'
  ): Promise<string> {
    const dn = `OU=${this.sanitizeOUName(ouName)},${parentDN}`;
    
    try {
      await this.searchOU(dn);
      console.log(`✅ OU existente: ${dn}`);
      return dn;
    } catch (error) {
      return new Promise((resolve, reject) => {
        this.client.add(dn, {
          objectClass: ["top", "organizationalUnit"],
          ou: this.sanitizeOUName(ouName),
          ...(attributes || {})  // Usar atributos si existen
        }, (err) => {
          if (err) reject(err);
          else {
            console.log(`✓ OU creada: ${dn}`);
            resolve(dn);
          }
        });
      });
    }
  }

  protected async cleanStructureContent(dn: string, structureName: string): Promise<void> {
    try {
      console.log(`🧹 Limpiando contenido de ${structureName}...`);
      await this.authenticate();
      await this.deleteAllContent(dn);
      console.log(`✅ Contenido de ${structureName} eliminado (OU raíz se conserva)`);
    } catch (error) {
      console.error(`💥 Error limpiando ${structureName}:`, error);
      throw error;
    } finally {
      this.safeUnbind();
    }
  }

  private async deleteAllContent(dn: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.search(dn, { scope: "sub" }, (err, res) => {
        if (err) return reject(err);
        
        const deleteQueue: string[] = [];
        
        res.on("searchEntry", (entry: SearchEntry) => {
          if (entry.objectName && entry.objectName.toString() !== dn) {
            deleteQueue.push(entry.objectName.toString());
          }
        });
        
        res.on("error", reject);
        
        res.on("end", async () => {
          try {
            for (const childDN of deleteQueue.reverse()) {
              await this.deleteOU(childDN);
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  }

  private async deleteOU(dn: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.del(dn, (err) => {
        if (err && err.code !== 32) reject(err);
        else {
          console.log(`🗑️ Eliminado: ${dn}`);
          resolve();
        }
      });
    });
  }

  // Métodos auxiliares
  protected sanitizeOUName(name: string): string {
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 -]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 64);
  }

  protected async authenticate(): Promise<void> {
    await bindAsync(
      this.client,
      process.env.LDAP_ADMIN_DN!,
      process.env.LDAP_ADMIN_PASSWORD!
    );
  }

  protected safeUnbind() {
    try {
      if (this.client) this.client.unbind();
    } catch (error) {
      console.error("⚠️ Error al cerrar conexión:", error);
    }
  }

  protected async searchOU(dn: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.search(dn, { scope: "base" }, (err, res) => {
        if (err) return reject(err);
        
        let found = false;
        res.on("searchEntry", () => found = true);
        res.on("error", reject);
        res.on("end", () => found ? resolve() : reject("OU no encontrada"));
      });
    });
  }

  
}

/* ts-node src/examples/createAssets.ts */