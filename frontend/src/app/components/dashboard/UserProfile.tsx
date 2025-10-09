'use client';
import { memo, useMemo, useState, useEffect } from 'react';
import { UserInfo } from '@/types';
import IconLoader from '../IconLoader';

// Mapa de iconos para reutilización
const iconMap = {
  identification: 'IdentificationIcon',
  academic: 'AcademicCapIcon',
  clock: 'ClockIcon',
  user: 'UserCircleIcon',
  email: 'EnvelopeIcon'
} as const;

// Tipo para los items de información
interface InfoItemConfig {
  icon: keyof typeof iconMap;
  label: string;
  value: string;
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

// Función para expandir códigos de carrera
const expandCarreraCode = (carrera: string): string => {
  if (!carrera) return 'No disponible';
  
  const match = carrera.match(/\(([^)]+)\)$/);
  if (match && match[1]) {
    const code = match[1];
    const expanded = carreraCodes[code] || code;
    return carrera.replace(`(${code})`, `(${expanded})`);
  }
  
  return carrera;
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

// Hook personalizado para verificar el estado dual (estudiante/trabajador)
const useDualVerification = () => {
  const [isAlsoEmployee, setIsAlsoEmployee] = useState<boolean>(false);
  const [loadingDual, setLoadingDual] = useState<boolean>(false);
  const [usedSigenu, setUsedSigenu] = useState<boolean>(false);
  const [isGraduated, setIsGraduated] = useState<boolean>(false);
  const [studentStatus, setStudentStatus] = useState<string>('');
  const [hasDualOccupation, setHasDualOccupation] = useState<boolean>(false);

  useEffect(() => {
    const verifyDualStatus = async () => {
        setLoadingDual(true);
        try {
            const token = localStorage.getItem('authToken');
            if (!token) return;

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
                
                // ✅ LÓGICA CORREGIDA PARA localStorage
                const statusLower = status.toLowerCase();
                const isBaja = statusLower.includes('baja');
                
                // SOLO guardar dobleOcupacion si:
                // 1. Tiene doble ocupación
                // 2. NO es egresado
                // 3. NO está de baja
                if (dualOccupation && !graduatedStatus && !isBaja) {
                    localStorage.setItem('dobleOcupacion', 'true');
                    console.log('🔄 Guardado en localStorage: dobleOcupacion = true');
                } else {
                    localStorage.removeItem('dobleOcupacion');
                    console.log('🔄 Removido de localStorage: dobleOcupacion - Razón:', {
                        dobleOcupacion: dualOccupation,
                        esEgresado: graduatedStatus,
                        esBaja: isBaja
                    });
                }

                console.log(`✅ Verificación dual completada:`, {
                    esEmpleado: employeeStatus,
                    usoSigenu: sigenuUsed,
                    esEgresado: graduatedStatus,
                    estadoEstudiante: status,
                    dobleOcupacion: dualOccupation,
                    tituloUsuario: data.userTitle
                });
            } else {
                throw new Error('Error en la respuesta del servidor');
            }
        } catch (error) {
            console.error('Error verificando estado dual:', error);
            setIsAlsoEmployee(false);
            setUsedSigenu(false);
            setIsGraduated(false);
            setStudentStatus('');
            setHasDualOccupation(false);
            localStorage.removeItem('dobleOcupacion');
            localStorage.removeItem('trabajador');
        } finally {
            setLoadingDual(false);
        }
    };

    verifyDualStatus();
}, []);
  

