// src/app.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

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

// Routes
app.use('/api/auth', authRoutes);

// Health Check
app.get('/health', (_: Request, res: Response) => {
  res.send('✅ Servidor activo');
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor en http://localhost:${PORT}`);
});