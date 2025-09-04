import { Request, Response } from "express";
import { unifiedLDAPSearch } from "../utils/ldap.utils";
import ldap from "ldapjs";

// Definir una interfaz para los atributos LDAP
interface LdapAttribute {
  type: string;
  values: string[];
}

// Función para formatear timestamps de LDAP
const formatLdapTimestamp = (timestamp: string): string => {
  const ldapTimestamp = parseInt(timestamp, 10);
  const date = new Date(ldapTimestamp / 10000 - 11644473600000);
  return date.toISOString();
};

// Mapeo de grupos a descripciones
const mapGroupToDescription = (group: string): string => {
  switch (group) {
    case "CN=internet_est,OU=_Grupos,DC=uniss,DC=edu,DC=cu":
      return "Acceso a internet modalidad estudiante";
    case "CN=internet_prof_vip,OU=_Grupos,DC=uniss,DC=edu,DC=cu":
      return "Acceso a internet modalidad profesor";
    case "CN=wifi_users,OU=_Grupos,DC=uniss,DC=edu,DC=cu":
      return "Usuario de la WiFi institucional";
    case "CN=correo_nac,OU=_Grupos,DC=uniss,DC=edu,DC=cu":
      return "Acceso a correo nacional";
    default:
      return "Grupo desconocido";
  }
};

export const searchUsers = async (
  req: Request<{}, {}, { searchTerm: string }>,
  res: Response
): Promise<void> => {
  try {
    const { searchTerm } = req.body;

    if (!searchTerm) {
      res.status(400).json({ error: "Campo searchTerm requerido" });
      return;
    }

    const entries = await unifiedLDAPSearch(searchTerm);

    if (entries.length === 0) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    // Convertir atributos a objeto con tipos correctos
    const userData = entries[0].attributes.reduce(
      (acc: Record<string, any>, attr: LdapAttribute) => {
        acc[attr.type] =
          attr.values?.length === 1 ? attr.values[0] : attr.values;
        return acc;
      },
      {} as Record<string, any>
    );

    // Añadir DN con tipo correcto
    userData.dn = entries[0].dn;

    res.json(userData);
  } catch (error: any) {
    res.status(500).json({
      error: "Error en búsqueda",
      details: error.message,
    });
  }
};

export const getUserDetails = async (
  req: Request<{}, {}, { searchTerm: string }>,
  res: Response
): Promise<void> => {
  try {
    const { searchTerm } = req.body;

    if (!searchTerm) {
      res.status(400).json({ error: "Campo searchTerm requerido" });
      return;
    }

    const entries = await unifiedLDAPSearch(searchTerm);

    if (entries.length === 0) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    // Encontrar atributos con tipos explícitos
    const accountExpiresAttr = entries[0].attributes.find(
      (attr: LdapAttribute) => attr.type === "accountExpires"
    );
    const accountExpiresValue = accountExpiresAttr?.values[0] || "0";

    const samAccountNameAttr = entries[0].attributes.find(
      (attr: LdapAttribute) => attr.type === "sAMAccountName"
    );
    const mailAttr = entries[0].attributes.find(
      (attr: LdapAttribute) => attr.type === "mail"
    );
    const displayNameAttr = entries[0].attributes.find(
      (attr: LdapAttribute) => attr.type === "displayName"
    );
    const userAccountControlAttr = entries[0].attributes.find(
      (attr: LdapAttribute) => attr.type === "userAccountControl"
    );
    const pwdLastSetAttr = entries[0].attributes.find(
      (attr: LdapAttribute) => attr.type === "pwdLastSet"
    );
    const lockoutTimeAttr = entries[0].attributes.find(
      (attr: LdapAttribute) => attr.type === "lockoutTime"
    );
    const studeninfoAttr = entries[0].attributes.find(
      (attr: LdapAttribute) => attr.type === "studeninfo"
    );
    const logonCountAttr = entries[0].attributes.find(
      (attr: LdapAttribute) => attr.type === "logonCount"
    );

    // Extraer y formatear los datos importantes
    const userData = {
      username: samAccountNameAttr?.values[0] || "",
      email: mailAttr?.values[0] || "",
      displayName: displayNameAttr?.values[0] || "",
      accountEnabled: userAccountControlAttr?.values[0] === "512", // 512 indica que la cuenta está habilitada
      lastPasswordChange: formatLdapTimestamp(pwdLastSetAttr?.values[0] || "0"),
      accountLocked: lockoutTimeAttr?.values[0] !== "0", // 0 indica que no está bloqueada
      accountExpires:
        accountExpiresValue === "0" ||
        accountExpiresValue === "9223372036854775807"
          ? "Nunca"
          : formatLdapTimestamp(accountExpiresValue),
      groups:
        entries[0].attributes
          .filter((attr: LdapAttribute) => attr.type === "memberOf")
          .flatMap((attr: LdapAttribute) => attr.values)
          .map(mapGroupToDescription) || [],
      lastLogon: formatLdapTimestamp(studeninfoAttr?.values[0] || "0"),
      logonCount: logonCountAttr?.values[0] || 0,
    };

    res.json(userData);
  } catch (error: any) {
    res.status(500).json({
      error: "Error al obtener los detalles del usuario",
      details: error.message,
    });
  }
};