  return { isAlsoEmployee, loadingDual, usedSigenu, isGraduated, studentStatus, hasDualOccupation };
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
            localStorage.removeItem('authToken');
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
const InfoItem = memo(({ icon, label, value, darkMode }: { 
  icon?: keyof typeof iconMap; 
  label: string; 
  value: string;
  darkMode: boolean;
}) => {
  const bgColor = darkMode ? "bg-gray-700" : "bg-gray-100";
  const textColor = darkMode ? "text-gray-100" : "text-gray-800";
  const labelColor = darkMode ? "text-gray-300" : "text-gray-600";
  const iconColor = darkMode ? "text-uniss-gold" : "text-uniss-blue";

  return (
    <div
      role="listitem"
      className={`flex items-start gap-4 p-4 rounded-xl ${bgColor} ${textColor}`}
      aria-label={`${label}: ${value}`}
    >
      {icon && (
        <div className={iconColor}>
          <IconLoader name={iconMap[icon]} className="w-7 h-7" />
        </div>
      )}
      <div className="flex-1">
        <p className={`text-base font-medium ${labelColor}`}>
          {label}
        </p>
        <div className="text-lg">
          {value}
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
  // ✅ OBTENER TODOS LOS ESTADOS DEL HOOK
  const { isAlsoEmployee, loadingDual, usedSigenu, isGraduated, studentStatus, hasDualOccupation  } = useDualVerification();

  const bgColor = isDarkMode ? "bg-gray-800" : "bg-white";
  const statusBgColor = isDarkMode ? "bg-gray-700 text-green-400" : "bg-green-100 text-green-800";
  const avatarColor = isDarkMode ? "text-gray-400" : "text-gray-600";
  const nameColor = isDarkMode ? "text-white" : "text-gray-900";
  
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

  const getWorkerInfoItems = (): InfoItemConfig[] => [
    { icon: 'identification', label: 'Identificación', value: userInfo.id || 'No disponible' },
    { icon: 'user', label: 'Nombre de Usuario', value: userInfo.username || 'No disponible' },
    { icon: 'email', label: 'Correo Institucional', value: userInfo.universityEmail || 'No disponible' },
    { icon: 'user', label: 'Correo Personal', value: userInfo.backupEmail || 'No disponible' },
    { icon: 'clock', label: 'Último acceso', value: userInfo.lastLogin || 'Nunca' }
  ];

  const getStudentInfoItems = (): InfoItemConfig[] => [
    { icon: 'identification', label: 'Carnet de Identidad', value: userInfo.id || 'No disponible' },
    { icon: 'user', label: 'Correo Personal', value: userInfo.backupEmail || 'No disponible' },
    { icon: 'email', label: 'Correo Institucional', value: userInfo.universityEmail || 'No disponible' },
    { icon: 'user', label: 'Nombre de Usuario', value: userInfo.username || 'No disponible' },
    { icon: 'clock', label: 'Último acceso', value: userInfo.lastLogin || 'Nunca' }
  ];

  const infoItems = useMemo((): InfoItemConfig[] => {
    return userInfo.isEmployee ? getWorkerInfoItems() : getStudentInfoItems();
  }, [userInfo]);

  // ✅ CONTENIDO DEL PERFIL CON AVATAR COMPLETO
  const profileContent = useMemo(() => (
    <div className="flex flex-col items-center mb-6">
      {/* 🔥 AVATAR CON ICONO Y ESTADO EN LÍNEA */}
      <div className="relative mb-4">
        <IconLoader 
          name="UserCircleIcon" 
          className={`w-24 h-24 ${avatarColor}`} 
        />
        <span 
          className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-white" 
          aria-label="Estado en línea"
          role="status"
        />
      </div>
      
      {/* NOMBRE DEL USUARIO */}
      <h1
        id="user-info-heading"
        className={`text-2xl font-bold mb-2 text-center ${nameColor}`}
        aria-label={`Usuario: ${userInfo.name}`}
      >
        {userInfo.name}
      </h1>
      
      {/* ESTADO Y INFORMACIÓN ADICIONAL */}
      <div className="flex flex-col items-center gap-2">
            <span
                className={`px-4 py-2 rounded-full text-base ${statusBgColor}`}
                aria-label={`Estado: ${getStatusText()}`}
            >
                {getStatusText()}
            </span>
            
            {/* ✅ Mostrar información de SIGENU */}
            {usedSigenu && (
                <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-blue-500">
                        ✓ Datos verificados en SIGENU
                    </span>
                    {studentStatus && (
                        <span className={`text-xs ${isGraduated ? 'text-orange-500' : 'text-green-500'}`}>
                            Estado académico: {studentStatus}
                        </span>
                    )}
                </div>
            )}
            
            {/* ✅ Mostrar información de doble ocupación SOLO si no es egresado */}
            {hasDualOccupation && !isGraduated && (
                <span className="text-xs text-purple-500">
                    ⚡ Doble ocupación verificada
                </span>
            )}
            
            {/* ✅ Indicador especial para egresados */}
            {isGraduated && (
                <span className="text-xs text-orange-500">
                    🎓 Graduado
                </span>
            )}
            
            {loadingDual && (
                <span className="text-xs text-gray-500 animate-pulse">
                    Verificando estado administrativo...
                </span>
            )}
        </div>
    </div>
), [
    userInfo.name, userInfo.status, userInfo.isEmployee, 
    isAlsoEmployee, loadingDual, usedSigenu, isGraduated, 
    studentStatus, hasDualOccupation, avatarColor, nameColor, statusBgColor
]);

  const infoList = useMemo(() => (
    <div className="space-y-4" role="list" aria-label="Información del usuario">
      {infoItems.map((item, index) => (
        <InfoItem
          key={`${item.label}-${index}`}
          icon={item.icon}
          label={item.label}
          value={item.value}
          darkMode={isDarkMode}
        />
      ))}
    </div>
  ), [infoItems, isDarkMode]);

  return (
    <section
      className={`lg:w-2/5 rounded-xl shadow-lg p-6 transition-colors ${bgColor} ${className}`}
      aria-labelledby="user-info-heading"
    >
      {profileContent}
      {infoList}
    </section>
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
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
        No se encontraron datos de usuario.
      </div>
    );
  }

  return <UserProfile userInfo={userData} isDarkMode={isDarkMode} />;
};

export default UserProfileContainer;