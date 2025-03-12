// src/api/routes/gemini.routes.ts
import express from 'express';
import { geminiController } from '../controllers/gemini.controller';

const router = express.Router();

router.post('/chat', geminiController);

export default router;