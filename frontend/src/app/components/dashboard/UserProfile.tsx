'use client';

import { memo, useMemo } from 'react';
import { UserInfo } from '@/types';
import IconLoader from '../IconLoader';

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
  value: string;
}

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
        <p className="text-lg">
          {value}
        </p>
      </div>
    </div>
  );
});

InfoItem.displayName = 'InfoItem';

interface UserProfileProps {
  userInfo: UserInfo;
  isDarkMode: boolean;
  className: string;
}

// Componente principal memoizado
const UserProfile = memo(({ userInfo, isDarkMode }: UserProfileProps) => {
  // Precalcular todos los valores que dependen de las props
  const bgColor = isDarkMode ? "bg-gray-800" : "bg-white";
  const statusBgColor = isDarkMode ? "bg-gray-700 text-green-400" : "bg-green-100 text-green-800";
  const avatarColor = isDarkMode ? "text-gray-400" : "text-gray-600";
  const nameColor = isDarkMode ? "text-white" : "text-gray-900";
  
  // Configuración de los items de información
  const infoItems = useMemo((): InfoItemConfig[] => [
    { icon: 'identification', label: 'Carnet de Identidad', value: userInfo.id },
    { icon: 'academic', label: 'Facultad/Carrera', value: `${userInfo.faculty} - ${userInfo.major}` },
    { icon: 'clock', label: 'Año Académico', value: userInfo.year },
    { icon: 'phone', label: 'Teléfono', value: userInfo.phone },
    { icon: 'user', label: 'Correo Personal', value: userInfo.backupEmail },
    { icon: 'email', label: 'Correo Institucional', value: userInfo.universityEmail },
    { icon: 'clock', label: 'Último acceso', value: userInfo.lastLogin }
  ], [userInfo]);

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
        aria-label={`Estado: ${userInfo.status}`}
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
      className={`lg:w-2/5 rounded-xl shadow-lg p-6 transition-colors ${bgColor}`}
      aria-labelledby="user-info-heading"
    >
      {profileContent}
      {infoList}
    </section>
  );
});

UserProfile.displayName = 'UserProfile';

export default UserProfile;