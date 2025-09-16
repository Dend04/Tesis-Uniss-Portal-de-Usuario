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
}
  
  export interface Device {
    type: "phone" | "laptop" | "tablet" | "pc";
    mac: string;
    model: string;
  }