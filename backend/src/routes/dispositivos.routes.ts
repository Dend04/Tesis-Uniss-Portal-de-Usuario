// src/routes/dispositivosRoutes.ts
import { Router } from 'express';
import { getDeviceManufacturer } from '../controllers/dispositivo.controller';

const router = Router();

// GET /api/devices/manufacturer/:mac
router.get('/manufacturer/:mac', getDeviceManufacturer);

export default router;