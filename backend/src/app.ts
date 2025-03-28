// src/app.ts
import dotenv from 'dotenv';
import express, { NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import { Request, Response } from 'express';
import studentRoutes from './routes/student.routes';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger/swagger';
import logger from './utils/logger';
import { createLDAPClient } from './utils/ldap.utils';
/* import connectDB from './config/db'; */
/* import setupSyncSchedule from './sincronizacion/sync.schedule'; */
import deviceRoutes from './routes/dispositivos.routes';
import ldap from './routes/ldap.routes';
import users from './routes/user.routes';
import { SigenuService } from './services/sigenu.services'

dotenv.config();

// Inicialización
const app = express();
/* connectDB(); */
/* setupSyncSchedule(); */
const PORT = process.env.PORT;

// Función de verificación LDAP
/* const checkLDAPConnection = async (): Promise<boolean> => {
  if (!process.env.LDAP_URL || !process.env.LDAP_BASE_DN) {
    logger.warn('⚠️ LDAP no configurado - Variables de entorno faltantes');
    return false;
  }

  const client = createLDAPClient();
  let connectionEstablished = false;

  try {
    // Verificación mediante bind con cuenta de sistema
    await new Promise<void>((resolve, reject) => {
      client.bind(
        process.env.LDAP_ADMIN_USER!, // Usuario con permisos de lectura
        process.env.LDAP_ADMIN_PASSWORD!,
        (err) => err ? reject(err) : resolve()
      );
    });

    // Búsqueda de prueba con filtro obligatorio
    await new Promise<void>((resolve, reject) => {
      client.search(
        process.env.LDAP_BASE_DN!,
        {
          scope: 'base',
          filter: '(objectClass=*)', // Filtro requerido
          attributes: ['namingContexts'] // Atributo mínimo para prueba
        },
        (err) => err ? reject(err) : resolve()
      );
    });

    logger.info('✅ Conexión LDAP establecida correctamente');
    connectionEstablished = true;
  } catch (error) {
    logger.error(`❌ Fallo en conexión LDAP: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  } finally {
    client.unbind();
  }

  return connectionEstablished;
}; */

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

// Middleware de logging de requests
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.http(`[${req.method}] ${req.originalUrl}`);
  next();
});

// En el manejador de errores
app.use((
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(`Error: ${err.stack}`);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.use(helmet());
app.use(express.json());

// Manejador de errores
app.use((
  err: Error,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Documentación API
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', studentRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api', ldap)
app.use('/api', users)

// Health Check
app.get('/health', (_: Request, res: Response) => {
  res.send('✅ Servidor activo');
});

app.listen(PORT, async () => {
  /* const ldapStatus = await checkLDAPConnection(); */
  /* app.locals.ldapAvailable = ldapStatus; */

  await SigenuService.getNationalCareers();

  logger.info(`🚀 Servidor en http://localhost:${PORT}`);
  logger.info(`📄 Docs: http://localhost:${PORT}/api-docs`);
  
  /* if (!ldapStatus) {
    logger.warn('🔓 Modo de operación alternativo activado (sin LDAP)');
    logger.warn('⚠️ La autenticación se realizará localmente');
  } */
});