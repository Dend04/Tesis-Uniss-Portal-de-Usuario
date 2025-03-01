import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { Request } from 'express';
import dotenv from 'dotenv';

dotenv.config();

interface TokenPayload {
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

//Recibir payload completo
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

// Recibir el token como string
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