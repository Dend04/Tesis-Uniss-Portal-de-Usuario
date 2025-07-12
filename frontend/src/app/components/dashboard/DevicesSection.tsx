'use client';

import { Device } from "@/types";
import IconLoader from "../IconLoader";


interface DevicesSectionProps {
  isDarkMode: boolean;
  devices: Device[];
  onAddDeviceClick: () => void;
}

export default function DevicesSection({ 
  isDarkMode, 
  devices, 
  onAddDeviceClick 
}: DevicesSectionProps) {
  return (
    <section
      className={`rounded-xl shadow-lg p-6 transition-colors ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      }`}
      aria-labelledby="devices-heading"
    >
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2
          id="devices-heading"
          className={`text-2xl font-bold flex items-center gap-2 ${
            isDarkMode ? "text-uniss-gold" : "text-uniss-black"
          }`}
        >
          Dispositivos vinculados
          <span className="text-base text-gray-500">
            ({devices.length}/4)
          </span>
        </h2>

        {devices.length < 4 && (
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

      {devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-6">
          <p
            className={`text-xl ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            No hay dispositivos vinculados
          </p>
          <button
            onClick={onAddDeviceClick}
            className={`px-8 py-4 rounded-xl flex items-center gap-3 
              ${
                isDarkMode
                  ? "bg-uniss-gold text-gray-900"
                  : "bg-uniss-blue text-white"
              } 
              hover:opacity-90 transition-opacity text-lg`}
            aria-label="Agregar primer dispositivo"
          >
            <IconLoader name="PlusIcon" className="w-8 h-8" />
            <span>Agregar primer dispositivo</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4" role="list" aria-label="Lista de dispositivos">
          {devices.map((device, index) => (
            <div
              key={index}
              className={`p-4 border-2 rounded-xl flex items-center justify-between transition-colors
                ${
                  isDarkMode
                    ? "border-gray-700 hover:bg-gray-700"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              role="listitem"
              aria-label={`Dispositivo: ${device.model}, MAC: ${device.mac}`}
            >
              <div className="flex items-center gap-4">
                {device.type === "phone" && (
                  <IconLoader 
                    name="DevicePhoneMobileIcon" 
                    className={`w-10 h-10 ${
                      isDarkMode ? "text-white" : "text-uniss-black"
                    }`} 
                  />
                )}
                {device.type === "laptop" && (
                  <IconLoader 
                    name="ComputerDesktopIcon" 
                    className={`w-10 h-10 ${
                      isDarkMode ? "text-white" : "text-uniss-black"
                    }`} 
                  />
                )}
                {device.type === "tablet" && (
                  <IconLoader 
                    name="DeviceTabletIcon" 
                    className={`w-10 h-10 ${
                      isDarkMode ? "text-white" : "text-uniss-black"
                    }`} 
                  />
                )}
                {device.type === "pc" && (
                  <IconLoader 
                    name="ComputerDesktopIcon" 
                    className={`w-10 h-10 ${
                      isDarkMode ? "text-white" : "text-uniss-black"
                    }`} 
                  />
                )}
                <div>
                  <p
                    className={`text-xl font-medium ${
                      isDarkMode ? "text-gray-100" : "text-gray-800"
                    }`}
                  >
                    {device.model}
                  </p>
                  <p
                    className={`text-base ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
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
          ))}
        </div>
      )}
    </section>
  );
}