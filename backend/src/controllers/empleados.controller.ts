import { Request, Response } from 'express';
import prisma from '../config/prisma';


// Buscar por No_CI
export const buscarPorCI = async (
  req: Request<{ no_ci: string }>,
  res: Response
): Promise<void> => {  // <-- Cambia a Promise<void>
  try {
    const { no_ci } = req.params;
    const empleado = await prisma.empleados_Gral.findFirst({
      where: { No_CI: no_ci },
      include: {
        Centro_Costo: true,
        Provincia: true,
        Municipio: true,
        Cargo: true,
      },
    });

    if (!empleado) {
      res.status(404).json({ error: 'Empleado no encontrado' });
      return;
    }

    res.json(empleado);
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar empleado' });
  }
};

// Buscar por Nombre + Apellido1 + Apellido2
export const buscarPorNombreCompleto = async (
  req: Request<{}, {}, {}, { nombre: string; apellido1: string; apellido2?: string }>,
  res: Response
): Promise<void> => {  // <-- Cambia a Promise<void>
  try {
    const { nombre, apellido1, apellido2 } = req.query;

    if (!nombre || !apellido1) {
      res.status(400).json({ error: 'Faltan parámetros requeridos' });
      return;
    }

    const empleados = await prisma.empleados_Gral.findMany({
      where: {
        Nombre: { contains: nombre.toString(), mode: 'insensitive' },
        Apellido_1: { contains: apellido1.toString(), mode: 'insensitive' },
        Apellido_2: apellido2 ? { contains: apellido2.toString(), mode: 'insensitive' } : undefined,
      },
    });

    res.json(empleados);
  } catch (error) {
    res.status(500).json({ error: 'Error en la búsqueda' });
  }
};

// Buscar por Id_CCosto
export const buscarPorCCosto = async (req: Request, res: Response) => {
  const { id_ccosto } = req.params;

  try {
    const empleados = await prisma.empleados_Gral.findMany({
      where: { Id_CCosto: parseInt(id_ccosto) },
    });

    res.json(empleados);
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar por centro de costo' });
  }
};

// Obtener empleados de baja
export const obtenerBajas = async (req: Request, res: Response) => {
  try {
    const empleados = await prisma.empleados_Gral.findMany({
      where: { Baja: true },
    });

    res.json(empleados);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener bajas' });
  }
};

// Buscar por ciudad
export const buscarPorCiudad = async (req: Request, res: Response) => {
  const { ciudad } = req.params;

  try {
    const empleados = await prisma.empleados_Gral.findMany({
      where: { Ciudad: { contains: ciudad, mode: 'insensitive' } },
    });

    res.json(empleados);
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar por ciudad' });
  }
};