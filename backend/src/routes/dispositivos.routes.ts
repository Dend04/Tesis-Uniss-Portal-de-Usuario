// src/routes/dispositivosRoutes.ts
import { Router } from 'express';
import { dispositivoController } from '../controllers/dispositivo.controller';


const router = Router();

// GET /api/devices/manufacturer/:mac
router.get('/mac/:mac/fabricante', dispositivoController.getDeviceManufacturer);

export default router;