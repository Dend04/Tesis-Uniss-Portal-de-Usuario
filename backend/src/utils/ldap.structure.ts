// src/utils/ldap.structure.ts

import { Client } from "ldapjs";
import { createLDAPClient, bindAsync } from "./ldap.utils";
import { Career, CourseType, Faculty, fetchStructureData } from "./ldap.data";
import { escapeLDAPValue } from "./ldap.utils";
import logger from "./logger"; // Asegúrate de importar el logger
import { Attribute, SearchEntry } from "ldapjs";
import path from "path";
import { promises as fs } from "fs";

export class LDAPStructureBuilder {
  private client: Client;

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
  
      // 1. Autenticación única
      console.log("🔑 Autenticando...");
      await this.authenticateWithRetry();
  
      // 2. Construir estructura base
      console.log("🛠 Creando estructura base");
      const { baseDN, sigenuDN } = await this.rebuildBaseStructure();
  
      // 3. Construcción académica
      console.log("🏗 Construyendo estructura académica");
      await this.buildAcademicStructure(sigenuDN, data);
  
      console.log("✅ Éxito: Estructura completada");
    } catch (error: any) {
      console.error("💥 Error crítico durante la ejecución:");
      console.error("▸ Tipo:", (error as Error).name);
      console.error("▸ Mensaje:", (error as Error).message);
      
      if ('lde_dn' in error) {
        console.error("▸ DN afectado:", (error as any).lde_dn);
      }
      
      process.exit(1); // Salir con código de error
    } finally {
      this.safeUnbind();
      console.log("🔌 Conexión LDAP cerrada");
    }
  }
  private logErrorDetails(error: Error, attempt: number) {
    console.error(`\n🚨 [Intento ${attempt}] Error detallado:`);
    console.error("▸ Tipo:", error.name);
    console.error("▸ Mensaje:", error.message);
    
    if ('lde_dn' in error) {
      console.error("▸ DN afectado:", (error as any).lde_dn);
    }
    
    console.error("▸ Stack:", error.stack?.split('\n').slice(0, 3).join('\n'));
  }
  
  private async waitBeforeRetry(retryCount: number) {
    const delay = Math.pow(2, retryCount) * 1000; // Backoff exponencial
    console.log(`\n⏳ Esperando ${delay}ms antes de reintentar...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  private safeUnbind() {
    try {
      if (this.client && typeof this.client.unbind === 'function') {
        this.client.unbind();
      }
    } catch (unbindError) {
      console.error("⚠️ Error al cerrar conexión:", (unbindError as Error).message);
    }
  }
  






  private async authenticateWithRetry(): Promise<void> {
    try {
      await bindAsync(
        this.client,
        process.env.LDAP_ADMIN_DN!,
        process.env.LDAP_ADMIN_PASSWORD!
      );
      console.log("🔓 Autenticación LDAP exitosa");
    } catch (error) {
      console.error("🔐 Error de autenticación LDAP");
      throw error;
    }
  }
  private async verifyBaseStructure(): Promise<{
    baseDN: string;
    sigenuDN: string;
  }> {
    const baseDN = process.env.LDAP_BASE_DN!;
    const sigenuDN = `OU=SIGENU,${baseDN}`;

    console.log("🕵️ Verificando estructura base...");

    // Verificación en profundidad
    await this.deepVerifyOU(baseDN);
    await this.deepVerifyOU(sigenuDN, {
      description: "Estructura académica principal",
      objectClass: ["top", "organizationalUnit"],
    });

    return { baseDN, sigenuDN };
  }
  private async deepVerifyOU(dn: string, attributes?: any): Promise<void> {
    try {
      const entry = await this.searchOU(dn);
      console.log(`✅ Verificación profunda exitosa para: ${dn}`);
      console.log(
        "   Atributos:",
        entry.attributes.map((a: any) => a.type)
      );
    } catch (error) {
      console.log(`🛠 Creando OU: ${dn}`);
      await this.createOUWithValidation(dn, attributes);
    }
  }
// En createOUWithValidation
private async createOUWithValidation(dn: string, attributes: any): Promise<void> {
  try {
    await this.createOU(dn, attributes);
  } catch (createError) {
    // LDAP código 68 = ENTRY_ALREADY_EXISTS
    if ((createError as any).code === 68) { 
      console.log(`ℹ️ OU existente: ${dn}`);
      return;
    }
    throw new Error(`Fallo al crear OU: ${dn} | ${(createError as Error).message}`);
  }
}
  private async buildAcademicStructure(
    sigenuDN: string,
    data: {
      faculties: Faculty[];
      careers: Career[];
      courseTypes: CourseType[];
    }
  ) {
    console.log("🏗 Iniciando construcción académica...");

    for (const faculty of data.faculties) {
      console.log(`\n📘 Procesando facultad: ${faculty.nombre}`);
      await this.processFaculty(
        sigenuDN,
        faculty,
        data.careers,
        data.courseTypes
      );
    }
  }
  private async processFaculty(
    parentDN: string,
    faculty: Faculty,
    careers: Career[],
    courseTypes: CourseType[]
  ) {
    // Sanitizar nombre y ID
    const safeName = this.sanitizeOUName(faculty.nombre);
    const safeId = this.sanitizeId(faculty.IdFacultad);
  
    try {
      console.log(`📘 Procesando facultad: ${faculty.nombre}`);
      
      const facultyDN = await this.ensureOU(
        parentDN,
        safeName,
        {
          description: safeId, // Usamos description para el ID complejo
          postalCode: this.extractNumericId(faculty.IdFacultad), // Extraer parte numérica si existe
          info: `Decano: ${faculty.nombreDecano} | Secretario: ${faculty.nombreSecretario}`,
          telephoneNumber: faculty.telf,
          objectClass: ["top", "organizationalUnit", "extensibleObject"]
        },
        true
      );
  

      const facultyCareers = careers.filter(
        (c) => c.facultad === faculty.IdFacultad
      );

      console.log(`   📚 Carreras encontradas: ${facultyCareers.length}`);

      for (const career of facultyCareers) {
        await this.processCareer(facultyDN, career, courseTypes);
      }
    } catch (error) {
      console.error(`🚨 Error procesando facultad ${faculty.nombre}:`);
      throw error;
    }
  }
  private async processCareer(
    parentDN: string,
    career: Career,
    courseTypes: CourseType[]
  ) {
    const safeName = this.sanitizeOUName(career.nombre);

    try {
      console.log(`   📖 Procesando carrera: ${career.nombre}`);

      const careerDN = await this.ensureOU(
        parentDN,
        safeName,
        {
          postalCode: career.idCarrera,
          description: `${career.nombre}`,
          objectClass: ["top", "organizationalUnit", "extensibleObject"],
        },
        true
      );

      for (const courseType of courseTypes) {
        await this.processCourseType(careerDN, courseType);
      }
    } catch (error) {
      console.error(`    🚨 Error procesando carrera ${career.nombre}:`);
      throw error;
    }
  }
  private sanitizeId(id: string): string {
    return id
      .replace(/[^a-zA-Z0-9-]/g, '') // Eliminar caracteres especiales
      .substring(0, 64); // Longitud máxima para description
  }
  
  private extractNumericId(id: string): string {
    const matches = id.match(/\d+/);
    return matches ? matches[0] : '0000';
  }
  






  private async cleanExistingStructure(sigenuDN: string) {
    try {
      console.log("🧹 Limpiando estructura existente...");
      await this.deleteOURecursive(sigenuDN);
      console.log("✅ Estructura limpiada exitosamente");
    } catch (error) {
      console.log("ℹ️ No se encontró estructura previa para limpiar");
    }
  }

  private async deleteOURecursive(dn: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.search(
        dn,
        {
          scope: "sub", // Cambiar de 'one' a 'sub' para eliminar recursivamente
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
            // Eliminar en orden inverso (primero hijos, luego padres)
            for (const childDN of deleteQueue.reverse()) {
              await new Promise((resolve, reject) => {
                this.client.del(childDN, (err) => {
                  if (err) reject(err);
                  else resolve(true);
                });
              });
            }

            // Finalmente eliminar el DN principal
            this.client.del(dn, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
      );
    });
  }

  // Modificar sanitización para caracteres especiales

  private async processCourseType(parentDN: string, courseType: CourseType) {
    const safeName = this.sanitizeOUName(courseType.nombre);

    try {
      console.log(`      📝 Procesando tipo de curso: ${courseType.nombre}`);

      await this.ensureOU(
        parentDN,
        safeName,
        {
          postalCode: courseType.IdCurso,
          description: `${courseType.nombre}`,
          objectClass: ["top", "organizationalUnit", "extensibleObject"],
        },
        true
      );
    } catch (error) {
      console.error(
        `       🚨 Error procesando tipo de curso ${courseType.nombre}:`
      );
      throw error;
    }
  }

   // Mejorar la sanitización de nombres
   private sanitizeOUName(name: string): string {
    return name
      .replace(/[\\\/#,+()$~%'":*?<>{}]/g, '') // Eliminar caracteres prohibidos
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 64);
  }
  

  private async ensureOUExists(dn: string, attributes?: any): Promise<void> {
    try {
      await this.searchOU(dn);
      console.log(`✅ OU existente: ${dn}`);
    } catch (error) {
      if (error instanceof Error && error.message === "OU no encontrada") {
        console.log(`🛠 Creando OU: ${dn}`);
        await this.createOU(dn, {
          objectClass: ["top", "organizationalUnit"],
          ou: dn.split(",")[0].split("=")[1],
          ...(attributes || {}),
        });
        // Verificación post-creación
        await this.searchOU(dn);
        console.log(`✅ OU creada exitosamente: ${dn}`);
      } else {
        throw error;
      }
    }
  }
  private async createFacultyStructure(
    parentDN: string,
    faculty: Faculty,
    careers: Career[],
    courseTypes: CourseType[]
  ): Promise<string> {
    const facultyDN = await this.ensureOU(parentDN, faculty.nombre, {
      postalCode: faculty.IdFacultad,
      description: `Facultad: ${faculty.nombre}`,
      st: faculty.nombre,
      l: faculty.nombre,
    });

    const facultyCareers = careers.filter(
      (c) => c.facultad === faculty.IdFacultad
    );

    for (const career of facultyCareers) {
      const careerDN = await this.ensureOU(facultyDN, career.nombre, {
        postalCode: career.idCarrera,
        description: `Carrera: ${career.nombre}`,
      });

      for (const courseType of courseTypes) {
        await this.ensureOU(careerDN, courseType.nombre, {
          postalCode: courseType.IdCurso,
          description: `Tipo de curso: ${courseType.nombre}`,
        });
      }
    }

    return facultyDN;
  }

  // Nuevo método para asegurar la jerarquía completa del DN base
  private async ensureBaseDNHierarchy(dn: string): Promise<void> {
    const parts = dn.split(',');
    let currentDN = '';
  
    // Construir desde el dominio raíz hacia arriba
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i].trim();
      currentDN = currentDN ? `${part},${currentDN}` : part;
  
      if (part.startsWith('OU=')) {
        try {
          await this.searchOU(currentDN);
          console.log(`✅ OU existente: ${currentDN}`);
        } catch (error) {
          await this.createOU(currentDN, {
            objectClass: ["top", "organizationalUnit"],
            ou: part.split('=')[1]
          });
          console.log(`🛠 OU creada: ${currentDN}`);
        }
      }
    }
  
    // Verificación final para sigenuDN
    try {
      await this.searchOU(dn);
      console.log(`🌟 sigenuDN existe: ${dn}`);
    } catch (error) {
      console.log(`🚨 sigenuDN no existe: ${dn}`);
    }
  }
  
  // Método ensureOU mejorado

  async updateStructure(data: {
    faculties: Faculty[];
    careers: Career[];
    courseTypes: CourseType[];
  }) {
    const { faculties, careers, courseTypes } = data;

    for (const faculty of faculties) {
      const facultyDN = `ou=${faculty.nombre},ou=SIGENU,${process.env
        .LDAP_BASE_DN!}`;
      await this.updateOUNameIfChanged(
        facultyDN,
        faculty.nombre,
        faculty.IdFacultad
      );

      const facultyCareers = careers.filter(
        (c) => c.facultad === faculty.IdFacultad
      );
      for (const career of facultyCareers) {
        const careerDN = `ou=${career.nombre},${facultyDN}`;
        await this.updateOUNameIfChanged(
          careerDN,
          career.nombre,
          career.idCarrera
        );

        for (const courseType of courseTypes) {
          const courseTypeDN = `ou=${courseType.nombre},${careerDN}`;
          await this.updateOUNameIfChanged(
            courseTypeDN,
            courseType.nombre,
            courseType.IdCurso
          );
        }
      }
    }
  }

  private async updateOUNameIfChanged(
    dn: string,
    newName: string,
    code: string
  ): Promise<void> {
    try {
      const entry = await this.searchOU(dn);
      const currentName = entry.ou; // Accede directamente a la propiedad 'ou'

      if (currentName !== newName) {
        logger.info(`Actualizando nombre de OU: ${currentName} a ${newName}`);
        await this.updateAttributes(dn, { ou: newName });
      }
    } catch (error) {
      if (error instanceof Error && error.message === "OU no encontrada") {
        logger.info(`Creando nueva OU: ${dn}`);
        await this.createOU(dn, {
          postalCode: code,
          description: `Código: ${code}`,
        });
      } else {
        logger.error(`Error al actualizar OU ${dn}:`, error);
        throw error;
      }
    }
  }

  private async ensureOU(
    parentDN: string,
    name: string,
    attributes: Record<string, any>,
    forceUpdate: boolean = false
  ): Promise<string> {
    const escapedName = escapeLDAPValue(name);
    const dn = `OU=${escapedName},${parentDN}`;

    try {
      const entry = await this.searchOU(dn);

      // Convertir todos los valores a string para comparación
      const updatesNeeded = Object.entries(attributes).filter(
        ([key, value]) => {
          const currentValues =
            entry.attributes.find((attr: Attribute) => attr.type === key)
              ?.values || [];

          return !currentValues.includes(value.toString());
        }
      );

      if (updatesNeeded.length > 0 || forceUpdate) {
        console.log(`🔄 Actualizando OU: ${dn}`);
        const updateAttributes = Object.fromEntries(updatesNeeded);
        await this.updateOU(dn, updateAttributes);
      }

      return dn;
    } catch (error) {
      if (error instanceof Error && error.message === "OU no encontrada") {
        console.log(`🛠 Creando nueva OU: ${dn}`);
        return this.createOU(dn, {
          objectClass: ["top", "organizationalUnit", "extensibleObject"],
          ou: escapedName,
          ...attributes,
        });
      }
      throw error;
    }
  }

  private async updateOU(dn: string, attributes: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const changes = Object.entries(attributes).map(([key, value]) => ({
        operation: "replace",
        modification: { [key]: value },
      }));

      this.client.modify(dn, changes, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private async searchOU(dn: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.search(dn, { scope: "base" }, (err, res) => {
        if (err) return reject(err);
        res.on("searchEntry", (entry) => {
          resolve(entry);
        });
        res.on("error", reject);
        res.on("end", () => reject(new Error("OU no encontrada")));
      });
    });
  }

  private async createOU(dn: string, attributes: any): Promise<string> {
    return new Promise((resolve, reject) => {
      this.client.add(
        dn,
        {
          objectClass: ["top", "organizationalUnit", "extensibleObject"],
          ou: dn.split(",")[0].split("=")[1],
          ...attributes,
        },
        (err) => {
          if (err) reject(err);
          else resolve(dn); // Devuelve el DN creado
        }
      );
    });
  }

  private async updateAttributes(dn: string, attributes: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const changes = Object.entries(attributes).map(([key, value]) => ({
        operation: "replace",
        modification: { [key]: value },
      }));

      this.client.modify(dn, changes, (err) => (err ? reject(err) : resolve()));
    });
  }

  private async rebuildBaseStructure(): Promise<{ baseDN: string; sigenuDN: string }> {
    const baseDN = process.env.LDAP_BASE_DN!;
    const sigenuDN = `OU=SIGENU,${baseDN}`;
  
    // Verificar y crear estructura base
    await this.ensureBaseDNHierarchy(baseDN); // Nueva función para verificar toda la jerarquía
    
    // Forzar creación de SIGENU con todos los atributos necesarios
    await this.forceCreateOU(sigenuDN, {
      objectClass: ["top", "organizationalUnit", "extensibleObject"], // Añadir extensibleObject
      description: "Estructura académica principal",
      ou: "SIGENU"
    });
  
    return { baseDN, sigenuDN };
  }

  private async verifyBaseOUExists(dn: string): Promise<void> {
  try {
    await this.searchOU(dn);
    console.log(`✓ OU base existente: ${dn}`);
  } catch (error) {
    throw new Error(`La OU base ${dn} no existe. Créala manualmente primero.`);
  }
}

  
  
  private async forceCreateOU(dn: string, attributes?: any): Promise<void> {
    try {
      await this.createOUWithValidation(dn, attributes);
    } catch (error) {
      if (error instanceof Error && error.message.includes("ya existe")) {
        await this.updateOUAttributes(dn, attributes);
      } else {
        throw error;
      }
    }
  }
  
  private async updateOUAttributes(dn: string, attributes: any): Promise<void> {
    const changes = Object.entries(attributes).map(([key, value]) => ({
      operation: "replace",
      modification: { [key]: value }
    }));
  
    await new Promise((resolve, reject) => {
      this.client.modify(dn, changes, (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }
  
}
