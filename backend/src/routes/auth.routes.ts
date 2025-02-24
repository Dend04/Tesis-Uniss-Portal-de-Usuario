import { Router } from 'express';
import { 
  loginController,
} from '../controllers/auth.controllers';

const router = Router();

// Ruta de login
router.post('/login', loginController);


export default router;