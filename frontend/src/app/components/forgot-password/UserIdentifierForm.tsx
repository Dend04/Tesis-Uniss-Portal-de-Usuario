// app/components/forgot-password/UserIdentifierForm.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UserIcon, ArrowPathIcon, KeyIcon, LockClosedIcon } from "@heroicons/react/24/outline";

interface UserData {
  email: string;
  displayName?: string;
  sAMAccountName?: string;
  employeeID?: string;
  userPrincipalName?: string;
  dn: string;
  accountStatus?: string;
  hasPin?: boolean;
  has2FA?: boolean;
}

interface UserIdentifierFormProps {
  onUserIdentified: (data: UserData, identifier: string) => void;
  flowType?: 'email' | 'pin' | '2fa' | 'default';
  title?: string;
  description?: string;
  customNote?: string;
}

// Definir el tipo para la configuración de flujo
type FlowConfig = {
  [key in 'email' | 'pin' | '2fa' | 'default']: {
    title: string;
    description: string;
    note: string;
    icon: React.ComponentType<any>;
    endpoint: string;
  };
};

export default function UserIdentifierForm({ 
  onUserIdentified, 
  flowType = 'default',
  title,
  description,
  customNote 
}: UserIdentifierFormProps) {
  const [userIdentifier, setUserIdentifier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Configuración por tipo de flujo - ACTUALIZADO con 2FA
  const flowConfig: FlowConfig = {
    email: {
      title: "Recuperar Contraseña",
      description: "Ingrese su nombre de usuario o carnet de identidad",
      note: "Se enviará un código de verificación al correo electrónico de respaldo o personal que usted suministró al crear su cuenta.",
      icon: UserIcon,
      endpoint: "/email/forgot-password"
    },
    pin: {
      title: "Recuperar con PIN",
      description: "Ingrese su nombre de usuario o carnet de identidad",
      note: "Se verificará si ha activado la opción de recuperación con PIN.",
      icon: KeyIcon,
      endpoint: "/pin/find-user"
    },
    '2fa': {
      title: "Recuperar con 2FA",
      description: "Ingrese su nombre de usuario o carnet de identidad",
      note: "Se verificará si tiene activada la autenticación de dos factores.",
      icon: LockClosedIcon,
      endpoint: "/2fa/check-status"
    },
    default: {
      title: "Recuperar Contraseña",
      description: "Ingrese su nombre de usuario o carnet de identidad",
      note: "Seleccione un método de recuperación para continuar.",
      icon: UserIcon,
      endpoint: "/email/forgot-password"
    }
  };

  const config = flowConfig[flowType];
  const IconComponent = config.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userIdentifier.trim()) {
      setError("Por favor, ingrese su nombre de usuario o carnet de identidad");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      
      // Determinar el endpoint basado en el flowType
      let endpoint = '/email/forgot-password';
      if (flowType === 'pin') endpoint = '/pin/find-user';
      if (flowType === '2fa') endpoint = '/2fa/check-status';
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: userIdentifier }),
      });

      console.log("📨 Respuesta del servidor:", response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Error del servidor:", errorData);
        
        // Mensaje de error mejorado para usuario no encontrado
        if (response.status === 404 || errorData.error?.includes("no encontrado")) {
          setError(`Usuario no encontrado. Verifique que ha introducido correctamente sus datos. Si no tiene una cuenta, puede crearla en ${window.location.origin}/activate-account`);
          return;
        }
        
        throw new Error(errorData.message || "Error al buscar usuario");
      }

      const result = await response.json();
      console.log("✅ Datos recibidos del servidor:", result);

      // ✅ Manejo específico para flujo de PIN
      if (flowType === 'pin') {
        if (!result.success) {
          setError(result.error || "Error al verificar el usuario");
          return;
        }

        const userData: UserData = {
          email: result.userData.email,
          displayName: result.userData.displayName,
          sAMAccountName: result.userData.sAMAccountName,
          employeeID: result.userData.employeeID,
          dn: result.userData.dn,
          hasPin: result.hasPin // Agregamos información del PIN
        };

        onUserIdentified(userData, userIdentifier);
        return;
      }

      // ✅ Manejo específico para flujo de 2FA
      if (flowType === '2fa') {
        if (!result.success) {
          setError(result.error || "Error al verificar el usuario");
          return;
        }

        const userData: UserData = {
          email: result.userData.email,
          displayName: result.userData.displayName,
          sAMAccountName: result.userData.sAMAccountName,
          employeeID: result.userData.employeeID,
          dn: result.userData.dn,
          has2FA: result.has2FA // Agregamos información del 2FA
        };

        onUserIdentified(userData, userIdentifier);
        return;
      }

      // ✅ Manejo para flujo de email (código existente)
      if (result.accountStatus === 'disabled') {
        setError("Su cuenta está deshabilitada permanentemente. Contacte al departamento de soporte.");
        return;
      }

      if (result.accountStatus === 'locked') {
        setError("Su cuenta está temporalmente bloqueada. Espere 30 minutos o contacte a soporte.");
        return;
      }

      // ✅ Para cuentas expiradas o activas, continuar normalmente
      if (result.accountStatus === 'expired' || result.accountStatus === 'active') {
        const userData: UserData = {
          email: result.email,
          displayName: result.displayName,
          sAMAccountName: result.sAMAccountName,
          employeeID: result.employeeID,
          dn: result.dn,
          accountStatus: result.accountStatus
        };

        // ✅ Mostrar mensaje informativo si la contraseña expiró
        if (result.accountStatus === 'expired') {
          setSuccessMessage("Su contraseña ha expirado. Se ha enviado un código de verificación para restablecerla.");
        }

        console.log("🚀 Llamando onUserIdentified con:", userData);
        onUserIdentified(userData, userIdentifier);
      } else {
        setError("Estado de cuenta no reconocido");
      }

    } catch (err: any) {
      console.error("💥 Error completo:", err);
      
      // Mensaje de error genérico con enlace de activación
      if (err.message.includes("fetch") || err.message.includes("network")) {
        setError("Error de conexión. Por favor verifique su conexión a internet e intente nuevamente.");
      } else {
        setError(`${err.message}. Si no tiene una cuenta, puede crearla en ${window.location.origin}/activate-account`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para obtener estilos basados en el flowType
  const getStyles = () => {
    switch (flowType) {
      case 'pin':
        return {
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-600',
          badge: 'bg-purple-100 text-purple-800',
          noteBg: 'bg-purple-50 border-purple-200',
          noteText: 'text-purple-700',
          buttonGradient: 'from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
        };
      case '2fa':
        return {
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-600',
          badge: 'bg-orange-100 text-orange-800',
          noteBg: 'bg-orange-50 border-orange-200',
          noteText: 'text-orange-700',
          buttonGradient: 'from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
        };
      default:
        return {
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-600',
          badge: 'bg-blue-100 text-blue-800',
          noteBg: 'bg-blue-50 border-blue-200',
          noteText: 'text-blue-700',
          buttonGradient: 'from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
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
        <div className={`mx-auto flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-full ${styles.bgColor}`}>
          <IconComponent className={`h-5 w-5 sm:h-6 sm:w-6 ${styles.textColor}`} />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mt-3 sm:mt-4 mb-2">
          {title || config.title}
        </h2>
        <p className="text-sm sm:text-base text-gray-600">
          {description || config.description}
        </p>
        
        {(flowType === 'pin' || flowType === '2fa') && (
          <div className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles.badge}`}>
            {flowType === 'pin' ? 'Método con PIN' : 'Método con 2FA'}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200 mb-4">
          <p className="text-red-700 text-xs sm:text-sm">{error}</p>
          {/* Enlace de activación para errores de usuario no encontrado */}
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
      )}

      {successMessage && (
        <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200 mb-4">
          <p className="text-green-700 text-xs sm:text-sm">{successMessage}</p>
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
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Utilice el mismo nombre de usuario que usa para iniciar sesión en los sistemas UNISS
          </p>
        </div>

        <div className={`p-3 sm:p-4 rounded-lg border ${styles.noteBg}`}>
          <p className={`text-xs sm:text-sm ${styles.noteText}`}>
            <strong>Nota:</strong> {customNote || config.note}
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !userIdentifier.trim()}
          className={`w-full bg-gradient-to-r py-3 rounded-lg transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 ${styles.buttonGradient} text-white`}
        >
          {isSubmitting ? (
            <>
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
              {flowType === 'pin' ? "Verificando..." : flowType === '2fa' ? "Verificando 2FA..." : "Buscando usuario..."}
            </>
          ) : (
            flowType === 'pin' ? "Verificar PIN" : flowType === '2fa' ? "Verificar 2FA" : "Continuar"
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
    </motion.div>
  );
}