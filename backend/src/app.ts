import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import studentRoutes from './routes/student.routes';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger/swagger';
import logger from './utils/logger';
import deviceRoutes from './routes/dispositivos.routes';
import ldap from './routes/ldap.routes';
import users from './routes/user.routes';
import { fetchStructureData } from './utils/ldap.data';
import studentAccountRoutes from './routes/student-account.routes';
import workerAccountRoutes from './routes/worker-account.routes';
import accountRemoval from './routes/account-removal.routes';
import identity from './routes/identity.routes';
import email from './routes/email.routes';
import usernameOptions from './routes/username-options.routes';
import { getLDAPPool } from './utils/ldap.utils'; // Importar el pool de conexiones
import { SigenuService } from './services/sigenu.services';
import passwordRoutes from "./routes/password.routes";
import dualVerificationRoutes from './routes/dual-verification.routes';
import logRoutes from "./routes/log.routes";
import './jobs/passwordExpiryCron';
import twoFARouter from './routes/2fa.routes';
import pinRoutes from "./routes/pin.routes";
import guestUserRoutes from "./routes/inviteAccount.routes";
import usersRoutes from "./routes/users.routes";
import forgotPassword2FARoutes from './routes/forgotPassword2FA.routes';
import forgotPassword2FATop from './routes/totp-verification.routes';
import portalRoutes from './routes/portal.routes';
import updateAccount from './routes/updateAccount.routes'
import groupRoutes from './routes/groups.route';


// Cargar variables de entorno desde el archivo .env
dotenv.config();

// Inicialización de la aplicación Express
const app = express();
const PORT = process.env.PORT || 3000; // Puerto por defecto 3000 si no está configurado

// Middleware de CORS para permitir solicitudes desde el frontend
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

// Middleware de seguridad Helmet para proteger la aplicación de vulnerabilidades web comunes
app.use(helmet());

// Middleware para parsear cuerpos de solicitud en formato JSON
app.use(express.json());

// Middleware de logging para registrar todas las solicitudes HTTP
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.http(`[${req.method}] ${req.originalUrl}`);
  next();
});

// Middleware de timeout para evitar que las solicitudes se queden colgadas
app.use((req: Request, res: Response, next: NextFunction) => {
  req.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(503).json({
        error: 'Timeout',
        message: 'La solicitud ha excedido el tiempo máximo de espera'
      });
    }
  });
  next();
});

// Configuración de la documentación API con Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Configuración de rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api', studentRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api', ldap);
app.use('/api/users', users);
app.use('/api/students', studentAccountRoutes);
app.use('/api/worker', workerAccountRoutes);
app.use('/api/removal', accountRemoval);
app.use('/api/identity', identity);
app.use('/api/email', email);
app.use('/api/usernameOptions', usernameOptions);
app.use("/api/password", passwordRoutes);
app.use('/api/verify', dualVerificationRoutes);
app.use("/api/log",logRoutes);
app.use('/api/2fa', twoFARouter);
app.use("/api/pin", pinRoutes);
app.use('/api', guestUserRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/2fa', forgotPassword2FARoutes);
app.use('/api/2fa', forgotPassword2FATop);
app.use('/api/portal', portalRoutes);
app.use('/api/updateAccount', updateAccount);
app.use('/api/groups', groupRoutes);

// Endpoint de health check para verificar que el servidor está funcionando
app.get('/health', (_: Request, res: Response) => {
  res.send('✅ Servidor activo');
});

// Middleware para manejar rutas no encontradas (404)
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta ${req.originalUrl} no existe en este servidor`
  });
});

// Middleware de manejo de errores global (DEBE ser el último middleware)
const errorHandler: ErrorRequestHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error global: ${err.stack}`);
  
  // Manejar errores de conexión LDAP específicamente
  if (err.message.includes('ECONNRESET') || 
      err.message.includes('LDAP') || 
      err.message.includes('Connection') ||
      err.name === 'LDAPConnectionError') {
    res.status(503).json({
      error: 'Servicio de directorio temporalmente no disponible',
      code: 'LDAP_CONNECTION_ERROR',
      message: 'Por favor, intente nuevamente en unos momentos'
    });
    return;
  }
  
  // Manejar errores de validación
  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: 'Datos de entrada inválidos',
      details: err.message
    });
    return;
  }
  
  // Manejar errores de autenticación/autorización
  if (err.name === 'UnauthorizedError') {
    res.status(401).json({
      error: 'No autorizado',
      message: err.message
    });
    return;
  }
  
  // Error por defecto (no exponer detalles en producción)
  res.status(500).json({ 
    error: 'Error interno del servidor',
    // Solo incluir detalles en desarrollo
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
};

app.use(errorHandler);

// Precargar caché al iniciar
SigenuService.preloadCareerCache()
  .then(() => {
    console.log('Caché de carreras precargada exitosamente.');
  })
  .catch((error) => {
    console.error('Error precargando caché de carreras:', error);
  });

// Manejadores para el cierre graceful de la aplicación
process.on('SIGINT', () => {
  console.log('Recibido SIGINT. Cerrando servidor y pool LDAP...');
  const pool = getLDAPPool();
  pool.closeAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Recibido SIGTERM. Cerrando servidor y pool LDAP...');
  const pool = getLDAPPool();
  pool.closeAll();
  process.exit(0);
});

// Iniciar el servidor
app.listen(PORT, async () => {
  try {
    // Precargar datos de estructura LDAP en caché al iniciar la aplicación
    logger.info('⏳ Precargando datos de estructura LDAP...');
    await fetchStructureData();
    logger.info('✅ Datos precargados en caché correctamente');
  } catch (error) {
    logger.warn('⚠️ Error al precargar datos, se cargarán bajo demanda');
    if (error instanceof Error) {
      logger.warn(`Detalles: ${error.message}`);
    }
  }
  logger.info(`🚀 Servidor en http://localhost:${PORT}`);
  logger.info(`📄 Docs: http://localhost:${PORT}/api-docs`);
});