// src/modules/ldap/ldap.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AssetStructureBuilder } from '../utils/asset.structure';
import { UserEntriesBuilder } from '../services/assets-account.services';

const prisma = new PrismaClient();
const assetBuilder = new AssetStructureBuilder();
const userBuilder = new UserEntriesBuilder(assetBuilder);

export class workerAccount {
  static async createUserByCI(req: Request<{ ci: string }>, res: Response) {
    try {
      const { ci } = req.params;
      
      // Validar formato del CI
      if (!/^\d{15}$/.test(ci)) {
        return res.status(400).json({
          success: false,
          message: 'Formato de CI inválido. Debe contener 15 dígitos'
        });
      }

      // 1. Buscar empleado en DB
      const employee = await prisma.empleados_Gral.findFirst({
        where: { 
          No_CI: ci,
          Baja: false
        }
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Empleado no encontrado o dado de baja'
        });
      }

      // 2. Construir estructura de assets si no existe
      await assetBuilder.buildAssetStructure();
      
      // 3. Crear usuario en LDAP
      const departmentDN = await (userBuilder as any).getDepartmentDN(employee.Id_Direccion);
      await (userBuilder as any).createUserEntry(departmentDN, employee);

      res.json({
        success: true,
        message: 'Usuario creado exitosamente en LDAP',
        dn: departmentDN
      });
    } catch (error: any) {
      console.error('Error en controlador:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al crear usuario',
        errorCode: error.code || 'UNKNOWN_ERROR'
      });
    }
  }
}