// backend/routes/groupRoutes.ts
import { Router } from 'express';
import { checkUserMembership, cleanup, getAllGroups, getGroupDetails, getUserAllGroups, getUserGroups, searchGroups, updateUserGroups } from '../controllers/group.controller';


const router = Router();

// Obtener todos los grupos (con paginación y búsqueda)
router.get('/', getAllGroups);

// Buscar grupos
router.get('/search', searchGroups);

// Obtener detalles de un grupo específico
router.get('/:groupDN', getGroupDetails);

// Obtener grupos de un usuario
router.get('/user/:username', getUserGroups);

// Obtener todos los grupos (directos y anidados) de un usuario
router.get('/user/:username/all', getUserAllGroups);

// Verificar si un usuario pertenece a un grupo específico
router.get('/user/:username/membership/:groupDN', checkUserMembership);

// Actualizar grupos de un usuario
router.post('/user/:username', updateUserGroups);

// Limpieza de recursos (admin)
router.delete('/cleanup', cleanup);

export default router;