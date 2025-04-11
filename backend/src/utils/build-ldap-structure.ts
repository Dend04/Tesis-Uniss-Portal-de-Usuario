// src/utils/ldap.structure.ts
import { LDAPStructureBuilder } from '../utils/ldap.structure';
import cron from 'node-cron';
import { fetchStructureData } from './ldap.data';

let isFirstRun = true;

async function main() {
  console.log('🚀 Iniciando proceso de construcción LDAP');
  try {
    console.log('🔍 Obteniendo datos de estructura...');
    const structureData = await fetchStructureData();
    console.log('✅ Datos obtenidos:', {
      faculties: structureData.faculties.length,
      careers: structureData.careers.length,
      courseTypes: structureData.courseTypes.length
    });

    const builder = new LDAPStructureBuilder();
    console.log('🛠 Creando instancia LDAPStructureBuilder');

    if (isFirstRun) {
      console.log('🔄 Primera ejecución - Construyendo estructura completa');
      await builder.buildFullStructure(structureData);
      isFirstRun = false;
    } else {
      console.log('⚡ Ejecución posterior - Actualizando estructura');
      /* await builder.updateStructure(structureData); */
    }

    console.log('✅ Estructura LDAP actualizada exitosamente');
  } catch (error) {
    console.error('❌ Error crítico:', error instanceof Error ? error.stack : error);
    process.exit(1);
  }
}

// Ejecución manual con verificación de módulo
if (require.main === module) {
  console.log('🔧 Modo de ejecución manual detectado');
  main()
    .then(() => console.log('🏁 Proceso completado'))
    .catch((e) => console.error('🔥 Error en proceso principal:', e));
}

// Ejecución programada (descomentada si se desea usar)
//cron.schedule('0 */6 * * *', async () => {
//  console.log('⏰ Ejecución programada iniciada');
//  try {
//    console.log('♻️ Limpiando caché de datos');
    // dataCache.flushAll(); // Descomentar si se usa caché
//    await main();
//  } catch (error) {
//    console.error('⏰ Error en ejecución programada:', error);
//  }
//});