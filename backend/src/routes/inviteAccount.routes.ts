// app/routes/inviteAccount.routes.ts
import { Router } from 'express';
import { GuestUserController } from '../controllers/inviteAccount.controller';

const router = Router();
const guestUserController = new GuestUserController();

router.post('/guest-users', (req, res) => guestUserController.createGuestUser(req, res));

export default router;