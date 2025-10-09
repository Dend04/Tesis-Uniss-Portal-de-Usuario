"use client";

import { useState, useEffect, useCallback } from "react";
import {
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
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
  isDarkMode: boolean;
}

const PasswordStrength = ({ password, username, displayName, isDarkMode }: PasswordStrengthProps) => {
  const requirements = [
    { regex: /.{8,}/, text: "Mínimo 8 caracteres" },
    { regex: /[A-Z]/, text: "Al menos una mayúscula" },
    { regex: /[0-9]/, text: "Al menos un número" },
    { regex: /[^A-Za-z0-9]/, text: "Al menos un carácter especial" },
    { 
      validator: () => !containsPersonalInfo(password, username, displayName), 
      text: "No contener información personal" 
    },
  ];

  const calculateStrength = () => {
    const passedRequirements = requirements.filter(req => 
      req.regex ? req.regex.test(password) : req.validator!()
    ).length;
    
    return (passedRequirements / requirements.length) * 100;
  };

  const strength = calculateStrength();
  const strengthLevel = 
    strength === 100 ? "strong" :
    strength >= 60 ? "medium" :
    strength >= 30 ? "weak" : "very-weak";

  const strengthColors = {
    "strong": isDarkMode ? "bg-green-500" : "bg-green-500",
    "medium": isDarkMode ? "bg-yellow-500" : "bg-yellow-500",
    "weak": isDarkMode ? "bg-orange-500" : "bg-orange-500",
    "very-weak": isDarkMode ? "bg-red-500" : "bg-red-500"
  };

  const strengthText = {
    "strong": "Muy segura",
    "medium": "Moderada", 
    "weak": "Débil",
    "very-weak": "Muy débil"
  };

  return (
    <div className={`mt-4 p-4 rounded-xl border ${
      isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-sm font-medium ${
          isDarkMode ? "text-gray-300" : "text-gray-700"
        }`}>
          Seguridad de la contraseña
        </span>
        {password && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            strengthLevel === "strong" ? (isDarkMode ? "bg-green-900/50 text-green-400" : "bg-green-100 text-green-700") :
            strengthLevel === "medium" ? (isDarkMode ? "bg-yellow-900/50 text-yellow-400" : "bg-yellow-100 text-yellow-700") :
            strengthLevel === "weak" ? (isDarkMode ? "bg-orange-900/50 text-orange-400" : "bg-orange-100 text-orange-700") :
            isDarkMode ? "bg-red-900/50 text-red-400" : "bg-red-100 text-red-700"
          }`}>
            {strengthText[strengthLevel]}
          </span>
        )}
      </div>

      {/* Barra de progreso de fortaleza */}
      {password && (
        <div className={`w-full h-2 rounded-full mb-4 ${
          isDarkMode ? "bg-gray-700" : "bg-gray-200"
        }`}>
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${strengthColors[strengthLevel]}`}
            style={{ width: `${strength}%` }}
          ></div>
        </div>
      )}

      <div className="space-y-2">
        {requirements.map((req, index) => {
          const isValid = req.regex ? req.regex.test(password) : req.validator!();
          
          return (
            <div key={index} className="flex items-center gap-3">
              <div className={`p-1 rounded-full ${
                isValid 
                  ? (isDarkMode ? "bg-green-900/50 text-green-400" : "bg-green-100 text-green-600")
                  : (isDarkMode ? "bg-gray-700 text-gray-500" : "bg-gray-200 text-gray-400")
              }`}>
                {isValid ? (
                  <CheckCircleIcon className="w-4 h-4" />
                ) : (
                  <XCircleIcon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-sm ${
                  isValid 
                    ? (isDarkMode ? "text-green-400" : "text-green-600")
                    : (isDarkMode ? "text-gray-400" : "text-gray-500")
                }`}
              >
                {req.text}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Mensajes explicativos si hay coincidencias */}
      {username && containsPersonalInfo(password, username, undefined) && (
        <div className={`mt-3 p-3 rounded-lg border ${
          isDarkMode ? "bg-red-900/20 border-red-800 text-red-400" : "bg-red-50 border-red-200 text-red-700"
        }`}>
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="text-xs">
              La contraseña contiene su nombre de usuario <strong>"{username}"</strong>
            </span>
          </div>
        </div>
      )}
      
      {displayName && containsPersonalInfo(password, undefined, displayName) && (
        <div className={`mt-3 p-3 rounded-lg border ${
          isDarkMode ? "bg-red-900/20 border-red-800 text-red-400" : "bg-red-50 border-red-200 text-red-700"
        }`}>
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="text-xs">
              La contraseña contiene su nombre completo o partes del mismo
            </span>
          </div>
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

// Componente de campo de contraseña reutilizable
const PasswordField = ({
  label,
  value,
  onChange,
  showPassword,
  onToggleVisibility,
  error,
  isDarkMode,
  isLoading,
  placeholder = "",
  autoComplete = "current-password"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  onToggleVisibility: () => void;
  error?: string;
  isDarkMode: boolean;
  isLoading: boolean;
  placeholder?: string;
  autoComplete?: string;
}) => (
  <div>
    <label
      className={`block mb-3 font-medium ${
        isDarkMode ? "text-gray-300" : "text-gray-700"
      }`}
    >
      {label}
    </label>
    <div className="relative">
      <div className="absolute left-3 top-3.5">
        <LockClosedIcon className={`w-5 h-5 ${
          isDarkMode ? "text-gray-500" : "text-gray-400"
        }`} />
      </div>
      <input
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full pl-11 pr-12 py-3 rounded-xl border-2 transition-all duration-200 ${
          isDarkMode
            ? "bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            : "bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        } ${error ? "border-red-500 shake-animation" : ""}`}
        placeholder={placeholder}
        required
        disabled={isLoading}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={onToggleVisibility}
        className={`absolute right-3 top-3.5 p-1 rounded-lg transition-colors ${
          isDarkMode 
            ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700" 
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
        }`}
        disabled={isLoading}
      >
        {showPassword ? (
          <EyeSlashIcon className="w-5 h-5" />
        ) : (
          <EyeIcon className="w-5 h-5" />
        )}
      </button>
    </div>
    {error && (
      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
        <ExclamationTriangleIcon className="w-4 h-4" />
        {error}
      </p>
    )}
  </div>
);

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
  const [showTips, setShowTips] = useState(true);
  
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

  // Calcular fortaleza de la contraseña para el botón
  const calculatePasswordStrength = useCallback((password: string) => {
    const requirements = [
      /.{8,}/,
      /[A-Z]/,
      /[0-9]/,
      /[^A-Za-z0-9]/,
    ];
    
    const passed = requirements.filter(regex => regex.test(password)).length;
    return (passed / requirements.length) * 100;
  }, []);

  const passwordStrength = calculatePasswordStrength(newPassword);

  return (
    <div className="mt-4 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${
            isDarkMode ? "text-gray-100" : "text-gray-800"
          }`}>
            Cambiar Contraseña
          </h3>
          <p className={`text-sm mt-1 ${
            isDarkMode ? "text-gray-400" : "text-gray-600"
          }`}>
            Actualiza tu contraseña para mantener tu cuenta segura
          </p>
        </div>
        <div className={`p-2 rounded-lg ${
          isDarkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-600"
        }`}>
          <ShieldCheckIcon className="w-5 h-5" />
        </div>
      </div>

      {/* Alertas */}
      {isSuccess && (
        <div className={`p-4 rounded-xl border-2 ${
          isDarkMode 
            ? "bg-green-900/20 border-green-800 text-green-400" 
            : "bg-green-50 border-green-200 text-green-700"
        }`}>
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">¡Contraseña cambiada exitosamente!</p>
              <p className="text-sm mt-1">Tu contraseña ha sido actualizada correctamente.</p>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className={`p-4 rounded-xl border-2 ${
          isDarkMode 
            ? "bg-red-900/20 border-red-800 text-red-400" 
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Error al cambiar la contraseña</p>
              <p className="text-sm mt-1">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Consejos de seguridad */}
      {showTips && (
        <div className={`p-4 rounded-xl border ${
          isDarkMode 
            ? "bg-blue-900/20 border-blue-800" 
            : "bg-blue-50 border-blue-200"
        }`}>
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-3">
              <InformationCircleIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                isDarkMode ? "text-blue-400" : "text-blue-600"
              }`} />
              <div>
                <h4 className={`font-medium text-sm ${
                  isDarkMode ? "text-blue-300" : "text-blue-800"
                }`}>
                  Consejos para una contraseña segura
                </h4>
                <ul className={`text-xs mt-1 space-y-1 ${
                  isDarkMode ? "text-blue-400" : "text-blue-700"
                }`}>
                  <li>• Use una combinación de letras, números y símbolos</li>
                  <li>• Evite información personal como nombres o fechas</li>
                  <li>• Considere usar una frase de contraseña única</li>
                </ul>
              </div>
            </div>
            <button
              onClick={() => setShowTips(false)}
              className={`text-xs px-2 py-1 rounded ${
                isDarkMode 
                  ? "text-blue-400 hover:bg-blue-800/50" 
                  : "text-blue-600 hover:bg-blue-100"
              }`}
            >
              Ocultar
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campo de contraseña actual */}
        <PasswordField
          label="Contraseña actual"
          value={currentPassword}
          onChange={setCurrentPassword}
          showPassword={showCurrentPassword}
          onToggleVisibility={() => setShowCurrentPassword(!showCurrentPassword)}
          isDarkMode={isDarkMode}
          isLoading={isLoading}
          placeholder="Ingresa tu contraseña actual"
          autoComplete="current-password"
        />

        {/* Campo de nueva contraseña */}
        <PasswordField
          label="Nueva contraseña"
          value={newPassword}
          onChange={setNewPassword}
          showPassword={showNewPassword}
          onToggleVisibility={() => setShowNewPassword(!showNewPassword)}
          isDarkMode={isDarkMode}
          isLoading={isLoading}
          placeholder="Crea una nueva contraseña"
          autoComplete="new-password"
        />

        {/* Indicador de fortaleza */}
        {newPassword && (
          <PasswordStrength 
            password={newPassword} 
            username={username}
            displayName={displayName}
            isDarkMode={isDarkMode}
          />
        )}

        {/* Campo de confirmación */}
        <PasswordField
          label="Confirmar nueva contraseña"
          value={confirmPassword}
          onChange={setConfirmPassword}
          showPassword={showConfirmPassword}
          onToggleVisibility={() => setShowConfirmPassword(!showConfirmPassword)}
          error={passwordError}
          isDarkMode={isDarkMode}
          isLoading={isLoading}
          placeholder="Repite tu nueva contraseña"
          autoComplete="new-password"
        />

        {/* Botones de acción */}
        <div className="flex gap-4 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-200 border ${
                isDarkMode
                  ? "border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-gray-100 disabled:opacity-50"
                  : "border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
              }`}
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 relative overflow-hidden ${
              isSubmitDisabled
                ? (isDarkMode 
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed" 
                    : "bg-gray-300 text-gray-500 cursor-not-allowed")
                : (isDarkMode
                    ? "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25"
                    : "bg-blue-500 text-white hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/25")
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Cambiando contraseña...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <ShieldCheckIcon className="w-4 h-4" />
                Cambiar contraseña
              </span>
            )}
            
            {/* Barra de progreso sutil */}
            {!isSubmitDisabled && newPassword && (
              <div 
                className={`absolute bottom-0 left-0 h-1 ${
                  passwordStrength === 100 ? "bg-green-500" :
                  passwordStrength >= 60 ? "bg-yellow-500" :
                  passwordStrength >= 30 ? "bg-orange-500" : "bg-red-500"
                }`}
                style={{ width: `${passwordStrength}%` }}
              />
            )}
          </button>
        </div>
      </form>

      {/* Estilos de animación */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .shake-animation {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}