import { Request, Response } from 'express';
import { 
  createLDAPClient, 
  ldapAuth,
  ldapChangePassword 
} from '../utils/ldap.utils';
import { 
  generateTokens, 
  verifyToken 
} from '../utils/jwt.utils';

export const loginController = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const client = createLDAPClient();

    await ldapAuth(client, username, password);
    const tokens = generateTokens(username);
    
    res.json({
      success: true,
      user: { username },
      ...tokens
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Credenciales inválidas'
    });
  } 
};

export const changePasswordController = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const decoded = verifyToken(req);
    const client = createLDAPClient();

    // Reautenticar para validar contraseña actual
    await ldapAuth(client, decoded.username, currentPassword);
    
    // Cambiar contraseña
    await ldapChangePassword(client, decoded.username, newPassword);
    
    // Generar nuevos tokens
    const tokens = generateTokens(decoded.username);
    
    res.json({
      success: true,
      message: 'Contraseña actualizada',
      ...tokens
    });

  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error al cambiar contraseña'
    });
  }
};