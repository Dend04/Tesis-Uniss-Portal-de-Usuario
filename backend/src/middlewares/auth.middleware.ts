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

    const decoded = verifyToken(token) as TokenPayload; // Tipar correctamente
    
    // Extraer sAMAccountName directamente del payload
    (req as any).user = {
      sAMAccountName: decoded.sAMAccountName // ← Campo correcto
    };

    console.log("Usuario autenticado:", (req as any).user); // Debug
    next();
  } catch (error) {
    console.error("Error en middleware:", error);
    res.status(401).json({ message: "Token inválido o expirado" });
  }
};