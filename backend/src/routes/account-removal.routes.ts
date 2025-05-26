import express from "express";
import { AccountRemovalController } from "../controllers/account-removal.controller";

const router = express.Router();

router.delete('/:identifier', AccountRemovalController.deleteAccount);

export default router;