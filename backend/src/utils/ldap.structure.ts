import { Client } from "ldapjs";
import { createLDAPClient, bindAsync } from "./ldap.utils";
import { Career, CourseType, Faculty } from "./ldap.data";
import { escapeLDAPValue } from "./ldap.utils";
import logger from "./logger"; // Asegúrate de importar el logger
import { Attribute, SearchEntry } from "ldapjs";
import dotenv from "dotenv";

dotenv.config();
export class LDAPStructureBuilder {
  private client: Client;
  private nameCache: Map<string, string> = new Map();

  constructor() {
    this.client = createLDAPClient(process.env.LDAP_URL!);
  }

  async buildFullStructure(data: {
    faculties: Faculty[];
    careers: Career[];
    courseTypes: CourseType[];
  }) {
    try {
      console.log("🚀 Iniciando construcción única");
      this.client = createLDAPClient(process.env.LDAP_URL!);

      // 1. Autenticación
      console.log("🔑 Autenticando...");
      await this.authenticateWithRetry();

      // 2. Verificar estructura base
      const { sigenuDN } = await this.verifyBaseStructure();

      // 3. Limpiar estructura existente dentro de SIGENU
      console.log("🧹 Limpiando estructura previa...");
      await this.cleanExistingStructure(sigenuDN);

      // 4. Construcción académica
      console.log("🏗 Construyendo estructura académica");
      await this.buildAcademicStructure(sigenuDN, data);

      console.log("✅ Estructura completada");
    } catch (error: any) {
      console.error("💥 Error crítico:", error.message);
      process.exit(1);
    } finally {
      this.safeUnbind();
      console.log("🔌 Conexión cerrada");
    }
  }

  private safeUnbind() {
    try {
      if (this.client) this.client.unbind();
    } catch (error) {
      console.error("⚠️ Error al cerrar conexión:", error);
    }
  }

  private async authenticateWithRetry(): Promise<void> {
    await bindAsync(
      this.client,
      process.env.LDAP_ADMIN_DN!,
      process.env.LDAP_ADMIN_PASSWORD!
    );
    console.log("🔓 Autenticación exitosa");
  }

  private async verifyBaseStructure(): Promise<{
    baseDN: string;
    sigenuDN: string;
  }> {
    const baseDN = process.env.LDAP_BASE_DN!; // OU=Pruebas_crear_usuarios,DC=uniss,DC=edu,DC=cu
    const sigenuDN = `OU=SIGENU,${baseDN}`;

    // Crear SIGENU dentro de Pruebas_crear_usuarios
    await this.createOU(baseDN, "SIGENU", {
      description: "Estructura académica principal",
      objectClass: ["top", "organizationalUnit"],
    });

    return { baseDN, sigenuDN };
  }

