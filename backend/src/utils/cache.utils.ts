// src/services/cache.service.ts
import NodeCache from "node-cache";

export const userDnCache = new NodeCache({ stdTTL: 3600 });
// Tipos para nuestro caché
export interface CacheUsuario {
  usuarios: any[];
  timestamp: number;
}

export class CacheService {
  private cache: NodeCache;

  constructor() {
    // 30 minutos de expiración (1800 segundos)
    this.cache = new NodeCache({ stdTTL: 1800 });
  }

  // ✅ Guardar usuarios en caché de forma tipada
  guardarUsuarios(clave: string, usuarios: any[]): boolean {
    const cacheData: CacheUsuario = {
      usuarios,
      timestamp: Date.now()
    };
    
    const success = this.cache.set(clave, cacheData);
    console.log(`✅ Cache actualizado para ${clave}: ${usuarios.length} usuarios`);
    return success;
  }

  // ✅ Obtener usuarios del caché
  obtenerUsuarios(clave: string): any[] | null {
    const cacheData = this.cache.get<CacheUsuario>(clave);
    
    if (!cacheData) {
      console.log(`❌ No hay datos en cache para ${clave}`);
      return null;
    }

    console.log(`✅ Datos obtenidos de cache para ${clave}: ${cacheData.usuarios.length} usuarios`);
    return cacheData.usuarios;
  }

  // ✅ Verificar si una clave existe en caché
  tieneDatos(clave: string): boolean {
    return this.cache.has(clave);
  }

  // ✅ Obtener estado completo del caché
  obtenerEstadoCache(): { [key: string]: { cantidad: number; tiempoRestante: string } } {
    const claves = this.cache.keys();
    const estado: any = {};
    
    claves.forEach(clave => {
      const ttl = this.cache.getTtl(clave);
      if (ttl) {
        const tiempoRestante = Math.ceil((ttl - Date.now()) / 1000 / 60);
        const cacheData = this.cache.get<CacheUsuario>(clave);
        
        estado[clave] = {
          cantidad: cacheData?.usuarios?.length || 0,
          tiempoRestante: `${tiempoRestante} minutos`
        };
      }
    });

    return estado;
  }

  // ✅ Limpiar caché específico
  limpiarClave(clave: string): void {
    this.cache.del(clave);
    console.log(`✅ Cache limpiado para clave: ${clave}`);
  }

  // ✅ Limpiar todo el caché
  limpiarTodo(): void {
    this.cache.flushAll();
    console.log('✅ Cache limpiado completamente');
  }

  // ✅ Obtener estadísticas del caché
  obtenerEstadisticas() {
    return this.cache.getStats();
  }
}

export const cacheService = new CacheService();