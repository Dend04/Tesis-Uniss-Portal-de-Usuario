'use client';
import { memo, useMemo, useState, useEffect, useCallback } from 'react';
import { UserInfo } from '@/types';
import IconLoader from '../IconLoader';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import EmployeeIDModal from '../modals/EmployeeIDModal';
import EmailForm from '../config/EmailForm';

// Mapa de iconos para reutilización
const iconMap = {
  identification: 'IdentificationIcon',
  academic: 'AcademicCapIcon',
  clock: 'ClockIcon',
  user: 'UserCircleIcon',
  email: 'EnvelopeIcon',
  refresh: 'ArrowPathIcon'
} as const;

// ✅ CORRECCIÓN: Agregar la propiedad 'missing' a InfoItemConfig
interface InfoItemConfig {
  icon: keyof typeof iconMap;
  label: string;
  value: string;
  missing?: boolean; // ✅ AGREGAR ESTA LÍNEA
}

interface BackendUserData {
  nombreCompleto?: string;
  displayName?: string;
  sAMAccountName: string;
  mail: string;
  email?: string;
  facultad?: string;
  carrera?: string;
  añoAcademico?: string;
  telefono?: string;
  cuentaHabilitada: boolean;
  ultimoInicioSesion: string;
  employeeID?: string;
  uid?: string;
  titulo?: string;
  userPrincipalName?: string;
  isEmployee?: boolean;
  company?: string;
  title?: string;
}

// Mapeo de códigos de carrera a descripciones completas
const carreraCodes: Record<string, string> = {
  'CD': 'Curso Diurno',
  'CCD': 'Ciclo Corto Diurno',
  'CCPE': 'Ciclo Corto por Encuentro',
  'CE': 'Continuidad de Estudios',
  'D': 'Desconocido',
  'ED': 'Enseñanza a Distancia',
  'Vn': 'Vespertino Nocturno'
};

// Función de transformación de datos con valores por defecto
const mapBackendToFrontend = (backendData: BackendUserData): UserInfo => ({
  name: backendData.displayName || backendData.nombreCompleto || 'Nombre no disponible',
  username: backendData.sAMAccountName || 'Usuario no disponible',
  universityEmail: backendData.userPrincipalName || backendData.mail || 'Correo no disponible',
  backupEmail: backendData.company || 'Correo personal no disponible',
  faculty: backendData.facultad || 'Facultad no disponible',
  major: backendData.carrera || 'Carrera no disponible',
  year: backendData.añoAcademico || 'Año no disponible',
  phone: backendData.telefono || 'Teléfono no disponible',
  status: backendData.title || backendData.titulo || (backendData.cuentaHabilitada ? 'Activo' : 'Inactivo'),
  lastLogin: backendData.ultimoInicioSesion || 'Nunca',
  id: backendData.employeeID || backendData.uid || 'ID no disponible',
  isEmployee: backendData.isEmployee || false
});

// Constantes para el sistema de cache
const DUAL_VERIFICATION_CACHE_KEY = 'dualVerificationCache';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas

interface DualVerificationCache {
  data: {
    isAlsoEmployee: boolean;
    usedSigenu: boolean;
    isGraduated: boolean;
    studentStatus: string;
    hasDualOccupation: boolean;
  };
  timestamp: number;
}

// Función para obtener cache de verificación dual
const getDualVerificationCache = (): DualVerificationCache | null => {
  try {
    const cached = localStorage.getItem(DUAL_VERIFICATION_CACHE_KEY);
    if (!cached) return null;

    const cache: DualVerificationCache = JSON.parse(cached);
    const now = Date.now();
    
    // Verificar si el cache está expirado
    if (now - cache.timestamp > CACHE_DURATION_MS) {
      localStorage.removeItem(DUAL_VERIFICATION_CACHE_KEY);
      return null;
    }
    
    return cache;
  } catch (error) {
    console.error('Error al leer cache de verificación dual:', error);
    return null;
  }
};

