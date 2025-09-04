// src/routes/username-options.routes.ts
import { Router } from 'express';
import { UsernameOptionsController } from '../controllers/username-options.controller';

const router = Router();

router.get('/:userType/:ci/options', UsernameOptionsController.getUsernameOptions);
router.post('/check', UsernameOptionsController.checkUsername);

export default router;