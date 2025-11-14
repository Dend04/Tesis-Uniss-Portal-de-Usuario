// src/services/ldap-email-update.service.ts
import { Attribute, Change, Client, SearchEntry } from "ldapjs";
import { createLDAPClient, bindAsync } from "../utils/ldap.utils";

interface LDAPError extends Error {
  code?: number;
  dn?: string;
  lde_message?: string;
}

interface LDAPSearchEntry {
  objectName: string;
  attributes: Array<{
    type: string;
    values: string[];
  }>;
}

export class LDAPEmailUpdateService {
  private client: Client;
  private baseDN: string;

  constructor() {
    this.client = createLDAPClient(process.env.LDAP_URL!);
    this.baseDN = process.env.LDAP_BASE_DN || "dc=uniss,dc=edu,dc=cu";
  }

  /**
   * ✅ ACTUALIZAR CUALQUIER ATRIBUTO DE USUARIO EN LDAP - MÉTODO MEJORADO
   */
  async updateUserAttribute(
    sAMAccountName: string,
    attribute: string,
    value: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.authenticate();

      console.log(`🔍 [LDAP SERVICE] Buscando usuario: ${sAMAccountName}`);

      const userDN = await this.findUserDN(sAMAccountName);

      if (!userDN) {
        return {
          success: false,
          message: `Usuario '${sAMAccountName}' no encontrado en el directorio`,
        };
      }

      console.log(`✅ [LDAP SERVICE] Usuario encontrado: ${userDN}`);
      console.log(
        `🔄 [LDAP SERVICE] Actualizando atributo '${attribute}' a: ${value}`
      );

      await this.updateLDAPAttribute(userDN, attribute, value);

      console.log(
        `✅ [LDAP SERVICE] Atributo ${attribute} actualizado exitosamente para ${sAMAccountName}`
      );
      return {
        success: true,
        message: `${attribute} actualizado exitosamente`,
      };
    } catch (error: unknown) {
      const ldapError = error as LDAPError;
      console.error(
        `❌ [LDAP SERVICE] Error actualizando atributo ${attribute}:`,
        ldapError
      );
      return {
        success: false,
        message: `Error actualizando ${attribute}: ${ldapError.message}`,
      };
    } finally {
      this.safeUnbind();
    }
  }

/**
 * ✅ BUSCAR DN DE USUARIO - CON NORMALIZACIÓN
 */
