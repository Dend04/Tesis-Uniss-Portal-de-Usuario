// app/components/config/EmailForm.tsx
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
  XMarkIcon,
  CheckCircleIcon,
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
  const [countdown, setCountdown] = useState(0); // en segundos
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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

  // Usar useRef para los intervalos y timeouts
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, []);

  // Efecto optimizado para el contador
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

  // Efecto optimizado para la animación
  useEffect(() => {
    animationRef.current = setTimeout(() => {
      setIsShaking(true);

      animationRef.current = setTimeout(() => {
        setIsShaking(false);
      }, 2000);
    }, 1000);

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
      }
    };
  }, []);

  // Función para validar email
  const validateEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  // Función para manejar el envío de verificación
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
              email: currentEmail,    // Correo actual (para registro)
              newEmail: newEmail,     // Nuevo correo (donde se enviará el código)
              userName: "Usuario"     // Nombre del usuario
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

  // Función para verificar y cambiar el email
 // Función para verificar y cambiar el email
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
        localStorage.removeItem('authToken');
        setErrorMessage("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al verificar el código");
      }

      // ✅ CORREO ACTUALIZADO EXITOSAMENTE
      setSuccessMessage("¡Correo actualizado exitosamente! Redirigiendo...");
      
      // Esperar 2 segundos para mostrar el mensaje y luego resetear
      setTimeout(() => {
        setSuccessMessage("");
        setStep("email"); // Volver al formulario inicial
        setVerificationCode(""); // Limpiar el código
        setNewEmail(""); // Limpiar el nuevo email
        setCountdown(0); // Resetear contador
        onSuccess(newEmail); // Notificar al componente padre
      }, 2000);

    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error al verificar el código");
    } finally {
      setIsLoading(false);
    }
  },
  [verificationCode, newEmail, onSuccess]
);

  // Función para reenviar el código
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
            email: currentEmail,    // Correo actual
            newEmail: newEmail,     // Nuevo correo (destino del código)
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

  // Función para volver al formulario de email
  const handleBackToEmail = useCallback(() => {
    setStep("email");
    setVerificationCode("");
    setErrorMessage("");
    setCountdown(0);
  }, []);

  // Función para formatear el tiempo
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
      {step === "email" ? (
        <form onSubmit={handleSendVerification} className="space-y-4">
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
            <label
              className={`block mb-2 ${
                isDarkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Nuevo correo electrónico
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={handleEmailChange}
              className={`w-full p-3 rounded-lg border ${
                emailError
                  ? "border-red-500"
                  : isDarkMode
                  ? "bg-gray-700 border-gray-600 text-gray-200"
                  : "bg-white border-gray-300 text-gray-800"
              }`}
              required
              placeholder="nuevo@gmail.com"
            />
            {emailError && (
              <p className="text-red-500 text-sm mt-1">{emailError}</p>
            )}
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
              disabled={isLoading || !!emailError || !newEmail}
              className="flex-1 px-4 py-2 bg-uniss-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Enviando código..." : "Continuar"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerifyAndChange} className="space-y-4">
          {/* Mensaje de éxito */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5" />
              {successMessage}
            </div>
          )}
  
          {/* Mostrar el formulario de verificación solo si no hay éxito */}
          {!successMessage && (
            <>
              {errorMessage && (
                <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5" />
                  {errorMessage}
                </div>
              )}
  
              <div className="text-center mb-6">
                <EnvelopeIcon className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                <h3
                  className={`text-lg font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Verifica tu nuevo correo
                </h3>
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Hemos enviado un código de verificación a{" "}
                  <strong>{newEmail}</strong>
                </p>
              </div>
  
              <div>
                <label
                  className={`block mb-2 ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
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
                  aria-describedby="code-help"
                  className={`w-full p-3 rounded-lg border ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-gray-200"
                      : "bg-white border-gray-300 text-gray-800"
                  }`}
                  required
                />
                <small
                  id="code-help"
                  className={`text-xs ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Ingresa el código de 6 dígitos que enviamos a tu correo
                </small>
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
                  className="flex-1 px-4 py-2 bg-uniss-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? "Verificando..." : "Confirmar cambio"}
                </button>
              </div>
  
              <div
                className={`text-center mt-4 ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                <p className="text-sm">¿No recibiste el código?</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={countdown > 0 || isLoading}
                    className={`text-blue-500 hover:text-blue-700 text-sm ${
                      countdown > 0
                        ? "line-through opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    Reenviar código {countdown > 0 && `(${formatTime(countdown)})`}
                  </button>
                  <button
                    onMouseEnter={preloadModal}
                    onClick={() => setShowHelpModal(true)}
                    className={`p-1 rounded-full ${
                      isDarkMode
                        ? "text-gray-200 hover:text-white hover:bg-gray-600"
                        : "text-blue-600 hover:text-blue-800 hover:bg-uniss-blue"
                    } ${isShaking ? "animate-bounce" : ""}`}
                    title="¿Qué es la autenticación en dos pasos?"
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
                  ¿Te equivocaste al suministrar el correo? Haz clic aquí para
                  corregirlo
                </button>
              </div>
            </>
          )}
        </form>
      )}
  
      {/* Modal de ayuda con lazy loading */}
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
          />
        </Suspense>
      </Modal>
    </div>
  );
}
