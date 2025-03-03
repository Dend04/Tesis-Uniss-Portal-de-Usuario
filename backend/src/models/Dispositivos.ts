// models/Device.ts
import mongoose, { Document, Schema, InferSchemaType } from 'mongoose';

// ENUM para tipos de dispositivos
enum DeviceType {
  PC = 'PC',
  LAPTOP = 'Laptop',
  PHONE = 'Celular',
  TABLET = 'Tablet',
  OTHER = 'Otro'
}

// Interface para TypeScript
export interface IDispositivo extends Document {
  mac: string;
  deviceModel?: string;  // Cambiado de 'model' a 'deviceModel'
  user_id: string;
  type: DeviceType;
  manufacturer?: string;
  last_seen: Date;
}

// Esquema de Mongoose
const DeviceSchema: Schema = new Schema({
  mac: {
    type: String,
    required: true,
    unique: true,
    match: [/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, 'MAC inválida']
  },
  deviceModel: {  // Nombre cambiado aquí
    type: String,
    maxlength: 50
  },
  user_id: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: Object.values(DeviceType),
    required: true
  },
  manufacturer: String,
  last_seen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Tipo inferido para TypeScript
export type DeviceDocument = InferSchemaType<typeof DeviceSchema>;

export default mongoose.model<IDispositivo>('Dispositivo', DeviceSchema);