private async findUserDN(sAMAccountName: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const filters = [
      `(&(objectClass=user)(sAMAccountName=${sAMAccountName}))`,
      `(&(objectClass=person)(sAMAccountName=${sAMAccountName}))`,
      `(sAMAccountName=${sAMAccountName})`,
    ];

    let userDN: string | null = null;
    let currentFilterIndex = 0;

    const tryNextFilter = () => {
      if (currentFilterIndex >= filters.length) {
        console.log(`❌ [LDAP SERVICE] Usuario '${sAMAccountName}' no encontrado con ningún filtro`);
        resolve(null);
        return;
      }

      const filter = filters[currentFilterIndex];
      console.log(`🔍 [LDAP SERVICE] Intentando filtro: ${filter}`);

      this.client.search(
        this.baseDN,
        {
          filter: filter,
          scope: "sub",
          attributes: ["distinguishedName", "sAMAccountName", "employeeID"],
        },
        (err, res) => {
          if (err) {
            console.error(`❌ [LDAP SERVICE] Error con filtro ${filter}:`, err);
            currentFilterIndex++;
            tryNextFilter();
            return;
          }

          let entryCount = 0;

          res.on("searchEntry", (entry: SearchEntry) => {
            entryCount++;
            console.log(`✅ [LDAP SERVICE] Entrada encontrada con filtro: ${filter}`);

            const dnAttr = entry.attributes.find(
              (attr) => attr.type === "distinguishedName"
            );
            if (dnAttr && dnAttr.values) {
              const values = Array.isArray(dnAttr.values)
                ? dnAttr.values
                : [dnAttr.values];
              if (values.length > 0) {
                userDN = values[0];
                console.log(`📝 [LDAP SERVICE] DN encontrado (RAW): ${userDN}`);
                
                // ✅ NORMALIZAR EL DN - ELIMINAR TILDES
                userDN = this.normalizeDN(userDN);
                console.log(`🔧 [LDAP SERVICE] DN normalizado: ${userDN}`);
              }
            }
          });

          res.on("error", (err) => {
            console.error(`❌ [LDAP SERVICE] Error en búsqueda con filtro ${filter}:`, err);
            currentFilterIndex++;
            tryNextFilter();
          });

          res.on("end", () => {
            console.log(`📊 [LDAP SERVICE] Búsqueda completada. Encontradas ${entryCount} entradas con filtro: ${filter}`);

            if (userDN) {
              console.log(`✅ [LDAP SERVICE] Búsqueda exitosa, DN: ${userDN}`);
              resolve(userDN);
            } else {
              console.log(`❌ [LDAP SERVICE] No se encontró usuario con filtro: ${filter}`);
              currentFilterIndex++;
              tryNextFilter();
            }
          });
        }
      );
    };

    tryNextFilter();
  });
}

  /**
   * ✅ LEER ATRIBUTO ACTUAL (para diagnóstico)
   */
  private async readAttribute(
    dn: string,
    attribute: string
  ): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.client.search(
        dn,
        {
          scope: "base",
          attributes: [attribute],
        },
        (err, res) => {
          if (err) {
            console.error(
              `❌ [LDAP SERVICE] Error leyendo atributo ${attribute}:`,
              err
            );
            resolve(null);
            return;
          }

          let value: string | null = null;

          res.on("searchEntry", (entry: SearchEntry) => {
            const attr = entry.attributes.find(
              (attr) => attr.type === attribute
            );
            if (attr && attr.values) {
              const values = Array.isArray(attr.values)
                ? attr.values
                : [attr.values];
              if (values.length > 0) {
                value = values[0];
              }
            }
          });

          res.on("error", (err) => {
            console.error(
              `❌ [LDAP SERVICE] Error en lectura de atributo:`,
              err
            );
            resolve(null);
          });

          res.on("end", () => {
            resolve(value);
          });
        }
      );
    });
  }

/**
 * ✅ ACTUALIZAR COMPANY - CON DN NORMALIZADO
 */
async updateUserCompany(
  sAMAccountName: string,
  companyEmail: string
): Promise<{ success: boolean; message: string }> {
  try {
    await this.authenticate();

    console.log(`🎯 ACTUALIZANDO COMPANY - Usuario: ${sAMAccountName}, Email: ${companyEmail}`);

    // Buscar el DN del usuario (ya normalizado)
    const userDN = await this.findUserDN(sAMAccountName);

    if (!userDN) {
      console.error(`❌ [LDAP SERVICE] Usuario no encontrado: ${sAMAccountName}`);
      return {
        success: false,
        message: `Usuario '${sAMAccountName}' no encontrado en el directorio`,
      };
    }

    console.log(`✅ [LDAP SERVICE] Usuario encontrado (DN normalizado): ${userDN}`);

    // ✅ USAR SOLO 'add' - EL ATRIBUTO NO EXISTE
    console.log(`➕ [LDAP SERVICE] Agregando nuevo atributo 'company': ${companyEmail}`);
    
    await this.onlyAddOperation(userDN, "company", companyEmail);

    console.log(`✅ [LDAP SERVICE] Atributo company creado exitosamente`);
    
    return {
      success: true,
      message: `Correo de respaldo guardado exitosamente`,
    };
  } catch (error: unknown) {
    const ldapError = error as Error;
    console.error(`❌ [LDAP SERVICE] Error creando company:`, ldapError);
    return {
      success: false,
      message: `Error guardando correo de respaldo: ${ldapError.message}`,
    };
  } finally {
    this.safeUnbind();
  }
}

/**
 * ✅ MÉTODO QUE USA SOLO 'add' - CON MEJOR MANEJO DE ERRORES
 */
