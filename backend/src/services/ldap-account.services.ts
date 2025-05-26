// src/services/ldap-account.service.ts
import { Client, SearchOptions, SearchEntry } from "ldapjs";
import { createLDAPClient, bindAsync, unifiedLDAPSearch } from "../utils/ldap.utils";
import { LDAPStructureBuilder } from "../utils/ldap.structure";
import dotenv from "dotenv";

dotenv.config();

interface PostalCodeEntry {
    ou: string;
}

export class LDAPAccountService {
  private client: Client;
  private structureBuilder: LDAPStructureBuilder;
  private nameCache = new Map<string, string>();

  constructor() {
    this.client = createLDAPClient(process.env.LDAP_URL!);
    this.structureBuilder = new LDAPStructureBuilder();
  }

  async createStudentAccount(studentData: any) {
    try {
        await this.authenticate();

        // 1. Obtener DN base de la estructura académica
        const yearDN = await this.getYearOUPath(studentData);

        // 2. Crear entrada del estudiante
        const userCN = `Estudiante ${this.escapeLDAPValue(studentData.personalData.fullName)}`;
        const userDN = `CN=${userCN},${yearDN}`;

        await this.createUserEntry(userDN, studentData);

        return {
            success: true,
            dn: userDN,
            message: "Cuenta creada exitosamente"
        };
    } catch (error: any) {
        console.error('Error al crear cuenta:', error);
        return {
            success: false,
            error: error.message,
            code: "LDAP_ACCOUNT_CREATION_FAILED",
            stack: error.stack // Para ver la traza completa
        };
    } finally {
        this.safeUnbind();
    }
  }

  private async getYearOUPath(studentData: any): Promise<string> {
    const baseDN = process.env.LDAP_BASE_DN!;

    // Normalizar nombres
    const normalized = this.normalizeAcademicData(studentData);
    console.log('Normalized Data:', normalized);

    // 1. Buscar OU de la facultad
    const facultyDN = `OU=${normalized.faculty},OU=SIGENU,${baseDN}`;
    console.log('Faculty DN:', facultyDN);

    try {
        // 2. Buscar OU de la carrera
        const careerDN = await this.findOUByName(facultyDN, normalized.career);
        console.log('Career DN:', careerDN);

        // 3. Buscar OU del tipo de curso
        const courseTypeCode = this.sanitizeOUName(studentData.rawData.docentData.courseType);
        console.log('Course Type Code:', courseTypeCode);
        const courseTypeDN = await this.findOUByName(careerDN, courseTypeCode);
        console.log('Course Type DN:', courseTypeDN);

        // 4. Manejar OU del año
        const academicYear = studentData.rawData.docentData.year.replace(/\D/g, '');
        console.log('Academic Year:', academicYear);
        return this.handleYearOU(courseTypeDN, academicYear);

    } catch (error: any) {
        console.error('Error en getYearOUPath:', error);
        throw new Error(`Error en estructura académica: ${error.message}`);
    }
  }

  private async findOUByPostalCode(parentDN: string, postalCode: string): Promise<string> {
    const searchOptions: SearchOptions = {
        scope: 'one',
        filter: `(&(objectClass=organizationalUnit)(postalCode=${postalCode}))`,
        attributes: ['ou']
    };

    const entries = await new Promise<string[]>((resolve, reject) => {
        this.client.search(parentDN, searchOptions, (err, res) => {
            if (err) return reject(err);

            const results: string[] = [];

            res.on('searchEntry', (entry: SearchEntry) => {
                const ou = entry.pojo.attributes.find(a => a.type === 'ou')?.values?.[0];
                if (ou) results.push(ou);
            });

            res.on('error', reject);
            res.on('end', () => resolve(results));
        });
    });

    if (entries.length === 0) {
        throw new Error(`No se encontró OU con postalCode ${postalCode} en ${parentDN}`);
    }

    return `OU=${entries[0]},${parentDN}`;
  }

  private async verifyOUExistence(dn: string, type: string): Promise<void> {
    try {
        await this.searchOU(dn);
    } catch (error) {
        throw new Error(`${type} no encontrada: ${dn}`);
    }
  }

  private async handleYearOU(parentDN: string, academicYear: string): Promise<string> {
    const yearOU = `OU=${academicYear},${parentDN}`;

    try {
        await this.searchOU(yearOU);
        console.log(`✅ OU del año ${academicYear} ya existe: ${yearOU}`);
        return yearOU;
    } catch (error) {
        console.log(`🆕 Creando OU del año académico: ${academicYear}`);
        await this.createSimpleOU(
            yearOU,
            academicYear,
            {
                description: `Estudiantes de ${academicYear} año`,
                postalCode: `YEAR-${academicYear}`,
                objectClass: ['top', 'organizationalUnit']
            }
        );
        return yearOU;
    }
  }

