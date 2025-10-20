// services/ldap-2fa.services.ts
import { Client, Change } from "ldapjs";
import { createLDAPClient, bindAsync, unifiedLDAPSearch } from "../utils/ldap.utils";
import { encryptionService } from "./EncryptionService";
import dotenv from "dotenv";

dotenv.config();

export class LDAP2FAService {
  /**
   * ✅ MÉTODO SIMPLIFICADO: Activar 2FA usando employeeNumber
   */
  async activateTwoFactorAuth(sAMAccountName: string, secret: string): Promise<void> {
    let client: Client | null = null;
    
    try {
      // Normalizar y validar secreto
      const normalizedSecret = encryptionService.normalizeTOTPSecret(secret);
      
      if (!encryptionService.validateTOTPSecret(normalizedSecret)) {
        throw new Error('Formato de secreto TOTP inválido. Debe ser Base32 (A-Z, 2-7) de 16 o 32 caracteres.');
      }

      const userDN = await this.getUserDNBySAMAccountName(sAMAccountName);
      client = createLDAPClient(process.env.LDAP_URL!);
      await bindAsync(client, process.env.LDAP_ADMIN_DN!, process.env.LDAP_ADMIN_PASSWORD!);

      console.log('🔄 Activando 2FA para:', sAMAccountName);

      // ✅ Encriptar y formatear para employeeNumber
      const encryptedSecret = encryptionService.encrypt(normalizedSecret);
      const employeeNumberValue = encryptionService.formatForEmployeeNumber(encryptedSecret);
      const userParametersValue = encryptionService.formatForUserParameters();

      console.log('🔐 Datos 2FA:', {
        userParameters: userParametersValue,
        employeeNumberLength: employeeNumberValue.length,
        secretOriginal: `${normalizedSecret.substring(0, 8)}...`
      });

      // ✅ Aplicar cambios a ambos atributos
      await this.applyLDAPChanges(client, userDN.toString(), userParametersValue, employeeNumberValue);
      
      console.log('✅ 2FA activado exitosamente');

    } catch (error) {
      console.error('❌ Error activando 2FA:', error);
      throw error;
    } finally {
      if (client) {
        try {
          client.unbind();
        } catch (error) {
          console.error("❌ Error cerrando conexión LDAP:", error);
        }
      }
    }
  }

