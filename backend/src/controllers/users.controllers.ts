import { Request, Response } from 'express';
import { unifiedLDAPSearch } from '../utils/ldap.utils';
import ldap from 'ldapjs';

export const searchUsers = async (
  req: Request<{}, {}, { searchTerm: string }>,
  res: Response
): Promise<void> => {
  try {
    const { searchTerm } = req.body;
    
    if (!searchTerm) {
      res.status(400).json({ error: 'Campo searchTerm requerido' });
      return;
    }

    const entries = await unifiedLDAPSearch(searchTerm);
    
    if (entries.length === 0) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    // Convertir atributos a objeto con tipos correctos
    const userData = entries[0].attributes.reduce((acc: Record<string, any>, attr: ldap.Attribute) => {
      acc[attr.type] = attr.values?.length === 1 ? attr.values[0] : attr.values;
      return acc;
    }, {} as Record<string, any>);

    // Añadir DN con tipo correcto
    userData.dn = entries[0].dn;

    res.json(userData);

  } catch (error: any) {
    res.status(500).json({ 
      error: 'Error en búsqueda',
      details: error.message 
    });
  }
};