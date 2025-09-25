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
  mode?: "change" | "reset";
  username?: string;
  fullName?: string; // Nueva prop para el nombre completo
}

// Función auxiliar para normalizar texto (eliminar acentos y convertir a minúsculas)
const normalizeText = (text: string) => {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
};

// Función para verificar si la contraseña contiene información personal
const containsPersonalInfo = (password: string, username?: string, fullName?: string) => {
  if (!username && !fullName) return false;
  
  const normalizedPassword = normalizeText(password);
  
  // Verificar nombre de usuario
  if (username && normalizedPassword.includes(normalizeText(username))) {
    return true;
  }
  
  // Verificar nombre completo
  if (fullName && normalizedPassword.includes(normalizeText(fullName))) {
    return true;
  }
  
  // Verificar partes del nombre (palabras de más de 2 caracteres)
  if (fullName) {
    const nameParts = fullName.split(/\s+/);
    return nameParts.some(part => 
      part.length > 2 && normalizedPassword.includes(normalizeText(part))
    );
  }
  
  return false;
};

interface PasswordStrengthProps {
  password: string;
  username?: string;
  fullName?: string;
}

const PasswordStrength = ({ password, username, fullName }: PasswordStrengthProps) => {
  const requirements = [
    { regex: /.{8,}/, text: "Mínimo 8 caracteres" },
    { regex: /[A-Z]/, text: "Al menos una mayúscula" },
    { regex: /[0-9]/, text: "Al menos un número" },
    { regex: /[^A-Za-z0-9]/, text: "Al menos un carácter especial" },
    { 
      validator: () => !containsPersonalInfo(password, username, fullName), 
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
      
      {fullName && containsPersonalInfo(password, undefined, fullName) && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          ❌ La contraseña contiene su nombre completo o partes del mismo
        </div>
      )}
    </div>
  );
};

// Función para verificar contraseñas anteriores contra LDAP
const checkPasswordHistory = async (username: string, newPassword: string): Promise<boolean> => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/check-password-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, newPassword }),
    });

    if (!response.ok) {
      throw new Error('Error al verificar historial de contraseñas');
    }

    const result = await response.json();
    return result.isInHistory; // true si la contraseña está en el historial
  } catch (error) {
    console.error('Error verificando historial de contraseñas:', error);
    // En caso de error, permitimos la contraseña pero mostramos advertencia
    return false;
  }
};

export default function PasswordForm({ 
  isDarkMode, 
  onSuccess, 
  onCancel, 
  mode = "change",
  username,
  fullName // Nueva prop
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
  const [historyError, setHistoryError] = useState("");

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
    setHistoryError("");
  }, [newPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setHistoryError("");

    // Validación adicional antes de enviar
    if (newPassword !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden");
      setIsLoading(false);
      return;
    }

    // Validar que no contenga información personal
    if (containsPersonalInfo(newPassword, username, fullName)) {
      setErrorMessage("La contraseña no puede contener su nombre de usuario o nombre completo");
      setIsLoading(false);
      return;
    }

    try {
      // Verificar historial de contraseñas (solo para cambios, no para resets iniciales)
      if (mode === "change" && username) {
        const isInHistory = await checkPasswordHistory(username, newPassword);
        if (isInHistory) {
          setHistoryError("Esta contraseña ha sido utilizada recientemente. Por favor, elija una diferente.");
          setIsLoading(false);
          return;
        }
      }

      if (mode === "change") {
        // Lógica para cambio normal (con contraseña actual)
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Simulación de verificación de contraseña actual (debería venir de una API)
        if (currentPassword !== "password123") { // Esto es solo para demostración
          throw new Error("La contraseña actual es incorrecta");
        }

        // Simulación de cambio de contraseña
        setIsSuccess(true);
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 2000);
      } else {
        // Lógica para reset: llamar a la API de reset-password
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, newPassword }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Error al cambiar la contraseña");
        }

        setIsSuccess(true);
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 2000);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error al cambiar la contraseña"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar si el botón debe estar deshabilitado
  const isSubmitDisabled = 
    isLoading || 
    !!passwordError || 
    containsPersonalInfo(newPassword, username, fullName) ||
    !!historyError;

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

      {historyError && (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-lg flex items-center gap-2">
          <ExclamationTriangleIcon className="w-5 h-5" />
          {historyError}
        </div>
      )}

      {mode === "change" && (
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
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-3.5"
            >
              {showCurrentPassword ? (
                <EyeSlashIcon className="w-5 h-5 text-gray-400" />
              ) : (
                <EyeIcon className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>
      )}

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
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-3.5"
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
          fullName={fullName}
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
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-3.5"
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
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="flex-1 px-4 py-2 bg-uniss-blue text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Procesando..." : "Cambiar contraseña"}
        </button>
      </div>
    </form>
  );
}