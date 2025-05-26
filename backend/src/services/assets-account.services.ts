import { Client } from "ldapjs";
import { SearchEntry } from "ldapjs";
import { PrismaClient } from "@prisma/client";
import { bindAsync, createLDAPClient, escapeLDAPValue } from "../utils/ldap.utils";

export class UserEntriesBuilder {
  private client: Client;
  private prisma: PrismaClient;
  baseDN: string = process.env.LDAP_BASE_DN!;

  constructor() {
    this.client = createLDAPClient(process.env.LDAP_URL!);
    this.prisma = new PrismaClient();
  }

  async createUserEntryByCI(ci: string) {
    try {
      console.log(`🚀 Iniciando creación de entrada de usuario para CI: ${ci}`);
      await this.authenticate();

      // Obtener el empleado por CI
      const employee = await this.prisma.empleados_Gral.findFirst({
        where: {
          No_CI: ci,
          Baja: false
        }
      });

      if (!employee) {
        console.log(`⚠️ Empleado no encontrado para CI: ${ci}`);
        return;
      }

      // Verificar si el usuario ya existe
      if (await this.userExists(ci)) {
        console.log(`⏩ Usuario ya existe: ${ci}`);
        return;
      }

      // Obtener DN del departamento
      const departmentDN = await this.getDepartmentDN(employee.Id_Direccion);

      // Crear entrada de usuario
      await this.createUserEntry(departmentDN, employee);

      console.log(`✅ Entrada de usuario creada exitosamente para CI: ${ci}`);
    } catch (error) {
      console.error(`💥 Error crítico al crear entrada de usuario para CI ${ci}:`, error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
      this.safeUnbind();
    }
  }

  private async createUserEntry(departmentDN: string, employee: any) {
    // Determinar el título y ajustar el campo cn
    const title = this.getEmployeeTitle(employee);
    const cnValue = this.getEmployeeCN(employee);
    const nombreUnico = 'daironenamorado';

    // Construir DN del usuario
    const userDN = `CN=${escapeLDAPValue(cnValue)},${departmentDN}`;

    // Determinar la descripción según el rol del empleado
    const description = this.getEmployeeDescription(employee);

    const departmentName = await this.getDepartmentName(employee.Id_Direccion);


    const entry = {
        objectClass: ['top', 'person', 'organizationalPerson', 'user'],
        cn: cnValue,
        givenName: employee.Nombre,
        sn: `${employee.Apellido_1} ${employee.Apellido_2 || ''}`.trim(), // Incluir Apellido_2
        displayName: `${employee.Nombre} ${employee.Apellido_1} ${employee.Apellido_2 || ''}`.trim(), // Nombre completo
        streetAddress: employee.Direccion || '',
        title: title,
        employeeID: employee.No_CI.replace(/\D/g, '').trim(), // Usar el valor del campo No_CI
        sAMAccountName: nombreUnico,
        uid: nombreUnico,
        userPrincipalName: `${nombreUnico}@uniss.edu.cu`,
       /*  userPassword: 'P@ssw0rdTemporal', // Contraseña inicial
        userAccountControl: '512', // 512 = Cuenta normal habilitada */
        mail: `${nombreUnico}@uniss.edu.cu`, // Correo electrónico
        description: description,
        department:departmentName
        
    };

    // Imprimir los atributos que se están guardando
    console.log('Atributos que se están guardando:');
    console.log('objectClass:', entry.objectClass);
    console.log('cn:', entry.cn);
    console.log('givenName:', entry.givenName);
    console.log('sn:', entry.sn);
    console.log('displayName:', entry.displayName);
    console.log('streetAddress:', entry.streetAddress);
    console.log('title:', entry.title);
    console.log('employeeID:', entry.employeeID);
    console.log('sAMAccountName:', entry.sAMAccountName);
    console.log('uid:', entry.uid);
    console.log('userPrincipalName:', entry.userPrincipalName);
    console.log('description:', entry.description);
    console.log('DN del usuario:', userDN); // Log del DN del usuario

    await new Promise((resolve, reject) => {
      this.client.add(userDN, entry, (err) => {
          if (err) return reject(err);
          resolve(true);
      });
  });
    await this.addUserToGroups(userDN, [
      'CN=correo_nac,OU=_Grupos,DC=uniss,DC=edu,DC=cu',
      'CN=wifi_users,OU=_Grupos,DC=uniss,DC=edu,DC=cu'
  ])
}
private async addUserToGroups(userDN: string, groupDNs: string[]): Promise<void> {
  for (const groupDN of groupDNs) {
    try {
      await this.addUserToGroup(userDN, groupDN);
    } catch (error) {
      console.error(`⛔ Error crítico agregando a ${groupDN}:`, error);
      throw error; // Propagar el error para manejo superior
    }
  }
}
private async addUserToGroup(userDN: string, groupDN: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const change = {
      operation: 'add',
      modification: {
        type: 'member', // Especificar el tipo de atributo
        values: [userDN] // Proporcionar el valor como un array
      }
    };

    this.client.modify(groupDN, change, (err) => {
      if (err) {
        // Manejar error de membresía existente (código 20 = attribute exists)
        if (err.name === 'ConstraintViolationError' || err.code === 20) {
          console.warn(`⚠️ El usuario ya existe en el grupo: ${groupDN}`);
          return resolve();
        }
        reject(new Error(`Error LDAP (${err.code}): ${err.message}`));
      } else {
        console.log(`✔️ Usuario agregado exitosamente a: ${groupDN}`);
        resolve();
      }
    });
  });
}



