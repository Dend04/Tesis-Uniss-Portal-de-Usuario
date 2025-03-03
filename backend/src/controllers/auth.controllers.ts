// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { 
  authenticateUser,
  createLDAPClient,
  bindAsync,
  ldapChangePassword
} from '../utils/ldap.utils'; // Agregar las importaciones faltantes
import { generateTokens, verifyToken } from '../utils/jwt.utils';

export const loginController = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    // Autenticar contra LDAP
    await authenticateUser(req, res);
    
    // Si la autenticación fue exitosa, generar tokens
    const tokens = generateTokens({ username });
    
    res.json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { username }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

export const changePasswordController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { oldPassword, newPassword } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({ success: false, message: 'Token no proporcionado' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    const client = createLDAPClient(process.env.LDAP_URL!);
    
    try {
      await bindAsync(client, decoded.username, oldPassword);
      await ldapChangePassword(client, decoded.username, newPassword);
      
      const newTokens = generateTokens({ username: decoded.username });
      
      res.json({
        success: true,
        message: 'Contraseña actualizada exitosamente',
        tokens: newTokens
      });
      
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al cambiar contraseña'
      });
    } finally {
      client.unbind();
    }
    
  } catch (error) {
    console.error('Error en cambio de contraseña:', error);
    res.status(401).json({
      success: false,
      message: 'Token inválido o expirado'
    });
  }
};