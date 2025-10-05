import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// ✅ INTERFAZ ACTUALIZADA CON CAMPO title
export interface TokenPayload {
  sAMAccountName: string;
  username: string;
  employeeID: string;
  displayName?: string;
  email?: string;
  title?: string; // ✅ NUEVO CAMPO AGREGADO
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

// ✅ FUNCIÓN ACTUALIZADA - INCLUYE title EN LOS TOKENS
export const generateTokens = (payload: TokenPayload) => {
  const accessToken = jwt.sign(
    payload, // ✅ Ahora incluye el campo title
    JWT_CONFIG.secret,
    JWT_CONFIG.signOptions
  );

  const refreshToken = jwt.sign(
    {
      // Para el refresh token, incluir campos esenciales + title
      username: payload.username,
      employeeID: payload.employeeID,
      sAMAccountName: payload.sAMAccountName,
      title: payload.title // ✅ AGREGAR title AL REFRESH TOKEN
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
  title?: string; // ✅ AGREGAR title
}

// ✅ FUNCIÓN ACTUALIZADA - VERIFICAR REFRESH TOKEN CON title
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

// ✅ FUNCIÓN ACTUALIZADA - RENOVAR TOKENS MANTENIENDO title
export const refreshTokens = (refreshToken: string): { accessToken: string; refreshToken: string } => {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    
    // Crear nuevo payload con todos los datos, incluyendo title
    const newPayload: TokenPayload = {
      sAMAccountName: decoded.sAMAccountName,
      username: decoded.username,
      employeeID: decoded.employeeID,
      title: decoded.title // ✅ MANTENER EL title EN LA RENOVACIÓN
    };

    return generateTokens(newPayload);
  } catch (error) {
    throw new Error('No se pudo renovar el token');
  }
};