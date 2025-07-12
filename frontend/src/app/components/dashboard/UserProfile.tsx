// src/components/dashboard/UserProfile.tsx
'use client';

import { memo } from 'react';

import { UserInfo } from '@/types';
import IconLoader from '../IconLoader';

// Componente memoizado para evitar rerenders innecesarios
const InfoItem = memo(({ icon, label, value, darkMode }: { 
  icon?: string; 
  label: string; 
  value: string; 
  darkMode: boolean;
}) => (
  <div
    role="listitem"
    className={`flex items-start gap-4 p-4 rounded-xl ${
      darkMode ? "bg-gray-700 text-gray-100" : "bg-gray-100 text-gray-800"
    }`}
    aria-label={`${label}: ${value}`}
  >
    {icon && (
      <div className={`${darkMode ? "text-uniss-gold" : "text-uniss-blue"} w-7 h-7`}>
        <IconLoader name={icon} className="w-7 h-7" />
      </div>
    )}
    <div className="flex-1">
      <p className={`text-base font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
        {label}
      </p>
      <p className={`text-lg ${darkMode ? "text-gray-100" : "text-gray-800"}`}>
        {value}
      </p>
    </div>
  </div>
));

interface UserProfileProps {
  userInfo: UserInfo;
  isDarkMode: boolean;
}

// Componente memoizado
const UserProfile = memo(({ userInfo, isDarkMode }: UserProfileProps) => {
  return (
    <section
      className={`lg:w-2/5 rounded-xl shadow-lg p-6 transition-colors ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      }`}
      aria-labelledby="user-info-heading"
    >
      <div className="flex flex-col items-center mb-6">
        <div className="relative mb-4">
          <IconLoader 
            name="UserCircleIcon" 
            className={`w-24 h-24 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`} 
          />
          <span 
            className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-white" 
            aria-label="Estado en línea"
            role="status"
          />
        </div>
        <h1
          id="user-info-heading"
          className={`text-2xl font-bold mb-2 text-center ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          {userInfo.name}
        </h1>
        <span
          className={`px-4 py-2 rounded-full text-base ${
            isDarkMode
              ? "bg-gray-700 text-green-400"
              : "bg-green-100 text-green-800"
          }`}
          aria-label="Estado de la cuenta"
        >
          {userInfo.status}
        </span>
      </div>

      <div 
        className="space-y-4" 
        role="list" 
        aria-label="Información del usuario"
      >
        <InfoItem
          icon="IdentificationIcon"
          label="Carnet de Identidad"
          value={userInfo.id}
          darkMode={isDarkMode}
        />
        <InfoItem
          icon="AcademicCapIcon"
          label="Facultad/Carrera"
          value={`${userInfo.faculty} - ${userInfo.major}`}
          darkMode={isDarkMode}
        />
        <InfoItem
          icon="ClockIcon"
          label="Año Académico"
          value={userInfo.year}
          darkMode={isDarkMode}
        />
        <InfoItem
          icon="DevicePhoneMobileIcon"
          label="Teléfono"
          value={userInfo.phone}
          darkMode={isDarkMode}
        />
        <InfoItem
          icon="UserCircleIcon"
          label="Correo Personal"
          value={userInfo.backupEmail}
          darkMode={isDarkMode}
        />
        <InfoItem
          icon="AcademicCapIcon"
          label="Correo Institucional"
          value={userInfo.universityEmail}
          darkMode={isDarkMode}
        />
        <InfoItem
          icon="ClockIcon"
          label="Último acceso"
          value={userInfo.lastLogin}
          darkMode={isDarkMode}
        />
      </div>
    </section>
  );
});

export default UserProfile;