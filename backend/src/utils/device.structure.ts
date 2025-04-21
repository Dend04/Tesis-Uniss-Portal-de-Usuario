import { AssetStructureBuilder } from "./asset.structure";

export class DeviceStructureBuilder extends AssetStructureBuilder {
  private get devicesDN(): string {
    return `OU=Dispositivos,${this.baseDN}`;
  }

  async buildDevicesStructure() {
    try {
      console.log("🛠️ Construyendo estructura de dispositivos...");
      await this.authenticate();
      
      // Crear OU principal Dispositivos
      await this.createAssetOU(this.baseDN, "Dispositivos", {
        description: "Dispositivos institucionales",
        postalCode: "5000",
        objectClass: ["top", "organizationalUnit"]
      });

      // Sub-OUs para tipos de dispositivos
      const deviceTypes = [
        { name: "Laptops", code: "5001" },
        { name: "Ordenadores", code: "5002" },
        { name: "Celulares", code: "5003" },
        { name: "Tablets", code: "5004" }
      ];

      for (const type of deviceTypes) {
        await this.createAssetOU(this.devicesDN, type.name, {
          postalCode: type.code,
          description: `Dispositivos tipo ${type.name}`,
          objectClass: ["top", "organizationalUnit"]
        });
      }

      console.log("✅ Estructura de dispositivos creada:");
      console.log(`
      OU=Dispositivos
      ├── OU=Laptops
      ├── OU=Ordenadores
      ├── OU=Celulares
      └── OU=Tablets
      `);
      
    } catch (error) {
      console.error("💥 Error crítico en estructura dispositivos:", error);
      throw error;
    } finally {
      this.safeUnbind();
    }
  }

  async cleanDevicesStructure() {
    try {
      console.log("🧹 Limpiando estructura de dispositivos...");
      await this.authenticate();
      await this.cleanStructureContent(`OU=Dispositivos,${this.baseDN}`, 'Dispositivos');
      console.log("✅ Estructura de dispositivos eliminada");
    } catch (error) {
      console.error("💥 Error limpiando dispositivos:", error);
    }
  }
}