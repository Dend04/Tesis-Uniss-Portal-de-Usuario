import { Router } from "express";
import { StudentController } from "../controllers/student.controller";

const router = Router();

/**
 * @swagger
 * /students/{ci}:
 *   get:
 *     summary: Obtiene datos completos de un estudiante
 *     tags: [Estudiantes]
 *     parameters:
 *       - in: path
 *         name: ci
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{11}$'
 *         description: Carnet de identidad del estudiante (11 dígitos)
 *     responses:
 *       200:
 *         description: Datos del estudiante
 *       400:
 *         description: CI inválido
 *       502:
 *         description: Error al comunicarse con SIGENU
 */
router.get("/students/:ci", (req, res, next) =>
  StudentController.getStudent(req, res, next)
);
export default router;
