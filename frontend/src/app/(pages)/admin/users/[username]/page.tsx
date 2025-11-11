// app/admin/users/[username]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  UserCircleIcon,
  IdentificationIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ShieldCheckIcon,
  CalendarIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

interface UserDetails {
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
  phone?: string;
  address?: string;
  province?: string;
  town?: string;
  country?: string;
  
  // Campos específicos de empleados
  employeeType?: string;
  office?: string;
  
  // Campos específicos de estudiantes
  studentType?: string;
  academicSituation?: string;
  courseType?: string;
  
  // Campos de seguridad y LDAP
  userParameters: string;
  serialNumber: string;
  description?: string;
  userAccountControl: string;
  
  // Información adicional de LDAP
  displayName?: string;
  givenName?: string;
  sn?: string;
  title?: string;
  physicalDeliveryOfficeName?: string;
  employeeID?: string;
  userPrincipalName?: string;
  mail?: string;
  employeeNumber?: string;
}

export default function UserViewPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        // Simular llamada a la API para obtener detalles del usuario
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Datos de ejemplo basados en la estructura real de LDAP
        const isStudent = Math.random() > 0.5;
        const has2FA = Math.random() > 0.5;
        const hasPIN = Math.random() > 0.5;
        const isActive = Math.random() > 0.2;

        const mockUser: UserDetails = {
          id: `user-${Math.random().toString(36).substr(2, 9)}`,
          username: username,
          fullName: "Usuario Ejemplo Apellido",
          email: `${username}@uniss.edu.cu`,
          role: isStudent ? "Estudiante" : "Docente",
          department: "TI",
          year: isStudent ? Math.floor(Math.random() * 6) + 1 : undefined,
          career: isStudent ? "Ingeniería Informática" : undefined,
          identityCard: `910${Math.random().toString().slice(2, 11)}`,
          faculty: "Ciencias Técnicas",
          status: isActive ? "active" : Math.random() > 0.5 ? "baja" : "prorroga",
          createdAt: new Date(Date.now() - Math.random() * 31536000000).toISOString(),
          lastLogin: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 86400000).toISOString() : undefined,
          phone: "+5351234567",
          address: "Calle Example #123",
          province: "Sancti Spíritus",
          town: "Sancti Spíritus",
          country: "Cuba",
          
          // Campos específicos
          employeeType: isStudent ? undefined : "Docente",
          office: isStudent ? undefined : "Oficina 101",
          studentType: isStudent ? "Curso Diurno" : undefined,
          academicSituation: isStudent ? "Regular" : undefined,
          courseType: isStudent ? "Presencial" : undefined,
          
          // Campos de seguridad - Basados en la estructura real
          userParameters: has2FA ? "2FA ENABLED" : "2FA DISABLED",
          serialNumber: hasPIN ? "encrypted_pin_value_here" : " ",
          description: isStudent 
            ? "Estudiante de Ingeniería Informática actualmente en curso diurno"
            : "Docente del departamento de TI",
          userAccountControl: isActive ? "512" : "514",
          
          // Campos LDAP
          displayName: "Usuario Ejemplo Apellido",
          givenName: "Usuario",
          sn: "Ejemplo Apellido",
          title: isStudent ? "Estudiante" : "Docente",
          physicalDeliveryOfficeName: isStudent 
            ? "Estudiante de Ingeniería Informática actualmente en curso diurno"
            : "Docente de Ingeniería Informática",
          employeeID: `910${Math.random().toString().slice(2, 11)}`,
          userPrincipalName: `${username}@uniss.edu.cu`,
          mail: `${username}@uniss.edu.cu`,
          employeeNumber: `910${Math.random().toString().slice(2, 11)}`,
        };

        setUser(mockUser);
      } catch (err: any) {
        setError(err.message || "Error al cargar los datos del usuario");
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchUserDetails();
    }
  }, [username]);

  // Determinar si tiene 2FA activado
  const has2FA = user?.userParameters?.toUpperCase().includes("2FA ENABLED");
  
  // Determinar si tiene PIN activado (serialNumber no vacío y no es solo espacio)
  const hasActivePIN = user?.serialNumber && user.serialNumber.trim() !== "" && user.serialNumber !== " ";

  // Determinar estado de la cuenta basado en userAccountControl
  const getAccountStatus = () => {
    switch (user?.userAccountControl) {
      case "512": return { text: "Cuenta Habilitada", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" };
      case "514": return { text: "Cuenta Deshabilitada", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" };
      default: return { text: "Estado Desconocido", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300" };
    }
  };

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
      case "prorroga": return "Prorroga de Tesis";
      default: return status;
    }
  };

  const getYearText = (year?: number) => {
    const years = ["1ro", "2do", "3ro", "4to", "5to", "6to"];
    return year ? years[year - 1] : "No especificado";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-gray-600 dark:text-gray-400">Cargando información del usuario...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {error ? "Error" : "Usuario no encontrado"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error || `No se pudo encontrar el usuario "${username}"`}
            </p>
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

  const accountStatus = getAccountStatus();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Volver a la lista
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {user.fullName}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {user.role} • {user.username}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(user.status)}`}>
                {getStatusText(user.status)}
              </span>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${accountStatus.color}`}>
                {accountStatus.text}
              </span>
              {has2FA && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-sm font-semibold rounded-full">
                  <ShieldCheckIcon className="h-4 w-4" />
                  2FA Activado
                </span>
              )}
              {hasActivePIN && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 text-sm font-semibold rounded-full">
                  <ShieldCheckIcon className="h-4 w-4" />
                  PIN Activado
                </span>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información Personal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <UserCircleIcon className="h-6 w-6 text-blue-600" />
                Información Personal
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Nombre Completo
                  </label>
                  <p className="text-gray-900 dark:text-white">{user.fullName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Carnet de Identidad
                  </label>
                  <p className="text-gray-900 dark:text-white">{user.identityCard}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Teléfono
                  </label>
                  <p className="text-gray-900 dark:text-white flex items-center gap-1">
                    <PhoneIcon className="h-4 w-4" />
                    {user.phone || "No especificado"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Correo
                  </label>
                  <p className="text-gray-900 dark:text-white flex items-center gap-1">
                    <EnvelopeIcon className="h-4 w-4" />
                    {user.email}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Dirección
                  </label>
                  <p className="text-gray-900 dark:text-white flex items-center gap-1">
                    <MapPinIcon className="h-4 w-4" />
                    {user.address || "No especificado"}
                    {user.town && `, ${user.town}`}
                    {user.province && `, ${user.province}`}
                    {user.country && `, ${user.country}`}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Información Académica/Laboral */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                {user.role === "Estudiante" ? (
                  <AcademicCapIcon className="h-6 w-6 text-green-600" />
                ) : (
                  <BuildingOfficeIcon className="h-6 w-6 text-purple-600" />
                )}
                {user.role === "Estudiante" ? "Información Académica" : "Información Laboral"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.role === "Estudiante" ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Carrera
                      </label>
                      <p className="text-gray-900 dark:text-white">{user.career}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Año Académico
                      </label>
                      <p className="text-gray-900 dark:text-white">{getYearText(user.year)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Facultad
                      </label>
                      <p className="text-gray-900 dark:text-white">{user.faculty}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Tipo de Estudiante
                      </label>
                      <p className="text-gray-900 dark:text-white">{user.studentType || "No especificado"}</p>
                    </div>
                    {user.academicSituation && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Situación Académica
                        </label>
                        <p className="text-gray-900 dark:text-white">{user.academicSituation}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Departamento
                      </label>
                      <p className="text-gray-900 dark:text-white">{user.department}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Cargo
                      </label>
                      <p className="text-gray-900 dark:text-white">{user.title || user.role}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Facultad
                      </label>
                      <p className="text-gray-900 dark:text-white">{user.faculty}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Oficina
                      </label>
                      <p className="text-gray-900 dark:text-white">{user.office || "No especificado"}</p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>

          {/* Columna lateral */}
          <div className="space-y-6">
            {/* Información de la Cuenta */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <IdentificationIcon className="h-6 w-6 text-indigo-600" />
                Información de la Cuenta
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Nombre de Usuario
                  </label>
                  <p className="text-gray-900 dark:text-white font-mono">{user.username}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Rol Principal
                  </label>
                  <p className="text-gray-900 dark:text-white">{user.role}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Estado de la Cuenta
                  </label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${accountStatus.color}`}>
                    {accountStatus.text}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Estado Académico/Laboral
                  </label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                    {getStatusText(user.status)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Autenticación de Dos Factores (2FA)
                  </label>
                  <div className="flex items-center gap-2">
                    {has2FA ? (
                      <>
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        <span className="text-green-700 dark:text-green-400">Activado</span>
                      </>
                    ) : (
                      <>
                        <XCircleIcon className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-500 dark:text-gray-400">Desactivado</span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    PIN de Seguridad
                  </label>
                  <div className="flex items-center gap-2">
                    {hasActivePIN ? (
                      <>
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        <span className="text-green-700 dark:text-green-400">Activado</span>
                      </>
                    ) : (
                      <>
                        <XCircleIcon className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-500 dark:text-gray-400">No activado</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Información de LDAP */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ShieldCheckIcon className="h-6 w-6 text-orange-600" />
                Información Técnica
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    User Principal Name
                  </label>
                  <p className="text-gray-900 dark:text-white text-sm font-mono break-all">
                    {user.userPrincipalName}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    sAMAccountName
                  </label>
                  <p className="text-gray-900 dark:text-white text-sm font-mono">{user.username}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Employee ID
                  </label>
                  <p className="text-gray-900 dark:text-white text-sm">{user.employeeID}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Employee Number
                  </label>
                  <p className="text-gray-900 dark:text-white text-sm">{user.employeeNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    userAccountControl
                  </label>
                  <p className="text-gray-900 dark:text-white text-sm font-mono">{user.userAccountControl}</p>
                </div>
              </div>
            </motion.div>

            {/* Descripción y Campos Adicionales */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                Información Adicional
              </h2>
              <div className="space-y-3">
                {user.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Descripción
                    </label>
                    <p className="text-gray-900 dark:text-white text-sm">{user.description}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    physicalDeliveryOfficeName
                  </label>
                  <p className="text-gray-900 dark:text-white text-sm">{user.physicalDeliveryOfficeName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    userParameters
                  </label>
                  <p className="text-gray-900 dark:text-white text-sm font-mono">{user.userParameters}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    serialNumber
                  </label>
                  <p className="text-gray-900 dark:text-white text-sm font-mono break-all">
                    {hasActivePIN ? "••••••••••" : user.serialNumber}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Actividad */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CalendarIcon className="h-6 w-6 text-blue-600" />
                Actividad
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Cuenta Creada
                  </label>
                  <p className="text-gray-900 dark:text-white text-sm">
                    {new Date(user.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Último Acceso
                  </label>
                  <p className="text-gray-900 dark:text-white text-sm">
                    {user.lastLogin 
                      ? new Date(user.lastLogin).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : "Nunca"
                    }
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}