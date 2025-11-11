// src/routes/users.routes.ts
import { Router } from 'express';
import { getUserAuditLogs, getUserAuditLogsAdmin, getUserDetails, getUserProfile, searchUsers } from '../controllers/user.controllers';
import { verifyTokenMiddleware } from '../middlewares/auth.middleware';


const router = Router();

// GET /api/users/search?searchTerm=<valor>
router.post('/search', searchUsers);
router.post('/details', getUserDetails);
router.get('/profile', verifyTokenMiddleware, getUserProfile);
router.get('/logs', verifyTokenMiddleware, getUserAuditLogs); // ✅ Sin parámetro username// Alternativa por parámetro
// Ruta para administradores
router.get('/admin/user/:username/logs', verifyTokenMiddleware, getUserAuditLogsAdmin);
export default router;