private async onlyAddOperation(
  dn: string,
  attribute: string,
  value: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`➕ [LDAP SERVICE] Creando nuevo atributo: ${attribute} = ${value}`);
    console.log(`🔄 [LDAP SERVICE] DN para modificación: ${dn}`);

    const change = new Change({
      operation: "add", // ✅ SOLO USAR 'add'
      modification: new Attribute({
        type: attribute,
        values: [value],
      }),
    });

    this.client.modify(dn, change, (err) => {
      if (err) {
        console.error(`❌ [LDAP SERVICE] Error en add:`, err);
        
        // Manejo específico de errores
        if (err.code === 32) {
          reject(new Error(`Objeto no encontrado (DN incorrecto): ${dn}`));
        } else if (err.code === 50) {
          reject(new Error(`Permisos insuficientes para modificar en esta OU`));
        } else if (err.code === 53) {
          reject(new Error(`El servidor no permite esta operación`));
        } else if (err.code === 20) {
          // ATTRIBUTE_OR_VALUE_EXISTS - intentar replace
          console.log(`⚠️ [LDAP SERVICE] Atributo ya existe, intentando replace...`);
          this.onlyReplaceOperation(dn, attribute, value)
            .then(resolve)
            .catch(reject);
          return;
        } else {
          reject(new Error(`Error LDAP (${err.code}): ${err.message}`));
        }
      } else {
        console.log(`✅ [LDAP SERVICE] Add exitoso - atributo creado`);
        resolve();
      }
    });
  });
}


/**
 * ✅ MÉTODO DE RESPALDO POR SI EL ATRIBUTO YA EXISTE
 */
private async onlyReplaceOperation(
  dn: string,
  attribute: string,
  value: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const change = new Change({
      operation: "replace",
      modification: new Attribute({
        type: attribute,
        values: [value],
      }),
    });

    this.client.modify(dn, change, (err) => {
      if (err) {
        console.error(`❌ Error en replace:`, err);
        reject(err);
      } else {
        console.log(`✅ Replace exitoso - atributo actualizado`);
        resolve();
      }
    });
  });
}

/**
 * ✅ MÉTODO SIMPLIFICADO - SIMILAR AL QUE USASTE PARA employeeID
 */
private async simpleLDAPModify(
  dn: string,
  attribute: string,
  value: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`🔄 [LDAP SERVICE] Modificación simple para: ${dn}`);
    console.log(`📝 [LDAP SERVICE] ${attribute} = ${value}`);

    const change = new Change({
      operation: "replace",
      modification: new Attribute({
        type: attribute,
        values: [value],
      }),
    });

    this.client.modify(dn, change, (err) => {
      if (err) {
        console.error(`❌ [LDAP SERVICE] Error en modificación simple:`, err);
        
        // Si replace falla, intentar add
        if (err.code === 16) { // NO_SUCH_ATTRIBUTE
          console.log(`⚠️ [LDAP SERVICE] Atributo no existe, intentando ADD...`);
          this.simpleLDAPAdd(dn, attribute, value)
            .then(resolve)
            .catch(reject);
          return;
        }
        
        reject(new Error(`Error LDAP (${err.code}): ${err.message}`));
      } else {
        console.log(`✅ [LDAP SERVICE] Modificación simple exitosa`);
        resolve();
      }
    });
  });
}

/**
 * ✅ MÉTODO PARA AGREGAR ATRIBUTO - SIMILAR AL DE employeeID
 */
private async simpleLDAPAdd(
  dn: string,
  attribute: string,
  value: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`➕ [LDAP SERVICE] Agregando atributo: ${attribute}`);

    const change = new Change({
      operation: "add",
      modification: new Attribute({
        type: attribute,
        values: [value],
      }),
    });

    this.client.modify(dn, change, (err) => {
      if (err) {
        console.error(`❌ [LDAP SERVICE] Error agregando atributo:`, err);
        reject(new Error(`Error agregando ${attribute}: ${err.message}`));
      } else {
        console.log(`✅ [LDAP SERVICE] Atributo agregado exitosamente`);
        resolve();
      }
    });
  });
}

/**
 * ✅ NORMALIZAR DN - Eliminar tildes y caracteres especiales
 */
