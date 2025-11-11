// validations/device.ts
import { z } from 'zod';

export const deviceSchema = z.object({
  mac: z.string()
    .min(1, 'La dirección MAC es requerida')
    .regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, 'Formato MAC inválido. Use el formato: 00:1A:2B:3C:4D:5E'),
  nombre: z.string()
    .min(1, 'El nombre es requerido')
    .max(50, 'El nombre no puede tener más de 50 caracteres'),
  tipo: z.enum(['CELULAR', 'TABLET', 'LAPTOP', 'PC', 'MINI_PC', 'OTRO'], {
    errorMap: () => ({ message: 'Tipo de dispositivo inválido' })
  })
});

export type DeviceFormData = z.infer<typeof deviceSchema>;