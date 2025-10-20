"use client";

import {
  useState,
  useEffect,
  useRef,
  lazy,
  Suspense,
  useCallback,
} from "react";
import {
  QrCodeIcon,
  KeyIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { TOTP } from "otpauth";
import Modal from "../Modal";

// Carga perezosa del componente de información
const TwoFactorInfoModal = lazy(() => import("../modals/TwoFactorInfoModal"));

// Componente de carga para el modal
const ModalLoading = () => (
  <div className="flex justify-center items-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
);

// ✅ INTERFACE ACTUALIZADA - Agregar verificationCode
// ✅ INTERFACE ACTUALIZADA - Solo necesita el secret
interface TwoFactorAuthProps {
  isDarkMode: boolean;
  onSetupComplete: (secret: string) => void; // ← Solo el secreto ahora
  onCancel: () => void;
  userEmail: string;
}

// Generar secreto para TOTP (formato base32)
const generateSecret = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  for (let i = 0; i < 32; i++) {
    secret += chars[Math.floor(Math.random() * chars.length)];
  }
  return secret;
};

// Generar códigos de respaldo
const generateBackupCodes = () => {
  const codes = [];
  for (let i = 0; i < 8; i++) {
    codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
  }
  return codes;
};

// Función para generar QR
const generateQRCode = async (
  otpauthUrl: string,
  isDarkMode: boolean
): Promise<string> => {
  try {
    const qrcode = await import("qrcode");
    return await qrcode.toDataURL(otpauthUrl, {
      width: 200,
      margin: 1,
      color: {
        dark: isDarkMode ? "#ffffff" : "#000000",
        light: isDarkMode ? "#1f2937" : "#ffffff",
      },
    });
  } catch (error) {
    console.warn("QRCode library not available, using fallback");
    return generateFallbackQRCode(otpauthUrl, isDarkMode);
  }
};

// Fallback para generar QR básico
const generateFallbackQRCode = (text: string, isDarkMode: boolean): string => {
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = isDarkMode ? "#1f2937" : "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = isDarkMode ? "#ffffff" : "#000000";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("QR Code Placeholder", canvas.width / 2, 30);
    ctx.font = "10px Arial";
    ctx.fillText("Install @types/qrcode for", canvas.width / 2, 50);
    ctx.fillText("proper QR code generation", canvas.width / 2, 65);

    ctx.fillStyle = isDarkMode ? "#ffffff" : "#000000";
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        if ((i + j) % 2 === 0) {
          ctx.fillRect(70 + i * 12, 80 + j * 12, 10, 10);
        }
      }
    }
  }

  return canvas.toDataURL();
};

