// app/components/config/EmailForm.tsx
"use client";

import { useState, useEffect } from "react";
import { 
  ExclamationTriangleIcon, 
  EnvelopeIcon,
  ArrowLeftIcon,
  QuestionMarkCircleIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

interface EmailFormProps {
  isDarkMode: boolean;
  currentEmail: string;
  onCancel: () => void;
  onSuccess: (newEmail: string) => void;
}

// Modal de ayuda
const HelpModal = ({ isOpen, onClose, email, isDarkMode }: { 
  isOpen: boolean; 
  onClose: () => void;
  email: string;
  isDarkMode: boolean;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`relative max-w-md w-full rounded-lg p-6 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1 rounded-full ${
            isDarkMode ? "text-gray-400 hover:bg-gray-700" : "text-gray-500 hover:bg-gray-200"
          }`}
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
        
        <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
          ¿No recibiste el código?
        </h3>
        
        <div className={`text-sm mb-6 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
          <p className="mb-4">
            Por favor, verifica que el correo suministrado sea correcto:
          </p>
          <p className="font-semibold mb-4">{email}</p>
          <p className="mb-4">
            Si no es correcto, haz clic en el enlace "No es mi correo" para volver a ingresarlo.
          </p>
          <p className="mb-4">
            Si el correo es correcto, espera un momento ya que a veces los correos pueden tardar en llegar. 
            También revisa la carpeta de spam o correo no deseado de tu buzón, ya que a veces es filtrado allí.
          </p>
          <p>
            Si continúas sin recibir el código, por favor dirígete a las oficinas de soporte para recibir asistencia.
          </p>
        </div>
        
        <button
          onClick={onClose}
          className={`w-full py-2 px-4 rounded-lg ${
            isDarkMode 
              ? "bg-blue-600 text-white hover:bg-blue-700" 
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          Entendido
        </button>
      </div>
    </div>
  );
};

export default function EmailForm({ isDarkMode, currentEmail, onCancel, onSuccess }: EmailFormProps) {
  const [newEmail, setNewEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [step, setStep] = useState<"email" | "verification">("email");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0); // en segundos
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Efecto para el contador
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Efecto para animar el botón de información
  useEffect(() => {
    // Iniciar animación después de un breve retraso
    const timer = setTimeout(() => {
      setIsShaking(true);
      
      // Detener animación después de 2 segundos
      const stopTimer = setTimeout(() => {
        setIsShaking(false);
      }, 2000);
      
      return () => clearTimeout(stopTimer);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

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

      // Enviar solicitud al backend para enviar el código de verificación
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/email/cambioCorreo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al enviar el código de verificación");
      }

      setIsCodeSent(true);
      setStep("verification");
      setCountdown(600); // 10 minutos en segundos
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/email/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: newEmail, 
          code: verificationCode 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al verificar el código");
      }

      // Éxito - llamar a la función onSuccess con el nuevo email
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
    if (countdown > 0) return; // No hacer nada si el contador está activo

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/email/cambioCorreo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al reenviar el código");
      }

      // Reiniciar el contador
      setCountdown(600);
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
    setCountdown(0);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Verificando..." : "Confirmar cambio"}
            </button>
          </div>

          <div className={`text-center mt-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            <p className="text-sm">¿No recibiste el código?</p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={countdown > 0 || isLoading}
                className={`text-blue-500 hover:text-blue-700 text-sm ${
                  countdown > 0 ? "line-through opacity-50 cursor-not-allowed" : ""
                }`}
              >
                Reenviar código {countdown > 0 && `(${formatTime(countdown)})`}
              </button>
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className={`p-1 rounded-full ${
                  isDarkMode 
                    ? "text-gray-400 hover:bg-gray-600" 
                    : "text-blue-500 hover:bg-blue-200"
                } ${isShaking ? "animate-bounce" : ""}`}
              >
                <QuestionMarkCircleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="text-center mt-2">
            <button
              type="button"
              onClick={handleBackToEmail}
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              ¿Te equivocaste al suministrar el correo? Haz clic aquí para corregirlo
            </button>
          </div>
        </form>
      )}

      <HelpModal 
        isOpen={showHelpModal} 
        onClose={() => setShowHelpModal(false)} 
        email={newEmail}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}