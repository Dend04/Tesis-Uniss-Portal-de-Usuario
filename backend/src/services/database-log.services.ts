// src/services/database-log.service.ts
import { PrismaClient } from ".prisma/client_portal";
import { cacheService } from "../utils/cache.utils";


export interface LogData {
  accion: string;
  username: string;
  exitoso: boolean;
  detalles?: string;
  ip?: string;
  userAgent?: string;
  dispositivo?: string;
  error?: string;
}

export class DatabaseLogService {
  private prisma: PrismaClient;
  private readonly CACHE_KEY_LOGS = "pending_logs";

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * ✅ Guardar log en la base de datos con fallback a caché
   */
  async guardarLog(logData: LogData): Promise<void> {
    try {
      // Intentar guardar directamente en la BD
      await this.prisma.log.create({
        data: {
          accion: logData.accion,
          username: logData.username,
          exitoso: logData.exitoso,
          detalles: logData.detalles,
          ip: logData.ip,
          userAgent: logData.userAgent,
          dispositivo: logData.dispositivo,
          createdAt: new Date(),
        },
      });
      
      console.log(`✅ Log guardado en BD: ${logData.accion} - ${logData.username}`);
      
    } catch (dbError) {
      console.error('❌ Error guardando log en BD, usando caché:', dbError);
      
      // ✅ GUARDAR EN CACHÉ COMO FALLBACK
      await this.guardarLogEnCache(logData);
    }
  }

  /**
   * ✅ Guardar log en caché cuando la BD no está disponible
   */
  private async guardarLogEnCache(logData: LogData): Promise<void> {
    try {
      // Obtener logs pendientes existentes
      const logsPendientes = cacheService.obtenerUsuarios(this.CACHE_KEY_LOGS) || [];
      
      // Agregar nuevo log
      const nuevosLogs = [...logsPendientes, {
        ...logData,
        timestamp: new Date().toISOString(),
        intentoGuardado: Date.now()
      }];
      
      // Guardar en caché
      cacheService.guardarUsuarios(this.CACHE_KEY_LOGS, nuevosLogs);
      console.log(`📦 Log guardado en caché (total: ${nuevosLogs.length}): ${logData.accion}`);
      
    } catch (cacheError) {
      console.error('💥 Error crítico: No se pudo guardar log ni en caché:', cacheError);
    }
  }

  /**
   * ✅ Reintentar guardar logs pendientes desde caché
   */
  async reintentarLogsPendientes(): Promise<void> {
    try {
      const logsPendientes = cacheService.obtenerUsuarios(this.CACHE_KEY_LOGS) as any[];
      
      if (!logsPendientes || logsPendientes.length === 0) {
        return;
      }

      console.log(`🔄 Reintentando guardar ${logsPendientes.length} logs pendientes...`);

      const logsExitosos: any[] = [];
      const logsFallidos: any[] = [];

      for (const logData of logsPendientes) {
        try {
          // Reintentar guardar en BD
          await this.prisma.log.create({
            data: {
              accion: logData.accion,
              username: logData.username,
              exitoso: logData.exitoso,
              detalles: logData.detalles,
              ip: logData.ip,
              userAgent: logData.userAgent,
              dispositivo: logData.dispositivo,
              createdAt: new Date(logData.timestamp),
            },
          });
          
          logsExitosos.push(logData);
          console.log(`✅ Log recuperado guardado: ${logData.accion}`);
          
        } catch (error) {
          // Si sigue fallando, mantener en la lista de fallidos
          logsFallidos.push(logData);
        }
      }

      // Actualizar caché con los logs que aún no se pudieron guardar
      if (logsFallidos.length > 0) {
        cacheService.guardarUsuarios(this.CACHE_KEY_LOGS, logsFallidos);
        console.log(`📦 ${logsFallidos.length} logs aún pendientes después del reintento`);
      } else {
        // Limpiar caché si todos se guardaron exitosamente
        cacheService.limpiarClave(this.CACHE_KEY_LOGS);
        console.log('✅ Todos los logs pendientes fueron guardados exitosamente');
      }

    } catch (error) {
      console.error('❌ Error en reintento de logs pendientes:', error);
    }
  }

  /**
   * ✅ Obtener estadísticas de logs
   */
  async obtenerEstadisticasLogs() {
    try {
      const totalLogs = await this.prisma.log.count();
      const logsExitosos = await this.prisma.log.count({
        where: { exitoso: true }
      });
      const logsFallidos = await this.prisma.log.count({
        where: { exitoso: false }
      });

      const logsPendientes = cacheService.obtenerUsuarios(this.CACHE_KEY_LOGS) || [];
      
      return {
        baseDatos: {
          total: totalLogs,
          exitosos: logsExitosos,
          fallidos: logsFallidos
        },
        cache: {
          pendientes: logsPendientes.length
        }
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de logs:', error);
      return {
        baseDatos: { total: 0, exitosos: 0, fallidos: 0 },
        cache: { pendientes: 0 }
      };
    }
  }

  /**
   * ✅ Cerrar conexión Prisma
   */
  async desconectar(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export const databaseLogService = new DatabaseLogService();