  private async createOUInternal(
    dn: string,
    safeName: string,
    attributes: any
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      this.client.add(
        dn,
        {
          objectClass: ["top", "organizationalUnit"],
          ou: safeName, // Nombre legible
          ...attributes,
        },
        (err) => {
          if (err) {
            console.error("ERROR DETALLADO:");
            console.error("DN ofensivo:", JSON.stringify(dn));
            console.error("Nombre original:", JSON.stringify(safeName));
            console.error("Código LDAP:", err.code, "Mensaje:", err.message);
            reject(err);
          } else {
            console.log(`✓ OU creada (segura): ${dn}`);
            resolve(dn);
          }
        }
      );
    });
  }

  private async createOU(
    parentDN: string,
    rawName: string,
    attributes: any
  ): Promise<string> {
    const safeName = this.sanitizeOUName(rawName);
    const escapedName = escapeLDAPValue(safeName);
    const dn = `OU=${escapedName},${parentDN}`;
  
    console.log('==== DEBUGGING DN ====');
    console.log('Input:', JSON.stringify(rawName));
    console.log('Sanitized (exact):', JSON.stringify(safeName));
    console.log('Escaped:', JSON.stringify(escapedName));
    console.log('Full DN:', JSON.stringify(dn));
  
    try {
      await this.searchOU(dn);
      console.log(`✅ OU existente (validada): ${dn}`);
      return dn;
    } catch (error) {
      console.log(`🛠 Creando OU validada: ${dn}`);
      return this.createOUInternal(dn, safeName, attributes);
    }
  }

  private async searchOU(dn: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.search(dn, { scope: "base" }, (err, res) => {
        if (err) return reject(err);

        let found = false;
        res.on("searchEntry", () => (found = true));
        res.on("error", reject);
        res.on("end", () => {
          found ? resolve() : reject(new Error("OU no encontrada"));
        });
      });
    });
  }

  private async buildAcademicStructure(
    sigenuDN: string,
    data: { faculties: Faculty[]; careers: Career[]; courseTypes: CourseType[] }
  ) {
    for (const faculty of data.faculties) {
      await this.createFacultyStructure(
        sigenuDN,
        faculty,
        data.careers,
        data.courseTypes
      );
    }
  }

  private async createFacultyStructure(
    parentDN: string,
    faculty: Faculty,
    careers: Career[],
    courseTypes: CourseType[]
  ) {
    // Crear OU de Facultad con postalCode correcto
    const facultyDN = await this.createOU(parentDN, faculty.nombre, {
      postalCode: faculty.IdFacultad, // <-- Aquí se asigna correctamente
      description: `Facultad: ${faculty.nombre}`,
      objectClass: ["top", "organizationalUnit"],
    });

    // Filtrar carreras de esta facultad
    const facultyCareers = careers.filter(
      (c) => c.facultad === faculty.IdFacultad
    );

    // Crear carreras en orden
    for (const career of facultyCareers) {
      await this.createCareerStructure(facultyDN, career, courseTypes);
    }
  }

  private async createCareerStructure(
    parentDN: string,
    career: Career,
    courseTypes: CourseType[]
  ) {
    // Crear OU de Carrera con postalCode correcto
    const careerDN = await this.createOU(parentDN, career.nombre, {
      postalCode: career.idCarrera, // <-- Aquí se asigna correctamente
      description: `Carrera: ${career.nombre}`,
      objectClass: ["top", "organizationalUnit"],
    });

    // Crear tipos de curso en orden
    for (const courseType of courseTypes) {
      await this.createCourseTypeOU(careerDN, courseType);
    }
  }

  private async createCourseTypeOU(parentDN: string, courseType: CourseType) {
    // Crear OU de Tipo de Curso con postalCode correcto
    await this.createOU(parentDN, courseType.nombre, {
      postalCode: courseType.IdCurso, // <-- Aquí se asigna correctamente
      description: `Tipo de curso: ${courseType.nombre}`,
      objectClass: ["top", "organizationalUnit"],
    });
  }

  private sanitizeOUName(name: string): string {
    if (this.nameCache.has(name)) {
      return this.nameCache.get(name)!;
    }
  
    let cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Tildes
    .replace(/[()]/g, "") // Eliminar paréntesis
    .replace(/null/gi, "") // Eliminar "null"
    .replace(/[^a-zA-Z0-9 -]/g, "") // Caracteres válidos
    .replace(/[\s\u00A0]+/g, " ") // Cualquier espacio → espacio normal
    .trim()
    .substring(0, 64)
    .trim(); // ← Trim adicional post-truncado


  
    this.nameCache.set(name, cleaned);
    return cleaned;
  }

  

  private async cleanExistingStructure(sigenuDN: string): Promise<void> {
    try {
      console.log("🗑️ Eliminando contenido de:", sigenuDN);
      await this.deleteAllContent(sigenuDN);
      console.log("✅ Contenido eliminado exitosamente");
    } catch (error) {
      console.log("ℹ️ No se encontró estructura previa para limpiar");
    }
  }

  private async deleteOURecursive(dn: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.search(
        dn,
        {
          scope: "one", // Solo hijos directos
          filter: "(objectClass=organizationalUnit)",
        },
        (err, res) => {
          if (err) return reject(err);

          const deleteQueue: string[] = [];

          res.on("searchEntry", (entry: SearchEntry) => {
            if (entry.objectName) {
              deleteQueue.push(entry.objectName);
            }
          });

          res.on("error", reject);

          res.on("end", async () => {
            try {
              // Eliminar en orden inverso
              for (const childDN of deleteQueue.reverse()) {
                await new Promise<void>((resolveDel, rejectDel) => {
                  this.client.del(childDN, (err) => {
                    if (err) rejectDel(err);
                    else {
                      console.log(`🗑️ Eliminado: ${childDN}`);
                      resolveDel();
                    }
                  });
                });
              }
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        }
      );
    });
  }

  private async deleteAllContent(dn: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.search(
        dn,
        {
          scope: "sub",
          filter: "(objectClass=*)",
        },
        (err, res) => {
          if (err) return reject(err);

          const deleteQueue: string[] = [];

          res.on("searchEntry", (entry: SearchEntry) => {
            // Verificar si objectName es null
            if (!entry.objectName) {
              console.warn("Entrada sin objectName:", entry);
              return; // Saltar esta entrada
            }

            const entryDN = entry.objectName.toString(); // Ahora seguro que no es null
            if (entryDN.toLowerCase() !== dn.toLowerCase()) {
              deleteQueue.push(entryDN);
            }
          });

          res.on("error", reject);

          res.on("end", async () => {
            try {
              deleteQueue.sort((a, b) => b.length - a.length);

              for (const childDN of deleteQueue) {
                await new Promise<void>((resolveDel, rejectDel) => {
                  this.client.del(childDN, (err) => {
                    if (err) rejectDel(err);
                    else {
                      console.log(`🗑️ Eliminado: ${childDN}`);
                      resolveDel();
                    }
                  });
                });
              }
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        }
      );
    });
  }
}

/*  private sanitizeOUName(name: string): string {
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Elimina tildes
      .replace(/[^a-zA-Z0-9_ -]/g, "") // Permite espacios, guiones y guiones bajos
      .replace(/\s+/g, " ") // Reduce múltiples espacios a uno solo
      .trim() // Elimina espacios al inicio/final
      .substring(0, 64);
  }
 */
