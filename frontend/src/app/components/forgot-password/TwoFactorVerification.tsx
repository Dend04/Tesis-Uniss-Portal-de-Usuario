// components/forgot-password/TwoFactorVerification.tsx - VERSIÓN SIMPLIFICADA
"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  KeyIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface UserData {
  email: string;
  displayName?: string;
  sAMAccountName?: string;
  employeeID?: string;
  userPrincipalName?: string;
  dn: string;
  accountStatus?: string;
  has2FA?: boolean;
}

interface TwoFactorVerificationProps {
  userData: UserData;
  userIdentifier: string;
  onVerificationSuccess: () => void;
  onBack: () => void;
}

export default function TwoFactorVerification({
  userData,
  userIdentifier,
  onVerificationSuccess,
  onBack,
}: TwoFactorVerificationProps) {
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);
  const [retryCount, setRetryCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Temporizador para el código TOTP
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 1 ? prev - 1 : 30));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-verificación cuando se completan 6 dígitos
  useEffect(() => {
    if (verificationCode.length === 6) {
      const autoVerifyTimer = setTimeout(() => {
        handleVerifyCode();
      }, 300);

      return () => clearTimeout(autoVerifyTimer);
    }
  }, [verificationCode]);

const handleVerifyCode = async () => {
  if (verificationCode.length !== 6) {
    setError("El código debe tener 6 dígitos");
    return;
  }

  setIsLoading(true);
  setError("");

  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    
    // ✅ USAR EL NUEVO ENDPOINT SIMPLIFICADO
    const response = await fetch(`${API_URL}/2fa/verify-totp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: userData.sAMAccountName || userIdentifier,
        code: verificationCode,
      }),
    });

    console.log("🔐 Verificando código TOTP:", {
      identifier: userData.sAMAccountName || userIdentifier,
      codeLength: verificationCode.length
    });

    const result = await response.json();
    console.log("📨 Respuesta del servidor:", response.status, result);

    if (!response.ok) {
      setError(result.error || "Error al verificar el código");
      return;
    }

    if (result.success) {
      console.log("✅ Verificación TOTP exitosa");
      onVerificationSuccess();
    } else {
      setError(result.error || "Error en la verificación");
    }

  } catch (err: any) {
    console.error("💥 Error en verificación TOTP:", err);
    
    if (err.message.includes("fetch") || err.message.includes("network")) {
      setError("Error de conexión. Verifica tu conexión a internet.");
    } else {
      setError("Error interno del servidor. Intente nuevamente.");
    }
  } finally {
    setIsLoading(false);
  }
};

  const handleVerificationError = () => {
    if (retryCount < 2) {
      setError(
        `Código incorrecto (Intento ${retryCount + 1}/3). Verifica que la hora de tu dispositivo esté sincronizada.`
      );
      setRetryCount((prev) => prev + 1);
      setVerificationCode("");
      inputRef.current?.focus();
    } else {
      setError(
        "Código incorrecto después de múltiples intentos. Verifica que la hora de tu dispositivo esté sincronizada correctamente."
      );
    }
  };

  const handleRetry = () => {
    setError("");
    setVerificationCode("");
    inputRef.current?.focus();
  };

  const formatTime = (seconds: number) => {
    return seconds.toString().padStart(2, '0');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8"
    >
      <div className="text-center mt-4 sm:mt-6 mb-4 sm:mb-6">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100">
          <KeyIcon className="h-6 w-6 text-orange-600" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mt-4 mb-2">
          Verificación en Dos Pasos
        </h2>
        <p className="text-gray-600">
          Abre tu aplicación de autenticación e ingresa el código de 6 dígitos
        </p>
        
        {/* Información del usuario */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            Verificando: <span className="font-medium">{userData.displayName || userData.sAMAccountName}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {userData.email}
          </p>
        </div>
      </div>

      {/* Timer */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-full">
          <ClockIcon className="w-4 h-4 text-orange-600" />
          <span className="text-sm font-medium text-orange-700">
            El código cambia en: {formatTime(timeLeft)}s
          </span>
        </div>
      </div>

      {/* Código de verificación */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
            Código de verificación
            <br />
            <span className="text-xs text-gray-500">
              La verificación será automática al completar 6 dígitos
            </span>
          </label>

          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                setVerificationCode(value);
                setError("");
              }}
              placeholder="000000"
              className={`w-full p-4 text-center text-xl font-mono rounded-xl border-2 transition-all duration-200 ${
                error 
                  ? "border-red-500 bg-red-50 shake-animation" 
                  : verificationCode.length === 6 
                  ? "border-green-500 bg-green-50" 
                  : "border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              }`}
              autoFocus
              disabled={isLoading}
            />

            {/* Indicador de progreso */}
            <div className="absolute -bottom-6 left-0 right-0 text-xs text-gray-500 text-center">
              {verificationCode.length === 6
                ? "✓ Código completo - Verificando..."
                : `${verificationCode.length}/6 dígitos`}
            </div>
          </div>
        </div>

        {/* Mensaje de error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-red-50 p-4 rounded-xl border border-red-200"
          >
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
              <div className="text-left flex-1">
                <p className="text-red-700 text-sm font-medium">{error}</p>
                
                {error.includes("incorrecto") && retryCount > 0 && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleRetry}
                      disabled={isLoading}
                      className="px-3 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? "Verificando..." : "Intentar de nuevo"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
          >
            Volver
          </button>
          
          <button
            type="button"
            onClick={handleVerifyCode}
            disabled={verificationCode.length !== 6 || isLoading}
            className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 px-4 rounded-lg hover:from-orange-700 hover:to-red-700 transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                Verificar
              </>
            )}
          </button>
        </div>

        {/* Información adicional */}
        <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
          <h4 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-2">
            <KeyIcon className="w-4 h-4 text-orange-600" />
            ¿Problemas con el código?
          </h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Asegúrese de que la hora de su dispositivo esté sincronizada correctamente</li>
            <li>• El código debe ser de 6 dígitos y cambiar cada 30 segundos</li>
            <li>• Verifique que está usando la aplicación de autenticación correcta</li>
            <li>• Si sigue teniendo problemas, use otro método de recuperación</li>
          </ul>
        </div>
      </div>

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
    </motion.div>
  );
}