import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// ✅ INTERFAZ ACTUALIZADA CON dn Y SIN email
export interface TokenPayload {
  sAMAccountName: string;
  username: string;
  employeeID: string;
  displayName?: string;
  title?: string;
  dn: string; // ✅ NUEVO CAMPO - Distinguished Name
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

// ✅ FUNCIÓN ACTUALIZADA - INCLUYE dn Y SIN email
export const generateTokens = (payload: TokenPayload) => {
  const accessToken = jwt.sign(
    payload,
    JWT_CONFIG.secret,
    JWT_CONFIG.signOptions
  );

  const refreshToken = jwt.sign(
    {
      username: payload.username,
      employeeID: payload.employeeID,
      sAMAccountName: payload.sAMAccountName,
      title: payload.title,
      dn: payload.dn // ✅ AGREGAR dn AL REFRESH TOKEN
    },
    JWT_CONFIG.refreshSecret,
    JWT_CONFIG.refreshOptions
  );

  return { accessToken, refreshToken };
};

// ✅ INTERFAZ ACTUALIZADA PARA REFRESH TOKEN
export interface RefreshTokenPayload {
  username: string;
  employeeID: string;
  sAMAccountName: string;
  title?: string;
  dn: string; // ✅ AGREGAR dn
}

// ✅ FUNCIÓN ACTUALIZADA - VERIFICAR REFRESH TOKEN CON dn
export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    return jwt.verify(
      token,
      JWT_CONFIG.refreshSecret,
      JWT_CONFIG.verifyOptions
    ) as RefreshTokenPayload;
  } catch (error) {
    throw new Error('Refresh token inválido o expirado');
  }
};

// ✅ FUNCIÓN ACTUALIZADA - RENOVAR TOKENS MANTENIENDO dn
export const refreshTokens = (refreshToken: string): { accessToken: string; refreshToken: string } => {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    
    // Crear nuevo payload con todos los datos, incluyendo dn
    const newPayload: TokenPayload = {
      sAMAccountName: decoded.sAMAccountName,
      username: decoded.username,
      employeeID: decoded.employeeID,
      title: decoded.title,
      dn: decoded.dn // ✅ MANTENER EL dn EN LA RENOVACIÓN
    };

    return generateTokens(newPayload);
  } catch (error) {
    throw new Error('No se pudo renovar el token');
  }
};