import { Request, Response } from "express";
import { createLDAPClient, bindAsync, LDAPClient, getLdapStructure } from "../utils/ldap.utils"; // Agregar las importaciones faltantes
export const getLdapTreeController = async (
  req: Request,
  res: Response
): Promise<void> => {
  let client: LDAPClient | null = null;

  try {
    // 1. Autenticación
    const user = (req as any).user as { username: string } | undefined;
    if (!user?.username) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }

    // 2. Conexión LDAP
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

    // 3. Obtener estructura completa
    const ldapTree = await getLdapStructure(client, "dc=uniss,dc=edu,dc=cu");

    // 4. Formatear respuesta
    res.json({
      success: true,
      tree: ldapTree,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Error obteniendo estructura LDAP",
    });
  } finally {
    if (client) client.unbind();
  }
};
