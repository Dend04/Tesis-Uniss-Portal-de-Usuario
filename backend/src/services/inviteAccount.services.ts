// lib/services/inviteAccount.services.ts
import { Client } from "ldapjs";
import { bindAsync, createLDAPClient, escapeDNValue, escapeLDAPValue } from "../utils/ldap.utils";

export interface CreateGuestUserDto {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  identityCard?: string;
  reason?: string;
}

export class GuestUserService {
  private client: Client;
  private baseDN: string = process.env.LDAP_BASE_DN_Propio!;
  private nameCache = new Map<string, string>();

  constructor() {
    this.client = createLDAPClient(process.env.LDAP_URL!);
  }

  async createGuestUser(createGuestUserDto: CreateGuestUserDto): Promise<{ success: boolean; message: string; username?: string }> {
    try {
      console.log(`🚀 Iniciando creación de usuario invitado: ${createGuestUserDto.username}`);
      await this.authenticate();

      // Verificar y preparar el username
      const username = await this.verifyAndPrepareUsername(createGuestUserDto.username);

      // Definir y verificar OU de invitados
      const guestsOU = 'OU=Invitados,DC=uniss,DC=edu,DC=cu';
      await this.ensureGuestsOUExists(guestsOU);

      // Crear entrada de usuario
      await this.createUserEntry(guestsOU, createGuestUserDto, username);

      console.log(`✅ Usuario invitado ${username} creado exitosamente`);
      
      return {
        success: true,
        message: 'Usuario invitado creado exitosamente',
        username: username
      };

    } catch (error: any) {
      console.error(`💥 Error al crear usuario invitado:`, error);
      throw error;
    } finally {
      this.safeUnbind();
    }
  }

  private async verifyAndPrepareUsername(requestedUsername: string): Promise<string> {
    const sanitizedUsername = this.sanitizeUsername(requestedUsername);
    
    // Verificar si el username está disponible
    if (!(await this.usernameExists(sanitizedUsername))) {
      return sanitizedUsername;
    }
    
    // Si no está disponible, generar uno único
    return await this.generateUniqueUsername(sanitizedUsername);
  }

  private async createUserEntry(guestsOU: string, dto: CreateGuestUserDto, username: string): Promise<void> {
    const cnValue = `Invitado ${this.normalizeName(dto.firstName)} ${this.normalizeName(dto.lastName)}`;
    const escapedCN = escapeDNValue(cnValue);
    const userDN = `CN=${escapedCN},${guestsOU}`;

    const userPrincipalName = `${username}@uniss.edu.cu`;
    const displayName = `${this.normalizeDisplayName(dto.firstName)} ${this.normalizeDisplayName(dto.lastName)}`;

    const entry: any = {
      objectClass: ['top', 'person', 'organizationalPerson', 'user'],
      cn: cnValue,
      givenName: this.normalizeDisplayName(dto.firstName),
      sn: this.normalizeDisplayName(dto.lastName),
      displayName: displayName,
      sAMAccountName: username,
      uid: username,
      userPrincipalName: userPrincipalName,
      mail: dto.email,
      description: dto.reason || 'Usuario invitado',
      userAccountControl: '512', // Cuenta habilitada
      unicodePwd: this.encodePassword(dto.password),
      
      // ✅ CAMPOS 2FA REQUERIDOS
      userParameters: "2FA DISABLED",  // 2FA deshabilitado inicialmente
      serialNumber: " ",                // Secreto vacío inicialmente
      
      title: "Usuario Invitado",
      employeeType: "Invitado",
    };

    // ✅ Agregar carnet de identidad como employeeID si se proporciona y no está vacío
    if (dto.identityCard && dto.identityCard.trim() !== '') {
      const cleanIdentityCard = dto.identityCard.replace(/\D/g, '').trim();
      if (cleanIdentityCard.length > 0) {
        entry.employeeID = cleanIdentityCard;
        console.log(`📝 Carnet de identidad guardado como employeeID: ${cleanIdentityCard}`);
      }
    }

    console.log('🎯 Creando entrada de usuario invitado con campos 2FA:');
    console.log('userParameters:', entry.userParameters);
    console.log('serialNumber:', entry.serialNumber);
    console.log('employeeID:', entry.employeeID || 'No proporcionado');

    await new Promise((resolve, reject) => {
      this.client.add(userDN, entry, (err) => {
        if (err) return reject(err);
        console.log(`✅ Entrada de usuario creada en LDAP con campos 2FA`);
        resolve(true);
      });
    });

    // Agregar a grupos básicos
    await this.addUserToGroups(userDN, [
      'CN=UNISS-Everyone,OU=_Grupos,DC=uniss,DC=edu,DC=cu',
      'CN=correo_int,OU=_Grupos,DC=uniss,DC=edu,DC=cu'
    ]);
  }

  private async ensureGuestsOUExists(guestsOU: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Verificar si la OU existe
      this.client.search(guestsOU, {
        scope: 'base',
        filter: '(objectClass=organizationalUnit)'
      }, (err, res) => {
        if (err) {
          // Si no existe, crearla
          this.createGuestsOU(guestsOU)
            .then(() => resolve())
            .catch(reject);
          return;
        }

        let exists = false;
        res.on('searchEntry', () => exists = true);
        res.on('error', reject);
        res.on('end', () => {
          if (exists) {
            resolve();
          } else {
            this.createGuestsOU(guestsOU)
              .then(() => resolve())
              .catch(reject);
          }
        });
      });
    });
  }

  private async createGuestsOU(guestsOU: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ouEntry = {
        objectClass: ['top', 'organizationalUnit'],
        ou: 'Invitados',
        description: 'Unidad Organizacional para usuarios invitados'
      };

      this.client.add(guestsOU, ouEntry, (err) => {
        if (err) {
          console.error('Error al crear OU de invitados:', err);
          return reject(err);
        }
        console.log('✅ OU de invitados creada exitosamente');
        resolve();
      });
    });
  }

  private async usernameExists(username: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.client.search(this.baseDN, {
        filter: `(&(objectClass=user)(|(sAMAccountName=${escapeLDAPValue(username)})(uid=${escapeLDAPValue(username)})))`,
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
    throw new Error("No se pudo generar username único después de múltiples intentos");
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

  private normalizeName(name: string): string {
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeDisplayName(name: string): string {
    if (!name) return "";
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ñ/g, "n").replace(/Ñ/g, "N")
      .replace(/[^a-zA-Z\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 64);
  }

  private async addUserToGroups(userDN: string, groupDNs: string[]): Promise<void> {
    for (const groupDN of groupDNs) {
      try {
        await this.addUserToGroup(userDN, groupDN);
      } catch (error) {
        console.error(`Error agregando a ${groupDN}:`, error);
        // No lanzar error para no interrumpir el proceso completo
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

  private encodePassword(password: string): Buffer {
    return Buffer.from(`"${password}"`, 'utf16le');
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
}