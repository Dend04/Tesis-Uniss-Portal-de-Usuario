// src/routes/users.routes.ts
import { Router } from 'express';
import { getUserDetails, searchUsers } from '../controllers/users.controllers';


const router = Router();

// GET /api/users/search?searchTerm=<valor>
router.post('/search', searchUsers);
router.post('/details', getUserDetails);

export default router;