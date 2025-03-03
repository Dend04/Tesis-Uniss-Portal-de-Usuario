// src/routes/student.routes.ts
import { Router } from "express";
import { StudentController } from "../controllers/student.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Estudiantes
 *   description: Endpoints para gestión de datos estudiantiles
 */

/**
 * @swagger
 * /students/{ci}:
 *   get:
 *     summary: Obtiene los datos principales del estudiante
 *     description: Retorna información personal, académica y familiar del estudiante
 *     tags: [Estudiantes]
 *     parameters:
 *       - in: path
 *         name: ci
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{11}$'
 *           example: "85010112345"
 *         description: Carné de identidad del estudiante (11 dígitos)
 *     responses:
 *       200:
 *         description: Datos del estudiante
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/StudentMainData'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "CI inválido. Debe tener 11 dígitos"
 *       502:
 *         description: Error en servicio externo
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "Error al obtener datos principales"
 */
router.get("/students/:ci", StudentController.getMainData);
/**
 * @swagger
 * /students/{ci}/photo:
 *   get:
 *     summary: Obtiene la foto del estudiante en base64
 *     tags: [Estudiantes]
 *     parameters:
 *       - in: path
 *         name: ci
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{11}$'
 *           example: "85010112345"
 *     responses:
 *       200:
 *         description: Foto del estudiante
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     photoBase64:
 *                       type: string
 *                       description: Imagen en formato base64
 *                       example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
 *       404:
 *         description: Foto no disponible
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "La foto no está disponible"
 *       502:
 *         description: Error en servicio externo
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "Error al obtener la foto"
 */
router.get("/students/:ci/photo", StudentController.getPhoto);
/**
 * @swagger
 * /students/status:
 *   get:
 *     summary: Obtiene la lista de estados académicos disponibles
 *     tags: [Estudiantes]
 *     responses:
 *       200:
 *         description: Lista de estados académicos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AcademicStatus'
 *       502:
 *         description: Error en servicio externo
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "Error al obtener estados académicos"
 */
router.get("/students/status", StudentController.getAcademicStatus);
/**
 * @swagger
 * components:
 *   schemas:
 *     StudentMainData:
 *       type: object
 *       properties:
 *         personalData:
 *           $ref: '#/components/schemas/PersonalData'
 *         academicData:
 *           $ref: '#/components/schemas/AcademicData'
 *         familyData:
 *           $ref: '#/components/schemas/FamilyData'
 *
 *     AcademicStatus:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "1"
 *         name:
 *           type: string
 *           example: "Matriculado"
 *         description:
 *           type: string
 *           example: "Estudiante activo y matriculado"
 *
 *     PersonalData:
 *       type: object
 *       properties:
 *         fullName:
 *           type: string
 *           example: "Juan Pérez López"
 *         identification:
 *           type: string
 *           example: "85010112345"
 *         birthDate:
 *           type: string
 *           example: "1 de enero de 1985"
 *         address:
 *           type: string
 *           example: "Calle 123 #456, Centro Habana"
 *         contact:
 *           type: string
 *           example: "+53 55555555"
 *         origin:
 *           type: string
 *           example: "La Habana, Cuba"
 *
 *     AcademicData:
 *       type: object
 *       properties:
 *         faculty:
 *           type: string
 *           example: "Facultad de Ingeniería"
 *         career:
 *           type: string
 *           example: "Ingeniería en Ciencias Informáticas"
 *         year:
 *           type: string
 *           example: "3° Año"
 *         status:
 *           type: string
 *           example: "Regular"
 *         academicIndex:
 *           type: string
 *           example: "4.75"
 *
 *     FamilyData:
 *       type: object
 *       properties:
 *         mother:
 *           type: string
 *           example: "María López - Economista (Universitario)"
 *         father:
 *           type: string
 *           example: "Carlos Pérez - Ingeniero (Universitario)"
 */




export default router;
