import { Router } from 'express';
import { 
  loginController,
  changePasswordController
} from '../controllers/auth.controllers';

const router = Router();

router.post('/login', loginController);
router.post('/change-password', changePasswordController);

export default router;