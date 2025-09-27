// src/routes/dual-verification.routes.ts
import { Router } from 'express';
import { verifyDualStatus } from '../controllers/dual-verification.controller';

const router = Router();

router.post('/dual-status', verifyDualStatus);

export default router;