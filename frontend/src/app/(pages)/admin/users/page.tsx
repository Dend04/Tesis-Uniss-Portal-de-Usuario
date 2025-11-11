"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  UserPlusIcon,
  TrashIcon,
  EyeIcon,
  ArrowPathIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShieldCheckIcon, // Agregado para permisos
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useUsers } from "@/app/hooks/useUsers";

// Tipos de datos
interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  department: string;
  year?: number;
  career?: string;
  identityCard: string;
  faculty: string;
  status: "active" | "baja" | "prorroga";
  createdAt: string;
  lastLogin?: string;
}

interface Filters {
  role: string;
  department: string;
  year: string;
  career: string;
  faculty: string;
  status: string;
}

// Transformar datos del backend al formato del frontend
const transformUser = (usuario: any): User => {
  let status: "active" | "baja" | "prorroga" = "active";
  if (!usuario.cuentaHabilitada) {
    status = "baja";
  } else if (usuario.descripcion?.toLowerCase().includes('prorroga') || 
             usuario.title?.toLowerCase().includes('prorroga')) {
    status = "prorroga";
  }

  return {
    id: usuario.sAMAccountName,
    username: usuario.sAMAccountName,
    fullName: usuario.displayName,
    email: usuario.mail,
    role: usuario.title || 'Usuario',
    department: usuario.department || 'Sin departamento',
    year: usuario.añoAcademico ? parseInt(usuario.añoAcademico) : undefined,
    career: usuario.carrera,
    identityCard: usuario.employeeID,
    faculty: usuario.facultad || 'Sin facultad',
    status: status,
    createdAt: usuario.whenCreated || new Date().toISOString(),
    lastLogin: usuario.whenChanged,
  };
};