private getEmployeeCN(employee: any): string {
  const fullName = `${employee.Nombre} ${employee.Apellido_1}`;
  let suffix = '';

  if (employee.Docente && employee.Investigador) {
      suffix = 'Docente e Investigador';
  } else if (employee.Docente) {
      suffix = 'Docente';
  } else if (employee.Investigador) {
      suffix = 'Investigador';
  } else {
      suffix = 'Trabajador';
  }

  return `${suffix} ${fullName}`;
}


  private getEmployeeDescription(employee: any): string {
    if (employee.Docente && employee.Investigador) {
        return "Docente e Investigador";
    } else if (employee.Docente) {
        return "Docente";
    } else if (employee.Investigador) {
        return "Investigador";
    } else {
        return "Trabajador";
    }
  }

  private async getDepartmentDN(idDireccion: string): Promise<string> {
    // Buscar el nombre de la dirección en la tabla RH_Plantilla
    const departmentData = await this.prisma.rH_Plantilla.findFirst({
      where: { Id_Direccion: idDireccion },
      select: { Desc_Direccion: true }
    });

    if (!departmentData?.Desc_Direccion) {
      throw new Error(`❌ Desc_Direccion no encontrado para Id_Direccion: ${idDireccion}`);
    }

    if (!departmentData || !departmentData.Desc_Direccion) {
      console.error(`No se encontró Desc_Direccion para Id_Direccion: ${idDireccion}`);
      throw new Error(`Departamento no encontrado para Id_Direccion: ${idDireccion}`);
    }

    const departmentName = departmentData.Desc_Direccion;
    const sanitizedOU = this.sanitizeOUName(departmentName);
    console.log(`Buscando OU con nombre: ${sanitizedOU}`);

    return new Promise((resolve, reject) => {
      this.client.search(this.baseDN, {
        filter: `(ou=${escapeLDAPValue(sanitizedOU)})`,
        scope: 'sub',
        attributes: ['ou']
      }, (err, res) => {
        if (err) {
          console.error(`Error al buscar OU: ${err}`);
          return reject(err);
        }

        let departmentDN: string | null = null;
        res.on('searchEntry', (entry: SearchEntry) => {
          const ou = entry.attributes.find(attr => attr.type === 'ou');
          if (ou && ou.values.length > 0 && ou.values[0] === sanitizedOU) {
            departmentDN = `OU=${sanitizedOU},OU=ASSETS,${this.baseDN}`;
            console.log(`OU encontrada: ${departmentDN}`);
          }
        });

        res.on('error', (err) => {
          console.error(`Error durante la búsqueda: ${err}`);
          reject(err);
        });

        res.on('end', () => {
          if (departmentDN) {
            resolve(departmentDN);
          } else {
            console.error(`OU no encontrada para nombre: ${sanitizedOU}`);
            reject(new Error(`OU no encontrada para nombre: ${sanitizedOU}`));
          }
        });
      });
    });
  }

  private async getDepartmentName(idDireccion: string): Promise<string> {
    const departmentData = await this.prisma.rH_Plantilla.findFirst({
      where: { Id_Direccion: idDireccion },
      select: { Desc_Direccion: true }
    });

    if (!departmentData?.Desc_Direccion) {
      throw new Error(`Descripción de dirección no encontrada para Id_Direccion: ${idDireccion}`);
    }

    return this.sanitizeOUName(departmentData.Desc_Direccion);
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

  private sanitizeOUName(name: string): string {
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
    sanitized = sanitized.substring(0, MAX_LENGTH).trim();

    return sanitized;
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
      if (this.client) this.client.unbind();
    } catch (error) {
      console.error("⚠️ Error al cerrar conexión:", error);
    }
  }

  private getEmployeeTitle(employee: any): string {
    const titles: string[] = [];

    if (employee.Docente) titles.push("Docente");
    if (employee.Investigador) titles.push("Investigador");

    if (titles.length === 0) {
        return "Trabajador";
    }

    return titles.join(" / ");
  }
}
