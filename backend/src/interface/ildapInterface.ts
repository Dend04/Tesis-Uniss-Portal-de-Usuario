import { SearchEntry } from 'ldapjs'; // Asegúrate de importar el tipo correcto

export interface CustomSearchEntry extends SearchEntry {
  employeeID?: string; // Agrega la propiedad employeeID
}

