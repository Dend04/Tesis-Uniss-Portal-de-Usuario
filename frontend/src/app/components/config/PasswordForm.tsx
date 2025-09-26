"use client";

import { useState, useEffect } from "react";
import {
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface PasswordFormProps {
  isDarkMode: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Función auxiliar para normalizar texto (eliminar acentos y convertir a minúsculas)
const normalizeText = (text: string) => {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
};

// Función para verificar si la contraseña contiene información personal
const containsPersonalInfo = (password: string, username?: string, displayName?: string) => {
  if (!username && !displayName) return false;
  
  const normalizedPassword = normalizeText(password);
  
  // Verificar nombre de usuario
  if (username && normalizedPassword.includes(normalizeText(username))) {
    return true;
  }
  
  // Verificar nombre completo (displayName)
  if (displayName && normalizedPassword.includes(normalizeText(displayName))) {
    return true;
  }
  
  // Verificar partes del nombre (palabras de más de 2 caracteres)
  if (displayName) {
    const nameParts = displayName.split(/\s+/);
    return nameParts.some(part => 
      part.length > 2 && normalizedPassword.includes(normalizeText(part))
    );
  }
  
  return false;
};

interface PasswordStrengthProps {
  password: string;
  username?: string;
  displayName?: string;
}

const PasswordStrength = ({ password, username, displayName }: PasswordStrengthProps) => {
  const requirements = [
    { regex: /.{8,}/, text: "Mínimo 8 caracteres" },
    { regex: /[A-Z]/, text: "Al menos una mayúscula" },
    { regex: /[0-9]/, text: "Al menos un número" },
    { regex: /[^A-Za-z0-9]/, text: "Al menos un carácter especial" },
    { 
      validator: () => !containsPersonalInfo(password, username, displayName), 
      text: "No coincidir con nombre de usuario o nombre completo" 
    },
  ];

  return (
    <div className="mt-4 space-y-2">
      {requirements.map((req, index) => {
        const isValid = req.regex ? req.regex.test(password) : req.validator!();
        
        return (
          <div key={index} className="flex items-center gap-2">
            {isValid ? (
              <CheckCircleIcon className="w-4 h-4 text-green-500" />
            ) : (
              <XCircleIcon className="w-4 h-4 text-red-500" />
            )}
            <span
              className={`text-sm ${
                isValid ? "text-green-600" : "text-red-600"
              }`}
            >
              {req.text}
            </span>
          </div>
        );
      })}
      
      {/* Mensajes explicativos si hay coincidencias */}
      {username && containsPersonalInfo(password, username, undefined) && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          ❌ La contraseña contiene su nombre de usuario "{username}"
        </div>
      )}
      
      {displayName && containsPersonalInfo(password, undefined, displayName) && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          ❌ La contraseña contiene su nombre completo o partes del mismo
        </div>
      )}
    </div>
  );
};

// Función para decodificar el token JWT
const decodeToken = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decodificando token:', error);
    return null;
  }
};

// Función para obtener los datos del usuario desde el token
const getUserDataFromToken = () => {
  if (typeof window === 'undefined') return null;
  
  const token = localStorage.getItem('authToken');
  if (!token) return null;
  
  const decoded = decodeToken(token);
  if (!decoded) return null;
  
  return {
    username: decoded.sAMAccountName,
    displayName: decoded.displayName || decoded.nombreCompleto
  };
};

