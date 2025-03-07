// src/routes/auth.routes.ts
import { Router } from 'express';
import { verifyTokenMiddleware } from '../utils/jwt.utils';
import { changePasswordController, getUserProfileController, loginController } from '../controllers/auth.controllers';

const router = Router();

router.post('/login', loginController);
router.post('/change-password', verifyTokenMiddleware, changePasswordController);
router.get(
    '/profile',
    verifyTokenMiddleware,
    getUserProfileController
  );

export default router;