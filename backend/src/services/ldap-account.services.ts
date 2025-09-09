import { Client, SearchOptions, SearchEntry, Change } from "ldapjs";
import {
  createLDAPClient,
  bindAsync,
  unifiedLDAPSearch,
} from "../utils/ldap.utils";
import { LDAPStructureBuilder } from "../utils/ldap.structure";
import dotenv from "dotenv";
dotenv.config();

interface LDAPError extends Error {
  code?: number;
  dn?: string;
  stack?: string;
  lde_message?: string;
  lde_dn?: string | null;
}

interface PostalCodeEntry {
  ou: string;
}

interface LdapAttribute {
  type: string;
  values: string[];
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
      const yearDN = await this.getYearOUPath(studentData);
      const userCN = `Estudiante ${this.escapeLDAPValue(studentData.personalData.fullName)}`;
      const userDN = `CN=${userCN},${yearDN}`;
      const username = await this.generateUniqueUsername(
        this.generateBaseUsername(studentData)
      );
      const userPassword = "DEBSmile2001*7027ab"; // Contraseña por defecto

      await this.createUserEntry(userDN, studentData, username, userPassword);

      return {
        success: true,
        dn: userDN,
        username,
        message: "Cuenta creada exitosamente",
      };
    } catch (error: unknown) {
      const ldapError = error as LDAPError;
      console.error("Error al crear cuenta:", ldapError);
      return {
        success: false,
        error: ldapError.message,
        code: "LDAP_ACCOUNT_CREATION_FAILED",
        details: {
          code: ldapError.code,
          dn: ldapError.dn,
          lde_message: ldapError.lde_message,
        },
      };
    } finally {
      this.safeUnbind();
    }
  }

  private async getYearOUPath(studentData: any): Promise<string> {
    const baseDN = process.env.LDAP_BASE_DN!;
    const normalized = this.normalizeAcademicData(studentData);
    console.log("Normalized Data:", normalized);
    const facultyDN = `OU=${normalized.faculty},OU=SIGENU,${baseDN}`;
    console.log("Faculty DN:", facultyDN);
    const careerDN = await this.findOUByName(facultyDN, normalized.career);
    console.log("Career DN:", careerDN);
    const courseTypeCode = this.sanitizeOUName(studentData.rawData.docentData.courseType);
    console.log("Course Type Code:", courseTypeCode);
    const courseTypeDN = await this.findOUByName(careerDN, courseTypeCode);
    console.log("Course Type DN:", courseTypeDN);
    const academicYear = studentData.rawData.docentData.year.replace(/\D/g, "");
    console.log("Academic Year:", academicYear);
    return this.handleYearOU(courseTypeDN, academicYear);
  }

  private async findOUByPostalCode(parentDN: string, postalCode: string): Promise<string> {
    const searchOptions: SearchOptions = {
      scope: "one",
      filter: `(&(objectClass=organizationalUnit)(postalCode=${postalCode}))`,
      attributes: ["ou"],
    };
    const entries = await new Promise<string[]>((resolve, reject) => {
      this.client.search(parentDN, searchOptions, (err, res) => {
        if (err) return reject(err);
        const results: string[] = [];
        res.on("searchEntry", (entry: SearchEntry) => {
          const ou = entry.pojo.attributes.find((a: LdapAttribute) => a.type === "ou")?.values?.[0];
          if (ou) results.push(ou);
        });
        res.on("error", reject);
        res.on("end", () => resolve(results));
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
      await this.createSimpleOU(yearOU, academicYear, {
        description: `Estudiantes de ${academicYear} año`,
        postalCode: `YEAR-${academicYear}`,
        objectClass: ["top", "organizationalUnit"],
      });
      return yearOU;
    }
  }

  private async createSimpleOU(dn: string, ouName: string, attributes: any): Promise<void> {
    const safeOU = this.sanitizeOUName(ouName);
    await new Promise((resolve, reject) => {
      console.log("Atributos a agregar:", attributes);
      this.client.add(
        dn,
        {
          objectClass: ["top", "organizationalUnit"],
          ou: safeOU,
          ...attributes,
        },
        (err) => {
          err ? reject(err) : resolve(true);
        }
      );
    });
  }

  private async searchOU(dn: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.search(dn, { scope: "base" }, (err, res) => {
        if (err) return reject(err);
        let exists = false;
        res.on("searchEntry", () => (exists = true));
        res.on("error", reject);
        res.on("end", () => (exists ? resolve() : reject("OU no encontrada")));
      });
    });
  }

  private normalizeAcademicData(studentData: any) {
    if (!studentData?.academicData?.faculty || !studentData?.academicData?.career) {
      throw new Error("Datos académicos incompletos: faculty o career no definidos");
    }
    const faculty = studentData.academicData.faculty || "";
    const career = studentData.academicData.career || "";
    const courseType = studentData.rawData.docentData.courseType || "";
    const year = studentData.rawData.docentData.year || "";
    console.log("Faculty:", faculty);
    console.log("Career:", career);
    console.log("Course Type:", courseType);
    return {
      faculty: this.sanitizeOUName(faculty),
      career: this.sanitizeOUName(career),
      year: year.replace(/\D/g, ""),
    };
  }

  private async createUserEntry(dn: string, studentData: any, username: string, password: string) {
    console.log("📝 Creando entrada para el estudiante:", {
      name: studentData.rawData.personalData.name,
      middleName: studentData.rawData.personalData.middleName,
      lastName: studentData.rawData.personalData.lastName,
      fullName: studentData.personalData.fullName,
    });
  
    const name = studentData.rawData.personalData.name.toString();
    const middleName = studentData.rawData.personalData.middleName.toString();
    const lastName = studentData.rawData.personalData.lastName.toString();
    const fullName = studentData.personalData.fullName.toString();
  
    // Atributos INCLUYENDO contraseña y userAccountControl
    const attributes = {
      objectClass: ["top", "person", "organizationalPerson", "user"],
      sAMAccountName: username,
      uid: username,
      cn: `Estudiante ${this.escapeLDAPValue(fullName)}`.trim(),
      givenName: this.normalizeDisplayName(name),
      sn: this.normalizeDisplayName(`${middleName} ${lastName}`),
      displayName: this.normalizeDisplayName(fullName),
      mail: studentData.backupEmail || this.generateStudentEmail(studentData),
      userPrincipalName: `${username}@uniss.edu.cu`,
      employeeID: studentData.personalData.identification,
      telephoneNumber: this.formatPhoneNumber(
        studentData.rawData.personalData.phone,
        studentData.rawData.personalData.country
      ),
      streetAddress: studentData.personalData.address,
      l: this.sanitizeAttribute(studentData.rawData.personalData.town),
      st: this.sanitizeAttribute(studentData.rawData.personalData.province),
      description: `Estudiante de ${studentData.academicData.career} actualmente ${studentData.rawData.docentData.studentType}`,
      title: "Estudiante",
      departmentNumber: studentData.academicData.year,
      employeeType: "Estudiante",
      ou: studentData.academicData.faculty,
      department: studentData.academicData.career,
      userAccountControl: "512", // Cuenta habilitada
      unicodePwd: this.encodePassword(password), // Contraseña codificada
    };
  
    console.log("📁 Atributos a agregar en la entrada del estudiante:", attributes);
  
    // Crear usuario CON contraseña y habilitado
    await new Promise((resolve, reject) => {
      this.client.add(dn, attributes, (err) => {
        if (err) {
          console.error("❌ Error al crear entrada LDAP:", err);
          reject(err);
        } else {
          console.log("✅ Entrada LDAP creada exitosamente con contraseña");
          resolve(true);
        }
      });
    });
  
    // Agregar a grupos
    const requiredGroups = [
      "CN=correo_nac,OU=_Grupos,DC=uniss,DC=edu,DC=cu",
      "CN=wifi_users,OU=_Grupos,DC=uniss,DC=edu,DC=cu",
      "CN=internet_est,OU=_Grupos,DC=uniss,DC=edu,DC=cu",
    ];
    
    try {
      await this.addUserToGroups(dn, requiredGroups);
      console.log("✅ Usuario agregado a todos los grupos correctamente");
    } catch (error) {
      console.error("⚠️ Error al agregar a grupos:", error);
      throw new Error("Usuario creado pero falló la asignación a grupos");
    }
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
        operation: "add",
        modification: {
          type: "member",
          values: [userDN],
        },
      };
      this.client.modify(groupDN, change, (err) => {
        if (err) {
          if (err.name === "ConstraintViolationError" || err.code === 20) {
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

  private encodePassword(password: string): Buffer {
    return Buffer.from(`"${password}"`, 'utf16le');
  }

  private generateStudentEmail(studentData: any): string {
    return `${studentData.personalData.identification}@uniss.edu.cu`;
  }

  private sanitizeOUName(name: string): string {
    if (!name) return "";
    if (this.nameCache.has(name)) {
      return this.nameCache.get(name)!;
    }
    let cleaned = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[()]/g, "")
      .replace(/[^a-zA-Z0-9 -]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 64)
      .trim();
    this.nameCache.set(name, cleaned);
    return cleaned;
  }

  private sanitizeCN(value: string): string {
    return value.replace(/[^a-zA-Z0-9\-_]/g, "").substring(0, 64);
  }

  private async findOUByName(parentDN: string, ouName: string): Promise<string> {
    if (!ouName || ouName.trim() === "") {
      throw new Error("Nombre de OU no puede estar vacío");
    }
    const searchOptions: SearchOptions = {
      scope: "one",
      filter: `(&(objectClass=organizationalUnit)(ou=${ouName}))`,
      attributes: ["ou"],
    };
    console.log("🔍 Buscando OU:", { parentDN, filter: searchOptions.filter });
    const entries = await new Promise<string[]>((resolve, reject) => {
      this.client.search(parentDN, searchOptions, (err, res) => {
        if (err) return reject(err);
        const results: string[] = [];
        res.on("searchEntry", (entry: SearchEntry) => {
          const ou = entry.pojo.attributes.find((a: LdapAttribute) => a.type === "ou")?.values?.[0];
          if (ou) results.push(ou);
        });
        res.on("error", reject);
        res.on("end", () => resolve(results));
      });
    });
    if (entries.length === 0) {
      throw new Error(`No se encontró OU con nombre ${ouName} en ${parentDN}`);
    }
    return `OU=${entries[0]},${parentDN}`;
  }

  private sanitizeAttribute(value: string): string {
    return value.replace(/[^\p{L}\s\-]/gu, "").substring(0, 128);
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

  private generateBaseUsername(studentData: any): string {
    const { name, middleName, lastName } = studentData.rawData.personalData;
    const [firstName] = name.toString().toLowerCase().split(" ");
    const firstSurname = middleName.toString().toLowerCase();
    const secondSurname = lastName.toString().toLowerCase();
    const variants = [
      `${firstName.charAt(0)}${secondSurname.replace(/ /g, "")}`,
      `${firstName.charAt(0)}${firstSurname.replace(/ /g, "")}`,
      `${firstName}${firstSurname.charAt(0)}${secondSurname.charAt(0)}`,
    ];
    const validVariant = variants.find(
      (v) => v.length <= 20 && /^[a-z]/.test(v) && v.length >= 4
    );
    return validVariant || this.fallbackUsername(firstName, firstSurname);
  }

  private fallbackUsername(firstName: string, firstSurname: string): string {
    return `${firstName}${firstSurname}`.substring(0, 20);
  }

  private async generateUniqueUsername(base: string): Promise<string> {
    let counter = 1;
    const MAX_ATTEMPTS = 50;
    let username = this.sanitizeUsername(base);
    if (!(await this.usernameExists(username))) return username;
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
    const suffix = counter.toString().padStart(2, "0");
    return this.sanitizeUsername(`${base.substring(0, 15)}-${suffix}`);
  }

  private sanitizeUsername(username: string): string {
    return username
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .substring(0, 20)
      .replace(/^-|-$/g, "");
  }

  private normalizeDisplayName(fullName: string | undefined): string {
    if (!fullName) return "";
    return fullName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ñ/g, "n")
      .replace(/Ñ/g, "N")
      .replace(/[^a-zA-Z\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 64);
  }

  public async usernameExists(username: string): Promise<boolean> {
    const maxRetries = 3;
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.authenticate();
        const baseDN = "ou=UNISS_Users,dc=uniss,dc=edu,dc=cu";
        const filter = `(&(|(sAMAccountName=${this.escapeLDAPValue(username)})(uid=${this.escapeLDAPValue(username)})))`;
        const entries = await this.searchLDAP(baseDN, filter, ["sAMAccountName", "uid"]);
        return entries.some((entry) =>
          entry.attributes.some(
            (attr: LdapAttribute) =>
              ["sAMAccountName", "uid"].includes(attr.type) &&
              attr.values.includes(username)
          )
        );
      } catch (error: unknown) {
        if (error instanceof Error) {
          lastError = error;
        } else {
          lastError = new Error(String(error));
        }
        console.warn(`Intento ${attempt} fallido:`, lastError);
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    console.error("Todos los intentos fallaron:", lastError);
    return false;
  }

  private async searchLDAP(baseDN: string, filter: string, attributes: string[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const entries: any[] = [];
      this.client.search(
        baseDN,
        {
          scope: "sub",
          filter,
          attributes,
        },
        (err, res) => {
          if (err) {
            return reject(err);
          }
          res.on("searchEntry", (entry) => {
            entries.push(entry);
          });
          res.on("error", (error) => {
            reject(error);
          });
          res.on("end", () => {
            resolve(entries);
          });
        }
      );
    });
  }

  private escapeLDAPValue(value: string): string {
    return value
      .replace(/\\/g, "\\5c")
      .replace(/,/g, "\\2c")
      .replace(/"/g, "\\22")
      .replace(/</g, "\\3c")
      .replace(/>/g, "\\3e")
      .replace(/;/g, "\\3b")
      .replace(/\//g, "\\2f")
      .substring(0, 64);
  }

  private formatPhoneNumber(phone: string, country: string): string {
    const countryCodes: { [key: string]: string } = {
      Cuba: "+53",
      "United States": "+1",
      Spain: "+34",
      Mexico: "+52",
      Germany: "+49",
      "El Salvador": "+503",
      Portugal: "+351",
      "United Kingdom": "+44",
      Russia: "+7",
      Chile: "+56",
      Uruguay: "+598",
      Angola: "+244",
    };
    const countryCode = countryCodes[country] || "+53";
    const cleanNumber = phone.replace(/\D/g, "");
    return `${countryCode}${cleanNumber}`;
  }
}