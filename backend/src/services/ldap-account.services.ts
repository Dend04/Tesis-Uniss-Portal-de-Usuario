// src/services/ldap-account.services.ts
import { Client, SearchOptions, SearchEntry, Change } from "ldapjs";
import {
  createLDAPClient,
  bindAsync,
  unifiedLDAPSearch,
} from "../utils/ldap.utils";
import { LDAPStructureBuilder } from "../utils/ldap.structure";
import dotenv from "dotenv";
import { userService } from "./user.services";
dotenv.config();

interface LDAPError extends Error {
  code?: number;
  dn?: string;
  stack?: string;
  lde_message?: string;
  lde_dn?: string | null;
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

async createStudentAccount(studentData: any, password: string, selectedUsername?: string) {
  try {
    console.log("🔧 Iniciando creación de cuenta LDAP...");
    console.log("👤 Username seleccionado:", selectedUsername);
    console.log("📧 Email backup:", studentData.backupEmail);
    console.log("🎓 Tipo estudiante:", studentData.rawData?.docentData?.academicSituation);

    
    await this.authenticate();
    await this.verifyBaseStructure();
    
    const yearDN = await this.getYearOUPath(studentData);
    const userCN = `Estudiante ${this.escapeCN(studentData.personalData.fullName)}`;
    const userDN = `CN=${userCN},${yearDN}`;
    
    // Usar el username seleccionado o generar uno automáticamente
    const username = selectedUsername 
      ? await this.verifyAndUseSelectedUsername(selectedUsername)
      : await this.generateUniqueUsername(this.generateBaseUsername(studentData));

    await this.createUserEntry(userDN, studentData, username, password, studentData.backupEmail);

    console.log(`✅ Cuenta creada exitosamente para: ${username}`);
    console.log(`📍 DN: ${userDN}`);
    
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

// Nuevo método para verificar y usar el username seleccionado
private async verifyAndUseSelectedUsername(username: string): Promise<string> {
  const sanitizedUsername = this.sanitizeUsername(username);
  
  if (!(await this.usernameExists(sanitizedUsername))) {
    return sanitizedUsername;
  } else {
    throw new Error(`El nombre de usuario "${username}" no está disponible`);
  }
}

  async getStudentAccount(employeeID: string): Promise<any> {
    try {
      const userData = await userService.getUserData(employeeID);
      
      return {
        sAMAccountName: userData.sAMAccountName || '',
        userPrincipalName: userData.userPrincipalName || '',
        mail: userData.email || userData.mail || '',
        cuentaHabilitada: true,
        ultimoInicioSesion: 'Nunca',
        displayName: userData.displayName || userData.nombreCompleto || '',
        email: userData.email || ''
      };
      
    } catch (error) {
      console.error("Error obteniendo datos LDAP:", error);
      return {
        sAMAccountName: '',
        userPrincipalName: '',
        mail: '',
        cuentaHabilitada: true,
        ultimoInicioSesion: 'Nunca',
        displayName: '',
        email: ''
      };
    }
  }

  private async getYearOUPath(studentData: any): Promise<string> {
    const baseDN = process.env.LDAP_BASE_DN_Propio!;
    
    const isThesisExtension = studentData.rawData.docentData.academicSituation === 'Prórroga de Tesis' || 
                             studentData.rawData.docentData.studentStatus === 'Prórroga de Tesis';
    
    if (isThesisExtension) {
      return this.handleThesisExtensionOU(baseDN);
    } else {
      const normalized = this.normalizeAcademicData(studentData);
      
      const facultyDN = await this.createOrVerifyOU(
        `OU=SIGENU,${baseDN}`, 
        normalized.faculty
      );
      
      const careerDN = await this.createOrVerifyOU(
        facultyDN, 
        normalized.career
      );
      
      const courseTypeCode = studentData.rawData.docentData.courseType;
      const courseTypeDN = await this.createOrVerifyOU(
        careerDN, 
        courseTypeCode
      );

      const academicYear = studentData.rawData.docentData.year.replace(/\D/g, "");
      return this.handleYearOU(courseTypeDN, academicYear);
    }
  }

  private async handleThesisExtensionOU(baseDN: string): Promise<string> {
    const originalOUName = "Prórroga de Tesis";
    const safeOUName = this.sanitizeOUName(originalOUName);
    const thesisDN = `OU=${safeOUName},${baseDN}`;

    try {
      await this.searchOU(thesisDN);
      return thesisDN;
    } catch (error) {
      await this.createSimpleOU(thesisDN, safeOUName, {
        description: `Estudiantes en ${originalOUName}`,
        postalCode: `THESIS-EXTENSION`,
        objectClass: ["top", "organizationalUnit"],
      });
      return thesisDN;
    }
  }

  private async handleYearOU(parentDN: string, academicYear: string): Promise<string> {
    const yearOU = `OU=${academicYear},${parentDN}`;
    try {
      await this.searchOU(yearOU);
      return yearOU;
    } catch (error) {
      await this.createSimpleOU(yearOU, academicYear, {
        description: `Estudiantes de ${academicYear} año`,
        postalCode: `YEAR-${academicYear}`,
        objectClass: ["top", "organizationalUnit"],
      });
      return yearOU;
    }
  }

  private async createOrVerifyOU(parentDN: string, ouName: string): Promise<string> {
    const safeOU = this.sanitizeOUName(ouName);
    const targetDN = `OU=${safeOU},${parentDN}`;
    
    try {
      await this.searchOU(targetDN);
      return targetDN;
    } catch (error) {
      await this.createSimpleOU(targetDN, safeOU, {
        description: `OU creada automáticamente para ${ouName}`,
        objectClass: ["top", "organizationalUnit"],
      });
      return targetDN;
    }
  }

  private async createSimpleOU(dn: string, ouName: string, attributes: any): Promise<void> {
    await new Promise((resolve, reject) => {
      this.client.add(
        dn,
        {
          objectClass: ["top", "organizationalUnit"],
          ou: ouName,
          ...attributes,
        },
        (err) => {
          if (err) {
            console.error(`Error creando OU ${dn}:`, err.message);
            reject(err);
          } else {
            resolve(true);
          }
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

  private async verifyBaseStructure(): Promise<void> {
    const baseDN = process.env.LDAP_BASE_DN_Propio!;
    
    try {
      await this.searchOU(baseDN);
    } catch (error) {
      console.error(`Estructura base no existe: ${baseDN}`);
      throw new Error(`Estructura LDAP base no encontrada: ${baseDN}`);
    }
  }

  private normalizeAcademicData(studentData: any) {
    if (!studentData?.academicData?.faculty || !studentData?.academicData?.career) {
      throw new Error("Datos académicos incompletos: faculty o career no definidos");
    }
    
    const faculty = studentData.academicData.faculty || "";
    const career = studentData.academicData.career || "";
    const year = studentData.rawData.docentData.year || "";
    
    const isThesisExtension = studentData.rawData.docentData.academicSituation === 'Prórroga de Tesis' || 
                             studentData.rawData.docentData.studentStatus === 'Prórroga de Tesis';
    
    return {
      faculty: this.sanitizeOUName(faculty),
      career: this.sanitizeOUName(career),
      year: isThesisExtension ? "Prórroga de Tesis" : year.replace(/\D/g, ""),
      isThesisExtension: isThesisExtension
    };
  }

private async createUserEntry(userDN: string, studentData: any, username: string, password: string, userEmail: string) {
  const name = studentData.rawData.personalData.name.toString();
  const middleName = studentData.rawData.personalData.middleName.toString();
  const lastName = studentData.rawData.personalData.lastName.toString();
  const fullName = studentData.personalData.fullName.toString();
  
  const normalizedName = this.normalizeName(name);
  const normalizedMiddleName = this.normalizeName(middleName);
  const normalizedLastName = this.normalizeName(lastName);
  const normalizedFullName = this.normalizeName(fullName);
  
  const isThesisExtension = studentData.rawData.docentData.academicSituation === 'Prórroga de Tesis' || 
                           studentData.rawData.docentData.studentStatus === 'Prórroga de Tesis';
  
  const userPrincipalName = `${username}@uniss.edu.cu`;

  const attributes = {
    objectClass: ["top", "person", "organizationalPerson", "user"],
    sAMAccountName: username,
    uid: username,
    cn: `Estudiante ${normalizedFullName}`.trim(),
    givenName: this.normalizeDisplayName(normalizedName),
    sn: this.normalizeDisplayName(`${normalizedMiddleName} ${normalizedLastName}`.trim()),
    displayName: this.normalizeDisplayName(normalizedFullName),
    mail: userPrincipalName,
    userPrincipalName: userPrincipalName,
    
    // ✅ CAMPOS 2FA ACTUALIZADOS
    userParameters: "2FA DISABLED",           // Estado del 2FA
    employeeNumber: studentData.personalData.identification, // Número de identificación original
    // serialNumber: " ", // ← Ahora libre para tu otro uso
    
    // ... (otros atributos se mantienen igual)
    telephoneNumber: this.formatPhoneNumber(
      studentData.rawData.personalData.phone,
      studentData.rawData.personalData.country
    ),
    streetAddress: studentData.personalData.address,
    l: this.sanitizeAttribute(studentData.rawData.personalData.town),
    st: this.sanitizeAttribute(studentData.rawData.personalData.province),
    physicalDeliveryOfficeName: isThesisExtension 
      ? `Estudiante de ${studentData.academicData.career} en Prórroga de Tesis`
      : `Estudiante de ${studentData.academicData.career} actualmente ${studentData.rawData.docentData.studentType}`,
    title: "Estudiante",
    departmentNumber: isThesisExtension ? "Prórroga de Tesis" : studentData.academicData.year,
    employeeType: "Estudiante",
    ou: studentData.academicData.faculty,
    department: studentData.academicData.career,
    company: userEmail,
    userAccountControl: "512",
    unicodePwd: this.encodePassword(password),
  };

  console.log('🎓 Atributos de estudiante:');
  console.log('userParameters (2FA):', attributes.userParameters);
  console.log('employeeNumber (ID + futuro 2FA):', attributes.employeeNumber);
  console.log('serialNumber (LIBRE):', "Disponible para otro uso");


  await new Promise((resolve, reject) => {
    this.client.add(userDN, attributes, (err) => {
      if (err) {
        console.error("Error al crear entrada LDAP:", err);
        reject(err);
      } else {
        console.log(`✅ Cuenta de estudiante creada con campos 2FA inicializados`);
        resolve(true);
      }
    });
  });

  const requiredGroups = [
    "CN=correo_int,OU=_Grupos,DC=uniss,DC=edu,DC=cu",
    "CN=UNISS-Everyone,OU=_Grupos,DC=uniss,DC=edu,DC=cu"
  ];
  
  await this.addUserToGroups(userDN, requiredGroups);
}

  private async addUserToGroups(userDN: string, groupDNs: string[]): Promise<void> {
    for (const groupDN of groupDNs) {
      try {
        await this.addUserToGroup(userDN, groupDN);
      } catch (error) {
        console.error(`Error agregando a ${groupDN}:`, error);
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
            resolve();
          } else {
            reject(new Error(`Error LDAP (${err.code}): ${err.message}`));
          }
        } else {
          resolve();
        }
      });
    });
  }

  private normalizeName(name: string): string {
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, ' ')
      .trim();
  }

  private sanitizeOUName(name: string): string {
    if (!name) return "";
    if (this.nameCache.has(name)) {
      return this.nameCache.get(name)!;
    }
    
    let cleaned = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    cleaned = cleaned.substring(0, 64);
    this.nameCache.set(name, cleaned);
    return cleaned;
  }

  private sanitizeAttribute(value: string): string {
    return value.replace(/[^\p{L}\s\-]/gu, "").substring(0, 128);
  }

  private normalizeDisplayName(fullName: string | undefined): string {
    if (!fullName) return "";
    return fullName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ñ/g, "n").replace(/Ñ/g, "N")
      .replace(/[^a-zA-Z\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 64);
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
      console.error("Error al cerrar conexión:", error);
    }
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

  public async usernameExists(username: string): Promise<boolean> {
    const maxRetries = 3;
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
      } catch (error) {
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
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

  private encodePassword(password: string): Buffer {
    return Buffer.from(`"${password}"`, 'utf16le');
  }

  private escapeLDAPValue(value: string): string {
    if (!value) return "";
    return value
      .replace(/\\/g, "\\\\")
      .replace(/,/g, "\\,")
      .replace(/"/g, '\\"')
      .replace(/</g, "\\<")
      .replace(/>/g, "\\>")
      .replace(/;/g, "\\;")
      .replace(/=/g, "\\=")
      .replace(/\+/g, "\\+")
      .replace(/\#/g, "\\#")
      .replace(/\r/g, "")
      .replace(/\n/g, "");
  }

  private escapeCN(value: string): string {
    if (!value) return "";
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, ' ')
      .trim();
  }

  private formatPhoneNumber(phone: string, country: string): string {
    const countryCodes: { [key: string]: string } = {
     Cuba: "+53",
      "United States": "+1",
      Argentina: "+54",
      Belgium:"+32",
      Brazil:"+55",
      Ecuador:"+593",
      Spain: "+34",
      Mexico: "+52",
      Germany: "+49",
      "El Salvador": "+503",
      Portugal: "+351",
      "United Kingdom": "+44",
      Russia: "+7",
      Venezuela:"+58",
      Japan:"+81",
      Italy:"+39",
      Haiti:"+509",
      Chile: "+56",
      Uruguay: "+598",
      Angola: "+244",
    };
    const countryCode = countryCodes[country] || "+53";
    const cleanNumber = phone.replace(/\D/g, "");
    return `${countryCode}${cleanNumber}`;
  }
}