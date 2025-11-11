// backend/services/groupService.ts
import { 
  getLDAPPool, 
  escapeLDAPValue, 
  LDAPClient,
  modifyAsync,
  searchAsync,
  LDAPConfig,
  getLDAPConfig
} from "../utils/ldap.utils";

export interface LDAPGroup {
  dn: string;
  cn: string;
  description?: string;
  member?: string[];
  memberOf?: string[];
  objectClass?: string[];
  distinguishedName?: string;
  sAMAccountName?: string;
}

export interface GroupMembershipResult {
  success: boolean;
  message: string;
  groups?: LDAPGroup[];
  error?: string;
}

export class GroupService {
  private pool = getLDAPPool();
  private config: LDAPConfig;

  constructor() {
    this.config = getLDAPConfig();
  }

  /**
   * Obtiene todos los grupos disponibles con paginación y filtrado
   */
  async getAllGroups(
    page: number = 1, 
    pageSize: number = 100,
    searchTerm: string = ''
  ): Promise<{ groups: LDAPGroup[]; total: number }> {
    let client: LDAPClient | null = null;

    try {
      client = await this.pool.getConnection();

      const filter = searchTerm 
        ? `(&(objectClass=group)(|(cn=*${this.escapeSearchTerm(searchTerm)}*)(description=*${this.escapeSearchTerm(searchTerm)}*)))`
        : '(objectClass=group)';

      const entries = await searchAsync(client, this.config.baseDN, {
        filter,
        scope: 'sub',
        attributes: ['cn', 'description', 'member', 'memberOf', 'objectClass', 'distinguishedName', 'sAMAccountName'],
        paged: true,
        sizeLimit: pageSize,
        timeLimit: 10
      });

      // Para obtener el total, hacemos una búsqueda separada sin límites de página
      const totalEntries = await searchAsync(client, this.config.baseDN, {
        filter: '(objectClass=group)',
        scope: 'sub',
        attributes: ['dn']
      });

      const groups: LDAPGroup[] = entries.map(entry => this.mapEntryToGroup(entry));

      // Aplicar paginación manualmente
      const startIndex = (page - 1) * pageSize;
      const paginatedGroups = groups.slice(startIndex, startIndex + pageSize);

      return {
        groups: paginatedGroups,
        total: totalEntries.length
      };

    } catch (error: any) {
      console.error('Error al obtener grupos:', error);
      throw new Error(`Error al obtener grupos: ${error.message}`);
    } finally {
      if (client) {
        this.pool.releaseConnection(client);
      }
    }
  }

  /**
   * Obtiene grupos de un usuario específico
   */
  async getUserGroups(username: string): Promise<LDAPGroup[]> {
    let client: LDAPClient | null = null;

    try {
      client = await this.pool.getConnection();

      // Primero obtener el DN del usuario
      const userDN = await this.getUserDN(username, client);

      const entries = await searchAsync(client, this.config.baseDN, {
        filter: `(&(objectClass=group)(member=${escapeLDAPValue(userDN)}))`,
        scope: 'sub',
        attributes: ['cn', 'description', 'member', 'memberOf', 'objectClass', 'distinguishedName']
      });

      return entries.map(entry => this.mapEntryToGroup(entry));

    } catch (error: any) {
      console.error(`Error al obtener grupos del usuario ${username}:`, error);
      throw new Error(`Error al obtener grupos del usuario: ${error.message}`);
    } finally {
      if (client) {
        this.pool.releaseConnection(client);
      }
    }
  }

  /**
   * Obtiene grupos directos e indirectos (anidados) de un usuario
   */
  async getUserAllGroups(username: string): Promise<{ directGroups: LDAPGroup[]; nestedGroups: LDAPGroup[] }> {
    let client: LDAPClient | null = null;

    try {
      client = await this.pool.getConnection();
      const userDN = await this.getUserDN(username, client);

      // Grupos directos
      const directEntries = await searchAsync(client, this.config.baseDN, {
        filter: `(&(objectClass=group)(member=${escapeLDAPValue(userDN)}))`,
        scope: 'sub',
        attributes: ['cn', 'description', 'member', 'memberOf', 'objectClass', 'distinguishedName']
      });

      const directGroups = directEntries.map(entry => this.mapEntryToGroup(entry));

      // Grupos anidados (a través de memberOf)
      const nestedGroups: LDAPGroup[] = [];
      const processedGroups = new Set<string>();

      // Función recursiva para obtener grupos anidados
      const getNestedGroups = async (groupDN: string) => {
        if (processedGroups.has(groupDN)) return;
        processedGroups.add(groupDN);

        const nestedEntries = await searchAsync(client!, this.config.baseDN, {
          filter: `(&(objectClass=group)(member=${escapeLDAPValue(groupDN)}))`,
          scope: 'sub',
          attributes: ['cn', 'description', 'member', 'memberOf', 'objectClass', 'distinguishedName']
        });

        for (const entry of nestedEntries) {
          const nestedGroup = this.mapEntryToGroup(entry);
          nestedGroups.push(nestedGroup);
          await getNestedGroups(entry.dn);
        }
      };

      // Obtener grupos anidados para cada grupo directo
      for (const group of directGroups) {
        await getNestedGroups(group.dn);
      }

      return {
        directGroups,
        nestedGroups: Array.from(new Set(nestedGroups)) // Eliminar duplicados
      };

    } catch (error: any) {
      console.error(`Error al obtener todos los grupos del usuario ${username}:`, error);
      throw new Error(`Error al obtener grupos del usuario: ${error.message}`);
    } finally {
      if (client) {
        this.pool.releaseConnection(client);
      }
    }
  }

