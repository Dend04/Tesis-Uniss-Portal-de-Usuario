// app/components/config/EmailForm.tsx
"use client";

import { useState } from "react";
import { 
  ExclamationTriangleIcon, 
  EnvelopeIcon,
  ArrowLeftIcon
} from "@heroicons/react/24/outline";

interface EmailFormProps {
  isDarkMode: boolean;
  currentEmail: string;
  onCancel: () => void;
  onSuccess: (newEmail: string) => void;
}

export default function EmailForm({ isDarkMode, currentEmail, onCancel, onSuccess }: EmailFormProps) {
  const [newEmail, setNewEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [step, setStep] = useState<"email" | "verification">("email");
  const [isCodeSent, setIsCodeSent] = useState(false);

  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        throw new Error("Por favor ingresa un correo electrónico válido");
      }

      if (newEmail === currentEmail) {
        throw new Error("El nuevo correo no puede ser igual al actual");
      }

      // Enviar código de verificación al backend
      const response = await fetch('/api/email/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al enviar el código de verificación");
      }

      setIsCodeSent(true);
      setStep("verification");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error al enviar el código de verificación"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      // Validar código de verificación
      if (verificationCode.length !== 6 || !/^\d+$/.test(verificationCode)) {
        throw new Error("Por favor ingresa un código de verificación válido de 6 dígitos");
      }

      // Verificar código y cambiar email
      const response = await fetch('/api/email/verify-and-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          newEmail, 
          verificationCode,
          currentEmail 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al verificar el código");
      }

      // Éxito
      onSuccess(newEmail);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error al verificar el código"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch('/api/email/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al reenviar el código");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error al reenviar el código"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep("email");
    setVerificationCode("");
    setErrorMessage("");
  };

  return (
    <div className="mt-4">
      {step === "email" ? (
        <form onSubmit={handleSendVerification} className="space-y-4">
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5" />
              {errorMessage}
            </div>
          )}

          <div>
            <label className={`block mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              Correo electrónico actual
            </label>
            <input
              type="email"
              value={currentEmail}
              disabled
              className={`w-full p-3 rounded-lg border ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-gray-400"
                  : "bg-gray-100 border-gray-300 text-gray-500"
              }`}
            />
          </div>

          <div>
            <label className={`block mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              Nuevo correo electrónico
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className={`w-full p-3 rounded-lg border ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-gray-200"
                  : "bg-white border-gray-300 text-gray-800"
              }`}
              required
              placeholder="nuevo@ejemplo.com"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-uniss-blue text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? "Enviando código..." : "Continuar"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerifyAndChange} className="space-y-4">
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5" />
              {errorMessage}
            </div>
          )}

          <div className="text-center mb-6">
            <EnvelopeIcon className="w-12 h-12 text-blue-500 mx-auto mb-2" />
            <h3 className={`text-lg font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              Verifica tu nuevo correo
            </h3>
            <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              Hemos enviado un código de verificación a <strong>{newEmail}</strong>
            </p>
          </div>

          <div>
            <label className={`block mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              Código de verificación
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setVerificationCode(value);
              }}
              placeholder="123456"
              className={`w-full p-3 rounded-lg border ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-gray-200"
                  : "bg-white border-gray-300 text-gray-800"
              }`}
              required
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleBackToEmail}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Atrás
            </button>
            <button
              type="submit"
              disabled={isLoading || verificationCode.length !== 6}
              className="flex-1 px-4 py-2 bg-uniss-blue text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? "Verificando..." : "Confirmar cambio"}
            </button>
          </div>

          <div className={`text-center mt-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            <p className="text-sm">¿No recibiste el código?</p>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isLoading}
              className="text-blue-500 hover:text-blue-700 text-sm disabled:opacity-50"
            >
              Reenviar código
            </button>
          </div>
        </form>
      )}
    </div>
  );
}