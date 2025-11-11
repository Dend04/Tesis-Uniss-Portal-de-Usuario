'use client';

import { useForm, SubmitHandler } from "react-hook-form";
import { Device } from "@/types";
import { formatMAC } from "../../utils/format";
import { useEffect } from "react";
import { 
  XMarkIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';

// Esquema de validación
const deviceSchema = {
  mac: {
    required: "La dirección MAC es requerida",
    pattern: {
      value: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
      message: "Formato MAC inválido. Use: 00:1A:2B:3C:4D:5E"
    }
  },
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

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  device?: Device | null;
  isDarkMode: boolean;
  deviceCount: number; // ✅ NUEVO: Contador de dispositivos
}

interface DeviceFormData {
  nombre: string;
  tipo: 'CELULAR' | 'TABLET' | 'LAPTOP' | 'PC' | 'MINI_PC' | 'OTRO';
  mac: string;
}

// ✅ FUNCIÓN MEJORADA PARA OBTENER EL TOKEN
const getAuthToken = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    const token = localStorage.getItem('authToken');
    return token || '';
  } catch (error) {
    return '';
  }
};

// ✅ FUNCIÓN PARA MANEJAR ERRORES DE LA API
const handleApiError = (error: any, setError: any) => {
  if (error instanceof Error) {
    const message = error.message;
    
    if (message.includes('401')) {
      setError('root', { 
        type: 'manual', 
        message: 'Sesión expirada. Por favor, inicia sesión nuevamente.'
      });
    } else if (message.includes('409') || message.includes('ya existe')) {
      setError('mac', { 
        type: 'manual', 
        message: 'Esta dirección MAC ya está registrada en otro dispositivo.'
      });
    } else if (message.includes('400') && message.includes('Límite')) {
      setError('root', { 
        type: 'manual', 
        message: 'Límite alcanzado. Máximo 4 dispositivos por usuario.'
      });
    } else if (message.includes('500')) {
      setError('root', { 
        type: 'manual', 
        message: 'Error del servidor. Por favor, intenta más tarde.'
      });
    } else if (message.includes('NetworkError') || message.includes('Failed to fetch')) {
      setError('root', { 
        type: 'manual', 
        message: 'Error de conexión. Verifica tu internet.'
      });
    } else {
      setError('root', { 
        type: 'manual', 
        message: `Error: ${message}`
      });
    }
  } else {
    setError('root', { 
      type: 'manual', 
      message: 'Error desconocido al crear dispositivo'
    });
  }
};

