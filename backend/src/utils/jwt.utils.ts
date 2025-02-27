import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { Request } from 'express';
import dotenv from 'dotenv';

dotenv.config();

// Configuración mejor tipada
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
    algorithms: ['HS256'] as const
  } as VerifyOptions
};

// Función de generación de tokens corregida
export const generateTokens = (username: string) => {
  const accessToken = jwt.sign(
    { username },
    JWT_CONFIG.secret,
    JWT_CONFIG.signOptions
  );

  const refreshToken = jwt.sign(
    { username },
    JWT_CONFIG.refreshSecret,
    JWT_CONFIG.refreshOptions
  );

  return { accessToken, refreshToken };
};

// Función de verificación mejorada
export const verifyToken = (req: Request) => {
  const token = req.headers.authorization?.split(' ')[1] || '';
  try {
    return jwt.verify(
      token, 
      JWT_CONFIG.secret, 
      JWT_CONFIG.verifyOptions
    ) as { username: string };
  } catch (error) {
    throw new Error('Token inválido o expirado');
  }
};