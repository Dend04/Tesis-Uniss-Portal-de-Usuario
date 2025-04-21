import { AssetStructureBuilder } from "./asset.structure";


async function main() {
  const assetBuilder = new AssetStructureBuilder();
  
  try {
    // Crear estructura completa
    await assetBuilder.buildAssetStructure();
    
    // Para eliminar:
    // await assetBuilder.cleanAssetStructure();
  } catch (error) {
    process.exit(1);
  }
}

main();