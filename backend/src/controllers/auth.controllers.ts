import { Request, Response } from 'express';
import { createLDAPClient, ldapAuth } from '../utils/ldap.utils';
import { generateTokens, verifyToken } from '../utils/jwt.utils';
import User from '../models/User';

// Interface para el payload del token
interface TokenPayload {
  username: string;
}

export const loginController = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    // Autenticar con LDAP
    const client = createLDAPClient();
    await ldapAuth(client, username, password);
    
    // Obtener usuario de MongoDB
    const user = await User.findOne({ username });
    if (!user) {
      throw new Error('Usuario no encontrado en la base de datos');
    }

    // Generar tokens JWT
    const tokens = generateTokens({ username });
    
    res.json({
      success: true,
      user: {
        username: user.username,
        institutionalEmail: user.institutionalEmail
      },
      ...tokens
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error de autenticación'
    });
  } 
};

export const changePasswordController = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Verificar token JWT
    const decoded = verifyToken(req.headers.authorization || '') as TokenPayload;
    
    // Obtener usuario
    const user = await User.findOne({ username: decoded.username });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Validar contraseña actual con LDAP
    const client = createLDAPClient();
    await ldapAuth(client, decoded.username, currentPassword);

    // Sincronizar nueva contraseña
    await user.syncPassword(newPassword);

    // Generar nuevos tokens
    const tokens = generateTokens({ username: decoded.username });
    
    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
      ...tokens
    });

  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error al cambiar contraseña'
    });
  }
};