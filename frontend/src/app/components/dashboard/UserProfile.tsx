'use client';

import { memo, useMemo, useState, useEffect } from 'react';
import { UserInfo } from '@/types';
import IconLoader from '../IconLoader';
 import { parsePhoneNumber } from 'libphonenumber-js';

// Mapa de iconos para reutilización
const iconMap = {
  identification: 'IdentificationIcon',
  academic: 'AcademicCapIcon',
  clock: 'ClockIcon',
  phone: 'DevicePhoneMobileIcon',
  user: 'UserCircleIcon',
  email: 'EnvelopeIcon'
} as const;

// Tipo para los items de información
interface InfoItemConfig {
  icon: keyof typeof iconMap;
  label: string;
  value: FormattedPhone | string;
}


interface FormattedPhone {
  countryCode: string;
  countryFlag: string;
  phone: string;
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
}

// Lista de códigos de país para teléfonos
const countryCodes: Record<string, string> = {
  CU: '+53',  // Cuba
  US: '+1',   // Estados Unidos
  ES: '+34',  // España
  MX: '+52',  // México
  FR: '+33',  // Francia
  CA: '+1',   // Canadá (comparte código con US)
  DE: '+49',  // Alemania
  RU: '+7',   // Rusia
  IT: '+39',  // Italia
  PE: '+51',  // Perú
  AR: '+54',  // Argentina
  HT: '+509', // Haití
};

const countryFlags: Record<string, string> = {
  CU: '🇨🇺', // Cuba
  US: '🇺🇸', // Estados Unidos
  ES: '🇪🇸', // España
  MX: '🇲🇽', // México
  FR: '🇫🇷', // Francia
  CA: '🇨🇦', // Canadá
  DE: '🇩🇪', // Alemania
  RU: '🇷🇺', // Rusia
  IT: '🇮🇹', // Italia
  PE: '🇵🇪', // Perú
  AR: '🇦🇷', // Argentina
  HT: '🇭🇹', // Haití
};


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
  
  // Buscar códigos entre paréntesis al final de la cadena
  const match = carrera.match(/\(([^)]+)\)$/);
  if (match && match[1]) {
    const code = match[1];
    const expanded = carreraCodes[code] || code;
    return carrera.replace(`(${code})`, `(${expanded})`);
  }
  
  return carrera;
};

// Función para formatear número de teléfono con código de país


const formatPhoneNumber = (phone: string): FormattedPhone | string => {
  if (!phone || phone === 'Teléfono no disponible') return 'No disponible';

  try {
    const phoneNumber = parsePhoneNumber(phone);
    if (!phoneNumber) return phone;

    const countryCode = phoneNumber.country;
    const countryFlag = countryCode ? (countryFlags[countryCode] || '🌍') : '🌍';
    
    console.log('Country code:', countryCode, 'Country flag:', countryFlag); // Para depurar

    return {
      countryCode: `+${phoneNumber.countryCallingCode}`,
      countryFlag: countryFlag,
      phone: phoneNumber.nationalNumber.toString()
    };
  } catch (e) {
    return phone;
  }
};

// Función de transformación de datos con valores por defecto
const mapBackendToFrontend = (backendData: BackendUserData): UserInfo => ({
  name: backendData.displayName || backendData.nombreCompleto || 'Nombre no disponible',
  username: backendData.sAMAccountName || 'Usuario no disponible',
  universityEmail: backendData.userPrincipalName || backendData.mail || 'Correo no disponible',
  backupEmail: backendData.email || backendData.mail || 'Correo personal no disponible',
  faculty: backendData.facultad || 'Facultad no disponible',
  major: expandCarreraCode(backendData.carrera || 'Carrera no disponible'),
  year: backendData.añoAcademico || 'Año no disponible',
  phone: backendData.telefono || 'Teléfono no disponible',
  status: backendData.titulo || (backendData.cuentaHabilitada ? 'Activo' : 'Inactivo'),
  lastLogin: backendData.ultimoInicioSesion || 'Nunca',
  id: backendData.employeeID || backendData.uid || 'ID no disponible',
});

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
  value: string | FormattedPhone; // Aceptar ambos tipos
  darkMode: boolean;
}) => {
  const bgColor = darkMode ? "bg-gray-700" : "bg-gray-100";
  const textColor = darkMode ? "text-gray-100" : "text-gray-800";
  const labelColor = darkMode ? "text-gray-300" : "text-gray-600";
  const iconColor = darkMode ? "text-uniss-gold" : "text-uniss-blue";
  
  // Función para formatear el valor basado en su tipo
  const formatValue = (val: string | FormattedPhone): React.ReactNode => {
    if (typeof val === 'string') {
      return val;
    }
    
    // Si es un objeto FormattedPhone, mostrar bandera y número
    return (
      <span className="flex items-center gap-2">
        <span className="text-2xl">{val.countryFlag}</span>
        <span>{val.countryCode} {val.phone}</span>
      </span>
    );
  };

  return (
    <div
      role="listitem"
      className={`flex items-start gap-4 p-4 rounded-xl ${bgColor} ${textColor}`}
      aria-label={`${label}: ${typeof value === 'string' ? value : `${value.countryCode} ${value.phone}`}`}
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
          {formatValue(value)}
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
  // Precalcular todos los valores que dependen de las props
  const bgColor = isDarkMode ? "bg-gray-800" : "bg-white";
  const statusBgColor = isDarkMode ? "bg-gray-700 text-green-400" : "bg-green-100 text-green-800";
  const avatarColor = isDarkMode ? "text-gray-400" : "text-gray-600";
  const nameColor = isDarkMode ? "text-white" : "text-gray-900";
  
  // Formatear el número de teléfono con código de país
  const formattedPhone = formatPhoneNumber(userInfo.phone);
  
  // Configuración de los items de información con valores por defecto
  const infoItems = useMemo((): InfoItemConfig[] => [
    { icon: 'identification', label: 'Carnet de Identidad', value: userInfo.id || 'No disponible' },
    { icon: 'academic', label: 'Facultad/Carrera', value: `${userInfo.faculty} - ${userInfo.major}` },
    { icon: 'clock', label: 'Año Académico', value: userInfo.year || 'No disponible' },
    { icon: 'phone', label: 'Teléfono', value: formattedPhone },
    { icon: 'user', label: 'Correo Personal', value: userInfo.backupEmail || 'No disponible' },
    { icon: 'email', label: 'Correo Institucional', value: userInfo.universityEmail || 'No disponible' },
    { icon: 'user', label: 'Nombre de Usuario', value: userInfo.username || 'No disponible' },
    { icon: 'clock', label: 'Último acceso', value: userInfo.lastLogin || 'Nunca' }
  ], [userInfo, formattedPhone]);

  // Memoizar el contenido del perfil de usuario
  const profileContent = useMemo(() => (
    <div className="flex flex-col items-center mb-6">
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
      <h1
        id="user-info-heading"
        className={`text-2xl font-bold mb-2 text-center ${nameColor}`}
        aria-label={`Usuario: ${userInfo.name}`}
      >
        {userInfo.name}
      </h1>
      <span
        className={`px-4 py-2 rounded-full text-base ${statusBgColor}`}
        aria-label={`Título: ${userInfo.status}`}
      >
        {userInfo.status}
      </span>
    </div>
  ), [userInfo.name, userInfo.status, avatarColor, nameColor, statusBgColor]);

  // Memoizar la lista de información
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