// Función principal para cambiar la contraseña en el backend
const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return {
        success: false,
        message: 'No se encontró token de autenticación'
      };
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/password/change`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        currentPassword,
        newPassword
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.error || data.message || 'Error al cambiar la contraseña'
      };
    }

    return {
      success: true,
      message: data.message
    };
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    return {
      success: false,
      message: 'Error de conexión con el servidor'
    };
  }
};

export default function PasswordForm({ 
  isDarkMode, 
  onSuccess, 
  onCancel, 
}: PasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  
  // Obtener datos del usuario desde el token
  const userData = getUserDataFromToken();
  const username = userData?.username;
  const displayName = userData?.displayName;

  // Validar coincidencia de contraseñas en tiempo real
  useEffect(() => {
    if (confirmPassword && newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
    } else {
      setPasswordError("");
    }
  }, [newPassword, confirmPassword]);

  // Limpiar errores cuando cambia la contraseña
  useEffect(() => {
    setErrorMessage("");
  }, [newPassword, currentPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    // Validaciones básicas
    if (!currentPassword) {
      setErrorMessage("La contraseña actual es requerida");
      setIsLoading(false);
      return;
    }

    if (!newPassword || !confirmPassword) {
      setErrorMessage("La nueva contraseña y su confirmación son requeridas");
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden");
      setIsLoading(false);
      return;
    }

    // Validar que no contenga información personal usando datos del token
    if (containsPersonalInfo(newPassword, username, displayName)) {
      setErrorMessage("La contraseña no puede contener su nombre de usuario o nombre completo");
      setIsLoading(false);
      return;
    }

    try {
      const result = await changePassword(currentPassword, newPassword);

      if (result.success) {
        setIsSuccess(true);
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 2000);
      } else {
        // Manejo específico de errores del backend
        if (result.message?.includes("contraseña actual es incorrecta") || 
            result.message?.includes("current_password_incorrect")) {
          setErrorMessage("La contraseña actual es incorrecta");
        } else if (result.message?.includes("historial") || result.message?.includes("history")) {
          setErrorMessage("Esta contraseña ha sido utilizada recientemente. Por favor, elija una diferente.");
        } else if (result.message?.includes("políticas") || result.message?.includes("policy")) {
          setErrorMessage("La contraseña no cumple con las políticas de seguridad");
        } else if (result.message?.includes("conexión") || result.message?.includes("timeout")) {
          setErrorMessage("Error de conexión con el servidor. Intente nuevamente.");
        } else if (result.message?.includes("token") || result.message?.includes("autenticación")) {
          setErrorMessage("Error de autenticación. Por favor, inicie sesión nuevamente.");
        } else {
          setErrorMessage(result.message || "Error al cambiar la contraseña");
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado al cambiar la contraseña"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar si el botón debe estar deshabilitado
  const isSubmitDisabled = 
    isLoading || 
    !!passwordError || 
    containsPersonalInfo(newPassword, username, displayName) ||
    !currentPassword ||
    !newPassword ||
    !confirmPassword;

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      {isSuccess && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg flex items-center gap-2">
          <CheckCircleIcon className="w-5 h-5" />
          ¡Contraseña cambiada exitosamente!
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg flex items-center gap-2">
          <ExclamationTriangleIcon className="w-5 h-5" />
          {errorMessage}
        </div>
      )}

      <div>
        <label
          className={`block mb-2 ${
            isDarkMode ? "text-gray-300" : "text-gray-600"
          }`}
        >
          Contraseña actual
        </label>
        <div className="relative">
          <input
            type={showCurrentPassword ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={`w-full p-3 rounded-lg border ${
              isDarkMode
                ? "bg-gray-700 border-gray-600 text-gray-200"
                : "bg-white border-gray-300 text-gray-800"
            }`}
            required
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            className="absolute right-3 top-3.5"
            disabled={isLoading}
          >
            {showCurrentPassword ? (
              <EyeSlashIcon className="w-5 h-5 text-gray-400" />
            ) : (
              <EyeIcon className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>
        {/* Se eliminó la notificación sobre registro en logs */}
      </div>

      <div>
        <label
          className={`block mb-2 ${
            isDarkMode ? "text-gray-300" : "text-gray-600"
          }`}
        >
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            type={showNewPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={`w-full p-3 rounded-lg border ${
              isDarkMode
                ? "bg-gray-700 border-gray-600 text-gray-200"
                : "bg-white border-gray-300 text-gray-800"
            }`}
            required
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-3.5"
            disabled={isLoading}
          >
            {showNewPassword ? (
              <EyeSlashIcon className="w-5 h-5 text-gray-400" />
            ) : (
              <EyeIcon className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>
        <PasswordStrength 
          password={newPassword} 
          username={username}
          displayName={displayName}
        />
      </div>

      <div>
        <label
          className={`block mb-2 ${
            isDarkMode ? "text-gray-300" : "text-gray-600"
          }`}
        >
          Confirmar nueva contraseña
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`w-full p-3 rounded-lg border ${
              isDarkMode
                ? "bg-gray-700 border-gray-600 text-gray-200"
                : "bg-white border-gray-300 text-gray-800"
            } ${
              passwordError ? "border-red-500" : ""
            }`}
            required
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-3.5"
            disabled={isLoading}
          >
            {showConfirmPassword ? (
              <EyeSlashIcon className="w-5 h-5 text-gray-400" />
            ) : (
              <EyeIcon className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>
        {passwordError && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <ExclamationTriangleIcon className="w-4 h-4" />
            {passwordError}
          </p>
        )}
      </div>

      <div className="flex gap-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="flex-1 px-4 py-2 bg-uniss-blue text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Procesando...
            </span>
          ) : (
            "Cambiar contraseña"
          )}
        </button>
      </div>
    </form>
  );
}