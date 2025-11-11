// src/routes/updateAccount.routes.ts
import { Router } from 'express';
import { getUserProfile, updateEmployeeID, updateUserEmail } from '../controllers/updateAccount.controller';


const router = Router();

router.put('/update-employee-id', updateEmployeeID);
router.put('/update-email', updateUserEmail);
router.get('/data', getUserProfile);

export default router;