private normalizeDN(dn: string): string {
  console.log(`🔧 Normalizando DN: ${dn}`);
  
  // Reemplazar caracteres con tildes
  let normalized = dn
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/Á/g, 'A')
    .replace(/É/g, 'E')
    .replace(/Í/g, 'I')
    .replace(/Ó/g, 'O')
    .replace(/Ú/g, 'U')
    .replace(/Ñ/g, 'N');

  console.log(`🔧 DN normalizado: ${normalized}`);
  return normalized;
}


  /**
   * ✅ MÉTODO PARA ACTUALIZAR EMAIL PRINCIPAL (NO usar en este caso)
   */
  async updateUserEmail(
    sAMAccountName: string,
    newEmail: string
  ): Promise<{ success: boolean; message: string }> {
    console.log(
      `📧 ACTUALIZANDO MAIL - Usuario: ${sAMAccountName}, Email: ${newEmail}`
    );
    return this.updateUserAttribute(sAMAccountName, "mail", newEmail);
  }

  /**
   * ✅ MÉTODO MEJORADO PARA BUSCAR POR EMPLOYEE ID (como en DualVerificationService)
   */
  async updateUserCompanyByEmployeeID(
    employeeID: string,
    companyEmail: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.authenticate();

      console.log(`🎯 BUSCANDO POR EMPLOYEE ID: ${employeeID}`);

      // Buscar usuario por employeeID
      const userDN = await this.findUserDNByEmployeeID(employeeID);

      if (!userDN) {
        return {
          success: false,
          message: `Usuario con employeeID '${employeeID}' no encontrado`,
        };
      }

      console.log(`🔄 Actualizando atributo 'company' a: ${companyEmail}`);
      await this.updateLDAPAttribute(userDN, "company", companyEmail);

      return {
        success: true,
        message: `Company actualizado exitosamente para ${employeeID}`,
      };
    } catch (error: unknown) {
      const ldapError = error as LDAPError;
      console.error(`❌ Error actualizando company:`, ldapError);
      return {
        success: false,
        message: `Error actualizando company: ${ldapError.message}`,
      };
    } finally {
      this.safeUnbind();
    }
  }

  /**
   * ✅ BUSCAR POR EMPLOYEE ID (similar a DualVerificationService)
   */
  private async findUserDNByEmployeeID(
    employeeID: string
  ): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const filter = `(employeeID=${this.escapeLDAPValue(employeeID)})`;
      console.log(
        `🔍 Buscando por employeeID: ${employeeID}, Filtro: ${filter}`
      );

      this.client.search(
        this.baseDN,
        {
          filter: filter,
          scope: "sub",
          attributes: ["distinguishedName", "sAMAccountName", "employeeID"],
        },
        (err, res) => {
          if (err) {
            console.error(`❌ Error buscando por employeeID:`, err);
            resolve(null);
            return;
          }

          let userDN: string | null = null;
          let entryCount = 0;

          res.on("searchEntry", (entry: SearchEntry) => {
            entryCount++;
            const dnAttr = entry.attributes.find(
              (attr) => attr.type === "distinguishedName"
            );
            if (dnAttr && dnAttr.values) {
              const values = Array.isArray(dnAttr.values)
                ? dnAttr.values
                : [dnAttr.values];
              if (values.length > 0) {
                userDN = values[0];
                console.log(`✅ Usuario encontrado por employeeID: ${userDN}`);
              }
            }
          });

          res.on("error", (err) => {
            console.error(`❌ Error en búsqueda por employeeID:`, err);
            resolve(null);
          });

          res.on("end", () => {
            console.log(
              `📊 Búsqueda por employeeID completada. Encontrados: ${entryCount} usuarios`
            );
            resolve(userDN);
          });
        }
      );
    });
  }

/**
 * ✅ ACTUALIZAR ATRIBUTO COMPANY - MÉTODO SIMPLIFICADO Y ROBUSTO
 */
