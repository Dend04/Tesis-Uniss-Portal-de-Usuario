// utils/format.ts
export const formatMAC = (value: string): string => {
  // Eliminar todos los caracteres que no sean hexadecimales
  const mac = value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  
  // Insertar dos puntos cada dos caracteres
  const formatted = mac.replace(/(.{2})/g, '$1:').slice(0, 17);
  
  // Eliminar el último dos puntos si sobra
  return formatted.endsWith(':') ? formatted.slice(0, -1) : formatted;
};