// src/routes/identity.routes.ts
import { Router } from 'express';
import { verifyCI } from '../controllers/identity-verification.controller';

const router = Router();

/**
 * @route POST /verify
 * @desc Verificar identidad por CI
 * @access Public
 * @param {string} ci - Carnet de identidad
 * @returns {object} - Objeto con tipo de usuario y datos
 */
router.post('/verify', verifyCI);

export default router;
