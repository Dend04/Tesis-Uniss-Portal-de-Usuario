// src/utils/ldap.utils.ts
import ldap, { Client, ClientOptions } from 'ldapjs';
import { Request, Response } from 'express';

type LDAPClient = ldap.Client;

export const createLDAPClient = (url: string): LDAPClient => {
  const clientOptions: ClientOptions = {
    url,
    tlsOptions: {
      rejectUnauthorized: false // Solo para desarrollo
    },
    connectTimeout: 10000, // 10 segundos
    timeout: 30000 // 30 segundos
  };

  const client = ldap.createClient(clientOptions);

  // Manejador de reconexión manual
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 3;

  client.on('close', () => {
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      console.log(`Intento de reconexión ${reconnectAttempts}/${maxReconnectAttempts}`);
        
      const newClient = createLDAPClient(url);
      replaceClient(client, newClient);
    }
  });

  return client;
};

// Función para reemplazar el cliente en uso
const replaceClient = (oldClient: LDAPClient, newClient: LDAPClient) => {
  oldClient.unbind();
  // Aquí deberías actualizar cualquier referencia al cliente antiguo
};

// Resto del código se mantiene igual
export const bindAsync = (
  client: LDAPClient,
  username: string,
  password: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    client.bind(username, password, (err) => {
      err ? reject(err) : resolve();
    });
  });
};

export const ldapChangePassword = async (
  client: LDAPClient,
  username: string,
  newPassword: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const userDN = `uid=${username},ou=users,dc=uniss,dc=edu,dc=cu`;

    // Codificación correcta para LDAP
    const encodedPassword = Buffer.from(`"${newPassword}"`, 'utf16le');

    const change = new ldap.Change({
      operation: 'replace',
      modification: {
        userPassword: encodedPassword
      }
    });

    client.modify(userDN, [change], (err) => {
      if (err) {
        reject(new Error(`Error LDAP: ${err.message}`));
        return;
      }
      resolve();
    });
  });
};

export const authenticateUser = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  
  if (!process.env.LDAP_URL) {
    throw new Error('Configuración LDAP no disponible');
  }

  const client = createLDAPClient(process.env.LDAP_URL);

  try {
    const userPrincipalName = username.includes('@') 
      ? username 
      : `${username}@uniss.edu.cu`;

    await bindAsync(client, userPrincipalName, password);
    
  } finally {
    client.unbind();
  }
};