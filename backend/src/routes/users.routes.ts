import { Router } from "express";
import { usersController } from "../controllers/users.controller";
import { verifyTokenMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// ✅ Todas las rutas requieren autenticación
router.get("/", verifyTokenMiddleware, usersController.obtenerTodosUsuarios);
router.get("/buscar", verifyTokenMiddleware, usersController.buscarUsuarios);
router.get("/:sAMAccountName", verifyTokenMiddleware, usersController.obtenerUsuarioPorSAM);
router.delete("/cache/limpiar", verifyTokenMiddleware, usersController.limpiarCache);
router.get("/cache/estadisticas", verifyTokenMiddleware, usersController.obtenerEstadisticasCache);

export default router;