  /**
   * Agregar usuario a múltiples grupos
   */
  async addUserToGroups(username: string, groupDNs: string[]): Promise<GroupMembershipResult> {
    let client: LDAPClient | null = null;
    const results: Array<{ groupDN: string; success: boolean; message: string }> = [];

    try {
      client = await this.pool.getConnection();
      const userDN = await this.getUserDN(username, client);

      for (const groupDN of groupDNs) {
        try {
          await this.addUserToGroup(userDN, groupDN, client);
          results.push({
            groupDN,
            success: true,
            message: `Usuario agregado exitosamente a: ${groupDN}`
          });
        } catch (error: any) {
          console.error(`Error agregando usuario a grupo ${groupDN}:`, error);
          results.push({
            groupDN,
            success: false,
            message: `Error al agregar a ${groupDN}: ${error.message}`
          });
        }
      }

      // Verificar si todas las operaciones fueron exitosas
      const allSuccess = results.every(result => result.success);
      const failedOperations = results.filter(result => !result.success);

      if (allSuccess) {
        // Obtener grupos actualizados
        const updatedGroups = await this.getUserGroups(username);
        return {
          success: true,
          message: `Usuario agregado exitosamente a ${groupDNs.length} grupo(s)`,
          groups: updatedGroups
        };
      } else {
        return {
          success: false,
          message: `Error en ${failedOperations.length} de ${groupDNs.length} operaciones`,
          error: failedOperations.map(op => op.message).join('; ')
        };
      }

    } catch (error: any) {
      console.error(`Error general al agregar usuario a grupos:`, error);
      return {
        success: false,
        message: 'Error general al procesar la solicitud',
        error: error.message
      };
    } finally {
      if (client) {
        this.pool.releaseConnection(client);
      }
    }
  }

  /**
   * Remover usuario de múltiples grupos
   */
  async removeUserFromGroups(username: string, groupDNs: string[]): Promise<GroupMembershipResult> {
    let client: LDAPClient | null = null;
    const results: Array<{ groupDN: string; success: boolean; message: string }> = [];

    try {
      client = await this.pool.getConnection();
      const userDN = await this.getUserDN(username, client);

      for (const groupDN of groupDNs) {
        try {
          await this.removeUserFromGroup(userDN, groupDN, client);
          results.push({
            groupDN,
            success: true,
            message: `Usuario removido exitosamente de: ${groupDN}`
          });
        } catch (error: any) {
          console.error(`Error removiendo usuario del grupo ${groupDN}:`, error);
          results.push({
            groupDN,
            success: false,
            message: `Error al remover de ${groupDN}: ${error.message}`
          });
        }
      }

      // Verificar si todas las operaciones fueron exitosas
      const allSuccess = results.every(result => result.success);
      const failedOperations = results.filter(result => !result.success);

      if (allSuccess) {
        // Obtener grupos actualizados
        const updatedGroups = await this.getUserGroups(username);
        return {
          success: true,
          message: `Usuario removido exitosamente de ${groupDNs.length} grupo(s)`,
          groups: updatedGroups
        };
      } else {
        return {
          success: false,
          message: `Error en ${failedOperations.length} de ${groupDNs.length} operaciones`,
          error: failedOperations.map(op => op.message).join('; ')
        };
      }

    } catch (error: any) {
      console.error(`Error general al remover usuario de grupos:`, error);
      return {
        success: false,
        message: 'Error general al procesar la solicitud',
        error: error.message
      };
    } finally {
      if (client) {
        this.pool.releaseConnection(client);
      }
    }
  }

  /**
   * Buscar grupos por término de búsqueda
   */
  async searchGroups(searchTerm: string, limit: number = 50): Promise<LDAPGroup[]> {
    let client: LDAPClient | null = null;

    try {
      client = await this.pool.getConnection();

      const filter = `(&(objectClass=group)(|(cn=*${this.escapeSearchTerm(searchTerm)}*)(description=*${this.escapeSearchTerm(searchTerm)}*)(sAMAccountName=*${this.escapeSearchTerm(searchTerm)}*)))`;

      const entries = await searchAsync(client, this.config.baseDN, {
        filter,
        scope: 'sub',
        attributes: ['cn', 'description', 'member', 'memberOf', 'objectClass', 'distinguishedName', 'sAMAccountName'],
        sizeLimit: limit,
        timeLimit: 10
      });

      return entries.map(entry => this.mapEntryToGroup(entry));

    } catch (error: any) {
      console.error(`Error buscando grupos con término "${searchTerm}":`, error);
      throw new Error(`Error en búsqueda de grupos: ${error.message}`);
    } finally {
      if (client) {
        this.pool.releaseConnection(client);
      }
    }
  }

