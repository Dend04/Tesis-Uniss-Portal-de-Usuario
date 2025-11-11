const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5550/api';

export interface Usuario {
  dn: string;
  sAMAccountName: string;
  username: string;
  employeeID: string;
  displayName: string;
  mail: string;
  title?: string;
  department?: string;
  company?: string;
  whenCreated?: string;
  whenChanged?: string;
  telefono?: string;
  direccion?: string;
  localidad?: string;
  provincia?: string;
  descripcion?: string;
  añoAcademico?: string;
  tipoEmpleado?: string;
  facultad?: string;
  carrera?: string;
  cuentaHabilitada?: boolean;
}

interface PaginatedResponse {
  success: boolean;
  data: {
    usuarios: Usuario[];
    total: number;
    fromCache: boolean;
    timestamp: string;
  };
  message: string;
}

class UsersApiService {
  private async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('authToken');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    };

    const response = await fetch(`${API_URL}${endpoint}`, config);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Obtener usuarios paginados
  async getUsers(page: number = 1, pageSize: number = 10): Promise<PaginatedResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: pageSize.toString()
    });

    return this.request(`/users?${params.toString()}`);
  }

  // Buscar usuarios paginados
  async searchUsers(query: string, page: number = 1, pageSize: number = 10): Promise<{
    success: boolean;
    data: {
      usuarios: Usuario[];
      total: number;
      termino: string;
    };
  }> {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: pageSize.toString()
    });

    return this.request(`/users/buscar?${params.toString()}`);
  }

  // Limpiar caché
  async clearCache(): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request('/users/cache/limpiar', {
      method: 'DELETE',
    });
  }
}

export const usersApiService = new UsersApiService();