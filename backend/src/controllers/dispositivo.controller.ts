import { PrismaClient } from ".prisma/client_portal";
import { Request, Response } from "express";
import { TokenPayload } from "../utils/jwt.utils";
import {
  addUserToGroup,
  LdapAttribute,
  unifiedLDAPSearch,
} from "../utils/ldap.utils";

const prisma = new PrismaClient();

// Extender la interfaz Request para incluir user
interface AuthRequest extends Request {
  user?: TokenPayload;
}

// ✅ FUNCIÓN SIMPLIFICADA PARA DETERMINAR TIPO DE USUARIO DESDE EL TITLE DEL TOKEN
function determineUserTypeFromTitle(title?: string): string {
  if (!title) {
    console.log(`🔍 [USER_TYPE] Title no disponible en el token`);
    return 'Estudiante u Otro';
  }

  console.log(`🔍 [USER_TYPE] Analizando title del token: "${title}"`);

  const lowerTitle = title.toLowerCase();

  // ✅ PALABRAS CLAVE PARA IDENTIFICAR DOCENTES
  const docenteKeywords = [
    'docente', 'profesor', 'teacher', 'faculty', 'catedra', 
    'profesora', 'catedrático', 'catedrática', 'enseñanza',
    'educador', 'educadora', 'maestro', 'maestra'
  ];

  // ✅ PALABRAS CLAVE PARA IDENTIFICAR INVESTIGADORES
  const investigadorKeywords = [
    'investigador', 'investigadora', 'investigator', 'research', 
    'científico', 'científica', 'science', 'investigación',
    'investigacion', 'researcher', 'ciencia'
  ];

  const isDocente = docenteKeywords.some(keyword => 
    lowerTitle.includes(keyword)
  );

  const isInvestigador = investigadorKeywords.some(keyword => 
    lowerTitle.includes(keyword)
  );

  if (isDocente && isInvestigador) {
    return 'Docente e Investigador';
  } else if (isDocente) {
    return 'Docente';
  } else if (isInvestigador) {
    return 'Investigador';
  }

  // ✅ SI NO ES DOCENTE NI INVESTIGADOR, VERIFICAR SI ES ESTUDIANTE
  const estudianteKeywords = [
    'estudiante', 'student', 'alumno', 'alumna', 'aprendiz'
  ];

  const isEstudiante = estudianteKeywords.some(keyword =>
    lowerTitle.includes(keyword)
  );

  if (isEstudiante) {
    return 'Estudiante';
  }

  console.log(`🔍 [USER_TYPE] Title no coincide con categorías conocidas: "${title}"`);
  return 'Personal u Otro';
}

