// app/admin/users/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
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
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

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

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface Filters {
  role: string;
  department: string;
  year: string;
  career: string;
  faculty: string;
  status: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Filters>({
    role: "",
    department: "",
    year: "",
    career: "",
    faculty: "",
    status: "",
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showBajaModal, setShowBajaModal] = useState(false);
  const [bajaReason, setBajaReason] = useState("");
  const router = useRouter();

  // Datos de ejemplo para los filtros
  const filterOptions = useMemo(
    () => ({
      roles: [
        "Estudiante",
        "Docente",
        "Administrador",
        "Investigador",
        "Trabajador",
      ],
      departments: [
        "TI",
        "Académico",
        "Administrativo",
        "Investigación",
        "Recursos Humanos",
      ],
      years: ["1ro", "2do", "3ro", "4to", "5to", "6to"],
      careers: [
        "Ingeniería Informática",
        "Medicina",
        "Derecho",
        "Administración",
        "Psicología",
        "Contabilidad",
      ],
      faculties: [
        "Ciencias Técnicas",
        "Ciencias Médicas",
        "Ciencias Sociales",
        "Ciencias Económicas",
      ],
      statuses: ["active", "baja", "prorroga"],
    }),
    []
  );

  // Cargar usuarios
  const fetchUsers = async (page: number = 1) => {
    setLoading(true);
    try {
      // Simular llamada a la API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Datos de ejemplo actualizados
      const mockUsers: User[] = Array.from({ length: 50 }, (_, index) => {
        const statuses: ("active" | "baja" | "prorroga")[] = [
          "active",
          "baja",
          "prorroga",
        ];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        return {
          id: `user-${index + 1}`,
          username: `usuario${index + 1}`,
          fullName: `Usuario ${index + 1} Apellido`,
          email: `usuario${index + 1}@uniss.edu.cu`,
          role: filterOptions.roles[
            Math.floor(Math.random() * filterOptions.roles.length)
          ],
          department:
            filterOptions.departments[
              Math.floor(Math.random() * filterOptions.departments.length)
            ],
          year: Math.floor(Math.random() * 6) + 1, // Años del 1 al 6
          career:
            filterOptions.careers[
              Math.floor(Math.random() * filterOptions.careers.length)
            ],
          identityCard: `910${Math.random().toString().slice(2, 11)}`,
          faculty:
            filterOptions.faculties[
              Math.floor(Math.random() * filterOptions.faculties.length)
            ],
          status: status,
          createdAt: new Date(
            Date.now() - Math.random() * 31536000000
          ).toISOString(),
          lastLogin:
            Math.random() > 0.3
              ? new Date(Date.now() - Math.random() * 86400000).toISOString()
              : undefined,
        };
      });

      const filteredUsers = mockUsers
        .filter(
          (user) =>
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.identityCard.includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .filter(
          (user) =>
            (!filters.role || user.role === filters.role) &&
            (!filters.department || user.department === filters.department) &&
            (!filters.year || user.year?.toString() === filters.year) &&
            (!filters.career || user.career === filters.career) &&
            (!filters.faculty || user.faculty === filters.faculty) &&
            (!filters.status || user.status === filters.status)
        );

      const startIndex = (page - 1) * 10;
      const paginatedUsers = filteredUsers.slice(startIndex, startIndex + 10);

      setUsers(paginatedUsers);
      setPagination({
        currentPage: page,
        totalPages: Math.ceil(filteredUsers.length / 10),
        totalUsers: filteredUsers.length,
        hasNext: page < Math.ceil(filteredUsers.length / 10),
        hasPrev: page > 1,
      });
    } catch (error) {
      console.error("Error cargando usuarios:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, [searchTerm, filters]);

  const handlePageChange = (page: number) => {
    fetchUsers(page);
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
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
  };

  // Función para abrir el modal de baja
  const handleOpenBajaModal = (user: User) => {
    setSelectedUser(user);
    setBajaReason("");
    setShowBajaModal(true);
  };

  // Función para procesar la baja del usuario
  const handleProcessBaja = () => {
    if (!selectedUser || !bajaReason.trim()) return;

    // Aquí iría la lógica real para dar de baja al usuario
    console.log(`Dando de baja al usuario: ${selectedUser.username}`);
    console.log(`Motivo: ${bajaReason}`);

    // Simular actualización del estado del usuario
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.id === selectedUser.id
          ? { ...user, status: "baja" as const }
          : user
      )
    );

    // Cerrar modal y resetear estado
    setShowBajaModal(false);
    setSelectedUser(null);
    setBajaReason("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "baja":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "prorroga":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Activo";
      case "baja":
        return "Baja";
      case "prorroga":
        return "Prorroga de Tesis";
      default:
        return status;
    }
  };

  // Calcular estadísticas
  const stats = useMemo(() => {
    const totalUsers = pagination.totalUsers;
    const estudiantesProrroga = users.filter(
      (u) => u.status === "prorroga"
    ).length;
    const bajas = users.filter((u) => u.status === "baja").length;

    return { totalUsers, estudiantesProrroga, bajas };
  }, [users, pagination.totalUsers]);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Gestión de Usuarios
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Administra y gestiona todos los usuarios del sistema
          </p>
        </motion.div>

        {/* Estadísticas actualizadas */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          {/* Total de Usuarios */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total de Usuarios
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalUsers}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <UserPlusIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Estudiantes en Prorroga de Tesis */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Estudiantes en Prorroga
                </p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.estudiantesProrroga}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <AcademicCapIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          {/* Bajas */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Bajas
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.bajas}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Barra de búsqueda y filtros */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Barra de búsqueda */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, usuario, carnet, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <FunnelIcon className="h-5 w-5" />
                Filtros
              </button>

              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Limpiar
              </button>

              <button
                onClick={() => router.push("/admin/users/new")}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlusIcon className="h-5 w-5" />
                Nuevo Usuario
              </button>
            </div>
          </div>

          {/* Filtros expandibles */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rol
                </label>
                <select
                  value={filters.role}
                  onChange={(e) => handleFilterChange("role", e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Todos los roles</option>
                  {filterOptions.roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Departamento
                </label>
                <select
                  value={filters.department}
                  onChange={(e) =>
                    handleFilterChange("department", e.target.value)
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Todos los departamentos</option>
                  {filterOptions.departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Año Académico
                </label>
                <select
                  value={filters.year}
                  onChange={(e) => handleFilterChange("year", e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Todos los años</option>
                  {filterOptions.years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Carrera
                </label>
                <select
                  value={filters.career}
                  onChange={(e) => handleFilterChange("career", e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Todas las carreras</option>
                  {filterOptions.careers.map((career) => (
                    <option key={career} value={career}>
                      {career}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Facultad
                </label>
                <select
                  value={filters.faculty}
                  onChange={(e) =>
                    handleFilterChange("faculty", e.target.value)
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Todas las facultades</option>
                  {filterOptions.faculties.map((faculty) => (
                    <option key={faculty} value={faculty}>
                      {faculty}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estado
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Todos los estados</option>
                  <option value="active">Activo</option>
                  <option value="baja">Baja</option>
                  <option value="prorroga">Prorroga de Tesis</option>
                </select>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Tabla de usuarios */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <ArrowPathIcon className="h-8 w-8 text-blue-600 animate-spin" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                Cargando usuarios...
              </span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Información
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Rol/Departamento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {users.map((user, index) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.username}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {user.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.fullName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Carnet: {user.identityCard}
                            </div>
                            {user.career && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {user.career} -{" "}
                                {filterOptions.years[user.year! - 1]}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.role}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {user.department}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {user.faculty}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                              user.status
                            )}`}
                          >
                            {getStatusText(user.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                router.push(`/admin/users/${user.username}`)
                              }
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Ver detalles del usuario"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleOpenBajaModal(user)}
                              disabled={user.status === "baja"}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Dar de baja al usuario"
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

              {/* Paginación */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Mostrando {(pagination.currentPage - 1) * 10 + 1} a{" "}
                      {Math.min(
                        pagination.currentPage * 10,
                        pagination.totalUsers
                      )}{" "}
                      de {pagination.totalUsers} usuarios
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handlePageChange(pagination.currentPage - 1)
                        }
                        disabled={!pagination.hasPrev}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Anterior
                      </button>
                      {Array.from(
                        { length: pagination.totalPages },
                        (_, i) => i + 1
                      ).map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1 border rounded-md ${
                            page === pagination.currentPage
                              ? "bg-blue-600 text-white border-blue-600"
                              : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() =>
                          handlePageChange(pagination.currentPage + 1)
                        }
                        disabled={!pagination.hasNext}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* Modal de Dar de Baja */}
      {showBajaModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
          >
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Dar de baja usuario
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Esta acción no se puede deshacer
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBajaModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Estás a punto de dar de baja al siguiente usuario:
                </p>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedUser.fullName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedUser.username} • {selectedUser.identityCard}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedUser.role} • {selectedUser.department}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <label
                  htmlFor="bajaReason"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Motivo de la baja *
                </label>
                <textarea
                  id="bajaReason"
                  value={bajaReason}
                  onChange={(e) => setBajaReason(e.target.value)}
                  placeholder="Describe los motivos por los cuales se da de baja al usuario..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white resize-none"
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Este motivo quedará registrado en el historial del usuario.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowBajaModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleProcessBaja}
                  disabled={!bajaReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Confirmar Baja
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