  private async createSimpleOU(dn: string, ouName: string, attributes: any): Promise<void> {
    const safeOU = this.sanitizeOUName(ouName);

    await new Promise((resolve, reject) => {
      console.log('Atributos a agregar:', attributes);
      this.client.add(dn, {
        objectClass: ['top', 'organizationalUnit'],
        ou: safeOU,
        ...attributes
      }, (err) => {
        err ? reject(err) : resolve(true);
      });
    });
  }

  private async searchOU(dn: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.search(dn, { scope: 'base' }, (err, res) => {
        if (err) return reject(err);

        let exists = false;
        res.on('searchEntry', () => exists = true);
        res.on('error', reject);
        res.on('end', () => exists ? resolve() : reject('OU no encontrada'));
      });
    });
  }

  private async buildAcademicStructure(studentData: any): Promise<string> {
    const baseDN = process.env.LDAP_BASE_DN!;
    const { faculty, career, year } = this.normalizeAcademicData(studentData);

    // Crear estructura usando el builder existente
    await this.structureBuilder.createOU(`OU=SIGENU,${baseDN}`, faculty, {
      description: `Facultad: ${faculty}`,
      postalCode: "FAC-001"
    });

    const facultyDN = `OU=${faculty},OU=SIGENU,${baseDN}`;

    await this.structureBuilder.createOU(facultyDN, career, {
      description: `Carrera: ${career}`,
      postalCode: "CAR-001"
    });

    const careerDN = `OU=${career},${facultyDN}`;
    const courseType = this.sanitizeOUName(studentData.rawData.docentData.courseType);

    await this.structureBuilder.createOU(careerDN, courseType, {
      description: `Tipo de curso: ${courseType}`,
      postalCode: "CUR-001"
    });

    const courseTypeDN = `OU=${courseType},${careerDN}`;
    const academicYear = year.replace(/\D/g, ''); // Solo números

    await this.structureBuilder.createOU(courseTypeDN, academicYear, {
      description: `Estudiantes de ${academicYear} año`,
      postalCode: `YEAR-${academicYear}`
    });

    return `OU=${academicYear},${courseTypeDN}`;
  }

  private normalizeAcademicData(studentData: any) {
    if (!studentData?.academicData?.faculty ||
        !studentData?.academicData?.career) {
        throw new Error("Datos académicos incompletos: faculty o career no definidos");
    }

    const faculty = studentData.academicData.faculty || '';
    const career = studentData.academicData.career || '';
    const courseType = studentData.rawData.docentData.courseType || '';
    const year = studentData.rawData.docentData.year || '';

    console.log('Faculty:', faculty);
    console.log('Career:', career);
    console.log('Course Type:', courseType);

    return {
        faculty: this.sanitizeOUName(faculty),
        career: this.sanitizeOUName(career),
        year: year.replace(/\D/g, '')
    };
  }

  private async createUserEntry(dn: string, studentData: any) {
    console.log('📝 Creando entrada para el estudiante:', {
        name: studentData.rawData.personalData.name,
        middleName: studentData.rawData.personalData.middleName,
        lastName: studentData.rawData.personalData.lastName,
        fullName: studentData.personalData.fullName
    });

    // Validación de campos obligatorios
    if (!studentData?.rawData?.personalData.name ||
        !studentData?.rawData?.personalData.middleName ||
        !studentData?.rawData?.personalData.lastName ||
        !studentData?.personalData?.fullName) {
        throw new Error("Datos personales incompletos: name, middleName, lastName o fullName no definidos");
    }

    // Normalización de datos del estudiante
    const name = studentData.rawData.personalData.name.toString();
    const middleName = studentData.rawData.personalData.middleName.toString();
    const lastName = studentData.rawData.personalData.lastName.toString();
    const fullName = studentData.personalData.fullName.toString();
    const password = "DEBSmile2001*7027ab"; // Contraseña por defecto

    // Generación de username único
    const baseUsername = this.generateBaseUsername(studentData);
    const uniqueUsername = await this.generateUniqueUsername(baseUsername);

    const encodedPassword = this.encodePassword(password);

    // Construcción de atributos LDAP
    const attributes = {
      objectClass: ['top', 'person', 'organizationalPerson', 'user'],
      sAMAccountName: uniqueUsername,
      uid: uniqueUsername,
      cn: `Estudiante ${this.escapeLDAPValue(fullName)}`,
      givenName: this.normalizeDisplayName(name),
      sn: this.normalizeDisplayName(`${middleName} ${lastName}`),
      displayName: this.normalizeDisplayName(fullName),
      mail: this.generateStudentEmail(studentData),
      userPrincipalName: `${uniqueUsername}@uniss.edu.cu`,
      employeeID: studentData.personalData.identification,
      telephoneNumber: this.formatPhoneNumber(studentData.rawData.personalData.phone, studentData.rawData.personalData.country),
      streetAddress: studentData.personalData.address,
      l: this.sanitizeAttribute(studentData.rawData.personalData.town),
      st: this.sanitizeAttribute(studentData.rawData.personalData.province),
      description: `Estudiante de ${studentData.academicData.career} actualmente ${studentData.rawData.docentData.studentType}`,
      title: 'Estudiante',
      departmentNumber: studentData.academicData.year,
      employeeType: 'Estudiante',
      ou: studentData.academicData.faculty,
      department: studentData.academicData.career,
      /* unicodePwd: encodedPassword, 
      userAccountControl: 512,                    // Cuenta habilitada
      pwdLastSet: 0                               // Forzar cambio de contraseña */
    };

    console.log('📁 Atributos a agregar en la entrada del estudiante:', attributes);

    // Crear la entrada en LDAP usando el DN proporcionado
    await new Promise((resolve, reject) => {
        this.client.add(dn, attributes, (err) => {  // Usamos el DN dinámico recibido
            err ? reject(err) : resolve(true);
        });
    });

    // Agregar usuario a grupos requeridos
    const requiredGroups = [
      'CN=correo_nac,OU=_Grupos,DC=uniss,DC=edu,DC=cu',
      'CN=wifi_users,OU=_Grupos,DC=uniss,DC=edu,DC=cu',
      'CN=internet_est,OU=_Grupos,DC=uniss,DC=edu,DC=cu'
    ];

    try {
      await this.addUserToGroups(dn, requiredGroups);
      console.log('✅ Usuario agregado a todos los grupos correctamente');
    } catch (error) {
      console.error('⚠️ Error al agregar a grupos:', error);
      throw new Error('Usuario creado pero falló la asignación a grupos');
    }
  }

  // Método auxiliar para agregar usuario a múltiples grupos
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

  // Método para agregar usuario a un grupo específico
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

  private encodePassword(password: string): string {
    const passwordBuffer = Buffer.from(`"${password}"`, 'utf16le');
    return `"${passwordBuffer.toString('base64')}"`;
  }
  
  

  private generateStudentEmail(studentData: any): string {
    return `${studentData.personalData.identification}@uniss.edu.cu`;
  }

  private sanitizeOUName(name: string): string {
    if (!name) return ''; // Maneja undefined, null, o vacío

    if (this.nameCache.has(name)) {
        return this.nameCache.get(name)!;
    }

    let cleaned = name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")  // Eliminar tildes
        .replace(/[()]/g, "")             // Eliminar paréntesis
        .replace(/[^a-zA-Z0-9 -]/g, "")   // Caracteres válidos
        .replace(/\s+/g, " ")             // Espacios múltiples → 1
        .trim()
        .substring(0, 64)
        .trim();

    this.nameCache.set(name, cleaned);
    return cleaned;
  }

  private sanitizeCN(value: string): string {
    return value.replace(/[^a-zA-Z0-9\-_]/g, '').substring(0, 64);
  }

  private async findOUByName(parentDN: string, ouName: string): Promise<string> {
    if (!ouName || ouName.trim() === '') {
        throw new Error("Nombre de OU no puede estar vacío");
    }

    const searchOptions: SearchOptions = {
        scope: 'one',
        filter: `(&(objectClass=organizationalUnit)(ou=${ouName}))`,
        attributes: ['ou']
    };

    console.log('🔍 Buscando OU:', { parentDN, filter: searchOptions.filter });

    const entries = await new Promise<string[]>((resolve, reject) => {
        this.client.search(parentDN, searchOptions, (err, res) => {
            if (err) return reject(err);

            const results: string[] = [];

            res.on('searchEntry', (entry: SearchEntry) => {
                const ou = entry.pojo.attributes.find(a => a.type === 'ou')?.values?.[0];
                if (ou) results.push(ou);
            });

            res.on('error', reject);
            res.on('end', () => resolve(results));
        });
    });

    if (entries.length === 0) {
        throw new Error(`No se encontró OU con nombre ${ouName} en ${parentDN}`);
    }

    return `OU=${entries[0]},${parentDN}`;
  }

  private sanitizeAttribute(value: string): string {
    return value.replace(/[^\p{L}\s\-]/gu, '').substring(0, 128);
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
      console.error("⚠️ Error al cerrar conexión:", error);
    }
  }

  private fallbackUsernameGeneration(firstName: string, firstSurname: string): string {
    const base = `${firstName}${firstSurname}`;
    return base.substring(0, 20);
  }

  // Algoritmo de generación de username
  private generateBaseUsername(studentData: any): string {
    const { name, middleName, lastName } = studentData.rawData.personalData;

    // Normalizar componentes del nombre
    const [firstName] = name.toString().toLowerCase().split(' ');
    const firstSurname = middleName.toString().toLowerCase();
    const secondSurname = lastName.toString().toLowerCase();

    // Generar variantes en orden de prioridad
    const variants = [
        // 1ra letra nombre + apellido1 completo
        `${firstName.charAt(0)}${secondSurname.replace(/ /g, '')}`,

        // 1ra letra nombre + apellido2 completo
        `${firstName.charAt(0)}${firstSurname.replace(/ /g, '')}`,

        // Nombre completo + inicial apellidos
        `${firstName}${firstSurname.charAt(0)}${secondSurname.charAt(0)}`
    ];

    // Seleccionar primera variante válida
    const validVariant = variants.find(v =>
        v.length <= 20 &&
        /^[a-z]/.test(v) &&
        v.length >= 4
    );

    return validVariant || this.fallbackUsername(firstName, firstSurname);
  }

  private fallbackUsername(firstName: string, firstSurname: string): string {
    return `${firstName}${firstSurname}`.substring(0, 20);
  }

  // Modifica el método generateUniqueUsername
  private async generateUniqueUsername(base: string): Promise<string> {
    let counter = 1;
    const MAX_ATTEMPTS = 50;
    let username = this.sanitizeUsername(base);

    // Generar primera variante
    if (!(await this.usernameExists(username))) return username;

    // Generar variantes numéricas
    while (counter <= MAX_ATTEMPTS) {
        const newUsername = `${username}${counter}`.substring(0, 20);
        if (!(await this.usernameExists(newUsername))) {
            return newUsername;
        }
        counter++;
    }
    throw new Error("No se pudo generar username único");
  }

  private generateUsernameVariant(base: string, counter: number): string {
    const suffix = counter.toString().padStart(2, '0');
    return this.sanitizeUsername(
        `${base.substring(0, 15)}-${suffix}` // Dejar espacio para sufijos
    );
  }

  private sanitizeUsername(username: string): string {
    return username
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .substring(0, 20)
        .replace(/^-|-$/g, '');
  }

  private normalizeDisplayName(fullName: string | undefined): string {
    if (!fullName) return ''; // Manejar casos vacíos

    return fullName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar tildes
        .replace(/ñ/g, 'n').replace(/Ñ/g, 'N') // Manejar eñes
        .replace(/[^a-zA-Z\s]/g, '') // Eliminar caracteres especiales
        .replace(/\s+/g, ' ') // Espacios múltiples a uno
        .trim()
        .substring(0, 64);
  }

  private async usernameExists(username: string): Promise<boolean> {
    try {
        const filter = `(&(|(sAMAccountName=${username})(uid=${username})))`;
        const entries = await unifiedLDAPSearch(filter);

        // Verificar coincidencias exactas
        return entries.some(entry =>
            entry.attributes.some(attr =>
                ['sAMAccountName', 'uid'].includes(attr.type) &&
                attr.values.includes(username)
            )
        );
    } catch (error) {
        console.error("Error en búsqueda LDAP:", error);
        return false; // No asumir que existe si hay un error
    }
  }

  private escapeLDAPValue(value: string): string {
    return value
        .replace(/\\/g, '\\5c')
        .replace(/,/g, '\\2c')
        .replace(/"/g, '\\22')
        .replace(/</g, '\\3c')
        .replace(/>/g, '\\3e')
        .replace(/;/g, '\\3b')
        .replace(/\//g, '\\2f')
        .substring(0, 64);
  }

  private formatPhoneNumber(phone: string, country: string): string {
    const countryCodes: { [key: string]: string } = {
      'Cuba': '+53',
        'United States': '+1',
        'Spain': '+34',
        'Mexico': '+52',
        'Germany': '+49',
        'El Salvador': '+503',
        'Portugal': '+351',
        'United Kingdom': '+44',
        'Russia': '+7',
        'Chile': '+56',
        'Uruguay': '+598',
        'Angola': '+244',
        // Agrega más países según sea necesario
    };
    // Obtener el código del país
    const countryCode = countryCodes[country] || '+53'; // Default a Cuba
    // Limpiar el número de teléfono
    const cleanNumber = phone.replace(/\D/g, ''); // Elimina todos los caracteres no numéricos

    // Formatear el número
    return `${countryCode}${cleanNumber}`;
  }

  private formatLDAPDate(dateString: string): string {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0].replace(/-/g, '');
  }
}
