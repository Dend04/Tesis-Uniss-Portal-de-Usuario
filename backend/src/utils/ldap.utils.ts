// src/utils/ldap.utils.ts
import ldap, { Client, ClientOptions } from "ldapjs";
import { Request, Response } from "express";

export type LDAPClient = ldap.Client;

export const createLDAPClient = (url: string): LDAPClient => {
  const clientOptions: ClientOptions = {
    url,
    tlsOptions: {
      rejectUnauthorized: false, // Solo para desarrollo
    },
    connectTimeout: 10000, // 10 segundos
    timeout: 30000, // 30 segundos
  };

  const client = ldap.createClient(clientOptions);

  // Manejador de reconexión manual
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 3;

  client.on("close", () => {
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      console.log(
        `Intento de reconexión ${reconnectAttempts}/${maxReconnectAttempts}`
      );

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
  username: string,
  newPassword: string
): Promise<void> => {
  if (
    !process.env.LDAP_URL ||
    !process.env.LDAP_ADMIN_DN ||
    !process.env.LDAP_ADMIN_PASSWORD
  ) {
    throw new Error("Configuración LDAP incompleta");
  }

  const client = createLDAPClient(process.env.LDAP_URL);

  try {
    // Autenticación como admin
    await bindAsync(
      client,
      process.env.LDAP_ADMIN_DN,
      process.env.LDAP_ADMIN_PASSWORD
    );

    const userDN = `uid=${username},ou=users,dc=uniss,dc=edu,dc=cu`;

    // Codificación correcta para Active Directory
    const encodedPassword = Buffer.from(`"${newPassword}"`, "utf16le");

    const modification = new ldap.Attribute({
      type: "userPassword",
      values: [newPassword], // Sin buffers
    });

    const change = new ldap.Change({
      operation: "replace",
      modification: modification,
    });

    await new Promise<void>((resolve, reject) => {
      client.modify(userDN, change, (err: Error | null) => {
        err ? reject(new Error(`Error LDAP: ${err.message}`)) : resolve();
      });
    });
  } finally {
    client.unbind();
  }
};

export const authenticateUser = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!process.env.LDAP_URL) {
    throw new Error("Configuración LDAP no disponible");
  }

  const client = createLDAPClient(process.env.LDAP_URL);

  try {
    const userPrincipalName = username.includes("@")
      ? username
      : `${username}@uniss.edu.cu`;

    await bindAsync(client, userPrincipalName, password);
  } finally {
    client.unbind();
  }
};

export const addLogEntry = async (
  username: string,
  action: string,
  details: string
): Promise<void> => {
  if (
    !process.env.LDAP_URL ||
    !process.env.LDAP_ADMIN_DN ||
    !process.env.LDAP_ADMIN_PASSWORD
  ) {
    throw new Error("Configuración LDAP incompleta");
  }

  const client = createLDAPClient(process.env.LDAP_URL);

  try {
    await bindAsync(
      client,
      process.env.LDAP_ADMIN_DN,
      process.env.LDAP_ADMIN_PASSWORD
    );

    const logEntry = {
      cn: `${username}-${Date.now()}`,
      objectClass: "logEntry",
      action: action,
      timestamp: new Date().toISOString(),
      userDN: `uid=${username},ou=users,dc=uniss,dc=edu,dc=cu`,
      details: details,
    };

    const logDN = `cn=${logEntry.cn},ou=logs,dc=uniss,dc=edu,dc=cu`;

    await new Promise<void>((resolve, reject) => {
      // Ahora TypeScript reconocerá el método add
      client.add(logDN, logEntry, (err: Error | null) => {
        if (err) {
          console.error("Error escribiendo log:", err);
          reject(err);
          return;
        }
        resolve();
      });
    });
  } finally {
    client.unbind();
  }
};

// Corregir la función searchAsync
export const searchAsync = (
  client: LDAPClient,
  base: string,
  options: ldap.SearchOptions
): Promise<ldap.SearchEntry[]> => {
  return new Promise((resolve, reject) => {
    const entries: ldap.SearchEntry[] = [];
    client.search(base, options, (err, res) => {
      if (err) return reject(err);

      res.on("searchEntry", (entry) => entries.push(entry));
      res.on("error" as any, (err) => reject(err));
      res.on("end", (result) => {
        if (!result) {
          return reject(new Error("LDAP search failed: No result received"));
        }

        result.status === 0
          ? resolve(entries)
          : reject(new Error(`LDAP search failed: Status ${result.status}`));
      });
    });
  });
};
