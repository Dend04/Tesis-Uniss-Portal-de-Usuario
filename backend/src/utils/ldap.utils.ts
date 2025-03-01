import ldap from 'ldapjs';
import dotenv from 'dotenv';
import { RateLimiterMemory } from 'rate-limiter-flexible';

dotenv.config();

// Configuración de límite de intentos de autenticación
const rateLimiter = new RateLimiterMemory({
  points: 5, // 5 intentos
  duration: 300, // en 5 minutos
});

// Tipo seguro para el cliente LDAP
type SecureLDAPClient = ldap.Client;

export const createLDAPClient = (): SecureLDAPClient => {
  // Validación de variables de entorno
  const requiredVars = ['LDAP_URL', 'LDAP_BASE_DN'];
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      throw new Error(`${varName} no está definido en las variables de entorno`);
    }
  });

  // Configuración segura de TLS
  const client = ldap.createClient({
    url: process.env.LDAP_URL!,
    tlsOptions: {
      rejectUnauthorized: true, // Validación estricta de certificados
      minVersion: 'TLSv1.2' // Versión mínima segura de TLS
    },
    connectTimeout: 5000, // Timeout de conexión de 5 segundos
    timeout: 10000 // Timeout de operaciones de 10 segundos
  });

  // Manejadores de errores globales
  client.on('error', (err) => {
    // Solo registrar errores de conexión activa
    if (['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'].includes(err.code)) {
      console.error('Error de conexión LDAP:', err.message);
      client.unbind(); // Cierra la conexión inmediatamente
    }
  });

  return client;
};

export const ldapAuth = async (
  client: SecureLDAPClient,
  username: string,
  password: string
): Promise<void> => {
  try {
    // Validación de entrada
    if (!username || !password) {
      throw new Error('Credenciales inválidas');
    }

    // Sanitización de entrada
    const sanitizedUsername = username.replace(/[^a-zA-Z0-9@._-]/g, '');
    
    // Verificación de tasa de intentos
    await rateLimiter.consume(sanitizedUsername);

    const userPrincipalName = sanitizedUsername.includes('@') 
      ? sanitizedUsername 
      : `${sanitizedUsername}@uniss.edu.cu`;

    return new Promise((resolve, reject) => {
      client.bind(userPrincipalName, password, (err) => {
        if (err) {
          // Error genérico para evitar leaks de información
          reject(new Error('Autenticación fallida'));
          return;
        }
        
        // Autenticación exitosa
        resolve();
      });
    });
  } catch (err) {
    // Limpieza segura de contraseña en memoria
    password = ''; 
    throw err;
  } finally {
    // Siempre cerrar conexión después de autenticar
    client.unbind();
  }
};

export const ldapChangePassword = async (
  client: SecureLDAPClient,
  username: string,
  newPassword: string
): Promise<void> => {
  try {
    // Validación de fortaleza de contraseña
    if (newPassword.length < 12) {
      throw new Error('La contraseña debe tener al menos 12 caracteres');
    }

    // Construcción segura del DN
    const sanitizedUsername = username.replace(/[^a-zA-Z0-9]/g, '');
    const userDN = `CN=${sanitizedUsername},${process.env.LDAP_BASE_DN}`;

    // Codificación correcta según especificación LDAP
    const encodedPassword = Buffer.from(`"${newPassword}"`, 'utf16le');

    return new Promise((resolve, reject) => {
      const change = new ldap.Change({
        operation: 'replace',
        modification: {
          unicodePwd: encodedPassword
        }
      });

      // Timeout para operación
      const timeout = setTimeout(() => {
        reject(new Error('Timeout al cambiar contraseña'));
        client.unbind();
      }, 10000);

      client.modify(userDN, [change], (err) => {
        clearTimeout(timeout);
        if (err) {
          // Log seguro sin detalles sensibles
          console.error('Error al cambiar contraseña');
          reject(new Error('No se pudo actualizar la contraseña'));
          return;
        }
        resolve();
      });
    });
  } finally {
    // Limpieza de contraseña en memoria
    newPassword = '';
    client.unbind();
  }
};