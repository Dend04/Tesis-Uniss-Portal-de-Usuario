import { Client } from "ldapjs";
import {
  createLDAPClient,
  bindAsync,
  unifiedLDAPSearch,
} from "../utils/ldap.utils";
import { cacheService } from "../utils/cache.utils";

export interface Usuario {
  dn: string;
  sAMAccountName: string;
  username: string;
  employeeID: string;
  displayName: string;
  mail: string;
  title?: string;
  department?: string;
  company?: string;
  whenCreated?: string;
  whenChanged?: string;
  telefono?: string;
  direccion?: string;
  localidad?: string;
  provincia?: string;
  descripcion?: string;
  añoAcademico?: string;
  tipoEmpleado?: string;
  facultad?: string;
  carrera?: string;
  cuentaHabilitada?: boolean;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export class UsersService {
  private client: Client;
  private readonly CACHE_KEY = "todos_usuarios";
  private readonly CACHE_TTL = 90 * 24 * 60 * 60; // 90 días en segundos

  constructor() {
    this.client = createLDAPClient(process.env.LDAP_URL!);
  }

  /**
   * Obtiene todos los usuarios activos del directorio LDAP con paginación
   */
  async obtenerTodosUsuarios(
    paginationOptions: PaginationOptions = { page: 1, limit: 50 },
    forceRefresh: boolean = false
  ): Promise<{
    success: boolean;
    data?: PaginatedResponse<Usuario>;
    fromCache: boolean;
    error?: string;
  }> {
    try {
      console.log(
        "🔍 Iniciando obtención de todos los usuarios con paginación...",
        paginationOptions
      );

      const { page, limit } = paginationOptions;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      // ✅ Verificar caché primero (a menos que forceRefresh sea true)
      if (!forceRefresh) {
        const cachedUsuarios = cacheService.obtenerUsuarios(this.CACHE_KEY);
        if (cachedUsuarios) {
          console.log("✅ Usuarios obtenidos desde caché con paginación");

          const paginatedUsuarios = cachedUsuarios.slice(startIndex, endIndex);
          const totalPages = Math.ceil(cachedUsuarios.length / limit);

          return {
            success: true,
            data: {
              data: paginatedUsuarios,
              pagination: {
                currentPage: page,
                pageSize: limit,
                totalItems: cachedUsuarios.length,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
              },
            },
            fromCache: true,
          };
        }
      }

      console.log("🔄 Buscando usuarios directamente desde LDAP...");
      await this.authenticate();

      // Filtro para usuarios activos (excluye cuentas deshabilitadas y de sistema)
      const filter =
        "(&(objectCategory=person)(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))";

      const attributes = [
        "dn",
        "sAMAccountName",
        "employeeID",
        "displayName",
        "mail",
        "title",
        "department",
        "company",
        "whenCreated",
        "whenChanged",
        "telephoneNumber",
        "streetAddress",
        "l",
        "st",
        "description",
        "departmentNumber",
        "employeeType",
        "ou",
        "department",
        "userAccountControl",
      ];

      const results = await unifiedLDAPSearch(filter, attributes);

      if (results.length === 0) {
        return {
          success: false,
          fromCache: false,
          error: "No se encontraron usuarios en el directorio",
        };
      }

      // Procesar y transformar los resultados
      const usuarios = this.procesarUsuariosLDAP(results);

      // ✅ Guardar en caché
      cacheService.guardarUsuarios(this.CACHE_KEY, usuarios);

      console.log(
        `✅ ${usuarios.length} usuarios obtenidos y guardados en caché`
      );

      // Aplicar paginación
      const paginatedUsuarios = usuarios.slice(startIndex, endIndex);
      const totalPages = Math.ceil(usuarios.length / limit);

      return {
        success: true,
        data: {
          data: paginatedUsuarios,
          pagination: {
            currentPage: page,
            pageSize: limit,
            totalItems: usuarios.length,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
        fromCache: false,
      };
    } catch (error: any) {
      console.error("❌ Error obteniendo usuarios:", error);

      // En caso de error, intentar devolver datos del caché si existen
      const cachedUsuarios = cacheService.obtenerUsuarios(this.CACHE_KEY);
      if (cachedUsuarios && cachedUsuarios.length > 0) {
        console.log("🔄 Usando datos de caché debido a error en LDAP");

        const { page, limit } = paginationOptions;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedUsuarios = cachedUsuarios.slice(startIndex, endIndex);
        const totalPages = Math.ceil(cachedUsuarios.length / limit);

        return {
          success: true,
          data: {
            data: paginatedUsuarios,
            pagination: {
              currentPage: page,
              pageSize: limit,
              totalItems: cachedUsuarios.length,
              totalPages,
              hasNextPage: page < totalPages,
              hasPrevPage: page > 1,
            },
          },
          fromCache: true,
        };
      }

      return {
        success: false,
        fromCache: false,
        error: error.message || "Error al obtener usuarios del directorio",
      };
    } finally {
      this.safeUnbind();
    }
  }

  /**
   * Obtiene un usuario específico por sAMAccountName
   */
  async obtenerUsuarioPorSAM(sAMAccountName: string): Promise<{
    success: boolean;
    usuario?: Usuario;
    error?: string;
  }> {
    try {
      console.log(`🔍 Buscando usuario: ${sAMAccountName}`);

      // Primero intentar buscar en caché
      const cachedUsuarios = cacheService.obtenerUsuarios(this.CACHE_KEY);
      if (cachedUsuarios) {
        const usuarioEnCache = cachedUsuarios.find(
          (u: Usuario) =>
            u.sAMAccountName.toLowerCase() === sAMAccountName.toLowerCase()
        );

        if (usuarioEnCache) {
          console.log("✅ Usuario encontrado en caché");
          return {
            success: true,
            usuario: usuarioEnCache,
          };
        }
      }

      // Si no está en caché, buscar en LDAP
      await this.authenticate();

      const filter = `(&(objectCategory=person)(objectClass=user)(sAMAccountName=${this.escapeLDAPValue(
        sAMAccountName
      )}))`;

      const attributes = [
        "dn",
        "sAMAccountName",
        "employeeID",
        "displayName",
        "mail",
        "title",
        "department",
        "company",
        "whenCreated",
        "whenChanged",
        "telephoneNumber",
        "streetAddress",
        "l",
        "st",
        "description",
        "departmentNumber",
        "employeeType",
        "ou",
        "department",
        "userAccountControl",
      ];

      const results = await unifiedLDAPSearch(filter, attributes);

      if (results.length === 0) {
        return {
          success: false,
          error: "Usuario no encontrado",
        };
      }

      const usuarios = this.procesarUsuariosLDAP(results);

      return {
        success: true,
        usuario: usuarios[0],
      };
    } catch (error: any) {
      console.error("❌ Error obteniendo usuario:", error);
      return {
        success: false,
        error: error.message || "Error al obtener el usuario",
      };
    } finally {
      this.safeUnbind();
    }
  }

  /**
   * Busca usuarios por nombre, email o employeeID con paginación
   */
  async buscarUsuarios(
    termino: string,
    paginationOptions: PaginationOptions = { page: 1, limit: 50 }
  ): Promise<{
    success: boolean;
    data?: PaginatedResponse<Usuario>;
    error?: string;
  }> {
    try {
      console.log(
        `🔍 Buscando usuarios con término: ${termino}`,
        paginationOptions
      );

      const { page, limit } = paginationOptions;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      // Primero buscar en caché
      const cachedUsuarios = cacheService.obtenerUsuarios(this.CACHE_KEY);
      if (cachedUsuarios) {
        const usuariosFiltrados = cachedUsuarios.filter(
          (usuario: Usuario) =>
            usuario.displayName
              ?.toLowerCase()
              .includes(termino.toLowerCase()) ||
            usuario.sAMAccountName
              ?.toLowerCase()
              .includes(termino.toLowerCase()) ||
            usuario.mail?.toLowerCase().includes(termino.toLowerCase()) ||
            usuario.employeeID?.includes(termino) ||
            usuario.title?.toLowerCase().includes(termino.toLowerCase()) ||
            usuario.company?.toLowerCase().includes(termino.toLowerCase()) ||
            usuario.department?.toLowerCase().includes(termino.toLowerCase())
        );

        const paginatedUsuarios = usuariosFiltrados.slice(startIndex, endIndex);
        const totalPages = Math.ceil(usuariosFiltrados.length / limit);

        console.log(
          `✅ ${usuariosFiltrados.length} usuarios encontrados en caché`
        );
        return {
          success: true,
          data: {
            data: paginatedUsuarios,
            pagination: {
              currentPage: page,
              pageSize: limit,
              totalItems: usuariosFiltrados.length,
              totalPages,
              hasNextPage: page < totalPages,
              hasPrevPage: page > 1,
            },
          },
        };
      }

      // Si no hay caché, buscar en LDAP
      const resultado = await this.obtenerTodosUsuarios();

      if (!resultado.success || !resultado.data) {
        return {
          success: false,
          error: resultado.error,
        };
      }

      const usuariosFiltrados = resultado.data.data.filter(
        (usuario) =>
          usuario.displayName?.toLowerCase().includes(termino.toLowerCase()) ||
          usuario.sAMAccountName
            ?.toLowerCase()
            .includes(termino.toLowerCase()) ||
          usuario.mail?.toLowerCase().includes(termino.toLowerCase()) ||
          usuario.employeeID?.includes(termino) ||
          usuario.title?.toLowerCase().includes(termino.toLowerCase()) ||
          usuario.company?.toLowerCase().includes(termino.toLowerCase()) ||
          usuario.department?.toLowerCase().includes(termino.toLowerCase())
      );

      const paginatedUsuarios = usuariosFiltrados.slice(startIndex, endIndex);
      const totalPages = Math.ceil(usuariosFiltrados.length / limit);

      return {
        success: true,
        data: {
          data: paginatedUsuarios,
          pagination: {
            currentPage: page,
            pageSize: limit,
            totalItems: usuariosFiltrados.length,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      };
    } catch (error: any) {
      console.error("❌ Error buscando usuarios:", error);
      return {
        success: false,
        error: error.message || "Error al buscar usuarios",
      };
    }
  }

  /**
   * Limpia la caché de usuarios
   */
  limpiarCache(): { success: boolean; message: string } {
    try {
      cacheService.limpiarClave(this.CACHE_KEY);

      return {
        success: true,
        message: "Caché de usuarios limpiada exitosamente",
      };
    } catch (error: any) {
      console.error("❌ Error limpiando caché:", error);
      return {
        success: false,
        message: error.message || "Error al limpiar la caché",
      };
    }
  }

  /**
   * Obtiene estadísticas de la caché
   */
  obtenerEstadisticasCache(): any {
    try {
      const estado = cacheService.obtenerEstadoCache();
      const estadisticas = cacheService.obtenerEstadisticas();

      return {
        success: true,
        cache: {
          estado,
          estadisticas,
          tieneUsuarios: cacheService.tieneDatos(this.CACHE_KEY),
          clave: this.CACHE_KEY,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Error al obtener estadísticas",
      };
    }
  }

  /**
   * Procesa los resultados LDAP y los transforma a la interfaz Usuario
   */
  private procesarUsuariosLDAP(results: any[]): Usuario[] {
    return results
      .map((entry) => {
        const getAttributeValue = (attrName: string): string => {
          const attr = entry.attributes.find(
            (attr: any) => attr.type === attrName
          );
          if (attr && attr.values && attr.values.length > 0) {
            const value = Array.isArray(attr.values)
              ? attr.values[0]
              : attr.values;
            return value || "";
          }
          return "";
        };

        const dn = entry.objectName ? entry.objectName.toString() : "";
        const sAMAccountName = getAttributeValue("sAMAccountName");
        const userAccountControl = parseInt(
          getAttributeValue("userAccountControl") || "0"
        );
        const cuentaHabilitada = (userAccountControl & 2) === 0;

        return {
          dn,
          sAMAccountName,
          username: sAMAccountName,
          employeeID: getAttributeValue("employeeID"),
          displayName: getAttributeValue("displayName"),
          mail: getAttributeValue("mail"),
          title: getAttributeValue("title"),
          department: getAttributeValue("department"),
          company: getAttributeValue("company"),
          whenCreated: getAttributeValue("whenCreated"),
          whenChanged: getAttributeValue("whenChanged"),
          telefono: getAttributeValue("telephoneNumber"),
          direccion: getAttributeValue("streetAddress"),
          localidad: getAttributeValue("l"),
          provincia: getAttributeValue("st"),
          descripcion: getAttributeValue("description"),
          añoAcademico: getAttributeValue("departmentNumber"),
          tipoEmpleado: getAttributeValue("employeeType"),
          facultad: getAttributeValue("ou"),
          carrera: getAttributeValue("department"),
          cuentaHabilitada,
        };
      })
      .filter(
        (usuario) =>
          // Filtrar usuarios sin sAMAccountName (cuentas de sistema)
          usuario.sAMAccountName &&
          usuario.sAMAccountName.length > 0 &&
          !usuario.sAMAccountName.endsWith("$") // Excluir cuentas de equipo
      );
  }

  private async authenticate(): Promise<void> {
    await bindAsync(
      this.client,
      process.env.LDAP_ADMIN_DN!,
      process.env.LDAP_ADMIN_PASSWORD!
    );
  }

  private safeUnbind() {
    try {
      this.client.unbind();
    } catch (error) {
      console.error("Error al cerrar conexión LDAP:", error);
    }
  }

  private escapeLDAPValue(value: string): string {
    if (!value) return "";
    return value
      .replace(/\\/g, "\\\\")
      .replace(/,/g, "\\,")
      .replace(/"/g, '\\"')
      .replace(/</g, "\\<")
      .replace(/>/g, "\\>")
      .replace(/;/g, "\\;")
      .replace(/=/g, "\\=")
      .replace(/\+/g, "\\+")
      .replace(/\#/g, "\\#")
      .replace(/\r/g, "")
      .replace(/\n/g, "");
  }
}

export const usersService = new UsersService();
