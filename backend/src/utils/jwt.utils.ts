// src/utils/jwt.utils.ts
import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

dotenv.config();

export interface TokenPayload {
  username: string;
}

const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'default_secret',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
  signOptions: {
    expiresIn: '1h',
    algorithm: 'HS256'
  } as SignOptions,
  refreshOptions: {
    expiresIn: '7d',
    algorithm: 'HS256'
  } as SignOptions,
  verifyOptions: {
    algorithms: ['HS256']
  } as VerifyOptions
};

// Función principal de verificación (sin cambios)
export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(
      token,
      JWT_CONFIG.secret,
      JWT_CONFIG.verifyOptions
    ) as TokenPayload;
  } catch (error) {
    throw new Error('Token inválido o expirado');
  }
};

// Middleware corregido usando verifyToken
export const verifyTokenMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ message: 'Token no proporcionado' });
      return;
    }

    // Usamos la función verifyToken existente
    const decoded = verifyToken(token);
    
    // Extender el tipo Request
    (req as any).user = decoded;
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

// Generación de tokens (sin cambios)
export const generateTokens = (payload: TokenPayload) => {
  const accessToken = jwt.sign(
    payload,
    JWT_CONFIG.secret,
    JWT_CONFIG.signOptions
  );

  const refreshToken = jwt.sign(
    payload,
    JWT_CONFIG.refreshSecret,
    JWT_CONFIG.refreshOptions
  );

  return { accessToken, refreshToken };
};