// Función para guardar cache de verificación dual
const setDualVerificationCache = (data: DualVerificationCache['data']): void => {
  try {
    const cache: DualVerificationCache = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(DUAL_VERIFICATION_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error al guardar cache de verificación dual:', error);
  }
};

// Hook personalizado para verificar el estado dual (estudiante/trabajador)
const useDualVerification = () => {
  const [isAlsoEmployee, setIsAlsoEmployee] = useState<boolean>(false);
  const [loadingDual, setLoadingDual] = useState<boolean>(false);
  const [usedSigenu, setUsedSigenu] = useState<boolean>(false);
  const [isGraduated, setIsGraduated] = useState<boolean>(false);
  const [studentStatus, setStudentStatus] = useState<string>('');
  const [hasDualOccupation, setHasDualOccupation] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const resetVerification = useCallback(() => {
    // Limpiar cache
    localStorage.removeItem(DUAL_VERIFICATION_CACHE_KEY);
    localStorage.removeItem('dobleOcupacion');
    
    // Forzar nueva verificación
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    const verifyDualStatus = async () => {
      // ✅ VERIFICAR SI HAY DOBLE OCUPACIÓN EN LOCALSTORAGE
      const existingDobleOcupacion = localStorage.getItem('dobleOcupacion');
      if (existingDobleOcupacion === 'true' && refreshTrigger === 0) {
        setHasDualOccupation(true);
        return;
      }

      // ✅ VERIFICAR CACHE DE VERIFICACIÓN DUAL (solo si no hay refresh)
      const cachedData = getDualVerificationCache();
      if (cachedData && refreshTrigger === 0) {
        const { data } = cachedData;
        setIsAlsoEmployee(data.isAlsoEmployee);
        setUsedSigenu(data.usedSigenu);
        setIsGraduated(data.isGraduated);
        setStudentStatus(data.studentStatus);
        setHasDualOccupation(data.hasDualOccupation);
        updateDobleOcupacionStorage(data.hasDualOccupation, data.isGraduated, data.studentStatus);
        return;
      }

      // ✅ HACER LA PETICIÓN AL SERVIDOR
      setLoadingDual(true);
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          console.warn('No hay token de autenticación');
          return;
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/verify/dual-status`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const employeeStatus = data.isAlsoEmployee || false;
          const sigenuUsed = data.usedSigenu || false;
          const graduatedStatus = data.isGraduated || false;
          const status = data.studentStatus || '';
          const dualOccupation = data.hasDualOccupation || false;
          
          setIsAlsoEmployee(employeeStatus);
          setUsedSigenu(sigenuUsed);
          setIsGraduated(graduatedStatus);
          setStudentStatus(status);
          setHasDualOccupation(dualOccupation);
          
          // ✅ GUARDAR EN CACHE PARA PRÓXIMAS VECES
          setDualVerificationCache({
            isAlsoEmployee: employeeStatus,
            usedSigenu: sigenuUsed,
            isGraduated: graduatedStatus,
            studentStatus: status,
            hasDualOccupation: dualOccupation
          });

          // ✅ ACTUALIZAR LOCALSTORAGE SEGÚN LÓGICA
          updateDobleOcupacionStorage(dualOccupation, graduatedStatus, status);

        } else {
          throw new Error('Error en la respuesta del servidor');
        }
      } catch (error) {
        console.error('Error verificando estado dual:', error);
        // En caso de error, establecer valores por defecto
        setIsAlsoEmployee(false);
        setUsedSigenu(false);
        setIsGraduated(false);
        setStudentStatus('');
        setHasDualOccupation(false);
        localStorage.removeItem('dobleOcupacion');
      } finally {
        setLoadingDual(false);
      }
    };

    // Función auxiliar para actualizar localStorage de dobleOcupacion
    const updateDobleOcupacionStorage = (dualOccupation: boolean, graduated: boolean, status: string) => {
      const statusLower = status.toLowerCase();
      const isBaja = statusLower.includes('baja');
      
      if (dualOccupation && !graduated && !isBaja) {
        localStorage.setItem('dobleOcupacion', 'true');
      } else {
        localStorage.removeItem('dobleOcupacion');
      }
    };

    verifyDualStatus();
  }, [refreshTrigger]);

  return { 
    isAlsoEmployee, 
    loadingDual, 
    usedSigenu, 
    isGraduated, 
    studentStatus, 
    hasDualOccupation,
    resetVerification 
  };
};

// Hook personalizado para obtener el perfil del usuario
const useUserProfile = () => {
  const [userData, setUserData] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          throw new Error('No se encontró token de autenticación');
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/users/profile`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            /* localStorage.removeItem('authToken'); */
            localStorage.removeItem('trabajador');
            throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
          }
          throw new Error(`Error en la petición: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success && data.user) {
          setUserData(mapBackendToFrontend(data.user));
        } else {
          throw new Error('Formato de respuesta inválido');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return { userData, loading, error };
};

// Componente memoizado optimizado
const InfoItem = memo(({ icon, label, value, darkMode, missing = false }: { 
  icon?: keyof typeof iconMap; 
  label: string; 
  value: string;
  darkMode: boolean;
  missing?: boolean;
}) => {
  const bgColor = darkMode ? "bg-gray-700" : "bg-gray-100";
  const textColor = darkMode ? "text-gray-100" : "text-gray-800";
  const labelColor = darkMode ? "text-gray-300" : "text-gray-600";
  const iconColor = darkMode ? "text-uniss-gold" : "text-uniss-blue";
  const missingColor = "text-yellow-600 dark:text-yellow-400";

  return (
    <div
      role="listitem"
      className={`flex items-start gap-4 p-4 rounded-xl ${bgColor} ${textColor} transition-all duration-200 hover:shadow-md relative ${
        missing ? 'ring-2 ring-yellow-500' : ''
      }`}
      aria-label={`${label}: ${value}`}
    >
      {icon && (
        <div className={`${iconColor} flex-shrink-0 mt-1`}>
          <IconLoader name={iconMap[icon]} className="w-6 h-6" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className={`text-sm font-semibold ${labelColor}`}>
            {label}
          </p>
          {missing && (
            <span className={`text-xs ${missingColor} font-medium flex items-center gap-1`}>
              <ExclamationTriangleIcon className="w-3 h-3" />
              Pendiente
            </span>
          )}
        </div>
        <div className={`text-base font-medium break-words ${missing ? missingColor : ''}`}>
          {value}
          {missing && (
            <button
              onClick={() => {
                if (label.includes('Carnet') || label.includes('Identificación')) {
                  // Esto se manejará en el componente padre
                } else if (label.includes('Correo Personal')) {
                  // Esto se manejará en el componente padre
                }
              }}
              className="ml-2 text-sm text-blue-500 hover:text-blue-600 underline"
            >
              Completar
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

InfoItem.displayName = 'InfoItem';

interface UserProfileProps {
  userInfo: UserInfo;
  isDarkMode: boolean;
  className?: string;
}

// Componente principal memoizado
const UserProfile = memo(({ userInfo, isDarkMode, className = '' }: UserProfileProps) => {
  // ✅ OBTENER TODOS LOS ESTADOS DEL HOOK OPTIMIZADO
  const { 
    isAlsoEmployee, 
    loadingDual, 
    usedSigenu, 
    isGraduated, 
    studentStatus, 
    hasDualOccupation,
    resetVerification 
  } = useDualVerification();

  // ✅ ESTADOS PARA MODALES
  const [showEmployeeIDModal, setShowEmployeeIDModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [needsEmployeeID, setNeedsEmployeeID] = useState(false);
  const [needsEmail, setNeedsEmail] = useState(false);

  // ✅ DETECTAR CAMPOS FALTANTES
  useEffect(() => {
    const checkMissingFields = () => {
      const employeeIDMissing = !userInfo.id || 
                               userInfo.id === 'ID no disponible' || 
                               userInfo.id === '';
      
      const emailMissing = !userInfo.backupEmail || 
                          userInfo.backupEmail === 'Correo personal no disponible' || 
                          userInfo.backupEmail === '';

      setNeedsEmployeeID(employeeIDMissing);
      setNeedsEmail(emailMissing);

      // Mostrar modales automáticamente si faltan campos
      if (employeeIDMissing) {
        setTimeout(() => setShowEmployeeIDModal(true), 1000);
      } else if (emailMissing) {
        setTimeout(() => setShowEmailModal(true), 1500);
      }
    };

    if (userInfo) {
      checkMissingFields();
    }
  }, [userInfo]);

  // ✅ MANEJAR ÉXITO DE EMPLOYEE ID
  const handleEmployeeIDSuccess = useCallback((employeeID: string) => {
    setShowEmployeeIDModal(false);
    setNeedsEmployeeID(false);
    
    // Recargar la página para actualizar los datos
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }, []);

  // ✅ MANEJAR ÉXITO DE EMAIL
  const handleEmailSuccess = useCallback((newEmail: string) => {
    setShowEmailModal(false);
    setNeedsEmail(false);
    
    // Actualizar el userInfo localmente
    // Nota: userInfo es inmutable, así que en realidad necesitaríamos
    // actualizar el estado del componente padre o recargar los datos
    window.location.reload();
  }, []);

  const bgColor = isDarkMode ? "bg-gray-800" : "bg-white";
  const statusBgColor = isDarkMode ? "bg-gray-700 text-green-400" : "bg-green-100 text-green-800";
  const avatarColor = isDarkMode ? "text-gray-400" : "text-gray-600";
  const nameColor = isDarkMode ? "text-white" : "text-gray-900";
  const buttonBgColor = isDarkMode 
    ? "bg-gray-700 hover:bg-gray-600 text-gray-200" 
    : "bg-gray-200 hover:bg-gray-300 text-gray-700";
  
  // ✅ NUEVA LÓGICA MEJORADA PARA DETERMINAR EL ESTADO
  const getStatusText = (): string => {
    const userTitle = userInfo.status?.toLowerCase() || '';
    
    // Caso 1: Si es egresado, mostrar "Egresado" (prioridad máxima)
    if (isGraduated) {
      return userTitle.charAt(0).toUpperCase() + userTitle.slice(1);
    }
    
    // Caso 2: Si el título es "estudiante"
    if (userTitle === 'estudiante') {
        // Si tiene doble ocupación → "Alumno/Ayudante"
        if (hasDualOccupation) {
            return 'Alumno/Ayudante';
        }
        // Solo estudiante → "Estudiante"
        return 'Estudiante';
    }
    
    // Caso 3: Si NO es estudiante (Docente, Investigador, Trabajador)
    // Y tiene doble ocupación (también es estudiante)
    if (hasDualOccupation) {
        return `${userInfo.status} - Estudiante`;
    }
    
    // Caso 4: Mostrar el título original (Docente, Investigador, etc.)
    return userInfo.status || 'Usuario';
  };

  // ✅ MOSTRAR BADGE SI FALTAN CAMPOS
  const MissingFieldsBadge = () => {
    if (!needsEmployeeID && !needsEmail) return null;

    return (
      <div className="absolute top-4 right-4">
        <div className="flex items-center gap-1 px-3 py-1 bg-yellow-500 text-white text-xs font-medium rounded-full animate-pulse">
          <ExclamationTriangleIcon className="w-3 h-3" />
          {needsEmployeeID && needsEmail ? 'Completar perfil' : 'Campo pendiente'}
        </div>
      </div>
    );
  };

  const getWorkerInfoItems = (): InfoItemConfig[] => [
    { 
      icon: 'identification', 
      label: 'Identificación', 
      value: userInfo.id || 'No disponible',
      missing: needsEmployeeID 
    },
    { icon: 'user', label: 'Nombre de Usuario', value: userInfo.username || 'No disponible' },
    { icon: 'email', label: 'Correo Institucional', value: userInfo.universityEmail || 'No disponible' },
    { 
      icon: 'user', 
      label: 'Correo Personal', 
      value: userInfo.backupEmail || 'No disponible',
      missing: needsEmail 
    },
    { icon: 'clock', label: 'Último acceso', value: userInfo.lastLogin || 'Nunca' }
  ];

  const getStudentInfoItems = (): InfoItemConfig[] => [
    { 
      icon: 'identification', 
      label: 'Carnet de Identidad', 
      value: userInfo.id || 'No disponible',
      missing: needsEmployeeID 
    },
    { 
      icon: 'user', 
      label: 'Correo Personal', 
      value: userInfo.backupEmail || 'No disponible',
      missing: needsEmail 
    },
    { icon: 'email', label: 'Correo Institucional', value: userInfo.universityEmail || 'No disponible' },
    { icon: 'user', label: 'Nombre de Usuario', value: userInfo.username || 'No disponible' },
    { icon: 'clock', label: 'Último acceso', value: userInfo.lastLogin || 'Nunca' }
  ];

  const infoItems = useMemo((): InfoItemConfig[] => {
    return userInfo.isEmployee ? getWorkerInfoItems() : getStudentInfoItems();
  }, [userInfo, needsEmployeeID, needsEmail]);

  // ✅ INFOITEM MEJORADO CON MANEJADORES DE CLICK
  const EnhancedInfoItem = memo(({ item, index }: { 
    item: InfoItemConfig; 
    index: number;
  }) => {
    const handleClick = () => {
      if (item.missing) {
        if (item.label.includes('Carnet') || item.label.includes('Identificación')) {
          setShowEmployeeIDModal(true);
        } else if (item.label.includes('Correo Personal')) {
          setShowEmailModal(true);
        }
      }
    };

    return (
      <InfoItem
        key={`${item.label}-${index}`}
        icon={item.icon}
        label={item.label}
        value={item.value}
        darkMode={isDarkMode}
        missing={item.missing}
      />
    );
  });

  EnhancedInfoItem.displayName = 'EnhancedInfoItem';

  const infoList = useMemo(() => (
    <div className="space-y-4" role="list" aria-label="Información del usuario">
      {infoItems.map((item, index) => (
        <div 
          key={`${item.label}-${index}`}
          onClick={() => {
            if (item.missing) {
              if (item.label.includes('Carnet') || item.label.includes('Identificación')) {
                setShowEmployeeIDModal(true);
              } else if (item.label.includes('Correo Personal')) {
                setShowEmailModal(true);
              }
            }
          }}
          className={item.missing ? 'cursor-pointer' : ''}
        >
          <InfoItem
            icon={item.icon}
            label={item.label}
            value={item.value}
            darkMode={isDarkMode}
            missing={item.missing}
          />
        </div>
      ))}
    </div>
  ), [infoItems, isDarkMode]);

  // ✅ CONTENIDO DEL PERFIL CON AVATAR COMPLETO
  const profileContent = useMemo(() => (
    <div className="flex flex-col items-center mb-6">
      {/* 🔥 AVATAR CON ICONO Y ESTADO EN LÍNEA */}
      <div className="relative mb-4">
        <IconLoader 
          name="UserCircleIcon" 
          className={`w-24 h-24 ${avatarColor} transition-colors duration-200`} 
        />
        <span 
          className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-sm" 
          aria-label="Estado en línea"
          role="status"
        />
      </div>
      
      {/* NOMBRE DEL USUARIO */}
      <h1
        id="user-info-heading"
        className={`text-2xl font-bold mb-3 text-center ${nameColor} transition-colors duration-200`}
        aria-label={`Usuario: ${userInfo.name}`}
      >
        {userInfo.name}
      </h1>
      
      {/* ESTADO Y INFORMACIÓN ADICIONAL */}
      <div className="flex flex-col items-center gap-3 w-full">
        <div className="flex items-center gap-3">
          <span
            className={`px-4 py-2 rounded-full text-base font-medium ${statusBgColor} transition-colors duration-200`}
            aria-label={`Estado: ${getStatusText()}`}
          >
            {getStatusText()}
          </span>
          
          {/* BOTÓN DE RESET */}
          <button
            onClick={resetVerification}
            disabled={loadingDual}
            className={`p-2 rounded-full transition-all duration-200 ${buttonBgColor} ${
              loadingDual ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'
            }`}
            aria-label="Actualizar verificación de estado"
            title="Actualizar verificación de estado"
          >
            <IconLoader 
              name="ArrowPathIcon" 
              className={`w-5 h-5 ${loadingDual ? 'animate-spin' : ''}`} 
            />
          </button>
        </div>
            
        {/* ✅ Mostrar información de SIGENU */}
        {usedSigenu && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-medium text-blue-500 flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Graduado de la Universidad
            </span>
            {studentStatus && (
              <span className={`text-xs ${isGraduated ? 'text-orange-500' : 'text-green-500'} font-medium`}>
                Estado académico: {studentStatus}
              </span>
            )}
          </div>
        )}
            
        {/* ✅ Mostrar información de doble ocupación SOLO si no es egresado */}
        {hasDualOccupation && !isGraduated && (
          <span className="text-sm font-medium text-purple-500 flex items-center gap-1">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            Doble ocupación verificada
          </span>
        )}
            
        {/* ✅ Indicador especial para egresados */}
        {isGraduated && (
          <span className="text-sm font-medium text-orange-500 flex items-center gap-1">
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
            Graduado
          </span>
        )}
            
        {loadingDual && (
          <span className="text-sm text-gray-500 animate-pulse flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
            Verificando estado administrativo...
          </span>
        )}
      </div>
    </div>
  ), [
    userInfo.name, userInfo.status, 
    isAlsoEmployee, loadingDual, usedSigenu, isGraduated, 
    studentStatus, hasDualOccupation, avatarColor, nameColor, 
    statusBgColor, buttonBgColor, resetVerification, getStatusText
  ]);

  return (
    <>
      <section
        className={`lg:w-2/5 rounded-xl shadow-lg p-6 transition-colors ${bgColor} ${className} relative`}
        aria-labelledby="user-info-heading"
      >
        <MissingFieldsBadge />
        {profileContent}
        {infoList}
      </section>

      {/* ✅ MODAL PARA EMPLOYEE ID */}
      <EmployeeIDModal
        isOpen={showEmployeeIDModal}
        onClose={() => setShowEmployeeIDModal(false)}
        onSuccess={handleEmployeeIDSuccess}
        isDarkMode={isDarkMode}
      />

      {/* ✅ MODAL PARA EMAIL */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-xl w-full max-w-2xl ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          }`}>
            <div className="p-6">
              <EmailForm
                isDarkMode={isDarkMode}
                currentEmail={userInfo.backupEmail || ''}
                onCancel={() => setShowEmailModal(false)}
                onSuccess={handleEmailSuccess}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
});

UserProfile.displayName = 'UserProfile';

// Componente contenedor que maneja la obtención de datos
const UserProfileContainer = ({ isDarkMode }: { isDarkMode: boolean }) => {
  const { userData, loading, error } = useUserProfile();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-xl p-6 ${
        isDarkMode ? 'bg-red-900/30 text-red-200 border border-red-800' : 'bg-red-50 text-red-700 border border-red-200'
      }`}>
        <strong className="font-semibold">Error:</strong> {error}
      </div>
    );
  }

  if (!userData) {
    return (
      <div className={`rounded-xl p-6 ${
        isDarkMode ? 'bg-yellow-900/30 text-yellow-200 border border-yellow-800' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
      }`}>
        No se encontraron datos de usuario.
      </div>
    );
  }

  return <UserProfile userInfo={userData} isDarkMode={isDarkMode} />;
};

export default UserProfileContainer;