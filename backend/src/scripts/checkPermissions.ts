import { createLDAPClient, bindAsync } from "../utils/ldap.utils";
import * as ldap from 'ldapjs';
import dotenv from "dotenv";

dotenv.config();

// Función helper para normalizar valores a array
function ensureArray(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value];
}

// Función helper para obtener el primer valor
function getFirstValue(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

async function analyzeGlobalPermissions() {
  const client = createLDAPClient(process.env.LDAP_URL!);
  const baseDN = process.env.LDAP_BASE_DN!;

  try {
    console.log('🔐 INICIANDO ANÁLISIS GLOBAL DE PERMISOS');
    console.log('=========================================');
    console.log('Cuenta:', process.env.LDAP_ADMIN_DN);
    console.log('Dominio:', baseDN);
    console.log('=========================================\n');

    await bindAsync(client, process.env.LDAP_ADMIN_DN!, process.env.LDAP_ADMIN_PASSWORD!);
    
    // 1. Primero analizar la cuenta misma
    await analyzeAccountItself(client, baseDN);
    
    // 2. Verificar permisos en diferentes partes del directorio
    await checkRootPermissions(client, baseDN);
    await checkSchemaPermissions(client, baseDN);
    await checkConfigurationPermissions(client, baseDN);
    await checkUserManagementPermissions(client, baseDN);
    await checkGroupManagementPermissions(client, baseDN);
    
    // 3. Resumen final
    await generatePermissionSummary();

  } catch (error) {
    console.error('❌ Error en análisis global:', error);
  } finally {
    client.unbind();
  }
}

async function analyzeAccountItself(client: ldap.Client, baseDN: string) {
  console.log('1. 📋 ANALIZANDO LA CUENTA LDAP_CONNECTION');
  console.log('-------------------------------------------');
  
  const searchOptions: ldap.SearchOptions = {
    scope: 'sub',
    filter: '(sAMAccountName=ldap_connection)',
    attributes: ['memberOf', 'userAccountControl', 'adminCount', 'primaryGroupID']
  };

  return new Promise<void>((resolve) => {
    client.search(baseDN, searchOptions, (err, res) => {
      if (err) {
        console.log('❌ Error buscando ldap_connection:', err.message);
        resolve();
        return;
      }

      res.on('searchEntry', (entry: ldap.SearchEntry) => {
        console.log('✅ Información de la cuenta:');
        
        let memberOf: string[] = [];
        let userAccountControl = '';
        let adminCount = '';
        
        entry.attributes.forEach(attr => {
          // CORRECCIÓN: Usar las funciones helper para manejar los tipos
          if (attr.type === 'memberOf') {
            memberOf = ensureArray(attr.values);
          }
          if (attr.type === 'userAccountControl') {
            userAccountControl = getFirstValue(attr.values);
          }
          if (attr.type === 'adminCount') {
            adminCount = getFirstValue(attr.values);
          }
        });
        
        console.log('   Grupos:');
        if (memberOf.length > 0) {
          memberOf.forEach(group => {
            console.log(`   👉 ${group}`);
          });
        } else {
          console.log('   ❌ No está en ningún grupo adicional');
        }
        
        console.log(`   UserAccountControl: ${userAccountControl}`);
        console.log(`   AdminCount: ${adminCount}`);
        
        // Analizar nivel de privilegios
        analyzePrivilegeLevel(memberOf, userAccountControl, adminCount);
      });

      res.on('end', () => {
        console.log('');
        resolve();
      });
    });
  });
}

function analyzePrivilegeLevel(groups: string[], userAccountControl: string, adminCount: string) {
  const privilegedGroups = [
    'Domain Admins',
    'Enterprise Admins', 
    'Account Operators',
    'Server Operators',
    'Backup Operators',
    'Print Operators',
    'Schema Admins',
    'Administrators'
  ];
  
  console.log('   📊 NIVEL DE PRIVILEGIOS:');
  
  let hasHighPrivileges = false;
  let foundGroups: string[] = [];
  
  groups.forEach(group => {
    privilegedGroups.forEach(privGroup => {
      if (group.toLowerCase().includes(privGroup.toLowerCase())) {
        foundGroups.push(privGroup);
        hasHighPrivileges = true;
      }
    });
  });
  
  if (hasHighPrivileges) {
    console.log(`   🚨 ALTO PRIVILEGIO: Miembro de ${foundGroups.join(', ')}`);
  } else {
    console.log('   ℹ️  Privilegios normales/bajos');
  }
  
  if (adminCount === '1') {
    console.log('   ⚠️  AdminCount=1: Indica que tuvo privilegios administrativos');
  }
}

async function checkRootPermissions(client: ldap.Client, baseDN: string) {
  console.log('2. 🌳 PERMISOS EN RAIZ DEL DOMINIO');
  console.log('-----------------------------------');
  
  // Intentar leer la raíz
  const rootSearch: ldap.SearchOptions = {
    scope: 'base',
    filter: '(objectClass=*)',
    attributes: ['*']
  };

  return new Promise<void>((resolve) => {
    client.search(baseDN, rootSearch, (err, res) => {
      if (err) {
        console.log('❌ No puede leer la raíz del dominio:', err.message);
      } else {
        res.on('searchEntry', () => {
          console.log('✅ PUEDE leer la raíz del dominio');
        });
      }
      
      // Probar si puede modificar la raíz (operación muy privilegiada)
      testRootModification(client, baseDN, resolve);
    });
  });
}

async function testRootModification(client: ldap.Client, baseDN: string, resolve: () => void) {
  const change = new ldap.Change({
    operation: 'replace',
    modification: {
      description: 'Prueba de permisos en raíz'
    }
  });

  client.modify(baseDN, change, (err) => {
    if (err) {
      if (err.message.includes('insufficient access')) {
        console.log('❌ NO puede modificar la raíz del dominio (normal)');
      } else {
        console.log('❌ No puede modificar raíz:', err.message);
      }
    } else {
      console.log('🚨🚨🚨 ALTO PRIVILEGIO: PUEDE modificar la raíz del dominio');
      // Revertir cambio
      const revert = new ldap.Change({
        operation: 'replace',
        modification: { description: '' }
      });
      client.modify(baseDN, revert, () => {});
    }
    console.log('');
    resolve();
  });
}

async function checkSchemaPermissions(client: ldap.Client, baseDN: string) {
  console.log('3. 📐 PERMISOS EN ESQUEMA');
  console.log('--------------------------');
  
  const schemaDN = 'CN=Schema,CN=Configuration,' + baseDN;
  
  const schemaSearch: ldap.SearchOptions = {
    scope: 'base',
    filter: '(objectClass=*)',
    attributes: ['objectClass']
  };

  return new Promise<void>((resolve) => {
    client.search(schemaDN, schemaSearch, (err, res) => {
      if (err) {
        console.log('❌ No puede acceder al esquema (normal para cuentas no privilegiadas)');
      } else {
        res.on('searchEntry', () => {
          console.log('🚨 ALTO PRIVILEGIO: PUEDE acceder al esquema');
        });
      }
      console.log('');
      resolve();
    });
  });
}

async function checkConfigurationPermissions(client: ldap.Client, baseDN: string) {
  console.log('4. ⚙️ PERMISOS EN CONFIGURACIÓN');
  console.log('-------------------------------');
  
  const configDN = 'CN=Configuration,' + baseDN;
  
  const configSearch: ldap.SearchOptions = {
    scope: 'one',
    filter: '(objectClass=*)',
    attributes: ['cn'],
    sizeLimit: 5
  };

  return new Promise<void>((resolve) => {
    client.search(configDN, configSearch, (err, res) => {
      if (err) {
        console.log('❌ No puede leer configuración (normal)');
      } else {
        let count = 0;
        res.on('searchEntry', () => count++);
        res.on('end', () => {
          if (count > 0) {
            console.log(`🚨 ALTO PRIVILEGIO: PUEDE leer configuración (encontró ${count} objetos)`);
          }
        });
      }
      console.log('');
      resolve();
    });
  });
}

async function checkUserManagementPermissions(client: ldap.Client, baseDN: string) {
  console.log('5. 👥 PERMISOS DE GESTIÓN DE USUARIOS');
  console.log('--------------------------------------');
  
  // Probar creación de usuario
  await testUserCreation(client, baseDN);
  
  // Probar eliminación de usuario
  await testUserDeletion(client, baseDN);
  
  // Probar modificación de usuarios
  await testUserModification(client, baseDN);
}

async function testUserCreation(client: ldap.Client, baseDN: string) {
  const testUserName = `test_${Date.now()}`;
  const testUserDN = `CN=${testUserName},CN=Users,${baseDN}`;
  
  const userAttributes = {
    objectClass: ['top', 'person', 'organizationalPerson', 'user'],
    cn: testUserName,
    sAMAccountName: testUserName,
    userPrincipalName: `${testUserName}@uniss.edu.cu`,
    displayName: 'Usuario de Prueba',
    userAccountControl: '514' // Cuenta deshabilitada
  };

  return new Promise<void>((resolve) => {
    client.add(testUserDN, userAttributes, (err) => {
      if (err) {
        if (err.message.includes('insufficient access')) {
          console.log('❌ NO puede crear usuarios');
        } else {
          console.log('❌ No puede crear usuarios:', err.message);
        }
      } else {
        console.log('✅ PUEDE crear usuarios');
        // Eliminar usuario de prueba
        client.del(testUserDN, (delErr) => {
          if (delErr) {
            console.log('⚠️  Creado usuario pero no puede eliminarlo');
          }
        });
      }
      resolve();
    });
  });
}

async function testUserDeletion(client: ldap.Client, baseDN: string) {
  // Buscar un usuario de prueba existente o usar uno conocido
  const testSearch: ldap.SearchOptions = {
    scope: 'sub',
    filter: '(sAMAccountName=denamorado)',
    attributes: ['dn']
  };

  return new Promise<void>((resolve) => {
    client.search(baseDN, testSearch, (err, res) => {
      if (err) {
        console.log('❌ Error buscando usuario para prueba de eliminación');
        resolve();
        return;
      }

      res.on('searchEntry', (entry: ldap.SearchEntry) => {
        const userDN = entry.dn;
        
        // NO intentar eliminar usuarios reales - solo verificar permisos
        console.log('💡 Para probar eliminación, se necesitaría un usuario de prueba');
        resolve();
      });

      res.on('end', () => {
        resolve();
      });
    });
  });
}

async function testUserModification(client: ldap.Client, baseDN: string) {
  const testSearch: ldap.SearchOptions = {
    scope: 'sub',
    filter: '(sAMAccountName=denamorado)',
    attributes: ['dn']
  };

  return new Promise<void>((resolve) => {
    client.search(baseDN, testSearch, (err, res) => {
      if (err) {
        console.log('❌ Error buscando usuario para prueba de modificación');
        resolve();
        return;
      }

      res.on('searchEntry', (entry: ldap.SearchEntry) => {
        const userDN = entry.dn;
        
        const change = new ldap.Change({
          operation: 'replace',
          modification: {
            description: 'Prueba de modificación ' + new Date().toISOString()
          }
        });

        client.modify(userDN, change, (modErr) => {
          if (modErr) {
            if (modErr.message.includes('insufficient access')) {
              console.log('❌ NO puede modificar usuarios existentes');
            } else {
              console.log('❌ Error modificando usuario:', modErr.message);
            }
          } else {
            console.log('✅ PUEDE modificar usuarios existentes');
            // Revertir cambio
            const revert = new ldap.Change({
              operation: 'replace',
              modification: { description: '' }
            });
            client.modify(userDN, revert, () => {});
          }
          resolve();
        });
      });

      res.on('end', () => {
        resolve();
      });
    });
  });
}

async function checkGroupManagementPermissions(client: ldap.Client, baseDN: string) {
  console.log('6. 🎯 PERMISOS DE GESTIÓN DE GRUPOS');
  console.log('-----------------------------------');
  
  // Probar creación de grupo
  await testGroupCreation(client, baseDN);
  
  // Probar modificación de grupos
  await testGroupModification(client, baseDN);
}

async function testGroupCreation(client: ldap.Client, baseDN: string) {
  const testGroupName = `TestGroup_${Date.now()}`;
  const testGroupDN = `CN=${testGroupName},CN=Users,${baseDN}`;
  
  const groupAttributes = {
    objectClass: ['top', 'group'],
    cn: testGroupName,
    sAMAccountName: testGroupName,
    groupType: '-2147483646' // Grupo de seguridad global
  };

  return new Promise<void>((resolve) => {
    client.add(testGroupDN, groupAttributes, (err) => {
      if (err) {
        if (err.message.includes('insufficient access')) {
          console.log('❌ NO puede crear grupos');
        } else {
          console.log('❌ No puede crear grupos:', err.message);
        }
      } else {
        console.log('✅ PUEDE crear grupos');
        // Eliminar grupo de prueba
        client.del(testGroupDN, () => {});
      }
      resolve();
    });
  });
}

async function testGroupModification(client: ldap.Client, baseDN: string) {
  // Buscar el grupo "Domain Users" para probar modificación
  const groupSearch: ldap.SearchOptions = {
    scope: 'sub',
    filter: '(sAMAccountName=Domain Users)',
    attributes: ['dn']
  };

  return new Promise<void>((resolve) => {
    client.search(baseDN, groupSearch, (err, res) => {
      if (err) {
        console.log('❌ Error buscando grupo para prueba');
        resolve();
        return;
      }

      res.on('searchEntry', (entry: ldap.SearchEntry) => {
        const groupDN = entry.dn;
        
        const change = new ldap.Change({
          operation: 'replace',
          modification: {
            description: 'Prueba de modificación ' + new Date().toISOString()
          }
        });

        client.modify(groupDN, change, (modErr) => {
          if (modErr) {
            if (modErr.message.includes('insufficient access')) {
              console.log('❌ NO puede modificar grupos existentes');
            } else {
              console.log('❌ Error modificando grupo:', modErr.message);
            }
          } else {
            console.log('🚨 ALTO PRIVILEGIO: PUEDE modificar grupos del sistema');
            // Revertir cambio
            const revert = new ldap.Change({
              operation: 'replace',
              modification: { description: '' }
            });
            client.modify(groupDN, revert, () => {});
          }
          resolve();
        });
      });

      res.on('end', () => {
        resolve();
      });
    });
  });
}

async function generatePermissionSummary() {
  console.log('\n=========================================');
  console.log('📊 RESUMEN FINAL DE PERMISOS');
  console.log('=========================================');
  console.log('\nBasado en los resultados anteriores:');
  console.log('\n💡 INTERPRETACIÓN:');
  console.log('   ✅ = Tiene el permiso');
  console.log('   ❌ = No tiene el permiso');
  console.log('   🚨 = Privilegio muy elevado');
  console.log('   ℹ️  = Comportamiento normal/esperado');
  
  console.log('\n🎯 RECOMENDACIONES:');
  console.log('   - Para solo lectura: Los permisos actuales son suficientes');
  console.log('   - Para modificar usuarios: Necesita "Write" en los objetos de usuario');
  console.log('   - Para crear usuarios: Necesita permisos de creación en la OU correspondiente');
  console.log('   - Para administración completa: Contactar al administrador de AD');
}

// Ejecutar análisis completo
analyzeGlobalPermissions().catch(console.error);