  /**
   * ✅ MÉTODO SIMPLIFICADO: Obtener estado 2FA
   */
  async getTwoFactorAuthStatus(sAMAccountName: string): Promise<{ 
    enabled: boolean; 
    secret?: string;
    hasEncryptedSecret: boolean;
    originalEmployeeNumber?: string;
  }> {
    try {
      console.log('🔍 Buscando estado 2FA para:', sAMAccountName);

      const filter = `(sAMAccountName=${sAMAccountName})`;
      const attributes = ['userParameters', 'employeeNumber'];
      
      const results = await unifiedLDAPSearch(filter, attributes);
      
      if (results.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const userEntry = results[0];
      let enabled = false;
      let secret: string | undefined;
      let hasEncryptedSecret = false;
      let originalEmployeeNumber: string | undefined;

      // Verificar userParameters para el estado
      const userParametersAttr = userEntry.attributes.find((attr: any) => attr.type === 'userParameters');
      if (userParametersAttr?.values?.[0]) {
        enabled = encryptionService.is2FAEnabled(userParametersAttr.values[0]);
      }

      // Verificar employeeNumber para el secreto encriptado
      const employeeNumberAttr = userEntry.attributes.find((attr: any) => attr.type === 'employeeNumber');
      if (employeeNumberAttr?.values?.[0]) {
        const employeeNumberValue = employeeNumberAttr.values[0];
        
        if (encryptionService.is2FASecretInEmployeeNumber(employeeNumberValue)) {
          const encryptedData = encryptionService.extractFromEmployeeNumber(employeeNumberValue);
          
          if (encryptedData) {
            try {
              secret = encryptionService.decrypt(encryptedData);
              hasEncryptedSecret = true;
              console.log('🔓 Secreto desencriptado exitosamente');
            } catch (decryptError) {
              console.error('❌ Error desencriptando secreto:', decryptError);
            }
          }
        } else {
          // Guardar el employeeNumber original si existe
          originalEmployeeNumber = employeeNumberValue;
          console.log('ℹ️  employeeNumber contiene valor original:', originalEmployeeNumber);
        }
      }

      return { enabled, secret, hasEncryptedSecret, originalEmployeeNumber };

    } catch (error) {
      console.error('❌ Error en getTwoFactorAuthStatus:', error);
      throw error;
    }
  }

/**
 * ✅ MÉTODO SIMPLIFICADO: Desactivar 2FA
 */
async disableTwoFactorAuth(sAMAccountName: string): Promise<void> {
  let client: Client | null = null;
  
  try {
    const userDN = await this.getUserDNBySAMAccountName(sAMAccountName);
    client = createLDAPClient(process.env.LDAP_URL!);
    await bindAsync(client, process.env.LDAP_ADMIN_DN!, process.env.LDAP_ADMIN_PASSWORD!);

    console.log('🔄 Desactivando 2FA y limpiando campos para:', sAMAccountName);

    // ✅ Obtener el employeeNumber original
    let originalEmployeeNumber = "";
    try {
      const currentStatus = await this.getTwoFactorAuthStatus(sAMAccountName);
      originalEmployeeNumber = currentStatus.originalEmployeeNumber || "";
      console.log('📋 EmployeeNumber original encontrado:', originalEmployeeNumber || '[VACÍO]');
    } catch (statusError) {
      console.warn('⚠️ No se pudo obtener el estado actual, usando valor vacío');
    }

    // ✅ Limpiar 2FA - userParameters a "2FA DISABLED" y employeeNumber a valor original o "2FA DESACTIVADO"
    await this.applyLDAPChanges(
      client, 
      userDN.toString(), 
      encryptionService.getDisabledUserParameters(), 
      originalEmployeeNumber // Si está vacío, se pondrá "2FA DESACTIVADO"
    );
    
    console.log('✅ 2FA desactivado exitosamente - Campos actualizados');

  } catch (error) {
    console.error('❌ Error desactivando 2FA:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.unbind();
      } catch (error) {
        console.error("❌ Error cerrando conexión LDAP:", error);
      }
    }
  }
}

/**
 * ✅ MÉTODO PRIVADO: Aplicar cambios LDAP
 */
private async applyLDAPChanges(
  client: Client, 
  userDN: string, 
  userParametersValue: string, 
  employeeNumberValue: string
): Promise<void> {
  
  console.log('🔄 Aplicando cambios LDAP:', {
    userParameters: userParametersValue,
    employeeNumber: employeeNumberValue 
      ? `[RESTAURANDO: ${employeeNumberValue}]` 
      : "[PONIendo '2FA DESACTIVADO']"
  });

  try {
    // ✅ PRIMERO: Actualizar userParameters
    await this.applySingleChange(client, userDN, new Change({
      operation: 'replace',
      modification: {
        type: 'userParameters',
        values: [userParametersValue]
      }
    }));
    console.log('✅ userParameters actualizado correctamente');

    // ✅ SEGUNDO: Manejar employeeNumber - NUNCA eliminar, siempre poner un valor
    const finalEmployeeNumberValue = employeeNumberValue || '2FA DESACTIVADO';
    
    await this.applySingleChange(client, userDN, new Change({
      operation: 'replace',
      modification: {
        type: 'employeeNumber',
        values: [finalEmployeeNumberValue]
      }
    }));
    
    console.log(`✅ employeeNumber actualizado a: "${finalEmployeeNumberValue}"`);

  } catch (error) {
    console.error('❌ Error en applyLDAPChanges:', error);
    throw new Error(`Error aplicando cambios LDAP: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

  /**
   * ✅ MÉTODO PARA OBTENER DN DESDE sAMAccountName
   */
  async getUserDNBySAMAccountName(sAMAccountName: string): Promise<string> {
    try {
      console.log('🔍 Obteniendo DN para sAMAccountName:', sAMAccountName);

      const filter = `(sAMAccountName=${sAMAccountName})`;
      const attributes = ['distinguishedName'];
      
      const results = await unifiedLDAPSearch(filter, attributes);
      
      if (results.length === 0) {
        throw new Error(`Usuario no encontrado: ${sAMAccountName}`);
      }

      const userEntry = results[0];
      const userDN = userEntry.objectName;
      
      console.log('✅ DN obtenido:', userDN);
      return userDN;

    } catch (error) {
      console.error('❌ Error obteniendo DN:', error);
      throw error;
    }
  }

  /**
   * ✅ MÉTODO SIMPLIFICADO: Aplicar un solo cambio LDAP
   */
  private async applySingleChange(client: Client, userDN: string, change: Change): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      client.modify(userDN, change, (err) => {
        if (err) {
          console.error(`❌ Error modificando atributo ${change.modification.type}:`, err);
          reject(err);
        } else {
          console.log(`✅ ${change.modification.type} modificado exitosamente`);
          resolve();
        }
      });
    });
  }
}

export const ldap2FAService = new LDAP2FAService();