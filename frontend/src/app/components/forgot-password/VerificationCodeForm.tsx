// src/app/components/forgot-password/VerificationCodeForm.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { EnvelopeIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface UserData {
  email: string;
  displayName?: string;
  sAMAccountName?: string;
}

interface VerificationCodeFormProps {
  userData: UserData;
  onBack: () => void;
  onCodeVerified: (code: string) => void
}

// Función para enmascarar el email de manera inteligente
const maskEmail = (email: string): string => {
  if (!email) return "";
  
  const [username, domain] = email.split('@');
  if (!username || !domain) return email;

  if (username.length <= 3) {
    // Si el username tiene 3 o menos caracteres, mostrar solo el primero
    const firstChar = username.substring(0, 1);
    const asterisks = '*'.repeat(Math.max(username.length - 1, 1));
    return `${firstChar}${asterisks}@${domain}`;
  } else if (username.length <= 6) {
    // Si el username tiene entre 4 y 6 caracteres, mostrar primeros 3 + asteriscos
    const visiblePart = username.substring(0, 3);
    const asterisks = '*'.repeat(username.length - 3);
    return `${visiblePart}${asterisks}@${domain}`;
  } else {
    // Si el username tiene más de 6 caracteres, mostrar primeros 3 + ... + últimos 3
    const firstPart = username.substring(0, 3);
    const lastPart = username.substring(username.length - 3);
    return `${firstPart}...${lastPart}@${domain}`;
  }
};

export default function VerificationCodeForm({
  userData,
  onBack,
  onCodeVerified,
}: VerificationCodeFormProps) {
  const [verificationCode, setVerificationCode] = useState<string[]>(Array(6).fill(""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Email enmascarado
  const maskedEmail = maskEmail(userData.email);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, []);

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    if (value !== "" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (value === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && verificationCode[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

const handleVerify = async (e: React.FormEvent) => {
  e.preventDefault();
  const code = verificationCode.join("");
  
  if (code.length !== 6) {
    setError("Por favor, ingrese el código completo de 6 dígitos");
    return;
  }

  setIsSubmitting(true);
  setError("");

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/email/verify-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: userData.email,
        code: code,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Código de verificación incorrecto");
    }

    const result = await response.json();

    if (result.success) {
      // ✅ Pasa el código verificado a la función
      onCodeVerified(code);
    } else {
      throw new Error(result.message || "Error en la verificación");
    }
  } catch (err: any) {
    setError(err.message || "Error al verificar el código");
  } finally {
    setIsSubmitting(false);
  }
};

  const handleResendCode = async () => {
    setIsSubmitting(true);
    setError("");
    
    try {
      // Reenviar código usando el endpoint de forgot-password
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/email/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userIdentifier: userData.sAMAccountName }),
      });

      if (!response.ok) {
        throw new Error("Error al reenviar el código");
      }

      setSuccessMessage("Código reenviado correctamente");
      setVerificationCode(Array(6).fill(""));
      if (inputRefs.current[0]) {
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setError(err.message || "Error al reenviar el código");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8"
    >
      <div className="text-center mt-4 sm:mt-6 mb-4 sm:mb-6">
        <div className="mx-auto flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-100">
          <EnvelopeIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mt-3 sm:mt-4 mb-2">
          Verificación de Código
        </h2>
        
        <div className="bg-blue-50 p-3 rounded-lg mb-4 text-left">
          <p className="text-sm text-blue-800">
            <strong>Usuario:</strong> {userData.displayName || userData.sAMAccountName}
            <br />
            <strong>Correo:</strong> {maskedEmail}
          </p>
        </div>
        
        <p className="text-sm sm:text-base text-gray-600">
          Se ha enviado un código de verificación a su correo electrónico
        </p>
      </div>

      {error && (
        <div className="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200 mb-4">
          <p className="text-red-700 text-xs sm:text-sm">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200 mb-4">
          <p className="text-green-700 text-xs sm:text-sm">{successMessage}</p>
        </div>
      )}

      <div className="space-y-4 sm:space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
            Ingrese el código de 6 dígitos
          </label>
          <div className="flex justify-center space-x-2">
            {verificationCode.map((digit, index) => (
              <input
                key={index}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                className="w-10 h-10 sm:w-12 sm:h-12 text-center text-lg sm:text-xl font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-6">
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm sm:text-base disabled:opacity-50"
          >
            Volver
          </button>
          <button
            onClick={handleVerify}
            disabled={isSubmitting || verificationCode.some((digit) => digit === "")}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium text-center text-sm sm:text-base disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin inline mr-2" />
                Verificando...
              </>
            ) : (
              "Verificar Código"
            )}
          </button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={handleResendCode}
            disabled={isSubmitting}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
          >
            ¿No recibió el código? Reenviar
          </button>
        </div>
      </div>
    </motion.div>
  );
}