export type CreateDispositivo = {
  mac: string;
  nombre?: string;
  tipo: 'CELULAR' | 'TABLET' | 'LAPTOP' | 'PC' | 'MINI_PC' | 'OTRO';
  username: string;
};

export type CreateLog = {
  accion: string;
  username: string;
  ip?: string;
  userAgent?: string;
  dispositivo?: string;
  exitoso?: boolean;
  detalles?: string;
  dispositivoId?: number;
};

export type CreateNotificacion = {
  titulo: string;
  mensaje: string;
  username: string;
  leida?: boolean;
  tipo?: 'INFORMATIVA' | 'ADVERTENCIA' | 'URGENTE' | 'SISTEMA';
  metadata?: any;
};