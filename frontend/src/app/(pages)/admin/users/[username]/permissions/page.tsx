// app/admin/users/[username]/permissions/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ShieldCheckIcon,
  UserCircleIcon,
  ArrowLeftIcon,
  PlusIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

interface LDAPGroup {
  dn: string;
  cn: string;
  description?: string;
  member?: string[];
  distinguishedName?: string;
  sAMAccountName?: string;
}

interface UserDetails {
  username: string;
  fullName: string;
  role: string;
  department: string;
  email: string;
}

export default function UserPermissionsPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [userGroups, setUserGroups] = useState<LDAPGroup[]>([]);
  const [allGroups, setAllGroups] = useState<LDAPGroup[]>([]);
  const [availableGroups, setAvailableGroups] = useState<LDAPGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL;

  // Cargar datos del usuario y grupos
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        // En una implementación real, esto vendría de tu API de usuarios
        // Por ahora usamos datos mock para los detalles del usuario
        const mockUserDetails: UserDetails = {
          username: username,
          fullName: "Usuario Ejemplo",
          role: "Estudiante",
          department: "Departamento de TI",
          email: `${username}@uniss.edu.cu`
        };
        setUserDetails(mockUserDetails);

        // Cargar grupos del usuario
        await fetchUserGroups();
        
        // Cargar todos los grupos disponibles
        await fetchAllGroups();

      } catch (err: any) {
        setError(err.message || "Error al cargar los datos del usuario");
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchUserData();
    }
  }, [username]);

  const fetchUserGroups = async () => {
    try {
      const response = await fetch(`${API_BASE}/groups/user/${username}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setUserGroups(data.groups);
      } else {
        throw new Error(data.error || "Error al cargar grupos del usuario");
      }
    } catch (err: any) {
      console.error("Error fetching user groups:", err);
      throw new Error("Error al cargar grupos del usuario: " + err.message);
    }
  };

  const fetchAllGroups = async () => {
    try {
      const response = await fetch(`${API_BASE}/groups`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setAllGroups(data.groups);
      } else {
        throw new Error(data.error || "Error al cargar todos los grupos");
      }
    } catch (err: any) {
      console.error("Error fetching all groups:", err);
      throw new Error("Error al cargar todos los grupos: " + err.message);
    }
  };

  // Actualizar grupos disponibles cuando cambien los grupos del usuario o todos los grupos
  useEffect(() => {
    const userGroupDNs = userGroups.map(group => group.dn);
    const filteredGroups = allGroups.filter(group => !userGroupDNs.includes(group.dn));
    
    // Aplicar filtro de búsqueda si existe
    const searchedGroups = searchTerm 
      ? filteredGroups.filter(group => 
          group.cn.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      : filteredGroups;
    
    setAvailableGroups(searchedGroups);
  }, [userGroups, allGroups, searchTerm]);

  const handleAddGroup = (groupDN: string) => {
    if (!selectedGroups.includes(groupDN)) {
      setSelectedGroups(prev => [...prev, groupDN]);
    }
  };

  const handleRemoveSelectedGroup = (groupDN: string) => {
    setSelectedGroups(prev => prev.filter(dn => dn !== groupDN));
  };

  const handleSavePermissions = async () => {
    if (selectedGroups.length === 0) {
      setError("Selecciona al menos un grupo para agregar");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`${API_BASE}/groups/user/${username}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          groupsToAdd: selectedGroups, 
          groupsToRemove: [] 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Actualizar la lista de grupos del usuario
        setUserGroups(data.groups);
        setSelectedGroups([]);
        setSuccess(data.message || `Se agregaron ${selectedGroups.length} grupo(s) al usuario`);
        
        // Recargar la lista de grupos disponibles
        await fetchAllGroups();
      } else {
        throw new Error(data.error || "Error al guardar los permisos");
      }

      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);

    } catch (err: any) {
      console.error("Error saving permissions:", err);
      setError(err.message || "Error al guardar los permisos");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveGroup = async (groupDN: string) => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`${API_BASE}/groups/user/${username}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          groupsToAdd: [], 
          groupsToRemove: [groupDN] 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setUserGroups(data.groups);
        setSuccess(data.message || 'Grupo removido correctamente');
        
        // Recargar la lista de grupos disponibles
        await fetchAllGroups();
      } else {
        throw new Error(data.error || "Error al remover el grupo");
      }

      setTimeout(() => setSuccess(null), 3000);

    } catch (err: any) {
      console.error("Error removing group:", err);
      setError(err.message || "Error al remover el grupo");
    } finally {
      setSaving(false);
    }
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  const handleSearchGroups = async () => {
    if (!searchTerm.trim()) {
      // Si no hay término de búsqueda, recargar todos los grupos
      await fetchAllGroups();
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/groups/search?q=${encodeURIComponent(searchTerm)}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setAllGroups(data.groups);
      } else {
        throw new Error(data.error || "Error en la búsqueda de grupos");
      }
    } catch (err: any) {
      console.error("Error searching groups:", err);
      setError(err.message || "Error en la búsqueda de grupos");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-gray-600 dark:text-gray-400">Cargando permisos...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !userDetails) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <button
              onClick={() => router.back()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Volver a la lista de usuarios
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Gestión de Permisos
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {userDetails?.fullName} • {userDetails?.username}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {userDetails?.role} • {userDetails?.department}
              </p>
              {userDetails?.email && (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {userDetails.email}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </motion.div>

        {/* Mensajes de estado */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          >
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
          >
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
              <p className="text-green-600 dark:text-green-400">{success}</p>
              <button
                onClick={() => setSuccess(null)}
                className="ml-auto p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna izquierda - Grupos Actuales */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            {/* Grupos Actuales del Usuario */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <UserCircleIcon className="h-6 w-6 text-green-600" />
                Grupos Actuales ({userGroups.length})
              </h2>
              
              {userGroups.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {userGroups.map((group) => (
                    <div
                      key={group.dn}
                      className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <ShieldCheckIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <p className="font-medium text-green-900 dark:text-green-300">
                            {group.cn}
                          </p>
                        </div>
                        {group.description && (
                          <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                            {group.description}
                          </p>
                        )}
                        <p className="text-xs text-green-600 dark:text-green-500 truncate mt-2">
                          {group.dn}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveGroup(group.dn)}
                        disabled={saving}
                        className="ml-4 p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 transition-colors"
                        title="Remover grupo"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShieldCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    El usuario no pertenece a ningún grupo
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Agrega grupos desde la sección de la derecha
                  </p>
                </div>
              )}
            </div>

            {/* Grupos Seleccionados para Agregar */}
            {selectedGroups.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
              >
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Grupos a Agregar ({selectedGroups.length})
                </h2>
                <div className="space-y-3 mb-4">
                  {selectedGroups.map((groupDN) => {
                    const group = allGroups.find(g => g.dn === groupDN);
                    return group ? (
                      <div
                        key={group.dn}
                        className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-blue-900 dark:text-blue-300">
                            {group.cn}
                          </p>
                          {group.description && (
                            <p className="text-sm text-blue-700 dark:text-blue-400">
                              {group.description}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveSelectedGroup(group.dn)}
                          className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                          title="Remover selección"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
                <button
                  onClick={handleSavePermissions}
                  disabled={saving || selectedGroups.length === 0}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="h-5 w-5" />
                      Agregar Grupos Seleccionados
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </motion.div>

          {/* Columna derecha - Grupos Disponibles */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Búsqueda de Grupos */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Buscar Grupos Disponibles
              </h2>
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o descripción..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchGroups()}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <button
                  onClick={handleSearchGroups}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Buscar
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {availableGroups.length} grupos disponibles
                {searchTerm && ` para "${searchTerm}"`}
              </p>
            </div>

            {/* Lista de Grupos Disponibles */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Grupos Disponibles
              </h2>
              
              {availableGroups.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {availableGroups.map((group) => (
                    <div
                      key={group.dn}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <ShieldCheckIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          <p className="font-medium text-gray-900 dark:text-white">
                            {group.cn}
                          </p>
                        </div>
                        {group.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {group.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-2">
                          {group.dn}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAddGroup(group.dn)}
                        disabled={selectedGroups.includes(group.dn)}
                        className="ml-4 p-2 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Agregar grupo"
                      >
                        <PlusIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No se encontraron grupos que coincidan con la búsqueda' : 'No hay grupos disponibles para agregar'}
                  </p>
                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        fetchAllGroups();
                      }}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm mt-2"
                    >
                      Limpiar búsqueda
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Información adicional */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6"
        >
          <div className="flex items-start gap-3">
            <ShieldCheckIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                Información sobre permisos y grupos
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                <li>• Los grupos definen los permisos y accesos del usuario en el sistema</li>
                <li>• Al agregar un grupo, el usuario hereda todos los permisos de ese grupo</li>
                <li>• Los cambios se aplican inmediatamente después de guardar</li>
                <li>• Algunos grupos pueden tener permisos especiales o restricciones</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}