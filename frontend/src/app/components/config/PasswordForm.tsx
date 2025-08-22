// app/components/PasswordForm.tsx
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

const PasswordStrength = ({ password }: { password: string }) => {
  const requirements = [
    { regex: /.{8,}/, text: "Mínimo 8 caracteres" },
    { regex: /[A-Z]/, text: "Al menos una mayúscula" },
    { regex: /[0-9]/, text: "Al menos un número" },
    { regex: /[^A-Za-z0-9]/, text: "Al menos un carácter especial" },
  ];

  return (
    <div className="mt-4 space-y-2">
      {requirements.map((req, index) => (
        <div key={index} className="flex items-center gap-2">
          {req.regex.test(password) ? (
            <CheckCircleIcon className="w-4 h-4 text-green-500" />
          ) : (
            <XCircleIcon className="w-4 h-4 text-red-500" />
          )}
          <span
            className={`text-sm ${
              req.regex.test(password) ? "text-green-600" : "text-red-600"
            }`}
          >
            {req.text}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function PasswordForm({ isDarkMode, onSuccess, onCancel }: PasswordFormProps) {
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

  // Validar coincidencia de contraseñas en tiempo real
  useEffect(() => {
    if (confirmPassword && newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
    } else {
      setPasswordError("");
    }
  }, [newPassword, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    // Validación adicional antes de enviar
    if (newPassword !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden");
      setIsLoading(false);
      return;
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulación de verificación de contraseña actual (debería venir de una API)
      if (currentPassword !== "password123") { // Esto es solo para demostración
        throw new Error("La contraseña actual es incorrecta");
      }

      if (newPassword !== confirmPassword) {
        throw new Error("Las contraseñas no coinciden");
      }

      setIsSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error al cambiar la contraseña"
      );
    } finally {
      setIsLoading(false);
    }
  };

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
        <PasswordStrength password={newPassword} />
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
          disabled={isLoading || !!passwordError}
          className="flex-1 px-4 py-2 bg-uniss-blue text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Procesando..." : "Cambiar contraseña"}
        </button>
      </div>
    </form>
  );
}