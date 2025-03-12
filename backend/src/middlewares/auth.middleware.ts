import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.utils';
import { TokenPayload } from '../utils/jwt.utils';

export const verifyTokenMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new Error("Token no proporcionado");

    const decoded = verifyToken(token);
    // Guardar identificador LDAP real en req.user
    (req as any).user = { 
      sAMAccountName: decoded.username // username ahora es sAMAccountName
    };
    
    next();
  } catch (error) {
    res.status(401).json({ message: "Token inválido" });
  }
};