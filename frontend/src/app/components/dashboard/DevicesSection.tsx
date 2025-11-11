'use client';

import { memo, useMemo, useState, useCallback, useEffect } from "react";
import { Device } from "@/types";
import IconLoader from "../IconLoader";
import EditDeviceModal from "../modals/EditDeviceModal";
import AddDeviceModal from "../modals/AddDeviceModal";

interface DevicesSectionProps {
  isDarkMode: boolean;
  devices?: Device[]; // Hacer opcional para usar dispositivos internos
  loading?: boolean;
  error?: string;
  className?: string;
}

// Mapa de iconos por tipo de dispositivo
const deviceIcons = {
  CELULAR: "DevicePhoneMobileIcon",
  LAPTOP: "ComputerDesktopIcon",
  TABLET: "DeviceTabletIcon",
  PC: "ComputerDesktopIcon",
  MINI_PC: "ComputerDesktopIcon",
  OTRO: "QuestionMarkCircleIcon",
} as const;

// Mapa de nombres legables para los tipos
const deviceTypeNames = {
  CELULAR: "Teléfono",
  LAPTOP: "Laptop",
  TABLET: "Tablet",
  PC: "Computadora",
  MINI_PC: "Mini PC",
  OTRO: "Otro",
};

// ✅ FUNCIÓN PARA OBTENER DISPOSITIVOS
const fetchDevices = async (): Promise<Device[]> => {
  const token = localStorage.getItem("authToken");
  if (!token) {
    throw new Error("No hay token de autenticación");
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/portal/dispositivos`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success && data.data && Array.isArray(data.data)) {
      return data.data.map((device: any) => ({
        id: device.id?.toString() || Math.random().toString(),
        mac: device.mac || "No disponible",
        nombre: device.nombre || "Dispositivo sin nombre",
        tipo: device.tipo || "OTRO",
        username: device.username || "Usuario no disponible",
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
      }));
    } else if (data.success && (!data.data || data.data.length === 0)) {
      return [];
    } else {
      throw new Error(data.error || "Formato de respuesta inesperado");
    }
  } catch (error) {
    throw error;
  }
};

// ✅ FUNCIÓN PARA ELIMINAR DISPOSITIVO
const deleteDevice = async (deviceId: string): Promise<boolean> => {
  const token = localStorage.getItem("authToken");
  if (!token) {
    throw new Error("No hay token de autenticación");
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/portal/dispositivos/${deviceId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.ok;
  } catch (error) {
    throw error;
  }
};

// Componente memoizado para dispositivos
const DeviceItem = memo(
  ({
    device,
    isDarkMode,
    onEdit,
    onDelete,
    onViewDetails,
  }: {
    device: Device;
    isDarkMode: boolean;
    onEdit: (device: Device) => void;
    onDelete: (device: Device) => void;
    onViewDetails: (device: Device) => void;
  }) => {
    const iconName = deviceIcons[device.tipo] || "QuestionMarkCircleIcon";
    const deviceTypeName = deviceTypeNames[device.tipo] || "Dispositivo";
    const textColor = isDarkMode ? "text-gray-100" : "text-gray-800";
    const secondaryTextColor = isDarkMode ? "text-gray-400" : "text-gray-500";
    const borderColor = isDarkMode
      ? "border-gray-700 hover:bg-gray-700"
      : "border-gray-200 hover:bg-gray-50";

    const formattedDate = device.createdAt
      ? new Date(device.createdAt).toLocaleDateString("es-ES")
      : null;

    return (
      <div
        className={`p-4 border-2 rounded-xl flex items-center justify-between transition-colors ${borderColor}`}
        role="listitem"
        aria-label={`Dispositivo: ${device.nombre}, MAC: ${device.mac}`}
      >
        <div className="flex items-center gap-4 flex-1">
          <IconLoader
            name={iconName}
            className={`w-10 h-10 ${
              isDarkMode ? "text-white" : "text-uniss-black"
            }`}
          />
          <div className="flex-1">
            <p className={`text-xl font-medium ${textColor}`}>
              {device.nombre}
            </p>
            <div className="flex flex-wrap gap-4 items-center">
              <p className={`text-base ${secondaryTextColor}`}>
                MAC: {device.mac}
              </p>
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  isDarkMode
                    ? "bg-gray-700 text-gray-300"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {deviceTypeName}
              </span>
              {formattedDate && (
                <p className={`text-sm ${secondaryTextColor}`}>
                  Agregado: {formattedDate}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onEdit(device)}
            className="text-uniss-blue hover:text-opacity-80"
            title="Editar dispositivo"
            aria-label={`Editar dispositivo ${device.nombre}`}
          >
            <IconLoader name="PencilSquareIcon" className="w-7 h-7" />
          </button>
          <button
            onClick={() => onDelete(device)}
            className="text-red-500 hover:text-opacity-80"
            title="Eliminar dispositivo"
            aria-label={`Eliminar dispositivo ${device.nombre}`}
          >
            <IconLoader name="TrashIcon" className="w-7 h-7" />
          </button>
          <button
            onClick={() => onViewDetails(device)}
            className="text-gray-600 hover:text-opacity-80 dark:text-gray-400"
            title="Ver detalles"
            aria-label={`Ver detalles de ${device.nombre}`}
          >
            <IconLoader name="EyeIcon" className="w-7 h-7" />
          </button>
        </div>
      </div>
    );
  }
);

DeviceItem.displayName = "DeviceItem";

// Componente para el estado vacío
const EmptyState = memo(
  ({
    isDarkMode,
    onAddDeviceClick,
    loading,
  }: {
    isDarkMode: boolean;
    onAddDeviceClick: () => void;
    loading?: boolean;
  }) => (
    <div className="flex flex-col items-center justify-center h-64 gap-6">
      {loading ? (
        <>
          <IconLoader
            name="ArrowPathIcon"
            className={`w-12 h-12 animate-spin ${
              isDarkMode ? "text-uniss-gold" : "text-uniss-blue"
            }`}
          />
          <p
            className={`text-xl ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Cargando dispositivos...
          </p>
        </>
      ) : (
        <>
          <IconLoader
            name="DeviceTabletIcon"
            className={`w-16 h-16 ${
              isDarkMode ? "text-gray-500" : "text-gray-400"
            }`}
          />
          <p
            className={`text-xl text-center ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            No hay dispositivos vinculados
          </p>
          <p
            className={`text-sm text-center ${
              isDarkMode ? "text-gray-500" : "text-gray-500"
            }`}
          >
            Actualmente no ha agregado dispositivos a su cuenta
          </p>
          <button
            onClick={onAddDeviceClick}
            className={`px-8 py-4 rounded-xl flex items-center gap-3 
            ${
              isDarkMode
                ? "bg-uniss-gold text-gray-900"
                : "bg-uniss-blue text-white"
            } 
            hover:opacity-90 transition-opacity text-lg font-medium`}
            aria-label="Agregar primer dispositivo"
          >
            <IconLoader name="PlusIcon" className="w-8 h-8" />
            <span>Agregar primer dispositivo</span>
          </button>
        </>
      )}
    </div>
  )
);

EmptyState.displayName = "EmptyState";

// Componente para el encabezado
const SectionHeader = memo(
  ({
    isDarkMode,
    deviceCount,
    onAddDeviceClick,
    onRefresh,
    loading,
  }: {
    isDarkMode: boolean;
    deviceCount: number;
    onAddDeviceClick: () => void;
    onRefresh?: () => void;
    loading?: boolean;
  }) => (
    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
      <div className="flex items-center gap-3">
        <IconLoader
          name="DeviceTabletIcon"
          className={`w-8 h-8 ${
            isDarkMode ? "text-uniss-gold" : "text-uniss-blue"
          }`}
        />
        <h2
          id="devices-heading"
          className={`text-2xl font-bold flex items-center gap-2 ${
            isDarkMode ? "text-uniss-gold" : "text-uniss-black"
          }`}
        >
          Mis Dispositivos
          {loading && (
            <IconLoader name="ArrowPathIcon" className="w-5 h-5 animate-spin" />
          )}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onRefresh}
          className={`p-2 rounded-lg ${
            isDarkMode
              ? "text-gray-400 hover:text-white hover:bg-gray-700"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          }`}
          title="Actualizar lista"
          aria-label="Actualizar lista de dispositivos"
        >
          <IconLoader name="ArrowPathIcon" className="w-5 h-5" />
        </button>

        <span
          className={`text-base ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          {deviceCount}/4 dispositivos
        </span>

        {deviceCount < 4 && (
          <button
            onClick={onAddDeviceClick}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              isDarkMode
                ? "bg-uniss-gold text-gray-900 hover:bg-yellow-500"
                : "bg-uniss-blue text-white hover:bg-blue-600"
            } transition-colors font-medium`}
            aria-label="Agregar dispositivo"
            disabled={loading}
          >
            <IconLoader name="PlusIcon" className="w-5 h-5" />
            <span>Agregar</span>
          </button>
        )}
      </div>
    </div>
  )
);

SectionHeader.displayName = "SectionHeader";

// Componente de error
const ErrorState = memo(
  ({
    error,
    isDarkMode,
    onRetry,
  }: {
    error: string;
    isDarkMode: boolean;
    onRetry: () => void;
  }) => (
    <div className="flex flex-col items-center justify-center h-64 gap-4 p-4">
      <IconLoader
        name="ExclamationTriangleIcon"
        className="w-12 h-12 text-red-500"
      />
      <div className="text-center">
        <p
          className={`text-lg font-medium mb-2 ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          Error al cargar dispositivos
        </p>
        <p
          className={`text-sm ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          {error}
        </p>
      </div>
      <button
        onClick={onRetry}
        className={`px-6 py-3 rounded-lg flex items-center gap-2 ${
          isDarkMode
            ? "bg-uniss-gold text-gray-900"
            : "bg-uniss-blue text-white"
        } hover:opacity-90 font-medium`}
      >
        <IconLoader name="ArrowPathIcon" className="w-5 h-5" />
        Reintentar
      </button>
    </div>
  )
);

ErrorState.displayName = "ErrorState";

export default function DevicesSection({
  isDarkMode,
  devices: externalDevices,
  loading = false,
  error,
  className = "",
}: DevicesSectionProps) {
  const bgColor = isDarkMode ? "bg-gray-800" : "bg-white";

  const [internalDevices, setInternalDevices] = useState<Device[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  
  // Estados para los modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);

  // Cargar dispositivos si no se proporcionan externamente
  const loadDevices = useCallback(async () => {
    if (externalDevices && externalDevices.length > 0) return;

    try {
      setInternalLoading(true);
      setInternalError(null);
      const devices = await fetchDevices();
      setInternalDevices(devices);
      setHasLoaded(true);
    } catch (error) {
      if (error instanceof Error && !error.message.includes("No hay token")) {
        setInternalError(
          error instanceof Error
            ? error.message
            : "Error al cargar dispositivos"
        );
      }
      setHasLoaded(true);
    } finally {
      setInternalLoading(false);
    }
  }, [externalDevices]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const handleRefresh = useCallback(() => {
    loadDevices();
  }, [loadDevices]);

  // Manejo de modales
  const handleOpenCreateModal = () => setIsCreateModalOpen(true);
  const handleCloseCreateModal = () => setIsCreateModalOpen(false);

  const handleOpenEditModal = useCallback((device: Device) => {
    setEditingDevice(device);
    setIsEditModalOpen(true);
  }, []);

  const handleCloseEditModal = () => {
    setEditingDevice(null);
    setIsEditModalOpen(false);
  };

  const handleOperationSuccess = () => {
    handleRefresh(); // Recargar la lista después de una operación exitosa
  };

  // Usar dispositivos externos si se proporcionan, de lo contrario usar internos
  const devices = externalDevices && externalDevices.length > 0 ? externalDevices : internalDevices;
  const deviceCount = devices.length;
  const shouldShowError = error || (internalError && (!externalDevices || externalDevices.length === 0));
  const finalLoading = loading || (internalLoading && !hasLoaded);

  // Manejar eliminación de dispositivo
  const handleDeleteDevice = useCallback(async (device: Device) => {
    if (
      window.confirm(
        `¿Estás seguro de que quieres eliminar el dispositivo "${device.nombre}"?`
      )
    ) {
      try {
        const success = await deleteDevice(device.id);
        if (success) {
          handleRefresh();
        } else {
          throw new Error(`Error al eliminar dispositivo`);
        }
      } catch (error) {
        alert("Error al eliminar el dispositivo");
      }
    }
  }, [handleRefresh]);

  // Manejar vista de detalles
  const handleViewDetails = useCallback((device: Device) => {
    const formattedDate = device.createdAt
      ? new Date(device.createdAt).toLocaleString()
      : "Fecha no disponible";
    alert(
      `Detalles del dispositivo:\n\nNombre: ${device.nombre}\nMAC: ${device.mac}\nTipo: ${device.tipo}\nCreado: ${formattedDate}`
    );
  }, []);

  const handleRetry = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  const deviceList = useMemo(
    () => (
      <div className="space-y-4" role="list" aria-label="Lista de dispositivos">
        {devices.map((device) => (
          <DeviceItem
            key={device.id}
            device={device}
            isDarkMode={isDarkMode}
            onEdit={handleOpenEditModal}
            onDelete={handleDeleteDevice}
            onViewDetails={handleViewDetails}
          />
        ))}
      </div>
    ),
    [
      devices,
      isDarkMode,
      handleOpenEditModal,
      handleDeleteDevice,
      handleViewDetails,
    ]
  );

  return (
    <>
      <section
        className={`rounded-xl shadow-lg p-6 transition-colors ${bgColor} ${className}`}
        aria-labelledby="devices-heading"
      >
        <SectionHeader
          isDarkMode={isDarkMode}
          deviceCount={deviceCount}
          onAddDeviceClick={handleOpenCreateModal}
          onRefresh={handleRefresh}
          loading={finalLoading}
        />

        {shouldShowError ? (
          <ErrorState
            error={error || internalError || "Error desconocido"}
            isDarkMode={isDarkMode}
            onRetry={handleRetry}
          />
        ) : deviceCount > 0 ? (
          deviceList
        ) : (
          <EmptyState
            isDarkMode={isDarkMode}
            onAddDeviceClick={handleOpenCreateModal}
            loading={finalLoading}
          />
        )}
      </section>

      {/* Modal para crear dispositivo */}
      <AddDeviceModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSuccess={handleOperationSuccess}
        isDarkMode={isDarkMode}
      />

      {/* Modal para editar dispositivo */}
      <EditDeviceModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSuccess={handleOperationSuccess}
        device={editingDevice}
        isDarkMode={isDarkMode}
      />
    </>
  );
}