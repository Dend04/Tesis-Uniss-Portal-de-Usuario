// services/passwordExpiryService.ts
import { createLDAPClient, searchAsync, bindAsync, LDAPClient } from "../utils/ldap.utils"; // ✅ Agrega bindAsync y LDAPClient
import { SearchOptions } from "ldapjs";

export interface ReporteExpiración {
  rango7Dias: UsuarioParaNotificar[];
  rango3Dias: UsuarioParaNotificar[];
  rango1Dia: UsuarioParaNotificar[];
  expirados: UsuarioParaNotificar[];
  resumen: {
    total7Dias: number;
    total3Dias: number;
    total1Dia: number;
    totalExpirados: number;
    mensaje: string;
  };
}

export interface UsuarioLDAP {
  dn: string;
  cn: string;
  mail: string;
  pwdChangedTime: string;
  pwdPolicySubentry?: string;
  sAMAccountName?: string; 
}

export interface UsuarioParaNotificar {
  email: string;
  userName: string;
  daysLeft: number;
  alertType: string;
  sAMAccountName: string;
}

export class PasswordExpiryService {
  
  async getUsersWithExpiringPasswords(
    thresholdDays: number[] = [7, 3, 1, 0], 
    baseDN?: string // ← AGREGAR ESTE PARÁMETRO OPCIONAL
  ): Promise<UsuarioParaNotificar[]> {
    const results: UsuarioParaNotificar[] = [];
    let client: LDAPClient | null = null;

    try {
      client = createLDAPClient(process.env.LDAP_URL!);
      await bindAsync(client, process.env.LDAP_ADMIN_DN!, process.env.LDAP_ADMIN_PASSWORD!);

      const searchOptions: SearchOptions = {
        scope: "sub",
        filter: "(&(objectClass=inetOrgPerson)(company=*)(pwdChangedTime=*))",
        attributes: ['cn', 'company', 'pwdChangedTime', 'pwdPolicySubentry', 'sAMAccountName']
      };

      // ✅ USAR el baseDN proporcionado o el por defecto
      const baseDNUtilizada = baseDN || process.env.LDAP_BASE_DN_Propio!;
      
      console.log(`🔍 Buscando usuarios en: ${baseDNUtilizada}`);

      // ✅ PASAR la base DN correcta
      const entries = await searchAsync(client, baseDNUtilizada, searchOptions);
      
      for (const entry of entries) {
        const usuario = this.mapLdapEntryToUsuario(entry);
        
        if (usuario && usuario.sAMAccountName) {
          const daysUntilExpiry = await this.calculateDaysUntilExpiry(usuario);
          
          if (thresholdDays.includes(daysUntilExpiry)) {
            results.push({
              email: usuario.mail,
              userName: usuario.cn,
              daysLeft: daysUntilExpiry,
              alertType: this.getAlertType(daysUntilExpiry),
              sAMAccountName: usuario.sAMAccountName
            });
          }
        }
      }
    } catch (error) {
      console.error('❌ Error en getUsersWithExpiringPasswords:', error);
      throw error;
    } finally {
      if (client) {
        client.unbind();
      }
    }
    return results;
  }

  async generarReporteExpiración(baseDN?: string): Promise<ReporteExpiración> {
    
    // 1. Determinar qué Base DN usar
    let baseDNUtilizada: string;
    
    if (baseDN === 'propio') {
      baseDNUtilizada = process.env.LDAP_BASE_DN_Propio!;
    } else {
      // Por defecto, usa el LDAP_BASE_DN estándar, o podrías lanzar un error si el parámetro no es válido
      baseDNUtilizada = process.env.LDAP_BASE_DN!;
    }
    
    console.log(`🔍 Usando Base DN: ${baseDNUtilizada}`);

    // 2. Pasar la base DN elegida a la búsqueda de usuarios
    // NOTA: Necesitarás modificar 'getUsersWithExpiringPasswords' para que acepte la base DN como argumento.
    const todosUsuarios = await this.getUsersWithExpiringPasswords([7, 6, 5, 4, 3, 2, 1, 0], baseDNUtilizada);
    
    
    const rango7Dias = todosUsuarios.filter(user => user.daysLeft >= 4 && user.daysLeft <= 7);
    const rango3Dias = todosUsuarios.filter(user => user.daysLeft >= 2 && user.daysLeft <= 3);
    const rango1Dia = todosUsuarios.filter(user => user.daysLeft === 1);
    const expirados = todosUsuarios.filter(user => user.daysLeft === 0);

    const resumen = {
      total7Dias: rango7Dias.length,
      total3Dias: rango3Dias.length,
      total1Dia: rango1Dia.length,
      totalExpirados: expirados.length,
      mensaje: this.generarMensajeResumen(rango7Dias.length, rango3Dias.length, rango1Dia.length, expirados.length)
    };

    return {
      rango7Dias,
      rango3Dias,
      rango1Dia,
      expirados,
      resumen
    };
  }

