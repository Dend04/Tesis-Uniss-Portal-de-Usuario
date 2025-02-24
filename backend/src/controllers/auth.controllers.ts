// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { authenticateUser } from '../utils/ldap.utils';

export const loginController = async (req: Request, res: Response) => {
  try {
    await authenticateUser(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};