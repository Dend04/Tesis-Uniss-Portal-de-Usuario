// app/hooks/useUsers.ts
import { useState, useEffect, useCallback } from 'react';
import { usersApiService } from '../services/usersApiService';
 // Ajusta la ruta según tu estructura

export interface UserPagination {
  currentPage: number;
  pageSize: number;
  totalUsers: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UserStats {
  activos: number;
  bajas: number;
  estudiantesProrroga: number;
}

export const useUsers = (initialPageSize: number = 10) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<UserPagination>({
    currentPage: 1,
    pageSize: initialPageSize,
    totalUsers: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [stats, setStats] = useState<UserStats>({
    activos: 0,
    bajas: 0,
    estudiantesProrroga: 0,
  });

  // Función para calcular estadísticas
  const calculateStats = useCallback((userList: any[]) => {
    const newStats = {
      activos: 0,
      bajas: 0,
      estudiantesProrroga: 0,
    };

    userList.forEach(user => {
      if (!user.cuentaHabilitada) {
        newStats.bajas++;
      } else if (user.descripcion?.toLowerCase().includes('prorroga') || 
                 user.title?.toLowerCase().includes('prorroga')) {
        newStats.estudiantesProrroga++;
      } else {
        newStats.activos++;
      }
    });

    setStats(newStats);
  }, []);

  // Función para cargar usuarios con paginación
  const loadUsers = useCallback(async (page: number = 1, pageSize: number = pagination.pageSize) => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersApiService.getUsers(page, pageSize);
      
      if (data.success) {
        setUsers(data.data.usuarios || []);
        setPagination({
          currentPage: data.data.pagination.currentPage,
          pageSize: data.data.pagination.pageSize,
          totalUsers: data.data.pagination.totalItems,
          totalPages: data.data.pagination.totalPages,
          hasNext: data.data.pagination.hasNextPage,
          hasPrev: data.data.pagination.hasPrevPage,
        });
        
        calculateStats(data.data.usuarios || []);
      } else {
        setError(data.error || 'Error al cargar usuarios');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión al cargar usuarios');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.pageSize, calculateStats]);

  // Función para buscar usuarios con paginación
  const searchUsers = useCallback(async (term: string, page: number = 1, pageSize: number = pagination.pageSize) => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersApiService.searchUsers(term, page, pageSize);
      
      if (data.success) {
        setUsers(data.data.usuarios || []);
        setPagination({
          currentPage: data.data.pagination.currentPage,
          pageSize: data.data.pagination.pageSize,
          totalUsers: data.data.pagination.totalItems,
          totalPages: data.data.pagination.totalPages,
          hasNext: data.data.pagination.hasNextPage,
          hasPrev: data.data.pagination.hasPrevPage,
        });
        
        calculateStats(data.data.usuarios || []);
      } else {
        setError(data.error || 'Error en la búsqueda');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión al buscar usuarios');
      console.error('Error searching users:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.pageSize, calculateStats]);

  // Función para cambiar de página
  const changePage = useCallback(async (page: number, pageSize: number = pagination.pageSize) => {
    await loadUsers(page, pageSize);
  }, [loadUsers, pagination.pageSize]);

  // Función para limpiar caché
  const clearCache = useCallback(async () => {
    setLoading(true);
    try {
      const data = await usersApiService.clearCache();
      
      if (data.success) {
        // Recargar los datos después de limpiar la caché
        await loadUsers(1, pagination.pageSize);
      } else {
        setError(data.error || 'Error al limpiar caché');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión al limpiar caché');
      console.error('Error clearing cache:', err);
    } finally {
      setLoading(false);
    }
  }, [loadUsers, pagination.pageSize]);

  // Cargar usuarios iniciales
  useEffect(() => {
    loadUsers(1, initialPageSize);
  }, [loadUsers, initialPageSize]);

  return {
    users,
    loading,
    error,
    pagination,
    stats,
    searchUsers,
    changePage,
    clearCache,
  };
};