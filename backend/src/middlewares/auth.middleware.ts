import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.utils';
import { TokenPayload } from '../utils/jwt.utils';

export const verifyTokenMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): any => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ message: "Token no proporcionado" });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Formato de autorización incorrecto. Debe ser: Bearer <token>" });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: "Token no proporcionado" });
    }


    const decoded = verifyToken(token) as TokenPayload;
    
    (req as any).user = decoded;

    console.log("=== MIDDLEWARE PASÓ ===");
    next();
    
  } catch (error: any) { 
    if (error.message === 'Token inválido o expirado') {
      return res.status(401).json({ message: "Token inválido o expirado" });
    }
    
    res.status(401).json({ message: "Error de autenticación" });
  }
};