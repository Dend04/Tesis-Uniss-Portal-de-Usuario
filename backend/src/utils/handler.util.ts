// src/utils/handler.util.ts
import { Response } from "express";

export function handleServiceResponse(res: Response, serviceResponse: any) {
  if (!serviceResponse.success) {
    return res.status(404).json(serviceResponse);
  }
  res.status(200).json(serviceResponse);
}
