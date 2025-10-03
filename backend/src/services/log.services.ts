// src/services/log.service.ts
import { unifiedLDAPSearch } from "../utils/ldap.utils";


export interface LDAPLogEntry {
  timestamp: string;
  eventType: string;
  employeeID: string;
  sAMAccountName: string;
  dn: string;
  operation: string;
  resultCode: number;
  message: string;
  clientIP?: string;
  targetUser?: string;
}

export class LogService {
  
  async getLogsByEmployeeID(employeeID: string): Promise<LDAPLogEntry[]> {
    try {
      console.log(`🔍 Buscando logs LDAP para employeeID: ${employeeID}`);

      // Filtro para buscar logs por employeeID
      const searchFilter = `(&(objectClass=auditEvent)(employeeID=${employeeID}))`;
      
      const attributes = [
        "reqStart",
        "eventType", 
        "employeeID",
        "sAMAccountName",
        "dn",
        "reqOperation",
        "reqResult",
        "reqMessage",
        "clientIP",
        "targetUser"
      ];

      // Usar unifiedLDAPSearch con el DN base por defecto (dc=uniss,dc=edu,dc=cu)
      const entries = await unifiedLDAPSearch(searchFilter, attributes);

      console.log(`✅ Encontrados ${entries.length} logs para employeeID: ${employeeID}`);

      return entries.map((entry: any) => this.mapearEntradaLog(entry));
      
    } catch (error: any) {
      console.error('❌ Error obteniendo logs LDAP:', error);
      throw new Error(`Error al obtener logs: ${error.message}`);
    }
  }

  async getLogsRecientes(limite: number = 100): Promise<LDAPLogEntry[]> {
    try {
      const searchFilter = `(objectClass=auditEvent)`;
      
      const attributes = [
        "reqStart",
        "eventType",
        "employeeID",
        "sAMAccountName", 
        "dn",
        "reqOperation",
        "reqResult",
        "reqMessage",
        "clientIP",
        "targetUser"
      ];

      const entries = await unifiedLDAPSearch(searchFilter, attributes);

      // Ordenar por timestamp más reciente primero y aplicar límite
      const logs = entries.map((entry: any) => this.mapearEntradaLog(entry));
      const logsOrdenados = logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return logsOrdenados.slice(0, limite);
      
    } catch (error: any) {
      console.error('❌ Error obteniendo logs recientes:', error);
      throw new Error(`Error al obtener logs: ${error.message}`);
    }
  }

  async getLogsPorUsuario(username: string): Promise<LDAPLogEntry[]> {
    try {
      console.log(`🔍 Buscando logs LDAP para usuario: ${username}`);

      // Buscar logs donde el usuario sea el sujeto o el objetivo de la operación
      const searchFilter = `(&(objectClass=auditEvent)(|(sAMAccountName=${username})(targetUser=${username})))`;
      
      const attributes = [
        "reqStart",
        "eventType",
        "employeeID",
        "sAMAccountName",
        "dn",
        "reqOperation",
        "reqResult",
        "reqMessage",
        "clientIP",
        "targetUser"
      ];

      const entries = await unifiedLDAPSearch(searchFilter, attributes);

      console.log(`✅ Encontrados ${entries.length} logs para usuario: ${username}`);

      return entries.map((entry: any) => this.mapearEntradaLog(entry));
      
    } catch (error: any) {
      console.error('❌ Error obteniendo logs por usuario:', error);
      throw new Error(`Error al obtener logs: ${error.message}`);
    }
  }

  private mapearEntradaLog(entrada: any): LDAPLogEntry {
    const extraerAtributo = (nombreAtributo: string): string => {
      try {
        const atributos = entrada.attributes || [];
        const atributo = atributos.find((a: any) => a.type === nombreAtributo);
        return atributo && atributo.values && atributo.values[0] ? String(atributo.values[0]) : '';
      } catch {
        return '';
      }
    };

    return {
      timestamp: extraerAtributo('reqStart') || new Date().toISOString(),
      eventType: extraerAtributo('eventType') || 'DESCONOCIDO',
      employeeID: extraerAtributo('employeeID'),
      sAMAccountName: extraerAtributo('sAMAccountName'),
      dn: extraerAtributo('dn'),
      operation: extraerAtributo('reqOperation'),
      resultCode: parseInt(extraerAtributo('reqResult')) || 0,
      message: extraerAtributo('reqMessage') || '',
      clientIP: extraerAtributo('clientIP'),
      targetUser: extraerAtributo('targetUser')
    };
  }
}

export const logService = new LogService();