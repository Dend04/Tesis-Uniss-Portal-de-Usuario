// src/types/oui.d.ts
declare module 'oui' {
    function OUI(mac: string): {
      organization: string;
      address: string[];
    } | null;
  
    export = OUI;
  }