// src/modules/ldap/builders/user-entries.builder.ts

import { Client } from "ldapjs";
import { SearchEntry } from "ldapjs";
import { PrismaClient } from "@prisma/client";
import { AssetStructureBuilder } from "../utils/asset.structure";
import { bindAsync, createLDAPClient, escapeLDAPValue } from "../utils/ldap.utils";


export class UserEntriesBuilder {
  private client: Client;
  private prisma: PrismaClient;
  private assetBuilder: AssetStructureBuilder;
  baseDN: string = process.env.LDAP_BASE_DN!;

  constructor(assetBuilder: AssetStructureBuilder) {
    this.client = createLDAPClient(process.env.LDAP_URL!);
    this.prisma = new PrismaClient();
    this.assetBuilder = assetBuilder;
  }

  async buildUserEntries() {
    try {
      console.log("🚀 Iniciando creación de entradas de usuario");
      await this.authenticate();

      // Obtener todos los empleados activos
      const employees = await this.prisma.empleados_Gral.findMany({
        where: { Baja: false }
      });

      console.log(`👥 Empleados a procesar: ${employees.length}`);

      for (const employee of employees) {
        try {
          // Verificar si el usuario ya existe
          if (await this.userExists(employee.No_CI)) {
            console.log(`⏩ Usuario ya existe: ${employee.No_CI}`);
            continue;
          }

          // Obtener DN del departamento
          const departmentDN = await this.getDepartmentDN(employee.Id_Direccion);
          
          // Crear entrada de usuario
          await this.createUserEntry(departmentDN, employee);
          
        } catch (error) {
          console.error(`⚠️ Error procesando empleado ${employee.No_CI}:`, error);
        }
      }
      
      console.log("✅ Entradas de usuario creadas exitosamente");
    } catch (error) {
      console.error("💥 Error crítico:", error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
      this.safeUnbind();
    }
  }
  

  private async createUserEntry(departmentDN: string, employee: any) {
    const userDN = `CN=${this.sanitizeName(employee.Nombre)} ${this.sanitizeName(employee.Apellido_1)},${departmentDN}`;
    
    const entry = {
      objectClass: ['top', 'person', 'organizationalPerson', 'user'],
      cn: `${employee.Nombre} ${employee.Apellido_1}`,
      givenName: employee.Nombre,
      sn: employee.Apellido_1,
      displayName: `${employee.Apellido_1}, ${employee.Nombre}`,
      telephoneNumber: employee.Telefono_Particular,
      postalCode: employee.Codigo_Postal,
      streetAddress: employee.Direccion,
      l: employee.Ciudad,
      st: employee.Region,
      co: employee.Pais,
      title: employee.Id_Cargo,
      employeeID: employee.Id_Expediente,
      sAMAccountName: employee.No_CI,
      userPrincipalName: `${employee.No_CI}@${this.baseDN}`,
    };

    return new Promise((resolve, reject) => {
      this.client.add(userDN, entry, (err) => {
        if (err) return reject(err);
        console.log(`✓ Usuario creado: ${userDN}`);
        resolve(true);
      });
    });
  }

  private async getDepartmentDN(idDireccion: string): Promise<string> {
    const departmentData = this.assetBuilder['departmentCache'].get(idDireccion);
    if (!departmentData) throw new Error(`Departamento no encontrado: ${idDireccion}`);

    const sanitizedOU = this.assetBuilder.sanitizeOUName(departmentData.Desc_Direccion);
    return `OU=${sanitizedOU},OU=ASSETS,${this.baseDN}`;
  }

  private async userExists(ci: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.client.search(this.baseDN, {
        filter: `(&(objectClass=user)(sAMAccountName=${escapeLDAPValue(ci)}))`,
        scope: 'sub'
      }, (err, res) => {
        if (err) return reject(err);
        
        let exists = false;
        res.on('searchEntry', () => exists = true);
        res.on('error', reject);
        res.on('end', () => resolve(exists));
      });
    });
  }

  private sanitizeName(name: string): string {
    return name
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim();
  }

  // Métodos de autenticación y utilidades (similar a AssetStructureBuilder)
  private async authenticate(): Promise<void> {
    await bindAsync(
      this.client,
      process.env.LDAP_ADMIN_DN!,
      process.env.LDAP_ADMIN_PASSWORD!
    );
  }

  private safeUnbind() {
    try {
      if (this.client) this.client.unbind();
    } catch (error) {
      console.error("⚠️ Error al cerrar conexión:", error);
    }
  }
}