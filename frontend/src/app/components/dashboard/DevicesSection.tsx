'use client';

import { memo, useMemo } from 'react';
import { Device } from "@/types";
import IconLoader from "../IconLoader";

interface DevicesSectionProps {
  isDarkMode: boolean;
  devices: Device[];
  onAddDeviceClick: () => void;
}

// Mapa de iconos por tipo de dispositivo
const deviceIcons = {
  phone: 'DevicePhoneMobileIcon',
  laptop: 'ComputerDesktopIcon',
  tablet: 'DeviceTabletIcon',
  pc: 'ComputerDesktopIcon'
} as const;

// Componente memoizado para dispositivos con mejoras de rendimiento
const DeviceItem = memo(({ device, isDarkMode }: { 
  device: Device;
  isDarkMode: boolean;
}) => {
  const iconName = deviceIcons[device.type] || 'QuestionMarkCircleIcon';
  const textColor = isDarkMode ? "text-gray-100" : "text-gray-800";
  const secondaryTextColor = isDarkMode ? "text-gray-400" : "text-gray-500";
  const borderColor = isDarkMode ? "border-gray-700 hover:bg-gray-700" : "border-gray-200 hover:bg-gray-50";
  
  return (
    <div
      className={`p-4 border-2 rounded-xl flex items-center justify-between transition-colors ${borderColor}`}
      role="listitem"
      aria-label={`Dispositivo: ${device.model}, MAC: ${device.mac}`}
    >
      <div className="flex items-center gap-4">
        <IconLoader 
          name={iconName} 
          className={`w-10 h-10 ${isDarkMode ? "text-white" : "text-uniss-black"}`} 
        />
        <div>
          <p className={`text-xl font-medium ${textColor}`}>
            {device.model}
          </p>
          <p className={`text-base ${secondaryTextColor}`}>
            {device.mac}
          </p>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          className="text-uniss-blue hover:text-opacity-80"
          title="Editar dispositivo"
          aria-label={`Editar dispositivo ${device.model}`}
        >
          <IconLoader name="PencilSquareIcon" className="w-7 h-7" />
        </button>
        <button
          className="text-red-500 hover:text-opacity-80"
          title="Eliminar dispositivo"
          aria-label={`Eliminar dispositivo ${device.model}`}
        >
          <IconLoader name="TrashIcon" className="w-7 h-7" />
        </button>
        <button
          className="text-gray-600 hover:text-opacity-80 dark:text-gray-400"
          title="Ver detalles"
          aria-label={`Ver detalles de ${device.model}`}
        >
          <IconLoader name="EyeIcon" className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
});

DeviceItem.displayName = 'DeviceItem';

// Componente para el estado vacío (sin dispositivos)
const EmptyState = memo(({ isDarkMode, onAddDeviceClick }: { 
  isDarkMode: boolean; 
  onAddDeviceClick: () => void;
}) => (
  <div className="flex flex-col items-center justify-center h-64 gap-6">
    <p className={`text-xl ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
      No hay dispositivos vinculados
    </p>
    <button
      onClick={onAddDeviceClick}
      className={`px-8 py-4 rounded-xl flex items-center gap-3 
        ${isDarkMode ? "bg-uniss-gold text-gray-900" : "bg-uniss-blue text-white"} 
        hover:opacity-90 transition-opacity text-lg`}
      aria-label="Agregar primer dispositivo"
    >
      <IconLoader name="PlusIcon" className="w-8 h-8" />
      <span>Agregar primer dispositivo</span>
    </button>
  </div>
));

EmptyState.displayName = 'EmptyState';

// Componente para el encabezado de la sección
const SectionHeader = memo(({ 
  isDarkMode, 
  deviceCount, 
  onAddDeviceClick 
}: { 
  isDarkMode: boolean; 
  deviceCount: number; 
  onAddDeviceClick: () => void;
}) => (
  <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
    <h2
      id="devices-heading"
      className={`text-2xl font-bold flex items-center gap-2 ${
        isDarkMode ? "text-uniss-gold" : "text-uniss-black"
      }`}
    >
      Dispositivos vinculados
      <span className="text-base text-gray-500">
        ({deviceCount}/4)
      </span>
    </h2>

    {deviceCount < 4 && (
      <button
        onClick={onAddDeviceClick}
        className="w-full md:w-auto"
        aria-label="Agregar dispositivo"
      >
        <IconLoader 
          name="PlusIcon" 
          className="w-8 h-8 text-uniss-blue dark:text-uniss-gold" 
        />
      </button>
    )}
  </div>
));

SectionHeader.displayName = 'SectionHeader';

export default function DevicesSection({ 
  isDarkMode, 
  devices, 
  onAddDeviceClick 
}: DevicesSectionProps) {
  const bgColor = isDarkMode ? "bg-gray-800" : "bg-white";
  const deviceCount = devices.length;
  
  // Memoizar la lista de dispositivos para evitar re-renders innecesarios
  const deviceList = useMemo(() => (
    <div className="space-y-4" role="list" aria-label="Lista de dispositivos">
      {devices.map(device => (
        <DeviceItem 
          key={device.mac} 
          device={device} 
          isDarkMode={isDarkMode} 
        />
      ))}
    </div>
  ), [devices, isDarkMode]);

  return (
    <section
      className={`rounded-xl shadow-lg p-6 transition-colors ${bgColor}`}
      aria-labelledby="devices-heading"
    >
      <SectionHeader 
        isDarkMode={isDarkMode} 
        deviceCount={deviceCount} 
        onAddDeviceClick={onAddDeviceClick} 
      />

      {deviceCount === 0 ? (
        <EmptyState 
          isDarkMode={isDarkMode} 
          onAddDeviceClick={onAddDeviceClick} 
        />
      ) : (
        deviceList
      )}
    </section>
  );
}