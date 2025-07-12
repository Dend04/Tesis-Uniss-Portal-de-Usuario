import { z } from "zod";

export const deviceSchema = z.object({
  type: z.enum(["phone", "laptop", "tablet", "pc"]),
  model: z.string().min(2, "Mínimo 2 caracteres"),
  mac: z
    .string()
    .regex(
      /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
      "MAC inválida"
    ),
});

export type DeviceFormData = z.infer<typeof deviceSchema>;