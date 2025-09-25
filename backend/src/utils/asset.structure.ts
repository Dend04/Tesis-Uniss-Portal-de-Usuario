import { Client } from "ldapjs";
import { createLDAPClient, bindAsync, escapeLDAPValue } from "./ldap.utils";
import { SearchEntry } from "ldapjs";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();
// 1. Actualizar la interfaz de atributos en createAssetOU
interface LdapAttributes {
  postalCode: string;
  description?: string; // Hacer opcional si es necesario
}

type DepartmentStructure = {
  name: string;
  departmentNumber: string;
  children: DepartmentStructure[];
};

export class AssetStructureBuilder {
  private client: Client;
  private prisma: PrismaClient;
  baseDN: string = process.env.LDAP_BASE_DN_Propio!;
  private departmentCache: Map<
    string,
    { Desc_Direccion: string; employees: string[] }
  > = new Map();
  private rhPlantillaCache: Map<
    string,
    { Nivel: number; Desc_Direccion: string }
  > = new Map();

  constructor() {
    this.client = createLDAPClient(process.env.LDAP_URL!);
    this.prisma = new PrismaClient();
  }

  async buildAssetStructure() {
    try {
      console.log("🚀 Iniciando creación de estructura ASSETS");

      // Borrar la caché si ya existe
      this.clearCaches();

      // Precargar la caché de RH_Plantilla
      await this.preloadRHPlantillaCache();
      console.log("✅ Datos de RH_Plantilla guardados en caché");

      await this.authenticate();

      const assetsDN = `OU=ASSETS,${this.baseDN}`;

      // Verificar si la OU "ASSETS" existe
      try {
        await this.searchOU(assetsDN);
        console.log(`✅ OU existente: ${assetsDN}`);
        // Limpiar la estructura existente en la OU "ASSETS"
        await this.cleanStructureContent(assetsDN, "ASSETS");
      } catch (error) {
        console.log(`🔍 OU no encontrada, creando: ${assetsDN}`);
        await this.createAssetOU(this.baseDN, "ASSETS");
      }

      // Precargar la caché de departamentos y empleados
      await this.preloadDepartmentCache();

      // Obtener la estructura de departamentos desde la caché
      const structure = this.getStructureFromCache();

      // Crear la estructura de departamentos
      console.log(
        "🏗️ Creando estructura de departamentos dentro de la OU ASSETS..."
      );
      await this.createNestedStructure(assetsDN, structure);

      console.log("✅ Estructura ASSETS creada exitosamente");
    } catch (error) {
      console.error("💥 Error crítico:", error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
      this.safeUnbind();
    }
  }

  // Modifica estos métodos clave:

  private async createNestedStructure(parentDN: string, nodes: DepartmentStructure[]): Promise<void> {
    console.log("🏗️ Iniciando creación de estructura organizativa...");
    
    for (const node of nodes) {
      if (!node.name?.trim()) {
        console.error("💥 Departamento sin nombre válido:", node.departmentNumber);
        continue;
      }
  
      try {
        console.log(`📂 Creando OU: ${node.name}`);
        const newDN = await this.createAssetOU(
          parentDN,
          node.name,
          { 
            postalCode: node.departmentNumber,
            description: `Departamento: ${node.name}`
          }
        );
  
        if (node.children?.length > 0) {
          await this.createNestedStructure(newDN, node.children);
        }
      } catch (error: any) {
        console.error(`💥 Error creando ${node.name}: ${error.message}`);
        throw error; // Fallo inmediato sin reintentos
      }
    }
  }

  protected async createAssetOU(
    parentDN: string,
    ouName: string,
    attributes?: LdapAttributes
  ): Promise<string> {
    const sanitizedName = this.sanitizeOUName(ouName);
    const dn = `OU=${sanitizedName},${parentDN}`;
  
    try {
      // Verificar si existe primero
      await this.searchOU(dn);
      console.log(`✅ OU existente: ${dn}`);
      return dn;
    } catch (error) {
      return new Promise((resolve, reject) => {
        this.client.add(dn, {
          objectClass: ["top", "organizationalUnit"],
          ou: sanitizedName,
          ...(attributes || {}),
        }, (err) => {
          if (err) {
            console.error(`⛔ Error permanente creando ${dn}: ${err.message}`);
            reject(err);
          } else {
            console.log(`✓ OU creada: ${dn}`);
            resolve(dn);
          }
        });
      });
    }
  }
  

protected async cleanStructureContent(
  dn: string,
  structureName: string
): Promise<void> {
  try {
    console.log(`🧹 Limpiando contenido de ${structureName}...`);
    await this.deleteAllContent(dn);
    console.log(`✅ Contenido de ${structureName} eliminado`);
  } catch (error) {
    console.error(`💥 Error limpiando ${structureName}:`, error);
    throw error;
  }
}
  private async deleteAllContent(dn: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.search(dn, { scope: "sub" }, (err, res) => {
        if (err) return reject(err);

        const deleteQueue: string[] = [];

        res.on("searchEntry", (entry: SearchEntry) => {
          if (entry.objectName && entry.objectName.toString() !== dn) {
            deleteQueue.push(entry.objectName.toString());
          }
        });

        res.on("error", reject);

        res.on("end", async () => {
          try {
            for (const childDN of deleteQueue.reverse()) {
              await this.deleteOU(childDN);
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  }

  private async deleteOU(dn: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.del(dn, (err) => {
        if (err && err.code !== 32) reject(err);
        else {
          console.log(`🗑️ Eliminado: ${dn}`);
          resolve();
        }
      });
    });
  }

  private clearCaches() {
    this.rhPlantillaCache.clear();
    this.departmentCache.clear();
    console.log("✅ Cachés borradas");
  }

  private async preloadRHPlantillaCache(): Promise<void> {
    const departments = await this.prisma.rH_Plantilla.findMany({
      select: { Nivel: true, Id_Direccion: true, Desc_Direccion: true },
      orderBy: { Nivel: "asc" },
    });

    for (const dept of departments) {
      this.rhPlantillaCache.set(dept.Id_Direccion, {
        Nivel: dept.Nivel,
        Desc_Direccion: dept.Desc_Direccion,
      });
    }
  }
  private async preloadDepartmentCache(): Promise<void> {
    try {
      console.log("🔄 Precargando empleados por departamento...");

      // 1. Obtener todos los empleados de una sola vez optimizando consultas
      const allEmployees = await this.prisma.empleados_Gral.findMany({
        select: {
          Id_Expediente: true,
          Id_Direccion: true,
        },
      });

      // 2. Crear mapa de empleados por Id_Direccion (case-insensitive y trimmed)
      const employeesByDireccion = new Map<string, string[]>();

      allEmployees.forEach((emp) => {
        const direccionKey =
          emp.Id_Direccion?.trim().toUpperCase() || "SIN_DEPARTAMENTO";
        if (!employeesByDireccion.has(direccionKey)) {
          employeesByDireccion.set(direccionKey, []);
        }
        employeesByDireccion.get(direccionKey)!.push(emp.Id_Expediente);
      });

      // 3. Mapear a departmentCache usando ambos caches
      let loadedCount = 0;

      for (const [idDireccion, rhData] of this.rhPlantillaCache.entries()) {
        const normalizedId = idDireccion.trim().toUpperCase();
        const empleados = employeesByDireccion.get(normalizedId) || [];

        this.departmentCache.set(idDireccion, {
          Desc_Direccion: rhData.Desc_Direccion,
          employees: empleados,
        });

        loadedCount++;

        // Log de progreso cada 10 departamentos
        if (loadedCount % 10 === 0) {
          console.log(
            `📊 Departamentos procesados: ${loadedCount}/${this.rhPlantillaCache.size}`
          );
        }
      }

      console.log("✅ Cache de departamentos precargada correctamente");
      console.log(`📝 Total departamentos: ${this.departmentCache.size}`);
      console.log(`👥 Total empleados mapeados: ${allEmployees.length}`);
    } catch (error) {
      console.error("💥 Error crítico al precargar empleados:", error);
      throw new Error("Fallo en precarga de datos de empleados");
    }
  }

  // Modifica el método getStructureFromCache
  // 1. Modificar el método getStructureFromCache para asegurar nombres válidos
  private getStructureFromCache(): DepartmentStructure[] {
    const structure: DepartmentStructure[] = [];

    const departments = Array.from(this.departmentCache.entries())
      .map(([idDireccion, deptData]) => {
        // Obtener datos de RH_Plantilla
        const plantillaData = this.rhPlantillaCache.get(idDireccion);

        // Validación estricta del nombre
        const nombreDepartamento =
          plantillaData?.Desc_Direccion?.trim() ||
          `Departamento-${idDireccion.trim()}`;

        return {
          name: nombreDepartamento,
          departmentNumber: idDireccion.trim(), // Eliminar espacios en blanco
          children: [],
        };
      })
      .filter((dept) => dept.name && dept.name !== "");
 /* console.log("Departamentos procesados:", departments); */
    return departments;
  }

  // Métodos auxiliares
   sanitizeOUName(name: string): string {
    if (!name) return "";
  
    // Paso 1: Normalización básica
    let sanitized = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Eliminar tildes
      .replace(/[^a-zA-Z0-9 \-\_]/g, "") // Solo caracteres permitidos
      .replace(/\s+/g, " ") // Espacios múltiples a uno
      .trim();
  
    // Paso 2: Escapar caracteres especiales LDAP
    sanitized = sanitized
      .replace(/,/g, "\\2c") // Escapar comas
      .replace(/:/g, "\\3a"); // Escapar dos puntos
  
    // Paso 3: Truncar + eliminar espacio final
    const MAX_LENGTH = 64;
    sanitized = sanitized.substring(0, MAX_LENGTH).trim(); // <- Clave aquí
  
    return sanitized;
  }
  
  

  protected async authenticate(): Promise<void> {
    await bindAsync(
      this.client,
      process.env.LDAP_ADMIN_DN!,
      process.env.LDAP_ADMIN_PASSWORD!
    );
  }

  protected safeUnbind() {
    try {
      if (this.client) this.client.unbind();
    } catch (error) {
      console.error("⚠️ Error al cerrar conexión:", error);
    }
  }

  protected async searchOU(dn: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.search(dn, { scope: "base" }, (err, res) => {
        if (err) return reject(err);

        let found = false;
        res.on("searchEntry", () => (found = true));
        res.on("error", reject);
        res.on("end", () => (found ? resolve() : reject("OU no encontrada")));
      });
    });
  }
}
