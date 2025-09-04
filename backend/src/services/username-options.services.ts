// src/services/username-options.service.ts
import { UserEntriesBuilder } from "./assets-account.services";
import { LDAPAccountService } from "./ldap-account.services";

export class UsernameOptionsService {
  private ldapService: LDAPAccountService;
  private userBuilder: UserEntriesBuilder;
  private usedCombinations: Map<string, string[]> = new Map();

  constructor() {
    this.ldapService = new LDAPAccountService();
    this.userBuilder = new UserEntriesBuilder();
  }

  async generateUsernameOptions(userData: any, userType: 'student' | 'employee', reset: boolean = false): Promise<string[]> {
    // Clave única para este usuario
    const userKey = userData.ci || userData.identification;
    
    // Obtener combinaciones previamente usadas para este usuario
    const previouslyUsed = this.usedCombinations.get(userKey) || [];

    if (reset) {
      // Si se solicita reset, limpiamos las combinaciones usadas para este usuario
      this.usedCombinations.delete(userKey);
    }

    // Extraer nombres y apellidos según el tipo de usuario
    let firstName = '';
    let middleName = '';
    let lastName = '';

    if (userType === 'student') {
      firstName = userData.rawData.personalData.name?.toString() || '';
      middleName = userData.rawData.personalData.middleName?.toString() || '';
      lastName = userData.rawData.personalData.lastName?.toString() || '';
    } else {
      firstName = userData.Nombre?.toString() || '';
      middleName = userData.Apellido_1?.toString() || '';
      lastName = userData.Apellido_2?.toString() || '';
    }

    // Validar que tenemos datos suficientes
    if (!firstName || (!middleName && !lastName)) {
      throw new Error('Datos insuficientes para generar nombres de usuario');
    }

    // Generar combinaciones
    const combinations = this.generateNameCombinations(firstName, middleName, lastName);
    
    // Filtrar y verificar disponibilidad
    const availableOptions: string[] = [];
    
    for (const option of combinations) {
      if (availableOptions.length >= 3) break;
      if (previouslyUsed.includes(option)) continue;
      
      try {
        const isAvailable = await this.checkUsernameAvailability(option);
        if (isAvailable) {
          availableOptions.push(option);
        }
      } catch (error) {
        console.error(`Error verificando disponibilidad de ${option}:`, error);
        continue;
      }
    }

    // Actualizar combinaciones usadas
    this.usedCombinations.set(userKey, [...previouslyUsed, ...availableOptions]);

    return availableOptions;
  }

  private generateNameCombinations(firstName: string, middleName: string, lastName: string): string[] {
    const cleanFirstName = this.sanitizeName(firstName);
    const cleanMiddleName = this.sanitizeName(middleName);
    const cleanLastName = this.sanitizeName(lastName);
    
    // Dividir nombres y apellidos en partes
    const firstNameParts = cleanFirstName.toLowerCase().split(' ');
    const middleNameParts = cleanMiddleName.toLowerCase().split(' ');
    const lastNameParts = cleanLastName.toLowerCase().split(' ');
    
    const firstFirstName = firstNameParts[0] || '';
    const secondFirstName = firstNameParts[1] || '';
    const firstMiddleName = middleNameParts[0] || '';
    const secondMiddleName = middleNameParts[1] || '';
    const firstLastName = lastNameParts[0] || '';
    const secondLastName = lastNameParts[1] || '';

    // Generar todas las combinaciones posibles
    const combinations = new Set<string>();
    
    // Combinaciones con primer nombre
    if (firstFirstName && firstMiddleName) {
      combinations.add(`${firstFirstName.charAt(0)}${firstMiddleName}`);
      combinations.add(`${firstFirstName}${firstMiddleName.charAt(0)}`);
      combinations.add(`${firstFirstName}${firstMiddleName}`.substring(0, 8));
      combinations.add(`${firstFirstName.charAt(0)}${firstMiddleName.charAt(0)}${firstMiddleName}`);
    }
    
    // Combinaciones con segundo nombre (si existe)
    if (secondFirstName && firstMiddleName) {
      combinations.add(`${secondFirstName.charAt(0)}${firstMiddleName}`);
      combinations.add(`${secondFirstName}${firstMiddleName.charAt(0)}`);
      combinations.add(`${secondFirstName}${firstMiddleName}`.substring(0, 8));
    }
    
    // Combinaciones con primer nombre y segundo apellido (si existe)
    if (firstFirstName && firstLastName) {
      combinations.add(`${firstFirstName.charAt(0)}${firstLastName}`);
      combinations.add(`${firstFirstName}${firstLastName.charAt(0)}`);
      combinations.add(`${firstFirstName}${firstLastName}`.substring(0, 8));
      combinations.add(`${firstFirstName.charAt(0)}${firstLastName.charAt(0)}${firstLastName}`);
    }
    
    // Combinaciones con segundo nombre y segundo apellido (si existe)
    if (secondFirstName && firstLastName) {
      combinations.add(`${secondFirstName.charAt(0)}${firstLastName}`);
      combinations.add(`${secondFirstName}${firstLastName.charAt(0)}`);
      combinations.add(`${secondFirstName}${firstLastName}`.substring(0, 8));
    }
    
    // Combinaciones con segundo apellido (si existe)
    if (firstFirstName && secondLastName) {
      combinations.add(`${firstFirstName.charAt(0)}${secondLastName}`);
      combinations.add(`${firstFirstName}${secondLastName.charAt(0)}`);
      combinations.add(`${firstFirstName}${secondLastName}`.substring(0, 8));
    }
    
    // Combinaciones con segundo nombre y segundo apellido (si existe)
    if (secondFirstName && secondLastName) {
      combinations.add(`${secondFirstName.charAt(0)}${secondLastName}`);
      combinations.add(`${secondFirstName}${secondLastName.charAt(0)}`);
      combinations.add(`${secondFirstName}${secondLastName}`.substring(0, 8));
    }
    
    // Combinaciones con tres partes (nombre + apellido1 + apellido2)
    if (firstFirstName && firstMiddleName && firstLastName) {
      combinations.add(`${firstFirstName.charAt(0)}${firstMiddleName.charAt(0)}${firstLastName.charAt(0)}`);
      combinations.add(`${firstFirstName}${firstMiddleName.charAt(0)}${firstLastName.charAt(0)}`);
      combinations.add(`${firstFirstName.charAt(0)}${firstMiddleName}${firstLastName.charAt(0)}`);
    }
    
    // Combinaciones con segundo nombre y dos apellidos
    if (secondFirstName && firstMiddleName && firstLastName) {
      combinations.add(`${secondFirstName.charAt(0)}${firstMiddleName.charAt(0)}${firstLastName.charAt(0)}`);
    }

    // Convertir a array, limpiar y filtrar
    return Array.from(combinations)
      .filter(opt => opt && opt.length >= 3)
      .map(opt => 
        opt
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '')
          .toLowerCase()
          .substring(0, 20)
      )
      .filter(opt => opt.length >= 3)
      .filter((opt, index, self) => self.indexOf(opt) === index);
  }

  private sanitizeName(name: string): string {
    if (!name) return '';
    
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async checkUsernameAvailability(username: string): Promise<boolean> {
    try {
      const baseDN = 'ou=UNISS_Users,dc=uniss,dc=edu,dc=cu';
      return !(await this.ldapService.usernameExists(username));
    } catch (error) {
      console.error('Error verificando disponibilidad de username:', error);
      throw new Error('No se pudo verificar la disponibilidad del nombre de usuario');
    }
  }
}