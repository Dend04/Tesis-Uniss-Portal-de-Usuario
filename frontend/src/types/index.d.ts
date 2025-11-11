// src/types/index.ts

// En tu archivo de tipos (types.ts)
export interface UserInfo {
  name: string;
  username: string;
  universityEmail: string;
  backupEmail: string;
  faculty: string;
  major: string;
  year: string;
  phone: string;
  status: string;
  lastLogin: string;
  id: string;
  passwordExpira?: string;
  diasHastaVencimiento?: number | null;
  tiempoHastaVencimiento?: string;
  isEmployee?: boolean;
}
  
export interface Device {
  id: string; 
  mac: string;
  nombre: string;
  tipo: 'CELULAR' | 'TABLET' | 'LAPTOP' | 'PC' | 'MINI_PC' | 'OTRO';
  username?: string;
  createdAt?: string;
  updatedAt?: string;
}