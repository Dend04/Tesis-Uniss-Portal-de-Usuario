// src/routes/auth.routes.ts
import { Router } from 'express';
import { changePasswordController, getUserController, getUserProfileController, loginController } from '../controllers/auth.controllers';
import { verifyTokenMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/login', loginController);
router.post('/change-password', verifyTokenMiddleware, changePasswordController);
router.get(
    '/profile',
    verifyTokenMiddleware,
    getUserProfileController
  );
  router.get('/user', verifyTokenMiddleware, getUserController);


export default router;