private async updateLDAPAttribute(
  dn: string,
  attribute: string,
  value: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`🔄 [LDAP SERVICE] Modificando atributo en DN: ${dn}`);
    console.log(`📝 [LDAP SERVICE] Atributo: ${attribute}, Valor: ${value}`);

    // ✅ ESTRATEGIA: Intentar REPLACE primero, si falla intentar ADD
    const replaceChange = new Change({
      operation: "replace",
      modification: new Attribute({
        type: attribute,
        values: [value],
      }),
    });

    this.client.modify(dn, replaceChange, (replaceErr) => {
      if (replaceErr) {
        console.log(`⚠️ [LDAP SERVICE] Replace falló (código ${replaceErr.code}), intentando ADD...`);
        
        // ✅ Si REPLACE falla, intentar ADD
        const addChange = new Change({
          operation: "add",
          modification: new Attribute({
            type: attribute,
            values: [value],
          }),
        });

        this.client.modify(dn, addChange, (addErr) => {
          if (addErr) {
            console.error(`❌ [LDAP SERVICE] ADD también falló:`, addErr);
            
            // ✅ Manejo específico de errores
            if (addErr.code === 32) {
              reject(new Error(`Objeto no encontrado: ${dn}. Verifica que el usuario exista y tenga permisos.`));
            } else if (addErr.code === 50) {
              reject(new Error(`Permisos insuficientes para modificar el atributo '${attribute}'.`));
            } else if (addErr.code === 16) {
              reject(new Error(`El atributo '${attribute}' no está definido en el esquema LDAP.`));
            } else {
              reject(new Error(`Error LDAP (${addErr.code}): ${addErr.message}`));
            }
          } else {
            console.log(`✅ [LDAP SERVICE] Atributo ${attribute} agregado exitosamente`);
            resolve();
          }
        });
      } else {
        console.log(`✅ [LDAP SERVICE] Atributo ${attribute} actualizado exitosamente`);
        resolve();
      }
    });
  });
}
  /**
   * ✅ VERIFICAR CONEXIÓN Y AUTENTICACIÓN
   */
  private async authenticate(): Promise<void> {
    console.log(`🔐 [LDAP SERVICE] Autenticando con LDAP...`);
    try {
      await bindAsync(
        this.client,
        process.env.LDAP_ADMIN_DN!,
        process.env.LDAP_ADMIN_PASSWORD!
      );
      console.log(`✅ [LDAP SERVICE] Autenticación LDAP exitosa`);
    } catch (error) {
      console.error(`❌ [LDAP SERVICE] Error de autenticación LDAP:`, error);
      throw new Error(
        `Fallo en autenticación LDAP: ${(error as Error).message}`
      );
    }
  }

  private safeUnbind() {
    try {
      this.client.unbind();
      console.log(`🔌 Conexión LDAP cerrada`);
    } catch (error) {
      console.error("⚠️ Error al cerrar conexión:", error);
    }
  }

  /**
   * ✅ MÉTODO PARA VERIFICAR SI EL ATRIBUTO COMPANY EXISTE Y ES MODIFICABLE
   */
  async checkCompanyAttribute(sAMAccountName: string): Promise<{
    exists: boolean;
    currentValue: string | null;
    editable: boolean;
    message: string;
  }> {
    try {
      await this.authenticate();

      const userDN = await this.findUserDN(sAMAccountName);
      if (!userDN) {
        return {
          exists: false,
          currentValue: null,
          editable: false,
          message: "Usuario no encontrado",
        };
      }

      // Leer el valor actual
      const currentValue = await this.readAttribute(userDN, "company");
      const isEmpty = !currentValue || currentValue.trim() === "";

      // Intentar una modificación de prueba (sin cambiar realmente)
      try {
        const testValue = currentValue || "test@test.com";
        await this.updateLDAPAttribute(userDN, "company", testValue);

        // Si estaba vacío, restaurar a vacío
        if (isEmpty) {
          await this.updateLDAPAttribute(userDN, "company", "");
        }

        return {
          exists: true,
          currentValue,
          editable: true,
          message: isEmpty
            ? "Campo company está vacío y puede ser agregado"
            : "Campo company tiene valor y puede ser actualizado",
        };
      } catch (error) {
        return {
          exists: true,
          currentValue,
          editable: false,
          message: "Campo company existe pero no es editable",
        };
      }
    } catch (error) {
      console.error(
        `❌ [LDAP SERVICE] Error verificando atributo company:`,
        error
      );
      return {
        exists: false,
        currentValue: null,
        editable: false,
        message: `Error verificando atributo: ${(error as Error).message}`,
      };
    } finally {
      this.safeUnbind();
    }
  }

  private escapeLDAPValue(value: string): string {
    const escapeChars: { [key: string]: string } = {
      "\\": "\\5c",
      ",": "\\2c",
      '"': "\\22",
      "<": "\\3c",
      ">": "\\3e",
      ";": "\\3b",
      "/": "\\2f",
      "+": "\\2b",
      "=": "\\3d",
    };

    return value
      .split("")
      .map((char) => escapeChars[char] || char)
      .join("")
      .substring(0, 64);
  }
}
