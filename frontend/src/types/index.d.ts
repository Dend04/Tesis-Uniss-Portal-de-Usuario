// src/types/index.ts

export interface UserInfo {
  id: string;
  faculty: string;
  major: string;
  year: string;
  phone: string;
  backupEmail: string;
  universityEmail: string;
  name: string;
  status: string;
  // Añadir las propiedades faltantes
  username: string;
  lastLogin: string;
}
  
  export interface Device {
    type: "phone" | "laptop" | "tablet" | "pc";
    mac: string;
    model: string;
  }