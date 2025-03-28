// src/controllers/dispositivoController.ts
import { Request, Response } from 'express';
import { getManufacturerMultiSource } from '../utils/macUtils';

export const getDeviceManufacturer = async (
  req: Request<{ mac: string }>,
  res: Response
): Promise<void> => {
  try {
    const { mac } = req.params;
    
    // Validación mejorada
    const macRegex = /^([0-9A-Fa-f]{2}[:-]?){5}([0-9A-Fa-f]{2})$/i;
    if (!mac || !macRegex.test(mac)) {
      res.status(400).json({ 
        error: 'Formato MAC inválido',
        formato_esperado: 'XX:XX:XX:XX:XX:XX',
        ejemplo_valido: '00:14:22:01:23:45'
      });
      return;
    }

    // Normalizar MAC
    const cleanMac = mac.replace(/[^A-Fa-f0-9]/g, '').toUpperCase();
    
    // Obtener fabricante con múltiples fuentes
    const manufacturer = await getManufacturerMultiSource(cleanMac);
    
    res.json({
      mac: cleanMac.match(/.{1,2}/g)?.join(':') || cleanMac, // Formatear salida
      manufacturer,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error detallado:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    res.status(500).json({
      error: 'Error interno',
      detalles: process.env.NODE_ENV === 'development' ? errorMessage : 'Contactar al administrador'
    });
  }
};