// @ts-ignore: Ignorar errores de tipo para ldapjs
import ldap from 'ldapjs';
import { Request, Response } from 'express';

type LDAPClient = any; // Usamos 'any' como tipo temporal

export const createLDAPClient = (url: string): LDAPClient => {
  return ldap.createClient({ url });
};

export const bindAsync = (
  client: LDAPClient,
  username: string,
  password: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    client.bind(username, password, (err: any) => { // Usar 'any' para los parámetros
      err ? reject(err) : resolve();
    });
  });
};

export const authenticateUser = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  
  if (!process.env.LDAP_URL) {
    return res.status(500).json({
      success: false,
      message: 'Configuración LDAP no disponible'
    });
  }

  const client = createLDAPClient(process.env.LDAP_URL);

  try {
    const userPrincipalName = username.includes('@') 
      ? username 
      : `${username}@uniss.edu.cu`;

    await bindAsync(client, userPrincipalName, password);
    
    res.json({
      success: true,
      message: 'Autenticación exitosa',
      user: {
        username,
        domain: 'uniss.edu.cu'
      }
    });
    
  } catch (error: unknown) {
    const message = error instanceof Error 
      ? error.message 
      : 'Error desconocido en autenticación LDAP';
    
    console.error('Error LDAP:', message);
    res.status(401).json({
      success: false,
      message: message
    });
    
  } finally {
    client.unbind();
  }
};