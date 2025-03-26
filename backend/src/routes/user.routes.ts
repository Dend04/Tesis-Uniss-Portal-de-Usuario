// src/routes/users.routes.ts
import { Router } from 'express';
import { searchUsers } from '../controllers/users.controllers';


const router = Router();

// GET /api/users/search?searchTerm=<valor>
router.post('/search', searchUsers);

export default router;