// ✅ FUNCIÓN MEJORADA PARA AGREGAR USUARIOS A GRUPOS SEGÚN SU TIPO
async function addUserToGroupsIfNeeded(username: string, userTitle?: string): Promise<{
  wifiGroupUpdated: boolean;
  vipGroupUpdated: boolean;
  userType?: string;
}> {
  try {
    console.log(`🔗 [LDAP] Verificando membresía de ${username} en grupos`);
    console.log(`👨‍🏫 [LDAP] Title del usuario: ${userTitle}`);

    // 1. Buscar el usuario en LDAP para obtener su DN
    const userEntries = await unifiedLDAPSearch(
      `(&(objectClass=user)(sAMAccountName=${username}))`,
      ["distinguishedName", "memberOf"]
    );

    if (userEntries.length === 0) {
      console.error(`❌ [LDAP] Usuario ${username} no encontrado en LDAP`);
      return { wifiGroupUpdated: false, vipGroupUpdated: false };
    }

    const userEntry = userEntries[0];
    
    // Obtener DN como string
    let userDN = userEntry.dn;
    if (typeof userDN !== 'string') {
      userDN = userDN.toString();
    }

    console.log(`✅ [LDAP] DN (string): ${userDN}`);

    const groups = {
      wifi: "CN=wifi_users,OU=_Grupos,DC=uniss,DC=edu,DC=cu",
      vip: "CN=internet_prof_vip,OU=_Grupos,DC=uniss,DC=edu,DC=cu"
    };

    // Verificar si ya es miembro de los grupos
    let memberOfArray: string[] = [];
    
    if ((userEntry as any).attributes) {
      const memberOfAttr = (userEntry as any).attributes.find((attr: LdapAttribute) => 
        attr.type === 'memberOf'
      );
      if (memberOfAttr && memberOfAttr.values) {
        memberOfArray = Array.isArray(memberOfAttr.values) 
          ? memberOfAttr.values 
          : [memberOfAttr.values];
      }
    }

    console.log(`🔍 [LDAP] Grupos del usuario:`, memberOfArray);

    const isInWifiGroup = memberOfArray.some((group: string) =>
      group.toLowerCase().includes('cn=wifi_users')
    );

    const isInVipGroup = memberOfArray.some((group: string) =>
      group.toLowerCase().includes('cn=internet_prof_vip')
    );

    // ✅ DETERMINAR TIPO DE USUARIO BASADO EN EL TITLE DEL TOKEN
    const userType = determineUserTypeFromTitle(userTitle);
    console.log(`👨‍🏫 [LDAP] Tipo de usuario detectado desde token: ${userType}`);

    let wifiGroupAdded = false;
    let vipGroupAdded = false;

    // Agregar a wifi_users si no está (para todos los usuarios con dispositivos)
    if (!isInWifiGroup) {
      try {
        console.log(`➡️ [LDAP] Agregando usuario ${username} a grupo wifi_users...`);
        await addUserToGroup(userDN, groups.wifi);
        console.log(`✅ [LDAP] Usuario ${username} agregado exitosamente al grupo wifi_users`);
        wifiGroupAdded = true;
      } catch (error) {
        console.error(`❌ [LDAP] Error agregando a wifi_users:`, error);
        // Manejar el caso donde el usuario ya es miembro
        if (error instanceof Error && 
            (error.message.includes('already exists') || 
             error.message.includes('constraint'))) {
          console.log(`✅ [LDAP] Usuario ya era miembro de wifi_users`);
        }
      }
    } else {
      console.log(`✅ [LDAP] Usuario ${username} ya es miembro de wifi_users`);
    }

    // ✅ AGREGAR A internet_prof_vip SI ES DOCENTE/INVESTIGADOR Y NO ESTÁ EN EL GRUPO
    const isTeacherOrResearcher = userType === 'Docente' || userType === 'Investigador';
    
    if (isTeacherOrResearcher && !isInVipGroup) {
      try {
        console.log(`➡️ [LDAP] Agregando usuario ${username} (${userType}) a grupo internet_prof_vip...`);
        await addUserToGroup(userDN, groups.vip);
        console.log(`✅ [LDAP] Usuario ${username} agregado exitosamente al grupo internet_prof_vip`);
        vipGroupAdded = true;
      } catch (error) {
        console.error(`❌ [LDAP] Error agregando a internet_prof_vip:`, error);
        // Manejar el caso donde el usuario ya es miembro
        if (error instanceof Error && 
            (error.message.includes('already exists') || 
             error.message.includes('constraint'))) {
          console.log(`✅ [LDAP] Usuario ya era miembro de internet_prof_vip`);
        }
      }
    } else {
      if (isInVipGroup) {
        console.log(`✅ [LDAP] Usuario ${username} ya es miembro de internet_prof_vip`);
      } else if (!isTeacherOrResearcher) {
        console.log(`ℹ️ [LDAP] Usuario ${username} no es Docente/Investigador (${userType}), no se agrega a internet_prof_vip`);
      }
    }

    return { 
      wifiGroupUpdated: wifiGroupAdded, 
      vipGroupUpdated: vipGroupAdded,
      userType 
    };

  } catch (error) {
    console.error(`❌ [LDAP] Error general:`, error);
    
    // Manejar el caso donde el usuario ya es miembro
    if (error instanceof Error) {
      if ((error as any).code === 20 || 
          error.message.includes('already exists') ||
          error.message.includes('constraint')) {
        console.log(`✅ [LDAP] Usuario ya era miembro de algún grupo`);
        return { wifiGroupUpdated: false, vipGroupUpdated: false };
      }
    }
    
    return { wifiGroupUpdated: false, vipGroupUpdated: false };
  }
}

// ✅ FUNCIÓN CORREGIDA PARA EXTRAER USERNAME DEL TOKEN (ACEPTA UNDEFINED)
function extractUsernameFromToken(userPayload: TokenPayload | undefined): string | null {
  if (!userPayload) {
    console.error("❌ [EXTRACT] CRÍTICO: userPayload está vacío");
    return null;
  }

  console.log(
    "🔍 [EXTRACT] Buscando username en payload completo:",
    userPayload
  );

  // ✅ PRIORIDAD: sAMAccountName del token (es el campo principal)
  if (userPayload.sAMAccountName) {
    console.log(`✅ [EXTRACT] Username encontrado en sAMAccountName:`, userPayload.sAMAccountName);
    return userPayload.sAMAccountName;
  }

  // ✅ FALLBACK: username del token
  if (userPayload.username) {
    console.log(`✅ [EXTRACT] Username encontrado en username:`, userPayload.username);
    return userPayload.username;
  }

  console.error(
    "❌ [EXTRACT] CRÍTICO: No se pudo extraer ningún username del token"
  );
  return null;
}

