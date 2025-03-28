// src/routes/auth.routes.ts
import { Router } from 'express';
import { changePasswordController, loginController } from '../controllers/auth.controllers';
import { verifyTokenMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/login', loginController);
router.post('/change-password', verifyTokenMiddleware, changePasswordController);



export default router;