  private generarMensajeResumen(total7: number, total3: number, total1: number, totalExp: number): string {
    const partes = [];
    
    if (total7 > 0) partes.push(`existen ${total7} usuarios que su cuenta expirará en 7 o menos de 7 días`);
    if (total3 > 0) partes.push(`existen ${total3} usuarios que su cuenta expirará en 3 días o menos`);
    if (total1 > 0) partes.push(`existen ${total1} usuarios que su contraseña expirará en 1 día`);
    if (totalExp > 0) partes.push(`existen ${totalExp} usuarios que su contraseña ya expiró`);
    
    return partes.length > 0 
      ? partes.join(', ') + '.'
      : 'No hay usuarios con contraseñas próximas a expirar.';
  }

  private mapLdapEntryToUsuario(entry: any): UsuarioLDAP | null {
    try {
      // Usar el mismo método que en tu UserService existente
      const extractAttr = (attrName: string): string => {
        try {
          const attrs = entry.attributes || [];
          const attr = attrs.find((a: any) => a.type === attrName);
          return attr && attr.values && attr.values[0] ? String(attr.values[0]) : '';
        } catch {
          return '';
        }
      };

      // Extraer DN de manera segura (igual que en tu UserService)
      let userDn: string = 'DN-no-encontrado';
      if (entry.dn) {
        userDn = String(entry.dn);
      } else if (entry.attributes) {
        const dnAttr = entry.attributes.find((a: any) => a.type === 'dn');
        userDn = dnAttr && dnAttr.values && dnAttr.values[0] ? String(dnAttr.values[0]) : 'DN-no-encontrado';
      }

      return {
        dn: userDn,
        cn: extractAttr('cn'),
        mail: extractAttr('company'),
        pwdChangedTime: extractAttr('pwdChangedTime'),
        pwdPolicySubentry: extractAttr('pwdPolicySubentry'),
        sAMAccountName: extractAttr('sAMAccountName')
      };
    } catch (error) {
      console.error('❌ Error mapeando entrada LDAP:', error);
      return null;
    }
  }

  private async calculateDaysUntilExpiry(user: UsuarioLDAP): Promise<number> {
    if (!user.pwdChangedTime) {
      return 999; // No expira si no hay fecha de cambio
    }

    try {
      // Obtener fecha de último cambio de contraseña
      const pwdChangedTime = user.pwdChangedTime;
      
      // Valor por defecto: 90 días en segundos (7776000)
      const pwdMaxAge = 7776000; // Por defecto 90 días

      // Calcular fecha de expiración
      const changeDate = this.parseLDAPTimestamp(pwdChangedTime);
      const expiryDate = new Date(changeDate.getTime() + (pwdMaxAge * 1000));
      const today = new Date();
      
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return Math.max(0, diffDays);
    } catch (error) {
      console.error('❌ Error calculando días hasta expiración:', error);
      return 999;
    }
  }

  private getAlertType(daysLeft: number): string {
    const alertTypes: { [key: number]: string } = {
      7: 'primera-alerta',
      3: 'alerta-urgente', 
      1: 'alerta-final',
      0: 'cuenta-suspendida'
    };
    return alertTypes[daysLeft];
  }

  private parseLDAPTimestamp(timestamp: string): Date {
    try {
      // Formato LDAP: YYYYMMDDHHMMSSZ
      const year = parseInt(timestamp.substring(0, 4));
      const month = parseInt(timestamp.substring(4, 6)) - 1;
      const day = parseInt(timestamp.substring(6, 8));
      const hour = parseInt(timestamp.substring(8, 10));
      const minute = parseInt(timestamp.substring(10, 12));
      const second = parseInt(timestamp.substring(12, 14));
      
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    } catch (error) {
      console.error('❌ Error parseando timestamp LDAP:', timestamp, error);
      return new Date(); // Fallback a fecha actual
    }
  }
}

export const passwordExpiryService = new PasswordExpiryService();