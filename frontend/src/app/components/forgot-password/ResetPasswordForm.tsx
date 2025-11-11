// src/app/components/forgot-password/ResetPasswordForm.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface UserData {
  email: string;
  displayName?: string;
  sAMAccountName?: string;
  dn: string;
}

interface ResetPasswordFormProps {
  userData: UserData;
  userIdentifier: string;
  verifiedCode: string;
  onBack: () => void;
  onPasswordReset: () => void;
  flowType?: 'email' | 'pin' | '2fa'; // ✅ Nuevo prop para identificar el flujo
}

const PasswordStrength = ({ 
  password, 
  username 
}: { 
  password: string;
  username?: string;
}) => {
  const requirements = [
    { regex: /.{8,}/, text: "Mínimo 8 caracteres" },
    { regex: /[A-Z]/, text: "Al menos una mayúscula" },
    { regex: /[0-9]/, text: "Al menos un número" },
    { regex: /[^A-Za-z0-9]/, text: "Al menos un carácter especial" },
    { 
      validator: () => !username || !password.toLowerCase().includes(username.toLowerCase()), 
      text: "No coincidir con nombre de usuario" 
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
    </div>
  );
};

export default function ResetPasswordForm({
  userData,
  userIdentifier,
  verifiedCode,
  onBack,
  onPasswordReset,
  flowType = 'email' // ✅ Valor por defecto
}: ResetPasswordFormProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (confirmPassword && newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
    } else {
      setPasswordError("");
    }
  }, [newPassword, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    // Validar fortaleza de contraseña
    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!strongPassword.test(newPassword)) {
      setError("La contraseña no cumple con los requisitos de seguridad");
      return;
    }

    setIsSubmitting(true);

    try {
      let endpoint = "";
      let requestBody = {};

      // ✅ DETERMINAR ENDPOINT Y BODY SEGÚN EL FLUJO
      switch (flowType) {
        case 'pin':
          endpoint = "/pin/reset-password";
          requestBody = {
            userIdentifier,
            newPassword
            // No necesita verifiedCode porque ya se verificó el PIN
          };
          break;

        case '2fa':
          endpoint = "/2fa/reset-password"; // ✅ Asumiendo que existe este endpoint
          requestBody = {
            userIdentifier,
            newPassword
            // Para 2FA, podrías necesitar el token si lo tienes
          };
          break;

        case 'email':
        default:
          endpoint = "/email/reset-password";
          requestBody = {
            userIdentifier,
            code: verifiedCode,
            newPassword
          };
          break;
      }

      console.log(`🔄 Enviando request a: ${endpoint}`, { 
        flowType, 
        userIdentifier,
        hasCode: flowType === 'email' ? !!verifiedCode : 'N/A'
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `Error al restablecer la contraseña (${response.status})`);
      }

      if (result.success) {
        console.log("✅ Contraseña restablecida exitosamente");
        onPasswordReset();
      } else {
        throw new Error(result.message || "Error en el restablecimiento");
      }
    } catch (err: any) {
      console.error("❌ Error restableciendo contraseña:", err);
      setError(err.message || "Error al restablecer la contraseña. Intente nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Obtener título, descripción y estilos según el flujo
  const getFlowInfo = () => {
    switch (flowType) {
      case 'pin':
        return {
          title: "Nueva Contraseña - Método PIN",
          description: "Establezca una nueva contraseña segura para su cuenta (verificado por PIN)",
          badge: {
            text: 'Verificado con PIN',
            class: 'bg-purple-100 text-purple-800'
          }
        };
      case '2fa':
        return {
          title: "Nueva Contraseña - Método 2FA", 
          description: "Establezca una nueva contraseña segura para su cuenta (verificado por 2FA)",
          badge: {
            text: 'Verificado con 2FA',
            class: 'bg-orange-100 text-orange-800'
          }
        };
      default:
        return {
          title: "Nueva Contraseña",
          description: "Establezca una nueva contraseña segura para su cuenta",
          badge: null
        };
    }
  };

  const flowInfo = getFlowInfo();

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8"
    >
      <div className="text-center mt-4 sm:mt-6 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
          {flowInfo.title}
        </h2>
        <p className="text-gray-600">
          {flowInfo.description}
        </p>
        
        {/* ✅ Indicador del método de verificación */}
        {flowInfo.badge && (
          <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${flowInfo.badge.class}`}>
            {flowInfo.badge.text}
          </div>
        )}
      </div>

      {/* ✅ Información del usuario y método */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-6">
        <p className="text-sm text-blue-800 font-medium">
          <strong>Usuario:</strong> {userData.displayName || userData.sAMAccountName}
        </p>
        <p className="text-sm text-blue-600 mt-1">
          <strong>Método:</strong> {flowType === 'email' ? 'Correo Electrónico' : 
                                 flowType === 'pin' ? 'PIN de Seguridad' : 
                                 'Autenticación de Dos Factores'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200 mb-4">
          <p className="text-red-700 text-xs sm:text-sm">{error}</p>
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
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-2 sm:right-3 top-2 sm:top-3"
              disabled={isSubmitting}
            >
              {showNewPassword ? (
                <EyeSlashIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              ) : (
                <EyeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              )}
            </button>
          </div>
          <PasswordStrength 
            password={newPassword} 
            username={userData.sAMAccountName}
          />
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
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-2 sm:right-3 top-2 sm:top-3"
              disabled={isSubmitting}
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
            disabled={isSubmitting}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm sm:text-base disabled:opacity-50"
          >
            Volver
          </button>
          <button
            type="submit"
            disabled={!!passwordError || isSubmitting || newPassword.length === 0}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium text-center text-sm sm:text-base disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin inline mr-2" />
                Restableciendo...
              </>
            ) : (
              "Restablecer Contraseña"
            )}
          </button>
        </div>
      </form>

      {/* ✅ Información adicional según el método */}
      {flowType === 'pin' && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-800 text-sm mb-2">🔒 Seguridad del PIN</h4>
          <p className="text-xs text-gray-600">
            Su PIN de seguridad ha sido verificado correctamente. La nueva contraseña reemplazará la anterior de forma inmediata.
          </p>
        </div>
      )}

      {flowType === '2fa' && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-800 text-sm mb-2">🔐 Autenticación de Dos Factores</h4>
          <p className="text-xs text-gray-600">
            Su identidad ha sido verificada mediante autenticación de dos factores. La nueva contraseña será efectiva inmediatamente.
          </p>
        </div>
      )}
    </motion.div>
  );
}