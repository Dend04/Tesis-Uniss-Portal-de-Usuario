// src/services/ldap/worker.ts
import { workerData, parentPort } from 'worker_threads';
import { SearchEntry } from 'ldapjs';
import { createLDAPClient, searchAsync } from './ldap.utils';


if (parentPort) {
  const { baseDN, filter } = workerData;
  const client = createLDAPClient(process.env.LDAP_URL!);

  parentPort.on('message', async () => {
    try {
      // Asegurar tipo de retorno
      const results: SearchEntry[] = await searchAsync(
        client, 
        baseDN, 
        { filter, scope: 'sub' }
      );
      
      // Validar entrada antes de usar
      const firstEntry = results[0];
      if (!firstEntry) throw new Error("No results");
      
      parentPort!.postMessage({ 
        data: results.map(entry => ({
          dn: entry.dn, // <- Propiedad válida
          attributes: entry.attributes
        }))
      });
    } catch (error) {
      parentPort!.postMessage({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
}