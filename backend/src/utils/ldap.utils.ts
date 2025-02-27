import ldap from 'ldapjs';
import dotenv from 'dotenv';

dotenv.config();

type LDAPClient = any;

// Configuración básica LDAP
export const createLDAPClient = (): LDAPClient => {
  return ldap.createClient({ 
    url: process.env.LDAP_URL || 'ldap://10.16.1.2'
  });
};

// Autenticación LDAP
export const ldapAuth = async (client: LDAPClient, username: string, password: string): Promise<void> => {
  const userPrincipalName = username.includes('@') 
    ? username 
    : `${username}@uniss.edu.cu`;

  return new Promise((resolve, reject) => {
    client.bind(userPrincipalName, password, (err: any) => {
      err ? reject(err) : resolve();
    });
  });
};

// Cambio de contraseña LDAP
export const ldapChangePassword = async (client: LDAPClient, username: string, newPassword: string): Promise<void> => {
  const userDN = `CN=${username},OU=Users,DC=uniss,DC=edu,DC=cu`;
  const encodedPassword = Buffer.from(`"${newPassword}"`, 'utf16le');

  return new Promise((resolve, reject) => {
    const change = new ldap.Change({
      operation: 'replace',
      modification: {
        unicodePwd: encodedPassword
      }
    });

    client.modify(userDN, [change], (err: any) => {
      err ? reject(err) : resolve();
    });
  });
};