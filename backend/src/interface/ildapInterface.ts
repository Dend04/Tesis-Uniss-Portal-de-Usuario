import { SearchEntry } from 'ldapjs'; // Asegúrate de importar el tipo correcto

export interface CustomSearchEntry extends SearchEntry {
  employeeID?: string; // Agrega la propiedad employeeID
}

export interface UserTokenPayload {
  username: string;
  employeeID: string;
  nombreCompleto: string;
  email: string;
}

