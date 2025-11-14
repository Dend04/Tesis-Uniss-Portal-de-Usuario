// app/components/modals/EmployeeIDModal.tsx
"use client";

import { useState } from "react";
import { 
  IdentificationIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from "@heroicons/react/24/outline";

interface EmployeeIDModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (employeeID: string) => void;
  isDarkMode: boolean;
}

export default function EmployeeIDModal({
  isOpen,
  onClose,
  onSuccess,
  isDarkMode
}: EmployeeIDModalProps) {
  const [employeeID, setEmployeeID] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const cleanCI = employeeID.replace(/\D/g, "");
      
      if (cleanCI.length !== 11) {
        throw new Error("El Carnet de Identidad debe tener 11 dígitos");
      }

      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error("No se encontró token de autenticación");
      }

      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/updateAccount/update-employee-id`;
      console.log('🔍 URL de la petición:', apiUrl);
      console.log('🔍 EmployeeID a enviar:', cleanCI);

      // 1. Actualizar employeeID en LDAP y OBTENER NUEVO TOKEN
      const updateResponse = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ employeeID: cleanCI })
      });

      console.log('🔍 Respuesta del servidor:', updateResponse.status, updateResponse.statusText);

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('🔍 Error response:', errorText);
        throw new Error(`Error ${updateResponse.status}: ${updateResponse.statusText}`);
      }

      const updateData = await updateResponse.json();

      // ✅ ACTUALIZAR EL TOKEN EN LOCALSTORAGE CON EL NUEVO TOKEN
      if (updateData.newToken) {
        localStorage.setItem('authToken', updateData.newToken);
        console.log('✅ Token actualizado con nuevo employeeID');
      } else {
        console.warn('⚠️ No se recibió nuevo token del servidor');
      }

      // 2. Ejecutar la verificación dual con el NUEVO TOKEN
      const verificationResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/verify/dual-status`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${updateData.newToken || token}`, // ✅ Usar nuevo token si está disponible
            "Content-Type": "application/json",
          },
        }
      );

      if (!verificationResponse.ok) {
        throw new Error("Error en la verificación de estado");
      }

      const verificationData = await verificationResponse.json();
      
      if (verificationData.success) {
        setSuccess(true);
        
        // ✅ Cerrar modal después de 2 segundos (NO CERRAR SESIÓN)
        setTimeout(() => {
          onSuccess(cleanCI);
          setSuccess(false);
          setEmployeeID("");
          onClose(); // ✅ Solo cerrar el modal
        }, 2000);
      } else {
        throw new Error(verificationData.error || "Error en la verificación");
      }

    } catch (err: any) {
      console.error('🔍 Error completo:', err);
      setError(err.message || "Error al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  const handleCIChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 11);
    setEmployeeID(value);
    setError("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className={`rounded-xl shadow-xl w-full max-w-md transform transition-all ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        }`}
      >
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
              <IdentificationIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              Completar Perfil
            </h3>
            <p className={`mt-2 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              Para continuar, necesitamos verificar tu Carnet de Identidad
            </p>
          </div>

          {success ? (
            <div className="text-center py-6">
              <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h4 className={`text-lg font-semibold mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                ¡Verificación Exitosa!
              </h4>
              <p className={isDarkMode ? "text-gray-300" : "text-gray-600"}>
                Tu perfil ha sido actualizado correctamente.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Carnet de Identidad
                </label>
                <input
                  type="text"
                  value={employeeID}
                  onChange={handleCIChange}
                  className={`w-full p-3 rounded-lg border transition-colors ${
                    error
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : isDarkMode
                      ? "bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
                      : "bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                  } focus:ring-2 focus:outline-none`}
                  placeholder="Ej: 12345678901"
                  required
                  disabled={loading}
                />
                <p className={`text-xs mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Ingresa tu Carnet de Identidad de 11 dígitos
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className={`flex-1 px-4 py-3 rounded-lg border transition-all ${
                    isDarkMode 
                      ? "border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500" 
                      : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                  } font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || employeeID.length !== 11}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verificando...
                    </div>
                  ) : (
                    "Continuar"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}