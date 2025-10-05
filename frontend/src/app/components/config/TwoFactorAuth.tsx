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

interface TwoFactorAuthProps {
  isDarkMode: boolean;
  onSetupComplete: (secret: string, backupCodes: string[]) => void;
  onCancel: () => void;
  userEmail: string;
}

// Generar secreto para TOTP (formato base32) recordar poner esto desde el backend para seguridad
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
        light: isDarkMode ? "#374151" : "#ffffff",
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
    ctx.fillStyle = isDarkMode ? "#374151" : "#ffffff";
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

// Modal de información
const InfoModal = ({
  isOpen,
  onClose,
  isDarkMode,
}: {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}) => {
  if (!isOpen) return null;

  const authApps = [
    { name: "Google Authenticator", platforms: ["iOS", "Android"] },
    { name: "Microsoft Authenticator", platforms: ["iOS", "Android"] },
    { name: "Authy", platforms: ["iOS", "Android", "Desktop"] },
    { name: "LastPass Authenticator", platforms: ["iOS", "Android"] },
    { name: "Duo Mobile", platforms: ["iOS", "Android"] },
    { name: "FreeOTP", platforms: ["iOS", "Android"] },
    { name: "andOTP", platforms: ["Android"] },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`relative max-w-md w-full rounded-lg p-6 ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        }`}
      >
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1 rounded-full ${
            isDarkMode
              ? "text-gray-400 hover:bg-gray-700"
              : "text-gray-500 hover:bg-gray-200"
          }`}
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        <h3
          className={`text-xl font-bold mb-4 ${
            isDarkMode ? "text-white" : "text-gray-800"
          }`}
        >
          Autenticación en Dos Pasos
        </h3>

        <div
          className={`text-sm mb-6 ${
            isDarkMode ? "text-gray-300" : "text-gray-600"
          }`}
        >
          <p className="mb-4">
            La autenticación en dos pasos añade una capa adicional de seguridad
            a tu cuenta. Además de tu contraseña, necesitarás un código de
            verificación que cambia cada 30 segundos.
          </p>

          <p className="mb-4">
            Para usar esta función, necesitarás una aplicación de autenticación
            en tu dispositivo móvil.
          </p>

          <h4
            className={`font-semibold mb-2 ${
              isDarkMode ? "text-gray-200" : "text-gray-700"
            }`}
          >
            Aplicaciones compatibles:
          </h4>

          <ul
            className={`space-y-2 mb-4 ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {authApps.map((app, index) => (
              <li key={index} className="flex justify-between">
                <span>{app.name}</span>
                <span
                  className={isDarkMode ? "text-gray-500" : "text-gray-500"}
                >
                  {app.platforms.join(", ")}
                </span>
              </li>
            ))}
          </ul>

          <p>
            Escanea el código QR con cualquiera de estas aplicaciones para
            configurar la autenticación en dos pasos.
          </p>
        </div>

        <button
          onClick={onClose}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
            isDarkMode
              ? "bg-uniss-gold text-gray-900 hover:bg-yellow-600"
              : "bg-uniss-blue text-white hover:bg-blue-700"
          }`}
        >
          Entendido
        </button>
      </div>
    </div>
  );
};

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
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [retryCount, setRetryCount] = useState(0); // ✅ Nuevo estado para contar reintentos
  const [lastAttemptCode, setLastAttemptCode] = useState(""); // ✅ Guardar el último código intentado

  const getUserIdentifier = () => {
    try {
      // 1. Recupera el token del localStorage
      const token = localStorage.getItem("token"); // Ajusta la clave según tu app
      if (!token) return "usuario"; // Valor por defecto si no hay token

      // 2. Decodifica el token (sin verificar firma para el frontend)
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(window.atob(base64));

      // 3. Retorna el sAMAccountName, o el email como fallback, o un valor por defecto
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

  // Precargar el modal cuando el usuario haga hover sobre el botón de información
  const preloadModal = useCallback(() => {
    import("../modals/TwoFactorInfoModal");
  }, []);

  // Efecto para animar el botón de información en loop
  useEffect(() => {
    if (animationStopped) return;

    const startAnimation = () => {
      setIsShaking(true);

      // Detener animación después de 2 segundos
      setTimeout(() => {
        setIsShaking(false);

        // Reiniciar animación después de 4 segundos de descanso
        animationIntervalRef.current = setTimeout(() => {
          startAnimation();
        }, 4000);
      }, 2000);
    };

    // Iniciar animación después de un breve retraso inicial
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

  const handleSetupComplete = async () => {
    setIsLoading(true);
    setError("");

    setLastAttemptCode(verificationCode);

    try {
      // Validar el código TOTP contra el secreto
      const totp = new TOTP({
        issuer: "Credenciales Uniss",  
        label: userIdentifier,         
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: secret,
      });

      const validationWindow = retryCount > 0 ? 3 : 2;

      const isValid =
        totp.validate({ token: verificationCode, window: 2 }) !== null;

      if (isValid) {
        onSetupComplete(secret, backupCodes);
      } else {
        // ✅ Manejar error con sugerencia de reintento
        if (retryCount < 2) {
          setError(
            `El código de verificación es incorrecto (Intento ${
              retryCount + 1
            }/3). ` +
              "Esto puede deberse a un desfase horario. " +
              "Espera a que cambie el código en tu app y vuelve a intentarlo, " +
              "o sincroniza la hora de tu dispositivo."
          );
          setRetryCount((prev) => prev + 1);
        } else {
          setError(
            "Código incorrecto después de múltiples intentos. " +
              "Verifica que la hora de tu dispositivo esté sincronizada correctamente " +
              "o genera un nuevo código QR."
          );
        }
      }
    } catch (err) {
      setError("Error al verificar el código. Por favor intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Función para reintentar con el mismo código
  const handleRetryWithSameCode = () => {
    if (lastAttemptCode && lastAttemptCode.length === 6) {
      setVerificationCode(lastAttemptCode);
      // Usar un pequeño delay para asegurar que el estado se actualice
      setTimeout(() => {
        handleSetupComplete();
      }, 100);
    }
  };

  // ✅ Función para reintentar con nuevo código
  const handleRetryWithNewCode = () => {
    setRetryCount(0);
    setError("");
    setVerificationCode("");
    // El usuario deberá ingresar el nuevo código que aparece en su app
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="mt-4">
      <div
        className={`p-6 rounded-xl ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } space-y-6 transition-colors`}
      >
        <div className="flex items-center justify-between">
          <h4
            className={`font-semibold text-lg ${
              isDarkMode ? "text-gray-100" : "text-gray-800"
            }`}
          >
            Configurar autenticación en dos pasos
          </h4>

          <button
            onMouseEnter={preloadModal} // Precargar al hacer hover
            onClick={handleInfoClick} // Manejar clic para mostrar modal
            className={`p-1 rounded-full transition-colors ${
              isDarkMode
                ? "text-gray-400 hover:text-white hover:bg-gray-700"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
            } ${isShaking ? "animate-bounce" : ""}`}
            title="¿Qué es la autenticación en dos pasos?"
          >
            <QuestionMarkCircleIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Paso 1: Escanear QR */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-4">
            <div
              className={`p-3 rounded-lg ${
                isDarkMode ? "bg-gray-700" : "bg-gray-100"
              }`}
            >
              <QrCodeIcon
                className={`w-8 h-8 ${
                  isDarkMode ? "text-gray-200" : "text-gray-600"
                }`}
              />
            </div>

            <p
              className={`text-sm font-medium text-center ${
                isDarkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              1. Escanea el código QR con una aplicación de autenticación
            </p>

            {/* Código QR centrado */}
            <div className="flex flex-col items-center gap-4">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Código QR para aplicaciones de autenticación"
                  className="border rounded-lg w-48 h-48 mx-auto"
                />
              ) : (
                <div
                  className={`w-48 h-48 border rounded-lg flex items-center justify-center mx-auto ${
                    isDarkMode ? "border-gray-600" : "border-gray-300"
                  }`}
                >
                  <ArrowPathIcon
                    className={`w-8 h-8 animate-spin ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  />
                </div>
              )}

              <div
                className={`text-xs text-center ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                <p>
                  Si no puedes escanear el código, ingresa esta clave
                  manualmente:
                </p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <code
                    className={`px-2 py-1 rounded font-mono ${
                      isDarkMode
                        ? "bg-gray-700 text-gray-200"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {secret}
                  </code>
                  <button
                    onClick={() => copyToClipboard(secret)}
                    className={`p-1 rounded transition-colors ${
                      isDarkMode
                        ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                        : "hover:bg-gray-200 text-gray-500 hover:text-gray-700"
                    }`}
                    title="Copiar clave secreta"
                  >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Paso 2: Ingresar código de verificación */}
          <div className="flex items-start gap-4 mt-6">
            <div
              className={`p-3 rounded-lg ${
                isDarkMode ? "bg-gray-700" : "bg-gray-100"
              }`}
            >
              <KeyIcon
                className={`w-8 h-8 ${
                  isDarkMode ? "text-gray-200" : "text-gray-600"
                }`}
              />
            </div>
            <div className="flex-1">
              <p
                className={`text-sm font-medium ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                2. Ingresa el código de verificación de 6 dígitos
              </p>
              <p
                className={`text-xs mt-1 ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Abre tu aplicación de autenticación y copia el código de 6
                dígitos que se muestra.
              </p>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setVerificationCode(value);
                }}
                placeholder="123456"
                className={`w-full p-3 mt-2 rounded-lg border transition-colors ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-500 focus:border-uniss-gold focus:ring-1 focus:ring-uniss-gold"
                    : "bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-uniss-blue focus:ring-1 focus:ring-uniss-blue"
                }`}
              />

              {error && (
                <div
                  className={`mt-2 ${
                    isDarkMode ? "text-red-400" : "text-red-600"
                  }`}
                >
                  <p className="text-sm">{error}</p>

                  {/* ✅ Botones de reintento que aparecen solo cuando hay error */}
                  {error.includes("incorrecto") && retryCount > 0 && (
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={handleRetryWithSameCode}
                        disabled={isLoading}
                        className={`text-xs px-3 py-1 rounded transition-colors ${
                          isDarkMode
                            ? "bg-uniss-gold text-gray-900 hover:bg-yellow-600 disabled:bg-gray-600"
                            : "bg-uniss-blue text-white hover:bg-blue-600 disabled:bg-gray-400"
                        }`}
                      >
                        {isLoading
                          ? "Verificando..."
                          : "Reintentar con mismo código"}
                      </button>

                      <button
                        type="button"
                        onClick={handleRetryWithNewCode}
                        disabled={isLoading}
                        className={`text-xs px-3 py-1 rounded border transition-colors ${
                          isDarkMode
                            ? "border-gray-500 text-gray-300 hover:bg-gray-700 disabled:text-gray-500"
                            : "border-gray-400 text-gray-600 hover:bg-gray-200 disabled:text-gray-400"
                        }`}
                      >
                        Ingresar nuevo código
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>{" "}
            {/* ✅ ESTE ES EL </div> QUE FALTABA */}
          </div>{" "}
          {/* ✅ Cierre del contenedor principal del Paso 2 */}
          <div
            className={`flex gap-4 pt-4 border-t ${
              isDarkMode ? "border-gray-600" : "border-gray-300"
            }`}
          >
            <button
              type="button"
              onClick={onCancel}
              className={`px-4 py-2 rounded-lg border font-medium transition-colors ${
                isDarkMode
                  ? "border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-gray-100"
                  : "border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-800"
              }`}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSetupComplete}
              disabled={verificationCode.length !== 6 || isLoading}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isDarkMode
                  ? "bg-uniss-gold text-gray-900 hover:bg-yellow-600 disabled:bg-gray-600 disabled:text-gray-400"
                  : "bg-uniss-blue text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:text-gray-200"
              }`}
            >
              {isLoading ? "Verificando..." : "Completar configuración"}
            </button>
          </div>
        </div>

        {/* Modal de información con lazy loading */}
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
    </div>
  );
}
