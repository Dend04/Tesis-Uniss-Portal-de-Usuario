
import dotenv from "dotenv";
import { DeviceStructureBuilder } from "./device.structure";

dotenv.config();

async function main() {
  const deviceBuilder = new DeviceStructureBuilder();
  
  try {
    console.log('🚀 Iniciando creación de estructura de dispositivos...');
    await deviceBuilder.buildDevicesStructure();
    
    // Para eliminar:
    // await deviceBuilder.cleanDevicesStructure();
  } catch (error) {
    process.exit(1);
  }
}

main();