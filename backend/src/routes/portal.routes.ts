import { Router } from 'express';
import { logController } from '../controllers/logController';
import { notificacionController } from '../controllers/notificacionController';
import { dispositivoController } from '../controllers/dispositivo.controller';
import { verifyTokenMiddleware } from '../middlewares/auth.middleware';
// ✅ IMPORTAR MIDDLEWARE

const router = Router();

// ✅ APLICAR MIDDLEWARE DE AUTENTICACIÓN A TODAS LAS RUTAS DEL PORTAL
router.use(verifyTokenMiddleware);

// Rutas para Dispositivos (AHORA PROTEGIDAS)
router.post('/dispositivos', dispositivoController.create);
router.get('/dispositivos', dispositivoController.getAll);
router.get('/dispositivos/:id', dispositivoController.getById);
router.put('/dispositivos/:id', dispositivoController.update);
router.delete('/dispositivos/:id', dispositivoController.delete);
router.get('/mac/:mac/fabricante', dispositivoController.getDeviceManufacturer);

// Rutas para Logs (PROTEGIDAS)
router.post('/logs', logController.create);
router.get('/logs', logController.getAll);
router.get('/logs/usuario/:username', logController.getByUser);
router.get('/logs/estadisticas', logController.getStats);

// Rutas para Notificaciones (PROTEGIDAS)
router.post('/notificaciones', notificacionController.create);
router.get('/notificaciones', notificacionController.getAll);
router.get('/notificaciones/usuario/:username', notificacionController.getByUser);
router.patch('/notificaciones/:id/leer', notificacionController.markAsRead);
router.patch('/notificaciones/:username/leer-todas', notificacionController.markAllAsRead);
router.put('/notificaciones/:id', notificacionController.update);
router.delete('/notificaciones/:id', notificacionController.delete);

export default router;