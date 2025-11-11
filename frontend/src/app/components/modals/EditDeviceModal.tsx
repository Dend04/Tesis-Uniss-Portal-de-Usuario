'use client';

import { useForm, SubmitHandler } from "react-hook-form";
import { Device } from "@/types";
import { formatMAC } from "../../utils/format";
import { useEffect } from "react";
import { 
  XMarkIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';

interface EditDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  device: Device | null;
  isDarkMode: boolean;
}

interface DeviceFormData {
  nombre: string;
  tipo: 'CELULAR' | 'TABLET' | 'LAPTOP' | 'PC' | 'MINI_PC' | 'OTRO';
  mac: string;
}

// Esquema de validación (puede ser diferente para edición)
const deviceSchema = {
  nombre: {
    required: "El nombre del dispositivo es requerido",
    minLength: {
      value: 1,
      message: "El nombre no puede estar vacío"
    },
    maxLength: {
      value: 50,
      message: "El nombre no puede tener más de 50 caracteres"
    }
  }
};

const getAuthToken = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    const token = localStorage.getItem('authToken');
    return token || '';
  } catch (error) {
    return '';
  }
};

export default function EditDeviceModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  device,
  isDarkMode
}: EditDeviceModalProps) {
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting }, 
    reset,
    setValue,
    setError,
    clearErrors
  } = useForm<DeviceFormData>();

  // Cargar datos del dispositivo cuando se abre el modal
  useEffect(() => {
    if (isOpen && device) {
      reset({
        tipo: device.tipo,
        nombre: device.nombre,
        mac: device.mac
      });
      clearErrors();
    }
  }, [isOpen, device, reset, clearErrors]);

  const onSubmit: SubmitHandler<DeviceFormData> = async (data) => {
    if (!device) return;

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No se encontró token de autenticación');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/portal/dispositivos/${device.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: data.nombre,
          tipo: data.tipo,
          mac: data.mac,
          // Nota: La MAC normalmente no se debería poder editar ya que es un identificador único
          // Si necesitas permitir editar la MAC, descomenta la siguiente línea:
        }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      onSuccess?.();
      onClose();
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          setError('root', { 
            type: 'manual', 
            message: 'Sesión expirada. Por favor, inicia sesión nuevamente.'
          });
        } else {
          setError('root', { 
            type: 'manual', 
            message: `Error al actualizar dispositivo: ${error.message}`
          });
        }
      } else {
        setError('root', { 
          type: 'manual', 
          message: 'Error desconocido al actualizar dispositivo'
        });
      }
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen || !device) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className={`p-6 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-device-title"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="edit-device-title" className={`text-2xl font-bold ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}>
            Editar dispositivo
          </h2>
          <button
            onClick={handleClose}
            className={`p-2 rounded-lg ${
              isDarkMode 
                ? "text-gray-400 hover:text-white hover:bg-gray-700" 
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
            aria-label="Cerrar"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form 
          onSubmit={handleSubmit(onSubmit)} 
          className="space-y-4"
          aria-labelledby="edit-device-title"
        >
          <div>
            <label htmlFor="editDeviceType" className={`block text-sm font-medium mb-2 ${
              isDarkMode ? "text-gray-200" : "text-gray-700"
            }`}>
              Tipo de dispositivo
            </label>
            <select
              id="editDeviceType"
              {...register("tipo")}
              className={`w-full p-3 rounded-lg border-2 text-base ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-white focus:border-uniss-gold"
                  : "bg-white border-gray-300 text-gray-900 focus:border-uniss-blue"
              }`}
              aria-required="true"
            >
              <option value="CELULAR">📱 Teléfono</option>
              <option value="LAPTOP">💻 Laptop</option>
              <option value="TABLET">📟 Tablet</option>
              <option value="PC">🖥️ Computadora</option>
              <option value="MINI_PC">🖥️ Mini PC</option>
              <option value="OTRO">❓ Otro</option>
            </select>
          </div>

          <div>
            <label htmlFor="editDeviceName" className={`block text-sm font-medium mb-2 ${
              isDarkMode ? "text-gray-200" : "text-gray-700"
            }`}>
              Nombre del dispositivo
            </label>
            <input
              id="editDeviceName"
              {...register("nombre", deviceSchema.nombre)}
              className={`w-full p-3 rounded-lg border-2 text-base ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-white focus:border-uniss-gold"
                  : "bg-white border-gray-300 text-gray-900 focus:border-uniss-blue"
              } ${errors.nombre ? "border-red-500" : ""}`}
              placeholder="Ej: Mi teléfono personal, Laptop del trabajo"
              aria-required="true"
              aria-invalid={errors.nombre ? "true" : "false"}
            />
            {errors.nombre && (
              <span className="text-red-500 text-sm block mt-1" role="alert">
                {errors.nombre.message}
              </span>
            )}
          </div>

          <div>
            <label htmlFor="editDeviceMAC" className={`block text-sm font-medium mb-2 ${
              isDarkMode ? "text-gray-200" : "text-gray-700"
            }`}>
              Dirección MAC
            </label>
            <input
              id="editDeviceMAC"
              value={device.mac}
              readOnly
              className={`w-full p-3 rounded-lg border-2 text-base ${
                isDarkMode
                  ? "bg-gray-600 border-gray-600 text-gray-400"
                  : "bg-gray-100 border-gray-300 text-gray-500"
              }`}
              aria-label="Dirección MAC (no editable)"
            />
            <p className={`text-xs mt-1 ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}>
              La dirección MAC no se puede modificar
            </p>
          </div>

          {errors.root && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg" role="alert">
              {errors.root.message}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className={`flex-1 py-3 px-4 rounded-lg font-medium ${
                isDarkMode
                  ? "text-gray-300 bg-gray-700 hover:bg-gray-600 border border-gray-600"
                  : "text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300"
              } disabled:opacity-50`}
              aria-label="Cancelar"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 py-3 px-4 rounded-lg font-medium ${
                isDarkMode
                  ? "bg-uniss-gold text-gray-900 hover:bg-yellow-500"
                  : "bg-uniss-blue text-white hover:bg-blue-600"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label="Actualizar dispositivo"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Actualizando...
                </div>
              ) : (
                'Actualizar Dispositivo'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}