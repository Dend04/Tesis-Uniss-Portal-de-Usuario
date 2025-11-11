// src/app/components/forgot-password/UserIdentifierForm.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  UserIcon,
  ArrowPathIcon,
  KeyIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { UserData } from "@/types/user";

// ✅ INTERFAZ ACTUALIZADA: Usar company en lugar de email

interface UserIdentifierFormProps {
  onUserIdentified: (data: UserData, identifier: string) => void;
  flowType?: "email" | "pin" | "2fa" | "default";
  title?: string;
  description?: string;
  customNote?: string;
}

// Definir el tipo para la configuración de flujo
type FlowConfig = {
  [key in "email" | "pin" | "2fa" | "default"]: {
    title: string;
    description: string;
    note: string;
    icon: React.ComponentType<any>;
    endpoint: string;
    method: "GET" | "POST";
  };
};

export default function UserIdentifierForm({
  onUserIdentified,
  flowType = "default",
  title,
  description,
  customNote,
}: UserIdentifierFormProps) {
  const [userIdentifier, setUserIdentifier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pinStatus, setPinStatus] = useState<{
    hasPin?: boolean;
    checking: boolean;
  }>({ checking: false });

  // ✅ CONFIGURACIÓN ACTUALIZADA
  const flowConfig: FlowConfig = {
    email: {
      title: "Recuperar Contraseña",
      description: "Ingrese su nombre de usuario o carnet de identidad",
      note: "Se enviará un código de verificación al correo electrónico de respaldo o personal que usted suministró al crear su cuenta.",
      icon: UserIcon,
      endpoint: "/email/check-user",
      method: "GET",
    },
    pin: {
      title: "Recuperar con PIN",
      description: "Ingrese su nombre de usuario o carnet de identidad",
      note: "Se verificará si ha activado la opción de recuperación con PIN.",
      icon: KeyIcon,
      endpoint: "/pin/find-user",
      method: "POST",
    },
    "2fa": {
      title: "Recuperar con 2FA",
      description: "Ingrese su nombre de usuario o carnet de identidad",
      note: "Se verificará si tiene activada la autenticación de dos factores.",
      icon: LockClosedIcon,
      endpoint: "/2fa/check-status",
      method: "POST",
    },
    default: {
      title: "Recuperar Contraseña",
      description: "Ingrese su nombre de usuario o carnet de identidad",
      note: "Seleccione un método de recuperación para continuar.",
      icon: UserIcon,
      endpoint: "/email/verificacion",
      method: "POST",
    },
  };

  const config = flowConfig[flowType];
  const IconComponent = config.icon;

  // ✅ NUEVA FUNCIÓN: Verificar estado del PIN del usuario
  const checkUserPinStatus = async (
    sAMAccountName: string
  ): Promise<boolean> => {
    try {
      setPinStatus({ checking: true });

      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${API_URL}/pin/check-user-has-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: sAMAccountName }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("🔍 Estado del PIN obtenido:", result);
        setPinStatus({ hasPin: result.hasPin, checking: false });
        return result.hasPin;
      } else {
        console.warn("⚠️ No se pudo verificar el estado del PIN");
        setPinStatus({ checking: false });
        return false;
      }
    } catch (error) {
      console.error("❌ Error verificando estado del PIN:", error);
      setPinStatus({ checking: false });
      return false;
    }
  };

  // ✅ FUNCIÓN AUXILIAR PARA MANEJAR ARRAYS DESDE LDAP
  const getStringValue = (value: any): string => {
    if (Array.isArray(value)) {
      return value[0] || "";
    }
    return value || "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userIdentifier.trim()) {
      setError("Por favor, ingrese su nombre de usuario o carnet de identidad");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;

      console.log(`🌐 Realizando búsqueda en: ${API_URL}${config.endpoint}`);
      console.log(`🔍 Identificador: ${userIdentifier}`);
      console.log(`📝 Método HTTP: ${config.method}`);

      let url = `${API_URL}${config.endpoint}`;
      let options: RequestInit = {
        method: config.method,
        headers: { "Content-Type": "application/json" },
      };

      if (config.method === "GET") {
        url = `${url}/${encodeURIComponent(userIdentifier)}`;
      } else {
        options.body = JSON.stringify({ identifier: userIdentifier });
      }

      console.log("🔗 URL final:", url);
      console.log("⚙️ Opciones:", options);

      const response = await fetch(url, options);

      console.log(
        "📨 Respuesta del servidor:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Error del servidor:", errorData);

        if (
          response.status === 404 ||
          errorData.error?.includes("no encontrado")
        ) {
          setError(
            `Usuario no encontrado. Verifique que ha introducido correctamente sus datos. Si no tiene una cuenta, puede crearla en ${window.location.origin}/activate-account`
          );
          return;
        }

        throw new Error(errorData.message || "Error al buscar usuario");
      }

      const result = await response.json();
      console.log("✅ Datos recibidos del servidor:", result);

      // ✅ MANEJO ESPECÍFICO PARA FLUJO DE EMAIL (usando check-user)
      if (flowType === "email") {
        if (!result.success) {
          setError(result.message || "Error al verificar el usuario");
          return;
        }

        if (!result.user) {
          setError("No se pudo obtener la información del usuario");
          return;
        }

        // ✅ USAR company EN LUGAR DE email
        const userData: UserData = {
          company:
            getStringValue(result.user.email) ||
            getStringValue(result.user.company),
          email:
            getStringValue(result.user.email) ||
            getStringValue(result.user.company), // ← AGREGA ESTA LÍNEA
          displayName: getStringValue(result.user.displayName),
          sAMAccountName: getStringValue(result.user.sAMAccountName),
          employeeID: getStringValue(result.user.employeeID),
          userPrincipalName: getStringValue(result.user.userPrincipalName),
          dn: getStringValue(result.user.dn),
        };

        // ✅ VERIFICAR QUE TENEMOS COMPANY (EMAIL)
        if (!userData.company) {
          setError("No se pudo obtener el correo electrónico del usuario");
          return;
        }

        setSuccessMessage(
          "✅ Usuario verificado correctamente. Procediendo a enviar código de verificación..."
        );

        setTimeout(() => {
          onUserIdentified(userData, userIdentifier);
        }, 1500);

        return;
      }

      // ✅ MANEJO ESPECÍFICO MEJORADO PARA FLUJO DE PIN
      if (flowType === "pin") {
        if (!result.success) {
          setError(result.error || "Error al verificar el usuario");
          return;
        }

        // ✅ VERIFICAR SI EL USUARIO TIENE PIN CONFIGURADO
        if (result.userData?.sAMAccountName) {
          const hasPin = await checkUserPinStatus(
            result.userData.sAMAccountName
          );

          if (!hasPin) {
            setError(
              "Este usuario no tiene configurado un PIN de seguridad. Por favor, utilice otro método de recuperación."
            );
            return;
          }
        } else {
          setError("No se pudo obtener la información completa del usuario");
          return;
        }

        // ✅ CORRECCIÓN: Usar userData en lugar de user
        const userData: UserData = {
          company:
            getStringValue(result.userData.email) ||
            getStringValue(result.userData.company),
          email:
            getStringValue(result.userData.email) ||
            getStringValue(result.userData.company),
          displayName: getStringValue(result.userData.displayName),
          sAMAccountName: getStringValue(result.userData.sAMAccountName),
          employeeID: getStringValue(result.userData.employeeID),
          userPrincipalName: getStringValue(result.userData.userPrincipalName),
          dn: getStringValue(result.userData.dn),
        };

        setSuccessMessage(
          "✅ Usuario verificado correctamente. Tiene PIN de seguridad configurado."
        );

        setTimeout(() => {
          onUserIdentified(userData, userIdentifier);
        }, 1000);

        return;
      }

      // ✅ MANEJO ESPECÍFICO PARA FLUJO DE 2FA
    // ✅ MANEJO ESPECÍFICO PARA FLUJO DE 2FA
