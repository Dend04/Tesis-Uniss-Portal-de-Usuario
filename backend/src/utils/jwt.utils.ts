import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export interface TokenPayload {
  sAMAccountName: string;
  username: string;
  employeeID: string;
  nombreCompleto?: string;
  email?: string;
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

// Función pura de verificación de token
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

// Función pura de generación de tokens
export const generateTokens = (payload: TokenPayload) => {
  const accessToken = jwt.sign(
    payload,
    JWT_CONFIG.secret,
    JWT_CONFIG.signOptions
  );

  const refreshToken = jwt.sign(
    {
      // Para el refresh token, incluir solo los campos esenciales
      username: payload.username,
      employeeID: payload.employeeID,
      sAMAccountName: payload.sAMAccountName
    },
    JWT_CONFIG.refreshSecret,
    JWT_CONFIG.refreshOptions
  );

  return { accessToken, refreshToken };
};

// Función para verificar refresh token (opcional, pero recomendado)
export const verifyRefreshToken = (token: string): { username: string; employeeID: string; sAMAccountName: string } => {
  try {
    return jwt.verify(
      token,
      JWT_CONFIG.refreshSecret,
      JWT_CONFIG.verifyOptions
    ) as { username: string; employeeID: string; sAMAccountName: string };
  } catch (error) {
    throw new Error('Refresh token inválido o expirado');
  }
};

// Función para renovar tokens (opcional, pero útil)
export const refreshTokens = (refreshToken: string): { accessToken: string; refreshToken: string } => {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    
    // Aquí podrías validar contra la base de datos si el usuario aún existe
    // y obtener datos actualizados si es necesario
    
    const newPayload: TokenPayload = {
      sAMAccountName: decoded.sAMAccountName,
      username: decoded.username,
      employeeID: decoded.employeeID,
      // Nota: nombreCompleto y email no están en el refresh token
      // Podrías obtenerlos de la base de datos si son necesarios
    };

    return generateTokens(newPayload);
  } catch (error) {
    throw new Error('No se pudo renovar el token');
  }
};