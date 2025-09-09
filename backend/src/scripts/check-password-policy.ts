import { SearchOptions } from "../types/ldapjs";
import { createLDAPClient, bindAsync } from "../utils/ldap.utils";
import dotenv from "dotenv";

dotenv.config();

async function checkPasswordPolicy() {
  const client = createLDAPClient(process.env.LDAP_URL!);
  
  try {
    await bindAsync(
      client,
      process.env.LDAP_ADMIN_DN!,
      process.env.LDAP_ADMIN_PASSWORD!
    );

    const baseDN = process.env.BASE_LDAP!;
    
    // Buscar en el contenedor de políticas por defecto
    const searchOptions: SearchOptions = {
      scope: 'base' as const,
      filter: '(objectClass=*)',
      attributes: ['minPwdLength', 'pwdProperties']
    };

    const policyDN = baseDN;
    
    client.search(policyDN, searchOptions, (err, res) => {
      if (err) {
        console.error('Error buscando políticas:', err);
        return;
      }

      res.on('searchEntry', (entry) => {
        console.log('🔍 Políticas de contraseña encontradas:');
        
        let hasPolicy = false;
        
        entry.attributes.forEach(attr => {
          if (attr.type === 'minPwdLength') {
            console.log(`• Longitud mínima: ${attr.values[0]}`);
            hasPolicy = true;
          }
          if (attr.type === 'pwdProperties') {
            const properties = parseInt(attr.values[0]);
            console.log('• Reglas de complejidad:');
            if (properties & 1) console.log('  - Requiere caracteres complejos');
            if (properties & 2) console.log('  - No permite cambios anónimos');
            if (properties & 4) console.log('  - Almacenamiento cifrado');
            if (properties & 8) console.log('  - Bloqueo para administradores');
            hasPolicy = true;
          }
        });

        if (!hasPolicy) {
          console.log('ℹ️ No se encontraron políticas en este contenedor');
        }
      });

      res.on('error', (err) => {
        console.error('Error en búsqueda:', err);
      });

      res.on('end', () => {
        console.log('✅ Búsqueda completada');
        client.unbind();
      });
    });
  } catch (error) {
    console.error('❌ Error conectando a LDAP:', error);
  }
}

checkPasswordPolicy();