export default function AddDeviceModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  device,
  isDarkMode,
  deviceCount // ✅ NUEVO: Recibir contador
}: AddDeviceModalProps) {
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting }, 
    reset,
    setValue,
    watch,
    setError,
    clearErrors
  } = useForm<DeviceFormData>({
    mode: 'onChange',
    defaultValues: {
      tipo: 'CELULAR',
      nombre: '',
      mac: ''
    }
  });

  const macValue = watch("mac");

  // Resetear formulario cuando se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      if (device) {
        setValue('tipo', device.tipo);
        setValue('nombre', device.nombre);
        setValue('mac', device.mac);
      } else {
        reset({
          tipo: 'CELULAR',
          nombre: '',
          mac: ''
        });
      }
      clearErrors();
    }
  }, [isOpen, device, setValue, reset, clearErrors]);

  // ✅ VERIFICAR LÍMITE ANTES DE ENVIAR
  const canAddDevice = deviceCount < 4;

  // ✅ FUNCIÓN ONSUBMIT MEJORADA
  const onSubmit: SubmitHandler<DeviceFormData> = async (data) => {
    // Verificar límite antes de enviar
    if (!canAddDevice) {
      setError('root', { 
        type: 'manual', 
        message: 'Límite alcanzado. Máximo 4 dispositivos por usuario.'
      });
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No se encontró token de autenticación');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/portal/dispositivos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mac: data.mac,
          nombre: data.nombre,
          tipo: data.tipo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = errorData.error || `Error ${response.status}: ${response.statusText}`;
        
        // Mensajes específicos por código de error
        switch (response.status) {
          case 400:
            if (errorMessage.includes('Límite')) {
              errorMessage = 'Límite alcanzado. Máximo 4 dispositivos por usuario.';
            } else if (errorMessage.includes('MAC')) {
              errorMessage = 'Esta dirección MAC ya está registrada.';
            }
            break;
          case 401:
            errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
            break;
          case 409:
            errorMessage = 'Esta dirección MAC ya está registrada en otro dispositivo.';
            break;
          case 500:
            errorMessage = 'Error del servidor. Por favor, intenta más tarde.';
            break;
        }
        
        throw new Error(errorMessage);
      }

      // ✅ ÉXITO - LIMPIAR Y CERRAR
      reset();
      onSuccess?.();
      onClose();
      
    } catch (error) {
      handleApiError(error, setError);
    }
  };

  const handleClose = () => {
    reset();
    clearErrors();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className={`p-6 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="device-modal-title"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="device-modal-title" className={`text-2xl font-bold ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}>
            Agregar dispositivo
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

        {/* ✅ ALERTA DE LÍMITE */}
        {!canAddDevice && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg" role="alert">
            <p className="font-medium">Límite alcanzado</p>
            <p className="text-sm">Ya tienes 4 dispositivos registrados. Elimina uno para agregar otro.</p>
          </div>
        )}

        <form 
          onSubmit={handleSubmit(onSubmit)} 
          className="space-y-4"
          aria-labelledby="device-modal-title"
        >
          <div>
            <label htmlFor="deviceType" className={`block text-sm font-medium mb-2 ${
              isDarkMode ? "text-gray-200" : "text-gray-700"
            }`}>
              Tipo de dispositivo
            </label>
            <select
              id="deviceType"
              {...register("tipo")}
              className={`w-full p-3 rounded-lg border-2 text-base ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-white focus:border-uniss-gold"
                  : "bg-white border-gray-300 text-gray-900 focus:border-uniss-blue"
              }`}
              aria-required="true"
              disabled={!canAddDevice}
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
            <label htmlFor="deviceName" className={`block text-sm font-medium mb-2 ${
              isDarkMode ? "text-gray-200" : "text-gray-700"
            }`}>
              Nombre del dispositivo
            </label>
            <input
              id="deviceName"
              {...register("nombre", deviceSchema.nombre)}
              className={`w-full p-3 rounded-lg border-2 text-base ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-white focus:border-uniss-gold"
                  : "bg-white border-gray-300 text-gray-900 focus:border-uniss-blue"
              } ${errors.nombre ? "border-red-500" : ""} ${
                !canAddDevice ? "opacity-50 cursor-not-allowed" : ""
              }`}
              placeholder="Ej: Mi teléfono personal, Laptop del trabajo"
              aria-required="true"
              aria-invalid={errors.nombre ? "true" : "false"}
              disabled={!canAddDevice}
            />
            {errors.nombre && (
              <span className="text-red-500 text-sm block mt-1" role="alert">
                {errors.nombre.message}
              </span>
            )}
          </div>

          <div>
            <label htmlFor="deviceMAC" className={`block text-sm font-medium mb-2 ${
              isDarkMode ? "text-gray-200" : "text-gray-700"
            }`}>
              Dirección MAC
            </label>
            <input
              id="deviceMAC"
              {...register("mac", deviceSchema.mac)}
              value={macValue || ""}
              onChange={(e) => {
                setValue("mac", formatMAC(e.target.value), { shouldValidate: true });
              }}
              placeholder="Formato: 00:1A:2B:3C:4D:5E"
              className={`w-full p-3 rounded-lg border-2 text-base ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-white focus:border-uniss-gold"
                  : "bg-white border-gray-300 text-gray-900 focus:border-uniss-blue"
              } ${errors.mac ? "border-red-500" : ""} ${
                !canAddDevice ? "opacity-50 cursor-not-allowed" : ""
              }`}
              maxLength={17}
              aria-required="true"
              aria-invalid={errors.mac ? "true" : "false"}
              disabled={!canAddDevice}
            />
            {errors.mac && (
              <span className="text-red-500 text-sm block mt-1" role="alert">
                {errors.mac.message}
              </span>
            )}
            <p className={`text-xs mt-1 ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}>
              La dirección MAC debe tener formato: 00:1A:2B:3C:4D:5E
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
              disabled={isSubmitting || !canAddDevice}
              className={`flex-1 py-3 px-4 rounded-lg font-medium ${
                isDarkMode
                  ? "bg-uniss-gold text-gray-900 hover:bg-yellow-500"
                  : "bg-uniss-blue text-white hover:bg-blue-600"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label="Guardar dispositivo"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Guardando...
                </div>
              ) : (
                'Guardar Dispositivo'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}