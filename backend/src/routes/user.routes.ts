// src/routes/users.routes.ts
import { Router } from 'express';
import { getUserDetails, getUserProfile, searchUsers } from '../controllers/users.controllers';
import { verifyTokenMiddleware } from '../middlewares/auth.middleware';


const router = Router();

// GET /api/users/search?searchTerm=<valor>
router.post('/search', searchUsers);
router.post('/details', getUserDetails);
router.get('/profile', verifyTokenMiddleware, getUserProfile);


export default router;