// Componente de steps
const SetupStep = ({
  number,
  title,
  description,
  icon,
  isActive,
  isCompleted,
  isDarkMode,
}: {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  isActive: boolean;
  isCompleted: boolean;
  isDarkMode: boolean;
}) => (
  <div
    className={`flex gap-4 p-4 rounded-xl transition-all duration-300 ${
      isActive
        ? isDarkMode
          ? "bg-gray-800 border-2 border-blue-500"
          : "bg-blue-50 border-2 border-blue-500"
        : isDarkMode
        ? "bg-gray-800/50"
        : "bg-gray-50"
    }`}
  >
    <div
      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
        isCompleted
          ? "bg-green-500 text-white"
          : isActive
          ? "bg-blue-500 text-white"
          : isDarkMode
          ? "bg-gray-700 text-gray-300"
          : "bg-gray-200 text-gray-600"
      }`}
    >
      {isCompleted ? <CheckCircleIcon className="w-5 h-5" /> : number}
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h3
          className={`font-semibold ${
            isDarkMode ? "text-gray-100" : "text-gray-800"
          }`}
        >
          {title}
        </h3>
      </div>
      <p
        className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
      >
        {description}
      </p>
    </div>
  </div>
);

export default function TwoFactorAuth({
  isDarkMode,
  onSetupComplete,
  onCancel,
}: TwoFactorAuthProps) {
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [secret, setSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState("");
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [animationStopped, setAnimationStopped] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [timeLeft, setTimeLeft] = useState(30);
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastAttemptCode, setLastAttemptCode] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null);
  const [qrScanned, setQrScanned] = useState(false);

  const getUserIdentifier = () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return "usuario";

      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(window.atob(base64));

      return payload.sAMAccountName || payload.email || "usuario";
    } catch (error) {
      console.error("Error decodificando el token:", error);
      return "usuario";
    }
  };

  const [userIdentifier, setUserIdentifier] = useState("");

  // Efecto para cargar el identificador al montar el componente
  useEffect(() => {
    setUserIdentifier(getUserIdentifier());
  }, []);

  // Temporizador para el código TOTP
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 1 ? prev - 1 : 30));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // ✅ EFECTO PARA DETECTAR AUTOMÁTICAMENTE CUANDO SE ESCANEA EL QR
  useEffect(() => {
    if (currentStep === 1 && !qrScanned) {
      // Verificar cada 2 segundos si el usuario ha empezado a escribir en el campo de código
      const checkForCodeInput = setInterval(() => {
        // Esta es una simulación - en una app real podrías detectar de otras formas
        const hasUserStartedTyping = verificationCode.length > 0;
        
        if (hasUserStartedTyping && !qrScanned) {
          setQrScanned(true);
          setCurrentStep(2);
          clearInterval(checkForCodeInput);
        }
      }, 2000);

      return () => clearInterval(checkForCodeInput);
    }
  }, [currentStep, qrScanned, verificationCode]);

  // ✅ EFECTO PARA VERIFICACIÓN AUTOMÁTICA AL COMPLETAR 6 DÍGITOS
  useEffect(() => {
    if (verificationCode.length === 6 && currentStep === 2) {
      // Pequeño delay para que el usuario vea que completó el código
      const autoVerifyTimer = setTimeout(() => {
        handleSetupComplete();
      }, 500);

      return () => clearTimeout(autoVerifyTimer);
    }
  }, [verificationCode, currentStep]);

  // ✅ EFECTO PARA CIERRE AUTOMÁTICO EN ÉXITO
  useEffect(() => {
    if (currentStep === 3) {
      // Limpiar timer anterior si existe
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
      }

      // Establecer nuevo timer para cerrar después de 10 segundos
      const timer = setTimeout(() => {
        onCancel();
      }, 10000);

      setAutoCloseTimer(timer);

      return () => {
        if (autoCloseTimer) {
          clearTimeout(autoCloseTimer);
        }
      };
    }
  }, [currentStep, onCancel]);

  // Limpiar timers al desmontar
  useEffect(() => {
    return () => {
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
      }
    };
  }, [autoCloseTimer]);

  // Precargar el modal cuando el usuario haga hover sobre el botón de información
  const preloadModal = useCallback(() => {
    import("../modals/TwoFactorInfoModal");
  }, []);

  // Efecto para animar el botón de información en loop
  useEffect(() => {
    if (animationStopped) return;

    const startAnimation = () => {
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        animationIntervalRef.current = setTimeout(() => {
          startAnimation();
        }, 4000);
      }, 2000);
    };

    const initialTimer = setTimeout(() => {
      startAnimation();
    }, 1000);

    return () => {
      clearTimeout(initialTimer);
      if (animationIntervalRef.current) {
        clearTimeout(animationIntervalRef.current);
      }
    };
  }, [animationStopped]);

  // Detener animación cuando el componente se desmonte o el usuario haga clic
  const handleInfoClick = () => {
    setAnimationStopped(true);
    setIsShaking(false);
    if (animationIntervalRef.current) {
      clearTimeout(animationIntervalRef.current);
    }
    setShowInfoModal(true);
  };

  // Generar secreto y códigos de respaldo al montar el componente
  useEffect(() => {
    const newSecret = generateSecret();
    const newBackupCodes = generateBackupCodes();
    setSecret(newSecret);
    setBackupCodes(newBackupCodes);
  }, []);

  // Generar código QR
  useEffect(() => {
    const generateQR = async () => {
      if (secret) {
        try {
          const otpauthUrl = `otpauth://totp/Credenciales%20Uniss:${encodeURIComponent(
            userIdentifier
          )}?secret=${secret}&issuer=Credenciales%20Uniss&algorithm=SHA1&digits=6&period=30`;
          const url = await generateQRCode(otpauthUrl, isDarkMode);
          setQrDataUrl(url);
        } catch (err) {
          console.error("Error generando QR:", err);
          setError("Error al generar el código QR");
        }
      }
    };

    generateQR();
  }, [secret, userIdentifier, isDarkMode]);

  const copyToClipboard = async (text: string, type: "secret" | "code") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "secret") {
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
      }
    } catch (err) {
      console.error("Error al copiar:", err);
    }
  };

  // ✅ FUNCIÓN MEJORADA - Con manejo de estado mejorado
const handleSetupComplete = async () => {
  if (verificationCode.length !== 6) return;
  
  setIsLoading(true);
  setError("");

  setLastAttemptCode(verificationCode);

  try {
    const totp = new TOTP({
      issuer: "Credenciales Uniss",
      label: userIdentifier,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: secret,
    });

    // ✅ VERIFICACIÓN LOCAL SOLAMENTE
    const isValid = totp.validate({ token: verificationCode, window: 2 }) !== null;

    if (isValid) {
      // Mostrar éxito inmediatamente
      setCurrentStep(3);
      
      // ✅ ENVIAR SOLO EL SECRETO AL BACKEND - SIN backupCodes NI verificationCode
      try {
        await onSetupComplete(secret); // ← Solo el secreto ahora
      } catch (backendError) {
        console.error("Error activando en backend:", backendError);
        // No revertimos el estado de éxito visual por error de backend
      }
    } else {
      if (retryCount < 2) {
        setError(
          `El código de verificación es incorrecto (Intento ${
            retryCount + 1
          }/3). Verifica que la hora de tu dispositivo esté sincronizada correctamente.`
        );
        setRetryCount((prev) => prev + 1);
      } else {
        setError(
          "Código incorrecto después de múltiples intentos. Verifica que la hora de tu dispositivo esté sincronizada correctamente."
        );
      }
    }
  } catch (err) {
    setError("Error al verificar el código. Por favor intenta nuevamente.");
  } finally {
    setIsLoading(false);
  }
};
  const handleRetryWithSameCode = () => {
    if (lastAttemptCode && lastAttemptCode.length === 6) {
      setVerificationCode(lastAttemptCode);
      setTimeout(() => {
        handleSetupComplete();
      }, 100);
    }
  };

  const handleRetryWithNewCode = () => {
    setRetryCount(0);
    setError("");
    setVerificationCode("");
  };

  // ✅ MANEJO MANUAL PARA PASAR AL SIGUIENTE PASO
  const handleManualContinue = () => {
    setCurrentStep(2);
    setQrScanned(true);
  };

  const steps = [
    {
      number: 1,
      title: "Escanea el código QR",
      description:
        "Usa tu aplicación de autenticación para escanear este código. Te llevaremos automáticamente al siguiente paso cuando detectemos que has empezado.",
      icon: <QrCodeIcon className="w-5 h-5" />,
      completed: currentStep > 1,
      active: currentStep === 1,
    },
    {
      number: 2,
      title: "Verifica el código",
      description: "Ingresa el código de 6 dígitos de tu aplicación. La verificación será automática.",
      icon: <KeyIcon className="w-5 h-5" />,
      completed: currentStep > 2,
      active: currentStep === 2,
    },
    {
      number: 3,
      title: "Configuración completada",
      description: "La autenticación en dos pasos está activa. Cerrando automáticamente...",
      icon: <CheckCircleIcon className="w-5 h-5" />,
      completed: currentStep === 3,
      active: currentStep === 3,
    },
  ];

  return (
    <div className="mt-4">
      <div
        className={`p-6 rounded-xl border ${
          isDarkMode
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        } space-y-6 transition-all duration-300`}
      >
        {/* Header Mejorado */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4
                className={`font-bold text-xl ${
                  isDarkMode ? "text-gray-100" : "text-gray-800"
                }`}
              >
                Autenticación en Dos Pasos
              </h4>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  isDarkMode
                    ? "bg-gray-700 text-gray-300"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                Opcional
              </span>
            </div>
            <p
              className={`text-sm ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Añade una capa adicional de seguridad a tu cuenta
            </p>
          </div>

          <button
            onMouseEnter={preloadModal}
            onClick={handleInfoClick}
            className={`p-2 rounded-lg transition-all duration-200 ${
              isDarkMode
                ? "text-gray-400 hover:text-white hover:bg-gray-700"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
            } ${isShaking ? "animate-bounce" : ""}`}
            title="¿Qué es la autenticación en dos pasos?"
          >
            <QuestionMarkCircleIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <SetupStep
              key={step.number}
              number={step.number}
              title={step.title}
              description={step.description}
              icon={step.icon}
              isActive={step.active}
              isCompleted={step.completed}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>

        {/* Step 1: QR Code */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <div className="flex flex-col items-center gap-4">
                {/* QR Code Container */}
                <div
                  className={`p-4 rounded-2xl ${
                    isDarkMode ? "bg-gray-900" : "bg-gray-50"
                  } border-2 ${
                    isDarkMode ? "border-gray-700" : "border-gray-200"
                  }`}
                >
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Código QR para aplicaciones de autenticación"
                      className="w-48 h-48 mx-auto"
                    />
                  ) : (
                    <div
                      className={`w-48 h-48 flex items-center justify-center ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      <ArrowPathIcon className="w-8 h-8 animate-spin" />
                    </div>
                  )}
                </div> 

                {/* Manual Setup Option */}
                <div
                  className={`p-4 rounded-xl w-full max-w-md ${
                    isDarkMode ? "bg-gray-700" : "bg-blue-50"
                  }`}
                >
                  <h5
                    className={`font-semibold text-sm mb-2 ${
                      isDarkMode ? "text-gray-200" : "text-blue-800"
                    }`}
                  >
                    Configuración manual
                  </h5>
                  <p
                    className={`text-xs mb-3 ${
                      isDarkMode ? "text-gray-400" : "text-blue-700"
                    }`}
                  >
                    Si no puedes escanear el código QR, ingresa esta clave
                    manualmente:
                  </p>

                  <div className="flex items-center gap-2">
                    <code
                      className={`flex-1 px-3 py-2 rounded-lg font-mono text-sm border ${
                        isDarkMode
                          ? "bg-gray-800 border-gray-600 text-gray-200"
                          : "bg-white border-gray-300 text-gray-800"
                      }`}
                    >
                      {secret}
                    </code>
                    <button
                      onClick={() => copyToClipboard(secret, "secret")}
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        copiedSecret
                          ? "bg-green-500 text-white"
                          : isDarkMode
                          ? "bg-gray-600 text-gray-300 hover:bg-gray-500"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                      title="Copiar clave secreta"
                    >
                      {copiedSecret ? (
                        <CheckCircleIcon className="w-5 h-5" />
                      ) : (
                        <DocumentDuplicateIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Action Buttons con opción de omitir */}
                <div className="flex flex-col gap-3 w-full max-w-md">
                  <button
                    onClick={handleManualContinue}
                    disabled={!qrDataUrl}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                      isDarkMode
                        ? "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-400"
                        : "bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500"
                    }`}
                  >
                    Continuar a verificación
                  </button>

                  <button
                    type="button"
                    onClick={onCancel}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 border ${
                      isDarkMode
                        ? "border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-gray-100"
                        : "border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                    }`}
                  >
                    Omitir por ahora
                  </button>
                </div>

                {/* Información adicional sobre la opcionalidad */}
                <div
                  className={`text-xs text-center max-w-md ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  <p>
                    La autenticación en dos pasos es opcional pero recomendada
                    para mayor seguridad.
                  </p>
                  <p>
                    Puedes activarla en cualquier momento desde la
                    configuración.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Verification */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <div className="flex flex-col items-center gap-6">
                {/* Timer Indicator */}
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                    isDarkMode ? "bg-gray-700" : "bg-gray-100"
                  }`}
                >
                  <ClockIcon className="w-4 h-4" />
                  <span
                    className={`text-sm font-medium ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    El código cambia en: {timeLeft}s
                  </span>
                </div>

                {/* Code Input */}
                <div className="w-full max-w-md">
                  <label
                    className={`block text-sm font-medium mb-3 text-center ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Ingresa el código de 6 dígitos
                    <br />
                    <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      La verificación será automática al completar 6 dígitos
                    </span>
                  </label>

                  <div className="relative">
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => {
                        const value = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6);
                        setVerificationCode(value);
                        setError("");
                      }}
                      placeholder="000000"
                      className={`w-full p-4 text-center text-xl font-mono rounded-xl border-2 transition-all duration-200 ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          : "bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      } ${error ? "border-red-500 shake-animation" : ""} ${
                        verificationCode.length === 6 ? "border-green-500" : ""
                      }`}
                      autoFocus
                    />

                    {/* Input helper */}
                    <div
                      className={`absolute -bottom-6 left-0 right-0 text-xs ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {verificationCode.length === 6
                        ? "✓ Código completo - Verificando..."
                        : `${verificationCode.length}/6 dígitos`}
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div
                      className={`mt-8 p-4 rounded-xl border ${
                        isDarkMode
                          ? "bg-red-900/20 border-red-800 text-red-400"
                          : "bg-red-50 border-red-200 text-red-600"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div className="text-left">
                          <p className="font-medium text-sm">{error}</p>

                          {error.includes("incorrecto") && retryCount > 0 && (
                            <div className="flex gap-2 mt-3">
                              <button
                                type="button"
                                onClick={handleRetryWithSameCode}
                                disabled={isLoading}
                                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                                  isDarkMode
                                    ? "bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-600"
                                    : "bg-red-500 text-white hover:bg-red-600 disabled:bg-gray-400"
                                }`}
                              >
                                {isLoading
                                  ? "Verificando..."
                                  : "Reintentar mismo código"}
                              </button>

                              <button
                                type="button"
                                onClick={handleRetryWithNewCode}
                                disabled={isLoading}
                                className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                                  isDarkMode
                                    ? "border-gray-600 text-gray-300 hover:bg-gray-700 disabled:text-gray-500"
                                    : "border-gray-400 text-gray-600 hover:bg-gray-200 disabled:text-gray-400"
                                }`}
                              >
                                Ingresar nuevo código
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 w-full max-w-md">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                      isDarkMode
                        ? "border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-gray-100"
                        : "border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                    }`}
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    onClick={handleSetupComplete}
                    disabled={verificationCode.length !== 6 || isLoading}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                      isDarkMode
                        ? "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-400"
                        : "bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500"
                    }`}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        Verificando...
                      </div>
                    ) : (
                      "Verificar manualmente"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Success - SIMPLIFICADO */}
        {currentStep === 3 && (
          <div className="text-center space-y-6 animate-fadeIn">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="w-8 h-8 text-white" />
              </div>

              <div>
                <h5
                  className={`font-bold text-lg ${
                    isDarkMode ? "text-gray-100" : "text-gray-800"
                  }`}
                >
                  ¡Configuración completada!
                </h5>
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  La autenticación en dos pasos ha sido activada para tu cuenta.
                  <br />
                  <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                    Cerrando automáticamente en 10 segundos...
                  </span>
                </p>
              </div>

              {/* ✅ BOTÓN PARA CERRAR MANUALMENTE */}
              <button
                onClick={onCancel}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isDarkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Cerrar ahora
              </button>
            </div>
          </div>
        )}

        {/* Modal de información */}
        <Modal
          isOpen={showInfoModal}
          onClose={() => setShowInfoModal(false)}
          title="Autenticación en Dos Pasos"
          isDarkMode={isDarkMode}
          maxWidth="md"
        >
          <Suspense fallback={<ModalLoading />}>
            <TwoFactorInfoModal
              isDarkMode={isDarkMode}
              onClose={() => setShowInfoModal(false)}
            />
          </Suspense>
        </Modal>
      </div>

      {/* Estilos de animación */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-5px);
          }
          75% {
            transform: translateX(5px);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .shake-animation {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}