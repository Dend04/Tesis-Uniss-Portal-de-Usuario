// src/utils/password.utils.ts
import bcrypt from 'bcrypt';
import { decode } from 'iconv-lite';

/**
 * Compara una contraseña en texto plano con una contraseña hasheada de LDAP
 * @param plainPassword Contraseña en texto plano
 * @param hashedPassword Contraseña hasheada de LDAP (en formato unicodePwd)
 * @returns Promise<boolean> True si la contraseña coincide
 */
export const comparePassword = async (plainPassword: string, hashedPassword: Buffer): Promise<boolean> => {
  try {
    // La contraseña en LDAP está codificada en UTF-16LE y entrecomillada
    const encodedPassword = Buffer.from(`"${plainPassword}"`, 'utf16le');
    
    // Comparación directa para contraseñas no hasheadas
    if (Buffer.compare(encodedPassword, hashedPassword) === 0) {
      return true;
    }
    
    // Si no coincide, puede estar hasheada con otro algoritmo
    // Intentamos con bcrypt (común en sistemas modernos)
    try {
      const passwordString = decode(hashedPassword, 'utf16le').replace(/"/g, '');
      return await bcrypt.compare(plainPassword, passwordString);
    } catch (bcryptError) {
      console.warn('No se pudo comparar con bcrypt:', bcryptError);
      return false;
    }
  } catch (error) {
    console.error('Error comparando contraseñas:', error);
    return false;
  }
};

/**
 * Detecta el tipo de hash utilizado en la contraseña
 * @param hashedPassword Contraseña hasheada
 * @returns String con el tipo de hash detectado
 */
export const detectHashType = (hashedPassword: Buffer): string => {
  const passwordStr = hashedPassword.toString();
  
  if (passwordStr.startsWith('$2a$') || passwordStr.startsWith('$2b$') || passwordStr.startsWith('$2y$')) {
    return 'bcrypt';
  }
  
  if (passwordStr.startsWith('$1$')) {
    return 'md5';
  }
  
  if (passwordStr.startsWith('$5$')) {
    return 'sha256';
  }
  
  if (passwordStr.startsWith('$6$')) {
    return 'sha512';
  }
  
  return 'unknown';
};