  /**
   * Verificar si un usuario pertenece a un grupo específico
   */
  async isUserInGroup(username: string, groupDN: string): Promise<boolean> {
    try {
      const userGroups = await this.getUserGroups(username);
      return userGroups.some(group => group.dn === groupDN);
    } catch (error) {
      console.error(`Error verificando membresía del usuario ${username} en grupo ${groupDN}:`, error);
      return false;
    }
  }

  /**
   * Obtener información detallada de un grupo específico
   */
  async getGroupDetails(groupDN: string): Promise<LDAPGroup | null> {
    let client: LDAPClient | null = null;

    try {
      client = await this.pool.getConnection();

      const entries = await searchAsync(client, groupDN, {
        filter: '(objectClass=group)',
        scope: 'base',
        attributes: ['cn', 'description', 'member', 'memberOf', 'objectClass', 'distinguishedName', 'sAMAccountName']
      });

      if (entries.length === 0) {
        return null;
      }

      return this.mapEntryToGroup(entries[0]);

    } catch (error: any) {
      console.error(`Error obteniendo detalles del grupo ${groupDN}:`, error);
      throw new Error(`Error al obtener detalles del grupo: ${error.message}`);
    } finally {
      if (client) {
        this.pool.releaseConnection(client);
      }
    }
  }

  /**
   * Métodos privados auxiliares
   */

  private async getUserDN(username: string, client: LDAPClient): Promise<string> {
    const entries = await searchAsync(client, this.config.baseDN, {
      filter: `(&(objectClass=user)(sAMAccountName=${escapeLDAPValue(username)}))`,
      scope: 'sub',
      attributes: ['dn']
    });

    if (entries.length === 0) {
      throw new Error(`Usuario no encontrado: ${username}`);
    }

    return entries[0].dn;
  }

  private async addUserToGroup(userDN: string, groupDN: string, client: LDAPClient): Promise<void> {
    const change = {
      operation: 'add' as const,
      modification: {
        type: 'member',
        values: [userDN]
      }
    };

    try {
      await modifyAsync(client, groupDN, change);
      console.log(`✅ Usuario agregado exitosamente a: ${groupDN}`);
    } catch (error: any) {
      if (error.name === 'ConstraintViolationError' || error.code === 20) {
        console.warn(`⚠️ El usuario ya existe en el grupo: ${groupDN}`);
        return; // No es un error fatal
      }
      throw error;
    }
  }

  private async removeUserFromGroup(userDN: string, groupDN: string, client: LDAPClient): Promise<void> {
    const change = {
      operation: 'delete' as const,
      modification: {
        type: 'member',
        values: [userDN]
      }
    };

    try {
      await modifyAsync(client, groupDN, change);
      console.log(`✅ Usuario removido exitosamente de: ${groupDN}`);
    } catch (error: any) {
      if (error.name === 'NoSuchAttributeError' || error.code === 16) {
        console.warn(`⚠️ El usuario no es miembro del grupo: ${groupDN}`);
        return; // No es un error fatal
      }
      throw error;
    }
  }

  private mapEntryToGroup(entry: any): LDAPGroup {
    const getAttributeValue = (attrName: string) => {
      const attr = entry.attributes.find((a: any) => a.type === attrName);
      return attr?.values?.[0] || attr?.values || undefined;
    };

    const getAttributeValues = (attrName: string) => {
      const attr = entry.attributes.find((a: any) => a.type === attrName);
      return attr?.values || [];
    };

    return {
      dn: entry.dn,
      cn: getAttributeValue('cn'),
      description: getAttributeValue('description'),
      member: getAttributeValues('member'),
      memberOf: getAttributeValues('memberOf'),
      objectClass: getAttributeValues('objectClass'),
      distinguishedName: getAttributeValue('distinguishedName'),
      sAMAccountName: getAttributeValue('sAMAccountName')
    };
  }

  private escapeSearchTerm(term: string): string {
    // Escapar caracteres especiales para búsqueda LDAP
    return term
      .replace(/\\/g, '\\5c')
      .replace(/\*/g, '\\2a')
      .replace(/\(/g, '\\28')
      .replace(/\)/g, '\\29')
      .replace(/\0/g, '\\00');
  }

  /**
   * Limpiar recursos
   */
  destroy() {
    // El pool se maneja globalmente, pero podemos agregar limpieza específica si es necesario
  }
}

// Instancia singleton para reutilización
export const groupService = new GroupService();