export default function UserManagementPage() {
  const {
    users: backendUsers,
    loading,
    error,
    pagination,
    stats,
    searchUsers,
    changePage,
    clearCache,
  } = useUsers(10); // 10 usuarios por página

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Filters>({
    role: "",
    department: "",
    year: "",
    career: "",
    faculty: "",
    status: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showBajaModal, setShowBajaModal] = useState(false);
  const [bajaReason, setBajaReason] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const router = useRouter();

  // Transformar usuarios
  const users: User[] = useMemo(() => {
    return backendUsers.map(transformUser);
  }, [backendUsers]);

  // Datos para filtros
  const filterOptions = useMemo(
    () => ({
      roles: ["Estudiante", "Docente", "Administrador", "Investigador", "Trabajador"],
      departments: ["TI", "Académico", "Administrativo", "Investigación", "Recursos Humanos"],
      years: ["1ro", "2do", "3ro", "4to", "5to", "6to"],
      careers: ["Ingeniería Informática", "Medicina", "Derecho", "Administración", "Psicología"],
      faculties: ["Ciencias Técnicas", "Ciencias Médicas", "Ciencias Sociales", "Ciencias Económicas"],
    }),
    []
  );

  // Manejar búsqueda
  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    await searchUsers(term, 1); // Siempre empieza en página 1 al buscar
  };

  // Manejar cambio de página
  const handlePageChange = (page: number) => {
    if (searchTerm.trim()) {
      searchUsers(searchTerm, page);
    } else {
      changePage(page);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      role: "",
      department: "",
      year: "",
      career: "",
      faculty: "",
      status: "",
    });
    setSearchTerm("");
    changePage(1);
  };

  // Limpiar caché
  const handleClearCache = async () => {
    setLocalLoading(true);
    await clearCache();
    setLocalLoading(false);
  };

  // Abrir modal de baja
  const handleOpenBajaModal = (user: User) => {
    setSelectedUser(user);
    setBajaReason("");
    setShowBajaModal(true);
  };

  // Procesar baja
  const handleProcessBaja = async () => {
    if (!selectedUser || !bajaReason.trim()) return;

    try {
      console.log(`Dando de baja al usuario: ${selectedUser.username}`);
      console.log(`Motivo: ${bajaReason}`);
      
      setShowBajaModal(false);
      setSelectedUser(null);
      setBajaReason("");

      // Recargar la página actual
      if (searchTerm.trim()) {
        await searchUsers(searchTerm, pagination.currentPage);
      } else {
        await changePage(pagination.currentPage);
      }
    } catch (error) {
      console.error('Error al procesar baja:', error);
    }
  };

  // Exportar datos
  const handleExportData = () => {
    const dataStr = JSON.stringify(users, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `usuarios-uniss-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Funciones auxiliares para UI
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "baja": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "prorroga": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active": return "Activo";
      case "baja": return "Baja";
      case "prorroga": return "Prorroga";
      default: return status;
    }
  };

  // Generar números de página para la paginación
  const getPageNumbers = () => {
    const pages = [];
    const totalPages = pagination.totalPages;
    const currentPage = pagination.currentPage;
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Gestión de Usuarios
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Administra y gestiona todos los usuarios del sistema
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleClearCache}
                disabled={localLoading}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-5 w-5 ${localLoading ? 'animate-spin' : ''}`} />
                {localLoading ? 'Actualizando...' : 'Actualizar Datos'}
              </button>
              <button
                onClick={handleExportData}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Exportar
              </button>
            </div>
          </div>
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Estadísticas */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Usuarios</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{pagination.totalUsers}</p>
              </div>
              <UserPlusIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Activos</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.activos}</p>
              </div>
              <EyeIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Prorroga</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.estudiantesProrroga}</p>
              </div>
              <AcademicCapIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Bajas</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.bajas}</p>
              </div>
              <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </motion.div>

        {/* Búsqueda y Filtros */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, usuario, carnet, email..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <FunnelIcon className="h-5 w-5" />
                Filtros
              </button>
              <button onClick={clearFilters} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Limpiar
              </button>
              <button onClick={() => router.push("/admin/users/new")} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <UserPlusIcon className="h-5 w-5" />
                Nuevo Usuario
              </button>
            </div>
          </div>

          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Filtros aquí (igual que antes) */}
            </motion.div>
          )}
        </motion.div>

        {/* Tabla y Paginación */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <ArrowPathIcon className="h-8 w-8 text-blue-600 animate-spin" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Cargando usuarios...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Usuario</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Información</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rol/Departamento</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {users.map((user, index) => (
                      <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.05 }} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{user.fullName}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Carnet: {user.identityCard}</div>
                            {user.career && <div className="text-sm text-gray-500 dark:text-gray-400">{user.career} {user.year && `- ${user.year}° año`}</div>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{user.role}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{user.department}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{user.faculty}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                            {getStatusText(user.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => router.push(`/admin/users/${user.username}`)} 
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" 
                              title="Ver detalles"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button 
                              onClick={() => router.push(`/admin/users/${user.username}/permissions`)} 
                              className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300" 
                              title="Gestionar permisos"
                            >
                              <ShieldCheckIcon className="h-5 w-5" />
                            </button>
                            <button 
                              onClick={() => handleOpenBajaModal(user)} 
                              disabled={user.status === "baja"} 
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed" 
                              title="Dar de baja"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación Mejorada */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Mostrando {(pagination.currentPage - 1) * pagination.pageSize + 1} a{" "}
                      {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalUsers)} de{" "}
                      {pagination.totalUsers} usuarios
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={!pagination.hasPrev}
                        className="p-2 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <ChevronLeftIcon className="h-4 w-4" />
                      </button>

                      {getPageNumbers().map((page, index) => (
                        page === '...' ? (
                          <span key={`ellipsis-${index}`} className="px-3 py-1 text-gray-500">
                            ...
                          </span>
                        ) : (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page as number)}
                            className={`px-3 py-1 border rounded-md text-sm ${
                              page === pagination.currentPage
                                ? "bg-blue-600 text-white border-blue-600"
                                : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`}
                          >
                            {page}
                          </button>
                        )
                      ))}

                      <button
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={!pagination.hasNext}
                        className="p-2 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <ChevronRightIcon className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-700 dark:text-gray-300">Mostrar:</span>
                      <select 
                        value={pagination.pageSize}
                        onChange={(e) => {
                          const newSize = parseInt(e.target.value);
                          if (searchTerm.trim()) {
                            searchUsers(searchTerm, 1, newSize);
                          } else {
                            changePage(1, newSize);
                          }
                        }}
                        className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                      <span className="text-gray-700 dark:text-gray-300">por página</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Modal de Baja */}
        {showBajaModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Dar de baja usuario
                  </h3>
                  <button
                    onClick={() => setShowBajaModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="mb-4">
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    ¿Estás seguro de que deseas dar de baja al usuario <strong>{selectedUser.fullName}</strong> ({selectedUser.username})?
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Esta acción cambiará el estado del usuario a "Baja".
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Motivo de la baja
                  </label>
                  <textarea
                    value={bajaReason}
                    onChange={(e) => setBajaReason(e.target.value)}
                    placeholder="Describe el motivo de la baja..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowBajaModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleProcessBaja}
                    disabled={!bajaReason.trim()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirmar Baja
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}