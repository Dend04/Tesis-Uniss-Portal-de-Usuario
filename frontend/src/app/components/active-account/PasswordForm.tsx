// src/app/components/active-account/PasswordForm.tsx
"use client";

import { useState, useEffect } from "react";
import {
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

interface PasswordFormProps {
  userData: any;
  username: string;
  email: string;
  userType: "student" | "employee";
  onAccountCreated: (userPrincipalName: string) => void;
  onBack: () => void;
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

export default function PasswordForm({
  userData,
  username,
  email,
  userType,
  onAccountCreated,
  onBack,
}: PasswordFormProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  useEffect(() => {
    if (confirmPassword && newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
    } else {
      setPasswordError("");
    }
  }, [newPassword, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (newPassword !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden");
      return;
    }

    // Validar fortaleza de contraseña - expresión regular más flexible
    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!strongPassword.test(newPassword)) {
      setErrorMessage(
        "La contraseña no cumple con los requisitos de seguridad"
      );
      return;
    }

    // Crear la cuenta
    setIsCreatingAccount(true);
    try {
        const endpoint =
        userType === "student"
          ? `${process.env.NEXT_PUBLIC_API_URL}/students/${userData.ci}/create-account`
          : `${process.env.NEXT_PUBLIC_API_URL}/worker/create-user/${userData.ci}`;
          
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          email,
          password: newPassword,
          userData,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const errorText = await response.text();
        throw new Error(`Expected JSON, got ${contentType}: ${errorText}`);
      }

      const result = await response.json();

      // Pasar el userPrincipalName al componente padre
      onAccountCreated(result.userPrincipalName || `${username}@uniss.edu.cu`);
    } catch (error: any) {
      console.error("Error al crear cuenta:", error);
      setErrorMessage(error.message || "Error al crear la cuenta");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8">
      <div className="text-center mt-4 sm:mt-6 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
          Establecer Contraseña
        </h2>
        <p className="text-gray-600">
          Establezca una contraseña segura para su cuenta.
        </p>
      </div>

      {errorMessage && (
        <div className="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200 mb-4">
          <p className="text-red-700 text-xs sm:text-sm">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-2 sm:right-3 top-2 sm:top-3"
            >
              {showNewPassword ? (
                <EyeSlashIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              ) : (
                <EyeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              )}
            </button>
          </div>
          <PasswordStrength password={newPassword} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirmar contraseña
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full p-2 sm:p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all ${
                passwordError ? "border-red-500" : "border-gray-300"
              }`}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-2 sm:right-3 top-2 sm:top-3"
            >
              {showConfirmPassword ? (
                <EyeSlashIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              ) : (
                <EyeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              )}
            </button>
          </div>
          {passwordError && (
            <p className="mt-2 text-sm text-red-600">{passwordError}</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            type="button"
            onClick={onBack}
            disabled={isCreatingAccount}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm sm:text-base disabled:opacity-50"
          >
            Volver
          </button>
          <button
            type="submit"
            disabled={!!passwordError || isCreatingAccount}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium text-center text-sm sm:text-base disabled:opacity-50"
          >
            {isCreatingAccount ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </div>
      </form>
    </div>
  );
}