if (flowType === "2fa") {
  if (!result.success) {
    setError(result.error || "Error al verificar el usuario");
    return;
  }

  // ✅ CORRECCIÓN: Verificar estructura de respuesta del endpoint 2FA
  console.log("🔍 Estructura de respuesta 2FA:", result);
  
  // ✅ Diferentes endpoints pueden devolver la data en propiedades diferentes
  const userSource = result.userData || result.user || result;
  
  if (!userSource) {
    setError("No se pudo obtener la información del usuario desde el servicio 2FA");
    return;
  }

  // ✅ VERIFICAR SI EL USUARIO TIENE 2FA CONFIGURADO
  if (result.has2FA === false) {
    setError(
      "Este usuario no tiene configurada la autenticación de dos factores. Por favor, utilice otro método de recuperación."
    );
    return;
  }

  const userData: UserData = {
    company:
      getStringValue(userSource.email) ||
      getStringValue(userSource.company) ||
      getStringValue(result.email),
    email:
      getStringValue(userSource.email) ||
      getStringValue(userSource.company) ||
      getStringValue(result.email),
    displayName: getStringValue(userSource.displayName) || getStringValue(result.displayName),
    sAMAccountName: getStringValue(userSource.sAMAccountName) || getStringValue(result.sAMAccountName),
    employeeID: getStringValue(userSource.employeeID) || getStringValue(result.employeeID),
    userPrincipalName: getStringValue(userSource.userPrincipalName) || getStringValue(result.userPrincipalName),
    dn: getStringValue(userSource.dn) || getStringValue(result.dn),
    has2FA: result.has2FA || true, // Asumir que si pasó la verificación, tiene 2FA
  };

  // ✅ VERIFICACIÓN ADICIONAL DE DATOS CRÍTICOS
  if (!userData.sAMAccountName && !userData.employeeID) {
    setError("No se pudo obtener la información completa del usuario para autenticación 2FA");
    return;
  }

  console.log("✅ Datos de usuario para 2FA:", userData);
  
  setSuccessMessage(
    "✅ Usuario verificado correctamente. Tiene autenticación de dos factores configurada."
  );

  setTimeout(() => {
    onUserIdentified(userData, userIdentifier);
  }, 1000);
  
  return;
}

      // ✅ MANEJO PARA FLUJO DEFAULT (código existente)
      if (result.accountStatus === "disabled") {
        setError(
          "Su cuenta está deshabilitada permanentemente. Contacte al departamento de soporte."
        );
        return;
      }

      if (result.accountStatus === "locked") {
        setError(
          "Su cuenta está temporalmente bloqueada. Espere 30 minutos o contacte a soporte."
        );
        return;
      }

      // ✅ Para cuentas expiradas o activas, continuar normalmente
      if (
        result.accountStatus === "expired" ||
        result.accountStatus === "active"
      ) {
        // ✅ USAR company EN LUGAR DE email
        const userData: UserData = {
          company:
            getStringValue(result.user.email) ||
            getStringValue(result.user.company),
          email:
            getStringValue(result.user.email) ||
            getStringValue(result.user.company), // ← AGREGA ESTA LÍNEA
          displayName: getStringValue(result.user.displayName),
          sAMAccountName: getStringValue(result.user.sAMAccountName),
          employeeID: getStringValue(result.user.employeeID),
          userPrincipalName: getStringValue(result.user.userPrincipalName),
          dn: getStringValue(result.user.dn),
        };

        if (result.accountStatus === "expired") {
          setSuccessMessage(
            "Su contraseña ha expirado. Se ha enviado un código de verificación para restablecerla."
          );
        }

        console.log("🚀 Llamando onUserIdentified con:", userData);
        onUserIdentified(userData, userIdentifier);
      } else {
        setError("Estado de cuenta no reconocido");
      }
    } catch (err: any) {
      console.error("💥 Error completo:", err);

      if (err.message.includes("fetch") || err.message.includes("network")) {
        setError(
          "Error de conexión. Por favor verifique su conexión a internet e intente nuevamente."
        );
      } else {
        setError(
          `${err.message}. Si no tiene una cuenta, puede crearla en ${window.location.origin}/activate-account`
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para obtener estilos basados en el flowType
  const getStyles = () => {
    switch (flowType) {
      case "pin":
        return {
          bgColor: "bg-purple-100",
          textColor: "text-purple-600",
          badge: "bg-purple-100 text-purple-800",
          noteBg: "bg-purple-50 border-purple-200",
          noteText: "text-purple-700",
          buttonGradient:
            "from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700",
        };
      case "2fa":
        return {
          bgColor: "bg-orange-100",
          textColor: "text-orange-600",
          badge: "bg-orange-100 text-orange-800",
          noteBg: "bg-orange-50 border-orange-200",
          noteText: "text-orange-700",
          buttonGradient:
            "from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700",
        };
      default:
        return {
          bgColor: "bg-blue-100",
          textColor: "text-blue-600",
          badge: "bg-blue-100 text-blue-800",
          noteBg: "bg-blue-50 border-blue-200",
          noteText: "text-blue-700",
          buttonGradient:
            "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700",
        };
    }
  };

  const styles = getStyles();

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8"
    >
      <div className="text-center mt-4 sm:mt-6 mb-4 sm:mb-6">
        <div
          className={`mx-auto flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-full ${styles.bgColor}`}
        >
          <IconComponent
            className={`h-5 w-5 sm:h-6 sm:w-6 ${styles.textColor}`}
          />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mt-3 sm:mt-4 mb-2">
          {title || config.title}
        </h2>
        <p className="text-sm sm:text-base text-gray-600">
          {description || config.description}
        </p>

        {(flowType === "pin" || flowType === "2fa") && (
          <div
            className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles.badge}`}
          >
            {flowType === "pin" ? "Método con PIN" : "Método con 2FA"}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200 mb-4">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-700 text-xs sm:text-sm">{error}</p>
              {error.includes("activate-account") && (
                <p className="text-red-700 text-xs sm:text-sm mt-2">
                  ¿No tiene cuenta?{" "}
                  <a
                    href={`${window.location.origin}/activate-account`}
                    className="underline font-medium"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Crear cuenta aquí
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200 mb-4">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-green-700 text-xs sm:text-sm">
              {successMessage}
            </p>
          </div>
        </div>
      )}

      {/* ✅ INDICADOR DE VERIFICACIÓN DE PIN */}
      {flowType === "pin" && pinStatus.checking && (
        <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200 mb-4">
          <div className="flex items-center gap-2">
            <ArrowPathIcon className="w-5 h-5 text-blue-600 animate-spin" />
            <p className="text-blue-700 text-xs sm:text-sm">
              Verificando estado del PIN de seguridad...
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre de usuario o Carnet de identidad
          </label>
          <div className="relative">
            <IconComponent className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
            <input
              type="text"
              value={userIdentifier}
              onChange={(e) => setUserIdentifier(e.target.value)}
              placeholder="nombre de usuario o número del carnet de identidad"
              className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              required
              disabled={isSubmitting || pinStatus.checking}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Utilice el mismo nombre de usuario que usa para iniciar sesión en
            los sistemas UNISS
          </p>
        </div>

        <div className={`p-3 sm:p-4 rounded-lg border ${styles.noteBg}`}>
          <p className={`text-xs sm:text-sm ${styles.noteText}`}>
            <strong>Nota:</strong> {customNote || config.note}
          </p>
          {flowType === "email" && (
            <div className="mt-2 flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              <p className="text-xs">
                <strong>Proceso:</strong> Primero verificaremos que el usuario
                existe, luego enviaremos un código de verificación a su correo
                electrónico.
              </p>
            </div>
          )}
          {flowType === "pin" && (
            <div className="mt-2 flex items-center gap-2">
              <KeyIcon className="w-4 h-4" />
              <p className="text-xs">
                <strong>Requisito:</strong> Debe tener configurado previamente
                un PIN de seguridad en la configuración de su cuenta.
              </p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={
            isSubmitting || !userIdentifier.trim() || pinStatus.checking
          }
          className={`w-full bg-gradient-to-r py-3 rounded-lg transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 ${styles.buttonGradient} text-white`}
        >
          {isSubmitting || pinStatus.checking ? (
            <>
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
              {pinStatus.checking
                ? "Verificando PIN..."
                : flowType === "email"
                ? "Verificando usuario..."
                : flowType === "pin"
                ? "Verificando..."
                : flowType === "2fa"
                ? "Verificando 2FA..."
                : "Buscando usuario..."}
            </>
          ) : flowType === "email" ? (
            "Verificar Usuario"
          ) : flowType === "pin" ? (
            "Verificar y Continuar"
          ) : flowType === "2fa" ? (
            "Verificar 2FA"
          ) : (
            "Continuar"
          )}
        </button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          ¿Recordó su contraseña?{" "}
          <a href="/" className="text-blue-600 hover:underline font-medium">
            Iniciar sesión
          </a>
        </p>
      </div>

      {/* ✅ INFORMACIÓN ADICIONAL SOBRE EL MÉTODO DE RECUPERACIÓN */}
      {flowType === "pin" && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-2">
            <KeyIcon className="w-4 h-4 text-purple-600" />
            ¿Qué es el PIN de seguridad?
          </h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>
              • Es un código de 6 dígitos que configuró previamente en la
              sección de seguridad
            </li>
            <li>• Funciona como método alternativo para recuperar su cuenta</li>
            <li>
              • Si no lo configuró, puede usar el método de recuperación por
              correo electrónico
            </li>
            <li>
              • Para configurarlo, vaya a: Configuración → Seguridad → PIN de
              Seguridad
            </li>
          </ul>
        </div>
      )}
    </motion.div>
  );
}
