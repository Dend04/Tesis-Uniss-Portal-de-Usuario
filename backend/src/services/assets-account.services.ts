import { Client } from "ldapjs";
import { SearchEntry } from "ldapjs";
import { PrismaClient } from "@prisma/client";
import { bindAsync, createLDAPClient, escapeDNValue, escapeLDAPValue } from "../utils/ldap.utils";

export class UserEntriesBuilder {
  private client: Client;
  private prisma: PrismaClient;
  baseDN: string = process.env.LDAP_BASE_DN_Propio!;

  constructor() {
    this.client = createLDAPClient(process.env.LDAP_URL!);
    this.prisma = new PrismaClient();
  }

// Modificar el método createUserEntryByCI para recibir el username
async createUserEntryByCI(ci: string, username: string, password: string, email: string) {
  try {
    console.log(`🚀 Iniciando creación de entrada de usuario para CI: ${ci} con username: ${username}`);
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
    if (await this.userExists(username)) {
      console.log(`⏩ Usuario ya existe: ${username}`);
      return;
    }

    // Obtener DN del departamento
    const departmentDN = await this.getDepartmentDN(employee.Id_Direccion);

    // Crear entrada de usuario con password y email
    await this.createUserEntry(departmentDN, employee, username, password, email);

    console.log(`✅ Entrada de usuario creada exitosamente para CI: ${ci} con username: ${username}`);
  } catch (error) {
    console.error(`💥 Error crítico al crear entrada de usuario para CI ${ci}:`, error);
    throw error;
  } finally {
    await this.prisma.$disconnect();
    this.safeUnbind();
  }
}

private async createUserEntry(departmentDN: string, employee: any, username: string, password: string, email: string) {
  // Determinar el título y ajustar el campo cn
  const title = this.getEmployeeTitle(employee);
  const cnValue = this.getEmployeeCN(employee);

  // ESCAPAR el CN correctamente usando la función específica para DN
  const escapedCN = escapeDNValue(cnValue);
  const userDN = `CN=${escapedCN},${departmentDN}`;

  // Resto del código se mantiene igual...
  console.log('DN del usuario (escapado):', userDN);

  // Determinar la descripción según el rol del empleado
  const description = this.getEmployeeDescription(employee);
  const departmentName = await this.getDepartmentName(employee.Id_Direccion);
   // Generar el userPrincipalName que será usado también para mail
   const userPrincipalName = `${username}@uniss.edu.cu`;

  const entry = {
    objectClass: ['top', 'person', 'organizationalPerson', 'user'],
    cn: cnValue,
    givenName: employee.Nombre,
    sn: `${employee.Apellido_1} ${employee.Apellido_2 || ''}`.trim(),
    displayName: `${employee.Nombre} ${employee.Apellido_1} ${employee.Apellido_2 || ''}`.trim(),
    streetAddress: employee.Direccion || '',
    title: title,
    employeeID: employee.No_CI.replace(/\D/g, '').trim(),
    sAMAccountName: username,
    uid: username,
    userPrincipalName: userPrincipalName,
    mail: userPrincipalName,
    physicalDeliveryOfficeName: description,
    department: departmentName,
    company: email,
    userAccountControl: '512', // Cuenta habilitada
    unicodePwd: this.encodePassword(password), // Contraseña codificada
    
    // ✅ CAMPOS 2FA AGREGADOS
    userParameters: "2FA DISABLED",  // 2FA deshabilitado inicialmente
    serialNumber: " ",                // Secreto vacío inicialmente
  };

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
  console.log('mail:', entry.mail);
  console.log('physicalDeliveryOfficeName:', entry.physicalDeliveryOfficeName);
  console.log('userParameters:', entry.userParameters); // ✅ Nuevo campo
  console.log('serialNumber:', entry.serialNumber);     // ✅ Nuevo campo
  console.log('DN del usuario:', userDN);
  console.log('email de respaldo del usuario:', entry.company);

  await new Promise((resolve, reject) => {
    this.client.add(userDN, entry, (err) => {
      if (err) return reject(err);
      console.log(`✅ Cuenta de empleado creada con campos 2FA inicializados`);
      resolve(true);
    });
  });

  await this.addUserToGroups(userDN, [
    'CN=correo_int,OU=_Grupos,DC=uniss,DC=edu,DC=cu',
    'CN=UNISS-Everyone,OU=_Grupos,DC=uniss,DC=edu,DC=cu',
    "CN=wifi_users,OU=_Grupos,DC=uniss,DC=edu,DC=cu",
    "CN=internet_prof_vip,OU=_Grupos,DC=uniss,DC=edu,DC=cu"
  ]);
}

private async addUserToGroups(userDN: string, groupDNs: string[]): Promise<void> {
  for (const groupDN of groupDNs) {
    try {
      await this.addUserToGroup(userDN, groupDN);
    } catch (error) {
      console.error(`⛔ Error crítico agregando a ${groupDN}:`, error);
      throw error;
    }
  }
}
private async addUserToGroup(userDN: string, groupDN: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const change = {
      operation: 'add',
      modification: {
        type: 'member',
        values: [userDN]
      }
    };

    this.client.modify(groupDN, change, (err) => {
      if (err) {
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

// Método para codificar la contraseña (igual que en LDAPAccountService)
private encodePassword(password: string): Buffer {
  return Buffer.from(`"${password}"`, 'utf16le');
}


private getEmployeeCN(employee: any): string {
  // Función para normalizar nombres eliminando tildes
  const normalizeName = (name: string) => {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar tildes
      .replace(/[^a-zA-Z0-9\s]/g, '') // Eliminar caracteres especiales
      .replace(/\s+/g, ' ')
      .trim();
  };

  const firstName = normalizeName(employee.Nombre);
  const lastName = normalizeName(employee.Apellido_1);
  const fullName = `${firstName} ${lastName}`;
  
  // Simplificar el CN para evitar problemas de sintaxis
  if (employee.Docente && employee.Investigador) {
    return `Docente-Investigador ${fullName}`;
  } else if (employee.Docente) {
    return `Docente ${fullName}`;
  } else if (employee.Investigador) {
    return `Investigador ${fullName}`;
  } else {
    return `Trabajador ${fullName}`;
  }
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
  const departmentData = await this.prisma.rH_Plantilla.findFirst({
    where: { Id_Direccion: idDireccion },
    select: { Desc_Direccion: true }
  });

  if (!departmentData?.Desc_Direccion) {
    throw new Error(`❌ Desc_Direccion no encontrado para Id_Direccion: ${idDireccion}`);
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

  private async userExists(username: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.client.search(this.baseDN, {
        filter: `(&(objectClass=user)(sAMAccountName=${escapeLDAPValue(username)}))`,
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
  
    // Normalizar más agresivamente para nombres de OU
    let sanitized = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Eliminar tildes
      .replace(/[^a-zA-Z0-9\s\-_]/g, "") // Solo caracteres permitidos
      .replace(/\s+/g, " ") // Espacios múltiples a uno
      .trim();
  
    // Escapar caracteres especiales LDAP
    sanitized = sanitized
      .replace(/,/g, "\\2c")
      .replace(/:/g, "\\3a");
  
    // Truncar + eliminar espacio final
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
