// src/modules/ldap/ldap.routes.ts
import { Router } from 'express';
import { workerAccount } from '../controllers/worker-account.controller';


const router = Router();

router.post('/create-user/:ci', workerAccount.createUserByCI);

export default router;