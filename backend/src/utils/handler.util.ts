// utils/handler.util.ts
import { Response } from 'express';

export const handleServiceResponse = (res: Response, data: any): void => {
  res.status(200).json(data);
};