export const dispositivoController = {
  // CREATE - Crear nuevo dispositivo (OBLIGATORIO username del token)
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      console.log("🔐 [CREATE] Iniciando creación de dispositivo...");
      console.log("👤 [CREATE] req.user recibido:", req.user);

      // ✅ VERIFICACIÓN MÁS DETALLADA
      if (!req.user) {
        console.error("❌ [CREATE] CRÍTICO: req.user está completamente vacío");
        res.status(401).json({
          success: false,
          error: "Usuario no autenticado. Middleware falló.",
        });
        return;
      }

      const username = extractUsernameFromToken(req.user);

      if (!username) {
        console.error(
          "❌ [CREATE] No se pudo extraer username del payload:",
          req.user
        );
        res.status(401).json({
          success: false,
          error: "No se pudo identificar al usuario desde el token.",
          detalles: "El token no contiene información de usuario válida",
          campos_disponibles: Object.keys(req.user),
        });
        return;
      }

      console.log("✅ [CREATE] Usuario identificado para creación:", username);
      console.log("🎓 [CREATE] Title del usuario:", req.user.title);

      // ✅ VERIFICAR LÍMITE DE DISPOSITIVOS (4 POR USUARIO)
      const userDevicesCount = await prisma.dispositivo.count({
        where: { username },
      });

      if (userDevicesCount >= 4) {
        console.error(
          `❌ [CREATE] Límite alcanzado para usuario ${username}: ${userDevicesCount} dispositivos`
        );
        res.status(400).json({
          success: false,
          error:
            "Límite de dispositivos alcanzado. Máximo 4 dispositivos por usuario.",
        });
        return;
      }

      const { mac, nombre, tipo } = req.body;
      console.log("📦 [CREATE] Datos recibidos del body:", {
        mac,
        nombre,
        tipo,
      });

      // Validar campos obligatorios
      if (!mac || !nombre || !tipo) {
        console.error("❌ [CREATE] Campos faltantes:", { mac, nombre, tipo });
        res.status(400).json({
          success: false,
          error: "Los campos mac, nombre y tipo son obligatorios",
        });
        return;
      }

      // Verificar si el MAC ya existe
      const existingDevice = await prisma.dispositivo.findUnique({
        where: { mac },
      });

      if (existingDevice) {
        console.error("❌ [CREATE] MAC ya existe:", mac);
        res.status(400).json({
          success: false,
          error: "El dispositivo con este MAC ya existe",
        });
        return;
      }

      // Crear el dispositivo con el username del token
      const dispositivo = await prisma.dispositivo.create({
        data: {
          mac,
          nombre,
          tipo,
          username,
        },
      });

      console.log("✅ [CREATE] Dispositivo creado exitosamente:", dispositivo);

      // ✅ LLAMAR A LA NUEVA FUNCIÓN DE GRUPOS CON EL TITLE DEL TOKEN
      try {
        const { wifiGroupUpdated, vipGroupUpdated, userType } = await addUserToGroupsIfNeeded(
          username, 
          req.user.title // ✅ PASAMOS EL TITLE DIRECTAMENTE DESDE EL TOKEN
        );

        console.log(`✅ [CREATE] Resultado grupos LDAP:`, {
          wifiGroupUpdated,
          vipGroupUpdated,
          userType
        });

        res.status(201).json({
          success: true,
          message: "Dispositivo creado exitosamente",
          data: dispositivo,
          ldapGroupsUpdated: {
            wifi_users: wifiGroupUpdated,
            internet_prof_vip: vipGroupUpdated
          },
          userType,
          userDeviceCount: userDevicesCount + 1
        });

      } catch (ldapError) {
        console.error(
          "⚠️ [CREATE] Error al verificar/agregar usuario a grupos LDAP:",
          ldapError
        );
        // No fallamos la creación del dispositivo por este error
        res.status(201).json({
          success: true,
          message: "Dispositivo creado exitosamente, pero error al actualizar grupos LDAP",
          data: dispositivo,
          ldapGroupsUpdated: {
            wifi_users: false,
            internet_prof_vip: false
          },
          warning: "Error al actualizar grupos de acceso"
        });
      }

    } catch (error) {
      console.error("❌ [CREATE] Error creating dispositivo:", error);

      if (
        error instanceof Error &&
        error.message.includes("Can't reach database server")
      ) {
        res.status(503).json({
          success: false,
          error: "Servicio de base de datos no disponible",
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  },

  // READ - Obtener todos los dispositivos DEL USUARIO AUTENTICADO
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      // ✅ VERIFICACIÓN MEJORADA CON MÁS DETALLES
      if (!req.user) {
        console.error(
          "❌ CRÍTICO: req.user está vacío - Middleware no funcionó"
        );
        res.status(401).json({
          success: false,
          error: "Usuario no autenticado - Middleware falló",
        });
        return;
      }

      const username = extractUsernameFromToken(req.user);

      if (!username) {
        console.error("❌ No se pudo extraer username del payload:", req.user);
        res.status(401).json({
          success: false,
          error: "No se pudo identificar al usuario",
          detalles: "El token no contiene información de usuario válida",
        });
        return;
      }

      console.log("👤 Obteniendo dispositivos para usuario:", username);

      // Parámetros de paginación con valores por defecto
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";
      const tipo = req.query.tipo as string;

      // Calcular skip
      const skip = (page - 1) * limit;

      // Construir filtro WHERE - SOLO dispositivos del usuario autenticado
      let where: any = { username };

      // Filtro de búsqueda por MAC o nombre
      if (search) {
        where.OR = [
          { mac: { contains: search, mode: "insensitive" } },
          { nombre: { contains: search, mode: "insensitive" } },
        ];
      }

      // Filtro por tipo
      if (tipo) {
        where.tipo = tipo;
      }

      console.log("🔍 Filtros aplicados:", { where, skip, limit });

      // Obtener dispositivos y total en paralelo
      const [dispositivos, total] = await Promise.all([
        // Datos paginados
        prisma.dispositivo.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),

        // Total de registros
        prisma.dispositivo.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      console.log(
        `✅ Encontrados ${dispositivos.length} dispositivos de ${total} totales`
      );

      res.json({
        success: true,
        data: dispositivos,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        filters: {
          search,
          tipo,
        },
      });
    } catch (error) {
      console.error("❌ Error fetching dispositivos:", error);

      if (
        error instanceof Error &&
        error.message.includes("Can't reach database server")
      ) {
        res.status(503).json({
          success: false,
          error: "Servicio de base de datos no disponible",
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  },

  // READ - Obtener dispositivo por ID (solo si pertenece al usuario)
  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "Usuario no autenticado",
        });
        return;
      }

      const username = extractUsernameFromToken(req.user);

      if (!username) {
        res.status(401).json({
          success: false,
          error: "Usuario no autenticado",
        });
        return;
      }

      console.log(`🔍 Buscando dispositivo ${id} para usuario: ${username}`);

      const dispositivo = await prisma.dispositivo.findFirst({
        where: {
          id: Number(id),
          username,
        },
      });

      if (!dispositivo) {
        res.status(404).json({
          success: false,
          error: "Dispositivo no encontrado",
        });
        return;
      }

      res.json({
        success: true,
        data: dispositivo,
      });
    } catch (error) {
      console.error("❌ Error fetching dispositivo:", error);

      if (
        error instanceof Error &&
        error.message.includes("Can't reach database server")
      ) {
        res.status(503).json({
          success: false,
          error: "Servicio de base de datos no disponible",
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  },

  // UPDATE - Actualizar dispositivo (solo si pertenece al usuario)
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { mac, nombre, tipo } = req.body;
      
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "Usuario no autenticado",
        });
        return;
      }

      const username = extractUsernameFromToken(req.user);

      if (!username) {
        res.status(401).json({
          success: false,
          error: "Usuario no autenticado",
        });
        return;
      }

      console.log(
        `✏️ Actualizando dispositivo ${id} para usuario: ${username}`
      );

      // Verificar si existe y pertenece al usuario
      const existing = await prisma.dispositivo.findFirst({
        where: {
          id: Number(id),
          username,
        },
      });

      if (!existing) {
        res.status(404).json({
          success: false,
          error: "Dispositivo no encontrado",
        });
        return;
      }

      // Si se actualiza MAC, verificar que no exista otro con el mismo MAC
      if (mac && mac !== existing.mac) {
        const macExists = await prisma.dispositivo.findUnique({
          where: { mac },
        });

        if (macExists) {
          res.status(400).json({
            success: false,
            error: "El nuevo MAC ya está registrado en otro dispositivo",
          });
          return;
        }
      }

      const dispositivo = await prisma.dispositivo.update({
        where: { id: Number(id) },
        data: { mac, nombre, tipo },
      });

      res.json({
        success: true,
        message: "Dispositivo actualizado exitosamente",
        data: dispositivo,
      });
    } catch (error) {
      console.error("❌ Error updating dispositivo:", error);

      if (
        error instanceof Error &&
        error.message.includes("Can't reach database server")
      ) {
        res.status(503).json({
          success: false,
          error: "Servicio de base de datos no disponible",
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  },

  // DELETE - Eliminar dispositivo (solo si pertenece al usuario)
  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "Usuario no autenticado",
        });
        return;
      }

      const username = extractUsernameFromToken(req.user);

      if (!username) {
        res.status(401).json({
          success: false,
          error: "Usuario no autenticado",
        });
        return;
      }

      console.log(`🗑️ Eliminando dispositivo ${id} para usuario: ${username}`);

      // Verificar si existe y pertenece al usuario
      const existing = await prisma.dispositivo.findFirst({
        where: {
          id: Number(id),
          username,
        },
      });

      if (!existing) {
        res.status(404).json({
          success: false,
          error: "Dispositivo no encontrado",
        });
        return;
      }

      await prisma.dispositivo.delete({
        where: { id: Number(id) },
      });

      res.json({
        success: true,
        message: "Dispositivo eliminado exitosamente",
      });
    } catch (error) {
      console.error("❌ Error deleting dispositivo:", error);

      if (
        error instanceof Error &&
        error.message.includes("Can't reach database server")
      ) {
        res.status(503).json({
          success: false,
          error: "Servicio de base de datos no disponible",
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  },

  // GET - Estadísticas de dispositivos DEL USUARIO
  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "Usuario no autenticado",
        });
        return;
      }

      const username = extractUsernameFromToken(req.user);

      if (!username) {
        res.status(401).json({
          success: false,
          error: "Usuario no autenticado",
        });
        return;
      }

      const [total, porTipo, ultimaSemana] = await Promise.all([
        prisma.dispositivo.count({ where: { username } }),

        prisma.dispositivo.groupBy({
          by: ["tipo"],
          where: { username },
          _count: {
            _all: true,
          },
          orderBy: {
            _count: {
              id: "desc",
            },
          },
        }),

        prisma.dispositivo.count({
          where: {
            username,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

      res.json({
        success: true,
        data: {
          total,
          porTipo,
          ultimaSemana,
          promedioPorDia: Math.round(ultimaSemana / 7),
        },
      });
    } catch (error) {
      console.error("❌ Error fetching dispositivos stats:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  },

  // Obtener fabricante por MAC
  async getDeviceManufacturer(
    req: Request<{ mac: string }>,
    res: Response
  ): Promise<void> {
    try {
      const { mac } = req.params;

      const macRegex = /^([0-9A-Fa-f]{2}[:-]?){5}([0-9A-Fa-f]{2})$/;
      if (!mac || !macRegex.test(mac)) {
        res.status(400).json({
          success: false,
          error: "Formato MAC inválido",
          formato_esperado: "XX:XX:XX:XX:XX:XX",
          ejemplo_valido: "00:14:22:01:23:45",
        });
        return;
      }

      const cleanMac = mac.replace(/[^A-Fa-f0-9]/g, "").toUpperCase();
      const manufacturer = await this.getManufacturerMultiSource(cleanMac);

      res.json({
        success: true,
        data: {
          mac: cleanMac.match(/.{1,2}/g)?.join(":") || cleanMac,
          manufacturer,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("❌ Error detallado:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      res.status(500).json({
        success: false,
        error: "Error interno",
        detalles:
          process.env.NODE_ENV === "development"
            ? errorMessage
            : "Contactar al administrador",
      });
    }
  },

  // Método auxiliar para obtener fabricante (simulado)
  async getManufacturerMultiSource(mac: string): Promise<string> {
    const manufacturers: { [key: string]: string } = {
      "001422": "Cisco Systems",
      "0050F2": "Microsoft",
      "000C29": "VMware",
      "001C14": "Apple",
      "001E65": "Samsung",
      F41A9C: "OPPO",
      "0021B9": "Intel",
      "0022B0": "Dell",
      "0023D4": "LG",
      "0024E8": "Huawei",
      "002564": "TP-Link",
    };

    const prefix = mac.substring(0, 6);
    return manufacturers[prefix] || "Fabricante desconocido";
  },
};