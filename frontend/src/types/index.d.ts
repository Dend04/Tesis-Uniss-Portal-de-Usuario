// src/types/index.ts

export interface UserInfo {
    name: string;
    id: string;
    faculty: string;
    major: string;
    year: string;
    phone: string;
    backupEmail: string;
    universityEmail: string;
    lastLogin: string;
    status: string;
  }
  
  export interface Device {
    type: "phone" | "laptop" | "tablet" | "pc";
    mac: string;
    model: string;
  }