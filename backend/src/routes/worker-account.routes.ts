// src/modules/ldap/ldap.routes.ts
import { Router } from 'express';
import { WorkerAccountController } from '../controllers/worker-account.controller';


const router = Router();

router.post('/create-user/:ci', WorkerAccountController.createUserByCI);

export default router;