"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  lazy,
  Suspense,
} from "react";
import {
  ExclamationTriangleIcon,
  EnvelopeIcon,
  ArrowLeftIcon,
  QuestionMarkCircleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Modal from "../Modal";

// Carga perezosa del componente de ayuda
const EmailHelpModal = lazy(() => import("../modals/EmailHelpModal"));

// Componente de carga para el modal
const ModalLoading = () => (
  <div className="flex justify-center items-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
);

interface EmailFormProps {
  isDarkMode: boolean;
  currentEmail: string;
  onCancel: () => void;
  onSuccess: (newEmail: string) => void;
}

export default function EmailForm({
  isDarkMode,
  currentEmail,
  onCancel,
  onSuccess,
}: EmailFormProps) {
  const [newEmail, setNewEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [step, setStep] = useState<"email" | "verification">("email");
  const [countdown, setCountdown] = useState(0);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isResendingGmail, setIsResendingGmail] = useState(false);
  const [resendStatus, setResendStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewEmail(value);

    if (value && !validateEmail(value)) {
      setEmailError("Por favor ingresa un correo electrónico válido");
    } else if (value.toLowerCase().endsWith("@uniss.edu.cu")) {
      setEmailError("No puedes utilizar un correo institucional @uniss. Por seguridad, usa un correo personal como Gmail, Yahoo, etc., para evitar perder acceso a tu cuenta.");
    } else {
      setEmailError("");
    }
  };

  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [countdown]);

  const validateEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  const handleSendVerification = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setErrorMessage("");

      try {
        if (!validateEmail(newEmail)) {
          throw new Error("Por favor ingresa un correo electrónico válido");
        }

        if (newEmail.toLowerCase().endsWith("@uniss.edu.cu")) {
          throw new Error(
            "No puedes utilizar un correo institucional @uniss. Por seguridad, usa un correo personal como Gmail, Yahoo, etc., para evitar perder acceso a tu cuenta."
          );
        }

        if (newEmail === currentEmail) {
          throw new Error("El nuevo correo no puede ser igual al actual");
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/email/change-email/send-code`,
          {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ 
              email: currentEmail,
              newEmail: newEmail,
              userName: "Usuario"
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Error al enviar el código de verificación"
          );
        }

        setStep("verification");
        setCountdown(600);
        // ✅ MOSTRAR MODAL DE CONFIRMACIÓN DE RECEPCIÓN
        setShowReceiptModal(true);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Error al enviar el código de verificación"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [newEmail, currentEmail, validateEmail]
  );

  const handleResendCodeGmail = async () => {
    setIsResendingGmail(true);
    setResendStatus(null);
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/email/resend-change-email-verification-gmail`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({ 
            email: currentEmail,
            newEmail: newEmail,
            userName: "Usuario"
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Error al reenviar el código ");
      }

      setResendStatus({
        success: true,
        message: "✅ Código reenviado exitosamente . Por favor revise su bandeja de entrada."
      });
      
      // Reiniciar el contador
      setCountdown(600);
      
    } catch (error: any) {
      setResendStatus({
        success: false,
        message: `❌ ${error.message}`
      });
    } finally {
      setIsResendingGmail(false);
    }
  };

  const handleConfirmReceipt = () => {
    setShowReceiptModal(false);
  };

  const handleVerifyAndChange = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setErrorMessage("");

      try {
        const token = localStorage.getItem('authToken');

        if (!token) {
          setErrorMessage("No estás autenticado");
          return;
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/email/change-email/verify-and-update`,
          {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ 
              newEmail: newEmail, 
              code: verificationCode 
            }),
          }
        );

        if (response.status === 401) {
          const errorText = await response.text();
          setErrorMessage("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Error al verificar el código");
        }

        setSuccessMessage("¡Correo actualizado exitosamente! Redirigiendo...");
        
        setTimeout(() => {
          setSuccessMessage("");
          setStep("email");
          setVerificationCode("");
          setNewEmail("");
          setCountdown(0);
          onSuccess(newEmail);
        }, 2000);

      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Error al verificar el código");
      } finally {
        setIsLoading(false);
      }
    },
    [verificationCode, newEmail, onSuccess]
  );

  const handleResendCode = useCallback(async () => {
    if (countdown > 0) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/email/change-email/send-code`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({ 
            email: currentEmail,
            newEmail: newEmail,
            userName: "Usuario"
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al reenviar el código");
      }

      setCountdown(600);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error al reenviar el código"
      );
    } finally {
      setIsLoading(false);
    }
  }, [countdown, newEmail]);

  const handleBackToEmail = useCallback(() => {
    setStep("email");
    setVerificationCode("");
    setErrorMessage("");
    setCountdown(0);
    setShowReceiptModal(false);
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  }, []);

  const preloadModal = useCallback(() => {
    import("../modals/EmailHelpModal");
  }, []);

  return (
    <div className="mt-4">
      {/* Modal de confirmación de recepción del correo */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="text-center mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <EnvelopeIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mt-3 mb-2">
                ¿Ha recibido el código de verificación?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Hemos enviado un código de verificación a:
              </p>
              <p className="text-blue-600 dark:text-blue-400 font-semibold my-2">{newEmail}</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Esta verificación es <span className="font-bold text-red-600">IMPORTANTE</span> para completar el cambio de correo.
              </p>
            </div>

            {resendStatus && (
              <div className={`p-3 rounded-lg mb-4 text-sm ${
                resendStatus.success 
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
                  : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}>
                {resendStatus.message}
              </div>
            )}

            <div className="flex flex-col space-y-3">
              {/* Botón NO - Verde (para hacer dudar) */}
              <button
                onClick={handleResendCodeGmail}
                disabled={isResendingGmail}
                className="w-full bg-green-600 text-white py-2.5 px-4 rounded-lg hover:bg-green-700 transition-all font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isResendingGmail ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Reenviando...</span>
                  </>
                ) : (
                  <>
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    <span>No, no lo he recibido</span>
                  </>
                )}
              </button>

              {/* Botón SÍ - Rojo (para confirmación) */}
              <button
                onClick={handleConfirmReceipt}
                className="w-full bg-red-600 text-white py-2.5 px-4 rounded-lg hover:bg-red-700 transition-all font-medium flex items-center justify-center space-x-2"
              >
                <CheckCircleIcon className="h-4 w-4" />
                <span>Sí, lo he recibido</span>
              </button>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-yellow-700 dark:text-yellow-300 text-xs text-center">
                <strong>Recomendación:</strong> Verifique en su bandeja de spam o correo no deseado antes de continuar.
              </p>
            </div>
          </div>
        </div>
      )}

      {step === "email" ? (
        <form onSubmit={handleSendVerification} className="space-y-6">
          {/* Header */}
          <div className="text-center mb-2">
            <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-3">
              <EnvelopeIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className={`text-lg font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
              Cambiar correo electrónico
            </h3>
            <p className={`text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              Actualiza tu correo de respaldo para notificaciones y recuperación de cuenta
            </p>
          </div>

          {errorMessage && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-red-700 dark:text-red-300 text-sm">{errorMessage}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                Correo electrónico actual
              </label>
              <div className={`w-full p-3 rounded-xl border ${isDarkMode ? "bg-gray-800 border-gray-700 text-gray-400" : "bg-gray-50 border-gray-300 text-gray-500"}`}>
                {currentEmail}
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                Nuevo correo electrónico
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={handleEmailChange}
                className={`w-full p-3 rounded-xl border transition-colors ${
                  emailError
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : isDarkMode
                    ? "bg-gray-800 border-gray-700 text-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    : "bg-white border-gray-300 text-gray-800 focus:border-blue-500 focus:ring-blue-500"
                } focus:ring-1 focus:outline-none`}
                required
                placeholder="ejemplo@gmail.com"
              />
              {emailError && (
                <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  {emailError}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className={`flex-1 px-4 py-3 rounded-xl border transition-all ${
                isDarkMode 
                  ? "border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500" 
                  : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              } font-medium`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !!emailError || !newEmail}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enviando código...
                </div>
              ) : (
                "Continuar"
              )}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerifyAndChange} className="space-y-6">
          {successMessage && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-start gap-3">
              <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-green-700 dark:text-green-300 text-sm">{successMessage}</p>
            </div>
          )}

          {!successMessage && (
            <>
              {/* Header de verificación */}
              <div className="text-center mb-2">
                <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                  <EnvelopeIcon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
                  Verifica tu nuevo correo
                </h3>
                <p className={`text-sm mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Hemos enviado un código de verificación a
                </p>
                <p className="font-medium text-blue-600 dark:text-blue-400 mt-1">{newEmail}</p>
              </div>

              {errorMessage && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-red-700 dark:text-red-300 text-sm">{errorMessage}</p>
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Código de verificación
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setVerificationCode(value);
                  }}
                  placeholder="123456"
                  className={`w-full p-3 text-center text-lg font-semibold rounded-xl border transition-colors ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-700 text-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      : "bg-white border-gray-300 text-gray-800 focus:border-blue-500 focus:ring-blue-500"
                  } focus:ring-1 focus:outline-none`}
                  required
                />
                <p className={`text-xs mt-2 text-center ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Ingresa el código de 6 dígitos que enviamos a tu correo
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBackToEmail}
                  className={`flex-1 px-4 py-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                    isDarkMode 
                      ? "border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500" 
                      : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                  } font-medium`}
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={isLoading || verificationCode.length !== 6}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verificando...
                    </div>
                  ) : (
                    "Confirmar cambio"
                  )}
                </button>
              </div>

              <div className={`text-center pt-4 border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                <p className={`text-sm mb-3 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  ¿No recibiste el código?
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={countdown > 0 || isLoading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      countdown > 0
                        ? "text-gray-400 cursor-not-allowed"
                        : isDarkMode
                        ? "text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                        : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    }`}
                  >
                    <ArrowPathIcon className={`w-4 h-4 ${countdown > 0 || isLoading ? "animate-spin" : ""}`} />
                    Reenviar código {countdown > 0 && `(${formatTime(countdown)})`}
                  </button>
                  <button
                    onMouseEnter={preloadModal}
                    onClick={() => setShowHelpModal(true)}
                    className={`p-2 rounded-lg transition-colors ${
                      isDarkMode
                        ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    }`}
                    title="Obtener ayuda"
                  >
                    <QuestionMarkCircleIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleBackToEmail}
                  className={`text-sm transition-colors ${
                    isDarkMode 
                      ? "text-blue-400 hover:text-blue-300" 
                      : "text-blue-600 hover:text-blue-700"
                  }`}
                >
                  ¿Te equivocaste al suministrar el correo? Haz clic aquí para corregirlo
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {/* Modal de ayuda */}
      <Modal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        title="¿No recibiste el código?"
        isDarkMode={isDarkMode}
        maxWidth="md"
        showCloseButton={true}
      >
        <Suspense fallback={<ModalLoading />}>
          <EmailHelpModal
            email={newEmail}
            isDarkMode={isDarkMode}
            onClose={() => setShowHelpModal(false)}
            onResendGmail={handleResendCodeGmail}
          />
        </Suspense>
      </Modal>
    </div>
  );
}