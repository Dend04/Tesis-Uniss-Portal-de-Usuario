import { getLdapTreeController } from "../controllers/ldap.controllers";
import { verifyTokenMiddleware } from "../middlewares/auth.middleware";
import express from "express";

const router = express.Router();

router.get("/ldap/tree", verifyTokenMiddleware, getLdapTreeController);

export default router;
