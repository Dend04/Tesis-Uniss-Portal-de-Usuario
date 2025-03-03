// src/utils/macUtils.ts
import { one } from 'macaddress';

// Función base mejorada
export const getManufacturer = async (mac: string): Promise<string> => {
  try {
    const manufacturer = await one(mac);
    return manufacturer || 'Desconocido';
  } catch (error) {
    console.error('Error en búsqueda básica:', error);
    return 'Error en búsqueda';
  }
};

// Implementación multi-fuente mejorada
export const getManufacturerMultiSource = async (mac: string): Promise<string> => {
  try {
    // Normalizar MAC
    const cleanMac = mac.replace(/[^A-F0-9]/gi, '').toUpperCase();
    
    // 1. Primera fuente: macaddress (local)
    try {
      const localResult = await one(cleanMac);
      if (localResult) return localResult;
    } catch (error) {
      console.log('Fuente local falló, probando API externa...');
    }

    // 2. Segunda fuente: API macvendors.com
    try {
      const apiResponse = await fetch(`https://api.macvendors.com/${cleanMac}`);
      if (apiResponse.ok) {
        const result = await apiResponse.text();
        if (result && !result.includes("Not Found")) return result;
      }
    } catch (error) {
      console.log('Error en macvendors, probando maclookup...');
    }

    // 3. Tercera fuente: API maclookup.app
    try {
      const fallbackResponse = await fetch(`https://maclookup.app/api/v2/macs/${cleanMac}`);
      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json() as { company?: string };
        return data.company || 'Desconocido';
      }
    } catch (error) {
      console.log('Todas las fuentes fallaron');
    }

    return 'Desconocido';
  } catch (error) {
    console.error('Error en búsqueda multi-fuente:', error);
    return 'Error en búsqueda';
  }
};