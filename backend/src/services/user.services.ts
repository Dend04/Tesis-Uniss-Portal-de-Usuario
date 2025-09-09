// src/services/user.service.ts
import { createLDAPClient, bindAsync, searchAsync } from "../utils/ldap.utils";
import { LDAPClient } from "../utils/ldap.utils";
import { Attribute, SearchOptions } from "ldapjs"; // <-- Importa SearchOptions
import { addLogEntry } from "./auth.services";

export const getUserProfile = async (username: string): Promise<any> => {
  let client: LDAPClient | null = null;
  try {
    if (
      !process.env.LDAP_URL ||
      !process.env.LDAP_ADMIN_DN ||
      !process.env.LDAP_ADMIN_PASSWORD
    ) {
      throw new Error("Configuración LDAP incompleta");
    }
    client = createLDAPClient(process.env.LDAP_URL);
    await bindAsync(
      client,
      process.env.LDAP_ADMIN_DN,
      process.env.LDAP_ADMIN_PASSWORD
    );
    const searchOptions: SearchOptions = { // <-- Tipado explícito
      filter: `(uid=${username})`,
      scope: "sub",
      attributes: ["cn", "uid", "mail", "givenName", "sn", "displayName"],
    };
    const entries = await searchAsync(
      client,
      "ou=UNISS_Users,dc=uniss,dc=edu,dc=cu",
      searchOptions
    );
    if (entries.length === 0) {
      throw new Error("Usuario no encontrado");
    }
    const getLdapAttribute = (entry: any, name: string): string => {
      const attributes = entry.attributes as unknown as Attribute[];
      const attr = attributes.find((a) => a.type === name);
      if (!attr || !attr.values || attr.values.length === 0) {
        return "";
      }
      return String(attr.values[0]);
    };
    const userData = {
      username: getLdapAttribute(entries[0], "uid"),
      nombreCompleto: getLdapAttribute(entries[0], "cn"),
      email: getLdapAttribute(entries[0], "mail"),
      nombre: getLdapAttribute(entries[0], "givenName"),
      apellido: getLdapAttribute(entries[0], "sn"),
      displayName: getLdapAttribute(entries[0], "displayName"),
    };
    await addLogEntry(username, "PROFILE_ACCESS", "Consulta de perfil exitosa");
    return userData;
  } finally {
    if (client) client.unbind();
  }
};
