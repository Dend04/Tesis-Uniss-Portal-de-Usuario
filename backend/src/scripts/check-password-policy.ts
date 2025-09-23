import { SearchOptions } from "../types/ldapjs";
import { createLDAPClient, bindAsync } from "../utils/ldap.utils";
import dotenv from "dotenv";

dotenv.config();

async function checkPasswordPolicy() {
  const client = createLDAPClient(process.env.LDAP_URL!);
  const baseDN = process.env.BASE_LDAP!;

  try {
    await bindAsync(client, process.env.LDAP_ADMIN_DN!, process.env.LDAP_ADMIN_PASSWORD!);

    // 1. Buscar la política de contraseña en el objeto de dominio raíz (CORRECCIÓN)
    const domainDN = baseDN; // Esto es correcto: DC=uniss,DC=edu,DC=cu
    const domainSearchOptions: SearchOptions = {
      scope: 'base',
      filter: '(objectClass=domainDNS)',
      attributes: ['maxPwdAge', 'minPwdAge', 'minPwdLength', 'pwdProperties']
    };

    // 2. Buscar Políticas de Contraseña Detalladas (FGPP/PSO)
    const psoContainerDN = `CN=Password Settings Container,CN=System,${baseDN}`;
    const psoSearchOptions: SearchOptions = {
      scope: 'sub',
      filter: '(objectClass=msDS-PasswordSettings)',
      attributes: ['msDS-MaximumPasswordAge', 'msDS-PSOAppliesTo', 'name']
    };

    console.log('🔍 Buscando políticas de contraseña...');

    // Función para convertir el intervalo de LDAP a días
    const convertIntervalToDays = (interval: string): number => {
      const intervalValue = BigInt(interval);
      if (intervalValue === BigInt(0) || intervalValue === BigInt('-9223372036854775808')) {
        return 0; // Nunca expira
      }
      const seconds = Number(intervalValue) / 10000000;
      const days = Math.abs(seconds / 86400);
      return Math.round(days);
    };

    // Función para manejar valores que pueden ser string o string[]
    const getAttributeValues = (values: string | string[]): string[] => {
      return Array.isArray(values) ? values : [values];
    };

    // CORRECCIÓN: Usar domainDN en lugar de domainPolicyDN
    client.search(domainDN, domainSearchOptions, (err, res) => {
      if (err) {
        console.error('Error buscando política de dominio:', err);
        // Continuar con la búsqueda de PSOs incluso si falla la de dominio
      }

      let domainPolicyFound = false;

      res.on('searchEntry', (entry) => {
        console.log('✅ Política de Dominio Encontrada:');
        domainPolicyFound = true;
        
        entry.attributes.forEach(attr => {
          const values = getAttributeValues(attr.values);
          
          if (attr.type === 'maxPwdAge') {
            const maxAgeDays = convertIntervalToDays(values[0]);
            console.log(`• Edad máxima de contraseña: ${maxAgeDays === 0 ? 'Nunca expira' : `${maxAgeDays} días`}`);
          }
          if (attr.type === 'minPwdAge') {
            const minAgeDays = convertIntervalToDays(values[0]);
            console.log(`• Edad mínima de contraseña: ${minAgeDays} días`);
          }
          if (attr.type === 'minPwdLength') {
            console.log(`• Longitud mínima: ${values[0]} caracteres`);
          }
          if (attr.type === 'pwdProperties') {
            const properties = parseInt(values[0]);
            console.log('• Reglas de complejidad:');
            if (properties & 1) console.log('  - Requiere caracteres complejos');
            if (properties & 2) console.log('  - No permite cambios anónimos');
            if (properties & 4) console.log('  - Almacenamiento cifrado');
            if (properties & 8) console.log('  - Bloqueo para administradores');
          }
        });
      });

      res.on('error', (err) => {
        console.error('Error en búsqueda de dominio:', err);
      });

      res.on('end', () => {
        if (!domainPolicyFound) {
          console.log('❌ No se encontró política de dominio en', domainDN);
        }
        
        console.log('\n🔍 Buscando Políticas de Contraseña Detalladas (PSO)...');
        
        client.search(psoContainerDN, psoSearchOptions, (psoErr, psoRes) => {
          if (psoErr) {
            console.error('Error buscando PSOs:', psoErr);
            client.unbind();
            return;
          }

          let psoCount = 0;

          psoRes.on('searchEntry', (psoEntry) => {
            psoCount++;
            console.log(`✅ Política de Contraseña Detallada (PSO) ${psoCount}:`);
            psoEntry.attributes.forEach(attr => {
              const values = getAttributeValues(attr.values);
              
              if (attr.type === 'name') {
                console.log(`• Nombre de la PSO: ${values[0]}`);
              }
              if (attr.type === 'msDS-MaximumPasswordAge') {
                const maxAgeDays = convertIntervalToDays(values[0]);
                console.log(`• Edad máxima de contraseña: ${maxAgeDays === 0 ? 'Nunca expira' : `${maxAgeDays} días`}`);
              }
              if (attr.type === 'msDS-PSOAppliesTo') {
                console.log(`• Se aplica a: ${values.join(', ')}`);
              }
            });
            console.log('---');
          });

          psoRes.on('error', (psoErr) => {
            console.error('Error en búsqueda PSO:', psoErr);
          });

          psoRes.on('end', () => {
            if (psoCount === 0) {
              console.log('ℹ️ No se encontraron Políticas de Contraseña Detalladas (PSO)');
            }
            console.log('✅ Búsqueda de políticas completada');
            client.unbind();
          });
        });
      });
    });

  } catch (error) {
    console.error('❌ Error conectando a LDAP:', error);
  }
}

checkPasswordPolicy();