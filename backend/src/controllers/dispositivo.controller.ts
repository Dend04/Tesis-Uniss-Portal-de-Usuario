import { PrismaClient } from '.prisma/client_portal';
import { Request, Response } from 'express';
import { TokenPayload } from '../utils/jwt.utils';
import { addUserToGroup, LdapAttribute, unifiedLDAPSearch } from '../utils/ldap.utils';

const prisma = new PrismaClient();

// Extender la interfaz Request para incluir user
interface AuthRequest extends Request {
  user?: TokenPayload;
}

export const dispositivoController = {
  // CREATE - Crear nuevo dispositivo (OBLIGATORIO username del token)
// En dispositivo.controller.ts - método create
async create(req: AuthRequest, res: Response): Promise<void> {
  try {
    console.log('🔐 [CREATE] Iniciando creación de dispositivo...');
    console.log('👤 [CREATE] req.user recibido:', req.user);
    
    // ✅ VERIFICACIÓN MÁS DETALLADA
    if (!req.user) {
      console.error('❌ [CREATE] CRÍTICO: req.user está completamente vacío');
      res.status(401).json({
        success: false,
        error: 'Usuario no autenticado. Middleware falló.'
      });
      return;
    }

    const username = extractUsernameFromToken(req.user);
    
    if (!username) {
      console.error('❌ [CREATE] No se pudo extraer username del payload:', req.user);
      res.status(401).json({
        success: false,
        error: 'No se pudo identificar al usuario desde el token.',
        detalles: 'El token no contiene información de usuario válida',
        campos_disponibles: Object.keys(req.user)
      });
      return;
    }

    console.log('✅ [CREATE] Usuario identificado para creación:', username);

    const { mac, nombre, tipo } = req.body;
    console.log('📦 [CREATE] Datos recibidos del body:', { mac, nombre, tipo });

    // Validar campos obligatorios
    if (!mac || !nombre || !tipo) {
      console.error('❌ [CREATE] Campos faltantes:', { mac, nombre, tipo });
      res.status(400).json({
        success: false,
        error: 'Los campos mac, nombre y tipo son obligatorios'
      });
      return;
    }

    // Verificar si el MAC ya existe
    const existingDevice = await prisma.dispositivo.findUnique({
      where: { mac }
    });

    if (existingDevice) {
      console.error('❌ [CREATE] MAC ya existe:', mac);
      res.status(400).json({
        success: false,
        error: 'El dispositivo con este MAC ya existe'
      });
      return;
    }

    // Crear el dispositivo con el username del token
    const dispositivo = await prisma.dispositivo.create({
      data: {
        mac,
        nombre,
        tipo,
        username
      }
    });

    console.log('✅ [CREATE] Dispositivo creado exitosamente:', dispositivo);

    // ✅ AGREGAR USUARIO AL GRUPO WIFI_USERS SI NO PERTENECE
    try {
      const groupAdded = await this.addUserToWifiGroupIfNeeded(username);
      
      if (groupAdded) {
        console.log(`✅ [CREATE] Usuario ${username} agregado al grupo wifi_users`);
      } else {
        console.log(`✅ [CREATE] Usuario ${username} ya estaba en grupo wifi_users`);
      }
      
    } catch (ldapError) {
      console.error('⚠️ [CREATE] Error al verificar/agregar usuario a grupo wifi:', ldapError);
      // No fallamos la creación del dispositivo por este error, solo log
    }

    res.status(201).json({
      success: true,
      message: 'Dispositivo creado exitosamente',
      data: dispositivo,
      ldapGroupUpdated: true
    });
  } catch (error) {
    console.error('❌ [CREATE] Error creating dispositivo:', error);
    
    if (error instanceof Error && error.message.includes('Can\'t reach database server')) {
      res.status(503).json({
        success: false,
        error: 'Servicio de base de datos no disponible'
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
},

async addUserToWifiGroupIfNeeded(username: string): Promise<boolean> {
  try {
    console.log(`🔗 [LDAP] Verificando membresía de ${username} en grupo wifi_users`);
    
    // 1. Buscar el usuario en LDAP para obtener su DN
    const userEntries = await unifiedLDAPSearch(
      `(&(objectClass=user)(sAMAccountName=${username}))`,
      ['distinguishedName', 'memberOf']
    );

    if (userEntries.length === 0) {
      console.error(`❌ [LDAP] Usuario ${username} no encontrado en LDAP`);
      return false;
    }

    const userEntry = userEntries[0];
    const userDN = userEntry.dn;
    
    console.log(`✅ [LDAP] DN encontrado para ${username}: ${userDN}`);

    // 2. Verificar si ya es miembro del grupo wifi_users
    const groupDN = "CN=wifi_users,OU=_Grupos,DC=uniss,DC=edu,DC=cu";
    
    // ✅ CORREGIDO: Tipar correctamente el atributo
    const memberOfAttr = userEntry.attributes?.find((attr: LdapAttribute) => attr.type === 'memberOf');
    
    // ✅ CORREGIDO: Manejar tanto string como string[]
    const memberOfValues = memberOfAttr?.values;
    const memberOfArray = Array.isArray(memberOfValues) 
      ? memberOfValues 
      : memberOfValues 
        ? [memberOfValues] 
        : [];
    
    const isAlreadyMember = memberOfArray.some((group: string) => 
      group.toLowerCase().includes('cn=wifi_users')
    );

    if (isAlreadyMember) {
      console.log(`✅ [LDAP] Usuario ${username} ya es miembro de wifi_users`);
      return false;
    }

    console.log(`➡️ [LDAP] Agregando usuario ${username} a grupo wifi_users...`);
    
    // 3. Agregar al grupo usando la función del utils
    await addUserToGroup(userDN, groupDN);
    
    console.log(`✅ [LDAP] Usuario ${username} agregado exitosamente al grupo wifi_users`);
    return true;
    
  } catch (error) {
    console.error(`❌ [LDAP] Error en addUserToWifiGroupIfNeeded:`, error);
    
    // Manejar errores específicos de LDAP
    if (error instanceof Error) {
      if (error.message.includes('Already exists') || error.message.includes('constraint violation')) {
        console.log(`✅ [LDAP] Usuario ${username} ya era miembro del grupo (detectado por constraint)`);
        return false;
      }
    }
    
    throw error;
  }
},

  // READ - Obtener todos los dispositivos DEL USUARIO AUTENTICADO
async getAll(req: AuthRequest, res: Response): Promise<void> {
  try {
    // ✅ VERIFICACIÓN MEJORADA CON MÁS DETALLES
    if (!req.user) {
      console.error('❌ CRÍTICO: req.user está vacío - Middleware no funcionó');
      res.status(401).json({
        success: false,
        error: 'Usuario no autenticado - Middleware falló'
      });
      return;
    }

    const username = extractUsernameFromToken(req.user);
    
    if (!username) {
      console.error('❌ No se pudo extraer username del payload:', req.user);
      res.status(401).json({
        success: false,
        error: 'No se pudo identificar al usuario',
        detalles: 'El token no contiene información de usuario válida'
      });
      return;
    }

    console.log('👤 Obteniendo dispositivos para usuario:', username);

      // Parámetros de paginación con valores por defecto
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string || '';
      const tipo = req.query.tipo as string;
      
      // Calcular skip
      const skip = (page - 1) * limit;
      
      // Construir filtro WHERE - SOLO dispositivos del usuario autenticado
      let where: any = { username };
      
      // Filtro de búsqueda por MAC o nombre
      if (search) {
        where.OR = [
          { mac: { contains: search, mode: 'insensitive' } },
          { nombre: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      // Filtro por tipo
      if (tipo) {
        where.tipo = tipo;
      }

      console.log('🔍 Filtros aplicados:', { where, skip, limit });

      // Obtener dispositivos y total en paralelo
      const [dispositivos, total] = await Promise.all([
        // Datos paginados
        prisma.dispositivo.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        
        // Total de registros
        prisma.dispositivo.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      console.log(`✅ Encontrados ${dispositivos.length} dispositivos de ${total} totales`);

      res.json({
        success: true,
        data: dispositivos,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        filters: {
          search,
          tipo
        }
      });
    } catch (error) {
      console.error('❌ Error fetching dispositivos:', error);
      
      if (error instanceof Error && error.message.includes('Can\'t reach database server')) {
        res.status(503).json({
          success: false,
          error: 'Servicio de base de datos no disponible'
        });
        return;
      }
      
       res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
    }
  },

  // READ - Obtener dispositivo por ID (solo si pertenece al usuario)
  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const username = extractUsernameFromToken(req.user);
      
      if (!username) {
        res.status(401).json({ 
          success: false,
          error: 'Usuario no autenticado' 
        });
        return;
      }
      
      console.log(`🔍 Buscando dispositivo ${id} para usuario: ${username}`);

      const dispositivo = await prisma.dispositivo.findFirst({
        where: { 
          id: Number(id),
          username
        }
      });

      if (!dispositivo) {
        res.status(404).json({ 
          success: false,
          error: 'Dispositivo no encontrado' 
        });
        return;
      }

      res.json({ 
        success: true,
        data: dispositivo 
      });
    } catch (error) {
      console.error('❌ Error fetching dispositivo:', error);
      
      if (error instanceof Error && error.message.includes('Can\'t reach database server')) {
        res.status(503).json({
          success: false,
          error: 'Servicio de base de datos no disponible'
        });
        return;
      }
      
      res.status(500).json({ 
        success: false,
        error: 'Error interno del servidor' 
      });
    }
  },

  // UPDATE - Actualizar dispositivo (solo si pertenece al usuario)
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { mac, nombre, tipo } = req.body;
      const username = extractUsernameFromToken(req.user);

      if (!username) {
        res.status(401).json({ 
          success: false,
          error: 'Usuario no autenticado' 
        });
        return;
      }

      console.log(`✏️ Actualizando dispositivo ${id} para usuario: ${username}`);

      // Verificar si existe y pertenece al usuario
      const existing = await prisma.dispositivo.findFirst({
        where: { 
          id: Number(id),
          username 
        }
      });

      if (!existing) {
        res.status(404).json({ 
          success: false,
          error: 'Dispositivo no encontrado' 
        });
        return;
      }

      // Si se actualiza MAC, verificar que no exista otro con el mismo MAC
      if (mac && mac !== existing.mac) {
        const macExists = await prisma.dispositivo.findUnique({
          where: { mac }
        });

        if (macExists) {
          res.status(400).json({
            success: false,
            error: 'El nuevo MAC ya está registrado en otro dispositivo'
          });
          return;
        }
      }

      const dispositivo = await prisma.dispositivo.update({
        where: { id: Number(id) },
        data: { mac, nombre, tipo }
      });

      res.json({
        success: true,
        message: 'Dispositivo actualizado exitosamente',
        data: dispositivo
      });
    } catch (error) {
      console.error('❌ Error updating dispositivo:', error);
      
      if (error instanceof Error && error.message.includes('Can\'t reach database server')) {
        res.status(503).json({
          success: false,
          error: 'Servicio de base de datos no disponible'
        });
        return;
      }
      
      res.status(500).json({ 
        success: false,
        error: 'Error interno del servidor' 
      });
    }
  },

  // DELETE - Eliminar dispositivo (solo si pertenece al usuario)
  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const username = extractUsernameFromToken(req.user);

      if (!username) {
        res.status(401).json({ 
          success: false,
          error: 'Usuario no autenticado' 
        });
        return;
      }

      console.log(`🗑️ Eliminando dispositivo ${id} para usuario: ${username}`);

      // Verificar si existe y pertenece al usuario
      const existing = await prisma.dispositivo.findFirst({
        where: { 
          id: Number(id),
          username 
        }
      });

      if (!existing) {
        res.status(404).json({ 
          success: false,
          error: 'Dispositivo no encontrado' 
        });
        return;
      }

      await prisma.dispositivo.delete({
        where: { id: Number(id) }
      });

      res.json({ 
        success: true,
        message: 'Dispositivo eliminado exitosamente' 
      });
    } catch (error) {
      console.error('❌ Error deleting dispositivo:', error);
      
      if (error instanceof Error && error.message.includes('Can\'t reach database server')) {
        res.status(503).json({
          success: false,
          error: 'Servicio de base de datos no disponible'
        });
        return;
      }
      
      res.status(500).json({ 
        success: false,
        error: 'Error interno del servidor' 
      });
    }
  },

  // GET - Estadísticas de dispositivos DEL USUARIO
  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const username = extractUsernameFromToken(req.user);
      
      if (!username) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const [total, porTipo, ultimaSemana] = await Promise.all([
        prisma.dispositivo.count({ where: { username } }),
        
        prisma.dispositivo.groupBy({
          by: ['tipo'],
          where: { username },
          _count: {
            _all: true
          },
          orderBy: {
            _count: {
              id: 'desc'
            }
          }
        }),
        
        prisma.dispositivo.count({
          where: {
            username,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        })
      ]);

      res.json({
        success: true,
        data: {
          total,
          porTipo,
          ultimaSemana,
          promedioPorDia: Math.round(ultimaSemana / 7)
        }
      });
    } catch (error) {
      console.error('❌ Error fetching dispositivos stats:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  // Obtener fabricante por MAC
  async getDeviceManufacturer(req: Request<{ mac: string }>, res: Response): Promise<void> {
    try {
      const { mac } = req.params;
      
      const macRegex = /^([0-9A-Fa-f]{2}[:-]?){5}([0-9A-Fa-f]{2})$/;
      if (!mac || !macRegex.test(mac)) {
        res.status(400).json({ 
          success: false,
          error: 'Formato MAC inválido',
          formato_esperado: 'XX:XX:XX:XX:XX:XX',
          ejemplo_valido: '00:14:22:01:23:45'
        });
        return;
      }

      const cleanMac = mac.replace(/[^A-Fa-f0-9]/g, '').toUpperCase();
      const manufacturer = await this.getManufacturerMultiSource(cleanMac);
      
      res.json({
        success: true,
        data: {
          mac: cleanMac.match(/.{1,2}/g)?.join(':') || cleanMac,
          manufacturer,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('❌ Error detallado:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({
        success: false,
        error: 'Error interno',
        detalles: process.env.NODE_ENV === 'development' ? errorMessage : 'Contactar al administrador'
      });
    }
  },

  // Método auxiliar para obtener fabricante (simulado)
  async getManufacturerMultiSource(mac: string): Promise<string> {
    const manufacturers: { [key: string]: string } = {
      '001422': 'Cisco Systems',
      '0050F2': 'Microsoft',
      '000C29': 'VMware',
      '001C14': 'Apple',
      '001E65': 'Samsung',
      'F41A9C': 'OPPO',
      '0021B9': 'Intel',
      '0022B0': 'Dell',
      '0023D4': 'LG',
      '0024E8': 'Huawei',
      '002564': 'TP-Link'
    };
    
    const prefix = mac.substring(0, 6);
    return manufacturers[prefix] || 'Fabricante desconocido';
  }
};


// ✅ FUNCIÓN MEJORADA PARA EXTRAER USERNAME DEL TOKEN
function extractUsernameFromToken(userPayload: any): string | null {
  if (!userPayload) {
    console.error('❌ [EXTRACT] CRÍTICO: userPayload está vacío');
    return null;
  }

  console.log('🔍 [EXTRACT] Buscando username en payload completo:', userPayload);

  // ✅ LISTA PRIORIZADA DE CAMPOS PARA USERNAME
  const priorityUsernameFields = [
    'sAMAccountName',        // Formato estándar de Active Directory - ALTA PRIORIDAD
    'samAccountName',        // Camel case alternativo
    'username',              // Campo genérico
    'userName',              // Camel case
    'preferred_username',    // Estándar OIDC
    'sub',                   // Subject (estándar JWT)
    'upn',                   // User Principal Name
    'userPrincipalName',     // User Principal Name completo
    'email',                 // Del email
    'uid',                   // User ID
    'name',                  // Nombre
    'given_name',            // Nombre dado
  ];

  console.log('🔎 [EXTRACT] Buscando en campos prioritarios:', priorityUsernameFields);

  // Buscar en campos prioritarios
  for (const field of priorityUsernameFields) {
    if (userPayload[field]) {
      const value = userPayload[field];
      console.log(`✅ [EXTRACT] Username encontrado en campo '${field}':`, value);
      
      // Si es un email, extraer la parte antes del @
      if (field === 'email' && typeof value === 'string' && value.includes('@')) {
        const usernameFromEmail = value.split('@')[0];
        console.log(`📧 [EXTRACT] Username extraído del email: ${usernameFromEmail}`);
        return usernameFromEmail;
      }
      
      return String(value);
    }
  }

  // ✅ SI NO ENCUENTRA EN CAMPOS PRIORITARIOS, BUSCAR EN TODOS LOS CAMPOS
  console.log('🔄 [EXTRACT] No se encontró en campos prioritarios. Buscando en todos los campos...');
  
  const allFields = Object.keys(userPayload);
  console.log('📋 [EXTRACT] Todos los campos disponibles:', allFields);

  // Buscar cualquier campo que contenga "user", "name", "account", "login", "id"
  const fallbackFields = allFields.filter(key => 
    key.toLowerCase().includes('user') || 
    key.toLowerCase().includes('name') || 
    key.toLowerCase().includes('account') ||
    key.toLowerCase().includes('login') ||
    key.toLowerCase().includes('id')
  );

  console.log('🔄 [EXTRACT] Buscando en campos de fallback:', fallbackFields);

  for (const field of fallbackFields) {
    if (userPayload[field]) {
      console.log(`🔄 [EXTRACT] Username encontrado en campo de fallback '${field}':`, userPayload[field]);
      return String(userPayload[field]);
    }
  }

  // ✅ ÚLTIMO RECURSO: Devolver el primer campo string que encuentre
  console.log('⚠️ [EXTRACT] No se encontraron campos específicos. Buscando cualquier campo string...');
  
  for (const field of allFields) {
    const value = userPayload[field];
    if (typeof value === 'string' && value.trim().length > 0) {
      console.log(`🔀 [EXTRACT] Usando campo alternativo '${field}':`, value);
      return value;
    }
  }

  console.error('❌ [EXTRACT] CRÍTICO: No se pudo extraer ningún username del token');
  return null;
}



