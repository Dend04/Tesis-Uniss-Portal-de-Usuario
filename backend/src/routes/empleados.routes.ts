import { Router } from 'express';
import {
  buscarPorCI,
  buscarPorNombreCompleto,
  buscarPorCCosto,
  obtenerBajas,
  buscarPorCiudad,
} from '../controllers/worker.controller';

const router = Router();

// Rutas
router.get('/ci/:no_ci', buscarPorCI);
router.get('/nombre', buscarPorNombreCompleto);
router.get('/ccosto/:id_ccosto', buscarPorCCosto);
router.get('/bajas', obtenerBajas);
router.get('/ciudad/:ciudad', buscarPorCiudad);

export default router;