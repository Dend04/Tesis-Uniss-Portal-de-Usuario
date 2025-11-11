// app/config/page.tsx
"use client";

import {
  useState,
  useCallback,
  memo,
  useEffect,
  useMemo,
  useTransition,
} from "react";
import Header from "@/app/components/Header";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ShieldCheckIcon,
  EnvelopeIcon,
  LockClosedIcon,
  ArrowLeftIcon,
  KeyIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useConfirmation } from "@/app/hooks/useConfirmation";
import ConfirmationModal from "@/app/components/modals/ConfirmationModal";
import { useBackupEmail } from "@/app/hooks/useBackupEmail";
import { useDarkModeContext } from "@/app/contexts/DarkModeContext";

// Carga perezosa optimizada con imports explícitos
const PasswordForm = dynamic(() => import("@/app/components/config/PasswordForm"), {
  loading: () => <FormLoading />,
  ssr: false,
});

const EmailForm = dynamic(() => import("@/app/components/config/EmailForm"), {
  loading: () => <FormLoading />,
  ssr: false,
});

const TwoFactorAuth = dynamic(() => import("@/app/components/config/TwoFactorAuth"), {
  loading: () => <FormLoading />,
  ssr: false,
});

const PinForm = dynamic(() => import("@/app/components/config/PinForm"), {
  loading: () => <FormLoading />,
  ssr: false,
});

// Componente de carga optimizado
const FormLoading = memo(() => (
  <div className="flex justify-center items-center py-12">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span className="text-sm text-gray-500 dark:text-gray-400">Cargando...</span>
    </div>
  </div>
));

FormLoading.displayName = "FormLoading";

// Hook personalizado para precarga mejorado
const usePreload = () => {
  const [preloaded, setPreloaded] = useState({
    twoFA: false,
    email: false,
    password: false,
    pin: false,
  });

  const preloadComponent = useCallback((component: keyof typeof preloaded) => {
    if (preloaded[component]) return;

    const preloadAction = () => {
      const components = {
        twoFA: () => import("@/app/components/config/TwoFactorAuth"),
        email: () => import("@/app/components/config/EmailForm"),
        password: () => import("@/app/components/config/PasswordForm"),
        pin: () => import("@/app/components/config/PinForm"),
      };

      components[component]().then(() => {
        setPreloaded((prev) => ({ ...prev, [component]: true }));
      });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(preloadAction);
    } else {
      setTimeout(preloadAction, 100);
    }
  }, [preloaded]);

  return { preloadComponent, preloaded };
};

// Componente ToggleSwitch mejorado
const ToggleSwitch = memo(({ 
  enabled, 
  setEnabled,
  loading = false
}: { 
  enabled: boolean; 
  setEnabled: (value: boolean) => void;
  loading?: boolean;
}) => (
  <button
    onClick={() => !loading && setEnabled(!enabled)}
    disabled={loading}
    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ${
      enabled 
        ? 'bg-green-500 hover:bg-green-600' 
        : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
    } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    aria-label={enabled ? "Desactivar" : "Activar"}
    type="button"
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-all duration-300 ${
        enabled ? "translate-x-6" : "translate-x-1"
      } ${loading ? 'opacity-70' : ''}`}
    />
    {loading && (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    )}
  </button>
));

ToggleSwitch.displayName = "ToggleSwitch";

// Badge para estados - CORREGIDO
const StatusBadge = memo(({ 
  type 
}: { 
  type: 'active' | 'inactive' | 'recommended' | 'optional';
}) => {
  const styles = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    recommended: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    optional: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  };

  const labels = {
    active: 'Activo',
    inactive: 'Inactivo',
    recommended: 'Recomendado',
    optional: 'Opcional'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[type]}`}>
      {labels[type]}
    </span>
  );
});

StatusBadge.displayName = "StatusBadge";

interface ConfigItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  status?: 'active' | 'inactive' | 'recommended' | 'optional';
  action: React.ReactNode;
  children?: React.ReactNode;
  onHover?: () => void;
  isExpanded?: boolean;
}

// Componente ConfigItem mejorado
const ConfigItem = memo(({
  icon,
  title,
  description,
  status,
  action,
  children,
  onHover,
  isExpanded = false,
}: ConfigItemProps) => (
  <div
    className={`flex flex-col p-6 rounded-2xl border transition-all duration-300 ${
      isExpanded
        ? 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-800 shadow-lg'
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
    }`}
    onMouseEnter={onHover}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-start gap-4 flex-1">
        <div className={`p-3 rounded-xl transition-colors ${
          isExpanded
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
        }`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">
              {title}
            </h3>
            {status && <StatusBadge type={status} />}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 ml-4">
        {action}
      </div>
    </div>
    
    {children && (
      <div className={`mt-6 transition-all duration-300 ${
        isExpanded ? 'animate-fadeIn' : ''
      }`}>
        {children}
      </div>
    )}
  </div>
));

ConfigItem.displayName = "ConfigItem";

// Componente de progreso de seguridad - MODIFICADO (solo 2FA y PIN)
const SecurityProgress = memo(({ 
  twoFAEnabled, 
  hasPin 
}: { 
  twoFAEnabled: boolean;
  hasPin: boolean;
}) => {
  const securityItems = [
    { name: "Autenticación 2FA", enabled: twoFAEnabled, weight: 0.6 },
    { name: "PIN de Seguridad", enabled: hasPin, weight: 0.4 },
  ];

  const enabledCount = securityItems.filter(item => item.enabled).length;
  const totalCount = securityItems.length;
  
  // Calcular progreso ponderado
  const progress = securityItems.reduce((total, item) => {
    return total + (item.enabled ? item.weight * 100 : 0);
  }, 0);
  
  const getSecurityLevel = () => {
    if (progress >= 80) return { level: "Alta", color: "text-green-600 dark:text-green-400", description: "Excelente protección" };
    if (progress >= 50) return { level: "Media", color: "text-yellow-600 dark:text-yellow-400", description: "Buena protección" };
    if (progress >= 20) return { level: "Básica", color: "text-orange-600 dark:text-orange-400", description: "Protección básica" };
    return { level: "Mínima", color: "text-red-600 dark:text-red-400", description: "Protección mínima" };
  };

  const { level, color, description } = getSecurityLevel();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Nivel de Seguridad
          </h2>
          <p className={`text-sm ${color} mt-1`}>
            {description}
          </p>
        </div>
        <span className={`text-lg font-bold ${color}`}>
          {level}
        </span>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Progreso de seguridad</span>
          <span>{Math.round(progress)}%</span>
        </div>
        
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div 
            className="h-3 rounded-full bg-gradient-to-r from-red-500 via-orange-500 to-green-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Detalles de medidas de seguridad */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          {securityItems.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                item.enabled ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {item.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {item.enabled ? 'Activado' : 'No activado'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

SecurityProgress.displayName = "SecurityProgress";

// ✅ FUNCIÓN MEJORADA CON MÁS ROBUSTEZ
const getSAMAccountNameFromToken = (): string | null => {
  try {
    const tokenNames = ['authToken', 'token', 'userToken', 'accessToken'];
    let token = null;

    for (const tokenName of tokenNames) {
      token = localStorage.getItem(tokenName);
      if (token) {
        console.log(`✅ Token encontrado en: ${tokenName}`);
        break;
      }
    }

    if (!token) {
      console.warn("❌ No se encontró ningún token en localStorage");
      return null;
    }

    // Decodificar el token
    const base64Url = token.split('.')[1];
    if (!base64Url) {
      console.error("❌ Token no tiene formato JWT válido");
      return null;
    }

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));

    console.log("=== 🔍 CAMPOS DISPONIBLES EN TOKEN ===");
    console.log("🔑 Campos:", Object.keys(payload));
    
    // Buscar sAMAccountName en diferentes variantes
    const samAccountNameFields = [
      'sAMAccountName',        // Formato estándar
      'samaccountname',        // Minúsculas
      'samAccountName',        // Camel case
      'username',              // Alternativo común
      'userName',              // Alternativo
      'sub',                   // Subject
      'preferred_username',    // Estándar OIDC
      'uid',                   // User ID
      'user_id',               // User ID alternativo
      'email'                  // Como último recurso
    ];

    for (const field of samAccountNameFields) {
      if (payload[field]) {
        console.log(`✅ sAMAccountName encontrado en campo '${field}': ${payload[field]}`);
        return payload[field];
      }
    }

    console.warn("❌ No se encontró sAMAccountName en el token");
    return null;

  } catch (error) {
    console.error("❌ Error decodificando el token:", error);
    return null;
  }
};

// ✅ FUNCIÓN PARA OBTENER TOKEN DE AUTENTICACIÓN
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  const tokenNames = ['authToken', 'token', 'userToken', 'accessToken'];
  for (const tokenName of tokenNames) {
    const token = localStorage.getItem(tokenName);
    if (token) {
      return token;
    }
  }
  return null;
};

export default function ConfigPage() {
  const { isDarkMode } = useDarkModeContext();
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [showTwoFASetup, setShowTwoFASetup] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPinForm, setShowPinForm] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [pinLoading, setPinLoading] = useState(true); // ✅ NUEVO: estado de carga del PIN
  const [loadingStates, setLoadingStates] = useState({
    twoFA: false,
    pin: false,
    email: false,
    password: false,
  });
  
  const { preloadComponent } = usePreload();
  const { backupEmail, loading: emailLoading, error: emailError, updateBackupEmail } = useBackupEmail();
  const [isPending, startTransition] = useTransition();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirmation();

  const searchParams = useSearchParams();

  // ✅ EFECTO CORREGIDO PARA VERIFICAR ESTADO DEL 2FA
  useEffect(() => {
    const check2FAStatus = async () => {
      try {
        const sAMAccountName = getSAMAccountNameFromToken();
        
        if (!sAMAccountName) {
          console.warn("⚠️ No se pudo obtener sAMAccountName del token");
          setTwoFAEnabled(false);
          return;
        }

        console.log("🔍 Verificando estado 2FA para sAMAccountName:", sAMAccountName);

        const API_URL = process.env.NEXT_PUBLIC_API_URL;
        const encodedSAMAccountName = encodeURIComponent(sAMAccountName);
        const url = `${API_URL}/2fa/status/${encodedSAMAccountName}`;

        console.log("🌐 URL de verificación:", url);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log("📡 Respuesta HTTP:", response.status, response.statusText);
        
        if (response.ok) {
          const result = await response.json();
          console.log("✅ Estado 2FA obtenido:", result);
          setTwoFAEnabled(result.enabled);
        } else {
          console.warn(`⚠️ Error ${response.status}, asumiendo 2FA desactivado`);
          setTwoFAEnabled(false);
        }
      } catch (error) {
        console.error("❌ Error verificando estado del 2FA:", error);
        setTwoFAEnabled(false);
      }
    };

    check2FAStatus();
  }, []);

  // ✅ NUEVO EFECTO: VERIFICAR ESTADO DEL PIN AL CARGAR LA PÁGINA
  useEffect(() => {
    const checkPinStatus = async () => {
      try {
        setPinLoading(true);
        console.log("🔍 Verificando estado del PIN...");

        const token = getAuthToken();
        if (!token) {
          console.warn("❌ No se pudo obtener el token de autenticación");
          setHasPin(false);
          setPinLoading(false);
          return;
        }

        const API_URL = process.env.NEXT_PUBLIC_API_URL;
        const response = await fetch(`${API_URL}/pin/check`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        });

        console.log("📡 Respuesta del servidor (PIN):", response.status);

        if (response.ok) {
          const result = await response.json();
          console.log("✅ Estado del PIN obtenido:", result);
          setHasPin(result.hasPin);
        } else {
          console.warn(`⚠️ Error ${response.status}, asumiendo PIN no configurado`);
          setHasPin(false);
        }
      } catch (error) {
        console.error("❌ Error verificando estado del PIN:", error);
        setHasPin(false);
      } finally {
        setPinLoading(false);
      }
    };

    checkPinStatus();
  }, []);

  // Precarga estratégica mejorada
  useEffect(() => {
    const preloadAll = () => {
      preloadComponent("password");
      preloadComponent("email");
      preloadComponent("pin");
      preloadComponent("twoFA");
    };

    const timer = setTimeout(preloadAll, 500);
    return () => clearTimeout(timer);
  }, [preloadComponent]);

  // Manejo de parámetros URL optimizado
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "change-password") {
      startTransition(() => {
        setShowPasswordForm(true);
        preloadComponent("password");
      });

      requestAnimationFrame(() => {
        setTimeout(() => {
          const passwordSection = document.getElementById("password-section");
          passwordSection?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 100);
      });
    }
  }, [searchParams, preloadComponent]);

  // Manejo de estados de carga
  const setLoading = useCallback((key: keyof typeof loadingStates, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  }, []);

  // ✅ FUNCIÓN MEJORADA PARA ACTIVAR 2FA
  const handle2FASetupComplete = async (secret: string) => {
    try {
      const sAMAccountName = getSAMAccountNameFromToken();
      
      if (!sAMAccountName) {
        console.warn("⚠️ No se pudo obtener sAMAccountName, activando localmente");
        setTwoFAEnabled(true);
        setShowTwoFASetup(false);
        return;
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      const url = `${API_URL}/2fa/activate`;

      console.log("🔍 Activando 2FA (solo secreto) para:", sAMAccountName);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sAMAccountName: sAMAccountName,
          secret: secret
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ 2FA activado exitosamente:", result);
      } else {
        console.warn(`⚠️ Respuesta HTTP no OK: ${response.status}`);
      }

      setTwoFAEnabled(true);
      setShowTwoFASetup(false);

    } catch (error) {
      console.error('❌ Error en handle2FASetupComplete:', error);
      setTwoFAEnabled(true);
      setShowTwoFASetup(false);
    }
  };

  const deactivate2FA = async (): Promise<boolean> => {
    try {
      const sAMAccountName = getSAMAccountNameFromToken();
      
      if (!sAMAccountName) {
        console.error("❌ No se pudo obtener sAMAccountName para desactivar 2FA");
        return false;
      }

      console.log("🔄 Desactivando 2FA para:", sAMAccountName);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/2fa/deactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sAMAccountName: sAMAccountName
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log("✅ 2FA desactivado exitosamente");
        return true;
      } else {
        console.error("❌ Error desactivando 2FA:", result.error);
        return false;
      }
    } catch (error) {
      console.error("❌ Error desactivando 2FA:", error);
      return false;
    }
  };

  const handleEmailSuccess = useCallback((newEmail: string) => {
    updateBackupEmail(newEmail);
    setShowEmailForm(false);
    setLoading('email', false);
  }, [updateBackupEmail, setLoading]);

  const handleTwoFAToggle = useCallback(async (enabled: boolean) => {
    if (enabled) {
      setLoading('twoFA', true);
      startTransition(() => {
        setShowTwoFASetup(true);
        preloadComponent("twoFA");
        setLoading('twoFA', false);
      });
    } else {
      const userConfirmed = await confirm({
        title: "Desactivar Autenticación en Dos Pasos",
        message: "¿Está seguro de que desea desactivar la autenticación en dos pasos? Tenga en cuenta que perderá una de sus opciones para poder restablecer su contraseña en caso de que se le olvide y perderá una capa de protección. ¿Desea continuar?",
        confirmText: "Sí, Desactivar",
        cancelText: "Cancelar",
        variant: "danger"
      });

      if (userConfirmed) {
        setLoading('twoFA', true);
        
        const success = await deactivate2FA();
        
        if (success) {
          setTwoFAEnabled(false);
          console.log("✅ 2FA desactivado exitosamente");
        } else {
          console.error("❌ Error al desactivar 2FA en backend");
        }
        
        setLoading('twoFA', false);
      }
    }
  }, [preloadComponent, confirm, setLoading]);

  // ✅ ACTUALIZADO: handlePinToggle para eliminar el PIN llamando a la API
  const handlePinToggle = useCallback(async (enabled: boolean) => {
    if (enabled) {
      setLoading('pin', true);
      startTransition(() => {
        setShowPinForm(true);
        preloadComponent("pin");
        setLoading('pin', false);
      });
    } else {
      const userConfirmed = await confirm({
        title: "Eliminar PIN de Seguridad",
        message: "¿Está seguro de que desea eliminar su PIN de seguridad? Perderá esta opción para recuperar su contraseña en caso de olvido.",
        confirmText: "Sí, Eliminar",
        cancelText: "Cancelar",
        variant: "danger"
      });

      if (userConfirmed) {
        setLoading('pin', true);
        
        try {
          const token = getAuthToken();
          if (!token) {
            throw new Error('No autenticado');
          }

          const API_URL = process.env.NEXT_PUBLIC_API_URL;
          const response = await fetch(`${API_URL}/pin/remove`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            },
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setHasPin(false);
              console.log("✅ PIN eliminado exitosamente");
            } else {
              console.error("❌ Error al eliminar PIN:", result.error);
            }
          } else {
            console.error("❌ Error en la respuesta al eliminar PIN");
          }
        } catch (error) {
          console.error("❌ Error al eliminar PIN:", error);
        } finally {
          setLoading('pin', false);
        }
      }
    }
  }, [preloadComponent, confirm, setLoading]);

  // ✅ ACTUALIZADO: handlePinSuccess para verificar el estado del PIN después de guardar
  const handlePinSuccess = useCallback(async () => {
    // Después de guardar, verificar el estado actual del PIN
    setLoading('pin', true);
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No autenticado');
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${API_URL}/pin/check`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.ok) {
        const result = await response.json();
        setHasPin(result.hasPin);
        console.log(`✅ Estado del PIN actualizado: ${result.hasPin ? 'CONFIGURADO' : 'NO CONFIGURADO'}`);
      } else {
        console.warn('No se pudo verificar el estado del PIN después de guardar');
        // Asumimos que se guardó correctamente
        setHasPin(true);
      }
    } catch (error) {
      console.error("Error verificando estado del PIN después de guardar:", error);
      // Asumimos que se guardó correctamente
      setHasPin(true);
    } finally {
      setShowPinForm(false);
      setLoading('pin', false);
    }
  }, [setLoading]);

  const handlePinCancel = useCallback(() => {
    setShowPinForm(false);
    setLoading('pin', false);
  }, [setLoading]);

  // Memoizar descripciones y estados
  const emailDescription = useMemo(() => {
    if (emailLoading) return 'Cargando información del correo...';
    if (emailError) return 'Error al cargar el correo electrónico';
    return backupEmail || "No configurado - Agregue un correo de respaldo";
  }, [backupEmail, emailLoading, emailError]);

  // ✅ ACTUALIZADO: pinDescription para incluir estado de carga
  const pinDescription = useMemo(() => {
    if (pinLoading) {
      return "Verificando estado del PIN...";
    }
    if (hasPin) {
      return "PIN de seguridad configurado. Puede usarlo para recuperar su contraseña en caso de olvido.";
    }
    return "Configure un PIN de 6 dígitos para recuperar su contraseña en caso de olvido. Esta opción es opcional pero recomendada.";
  }, [hasPin, pinLoading]);

  // Determinar el estado del correo
  const getEmailStatus = useCallback(() => {
    if (emailLoading) return 'inactive';
    if (emailError) return 'inactive';
    return backupEmail ? 'active' : 'inactive';
  }, [backupEmail, emailLoading, emailError]);

  // ✅ NUEVO: Determinar el estado del PIN
  const getPinStatus = useCallback(() => {
    if (pinLoading) return 'inactive';
    return hasPin ? 'active' : 'recommended';
  }, [hasPin, pinLoading]);

  // Determinar el estado para otros elementos
  const getSecurityStatus = useCallback((enabled: boolean, recommended?: boolean) => {
    if (enabled) return 'active';
    if (recommended) return 'recommended';
    return 'optional';
  }, []);

  return (
    <div className="min-h-screen transition-colors duration-300 bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-900 dark:to-blue-900/20">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header mejorado */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-uniss-blue dark:text-uniss-gold hover:opacity-80 transition-all duration-200 group mb-6"
            prefetch={true}
          >
            <ArrowLeftIcon className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span className="font-medium">Volver al Dashboard</span>
          </Link>

          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
              <Cog6ToothIcon className="w-8 h-8 text-uniss-blue dark:text-uniss-gold" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                Configuración de Seguridad
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Gestiona las opciones de seguridad y recuperación de tu cuenta
              </p>
            </div>
          </div>
        </div>

        {/* Barra de progreso de seguridad - ACTUALIZADA con estado real del PIN */}
        <SecurityProgress 
          twoFAEnabled={twoFAEnabled} 
          hasPin={hasPin && !pinLoading} 
        />

        <div className="space-y-6">
          {/* Autenticación en dos pasos */}
          <ConfigItem
            icon={<ShieldCheckIcon className="w-6 h-6" />}
            title="Autenticación en Dos Pasos"
            description="Protege tu cuenta con una capa adicional de seguridad mediante códigos de verificación. Opcional pero altamente recomendada."
            status={getSecurityStatus(twoFAEnabled, true)}
            action={
              <ToggleSwitch
                enabled={twoFAEnabled || showTwoFASetup}
                setEnabled={handleTwoFAToggle}
                loading={loadingStates.twoFA}
              />
            }
            onHover={() => preloadComponent("twoFA")}
            isExpanded={showTwoFASetup}
          >
            {showTwoFASetup && (
              <TwoFactorAuth
                isDarkMode={isDarkMode}
                onSetupComplete={handle2FASetupComplete}
                onCancel={() => {
                  setShowTwoFASetup(false);
                  if (!twoFAEnabled) {
                    setTwoFAEnabled(false);
                  }
                }}
                userEmail={backupEmail || ''}
              />
            )}
          </ConfigItem>

          {/* ✅ PIN de seguridad - ACTUALIZADO con estado real */}
          <ConfigItem
            icon={<KeyIcon className="w-6 h-6" />}
            title="PIN de Seguridad"
            description={pinDescription}
            status={getPinStatus()}
            action={
              <ToggleSwitch
                enabled={hasPin || showPinForm}
                setEnabled={handlePinToggle}
                loading={loadingStates.pin || pinLoading}
              />
            }
            onHover={() => preloadComponent("pin")}
            isExpanded={showPinForm}
          >
            {showPinForm && (
              <PinForm
                isDarkMode={isDarkMode}
                hasExistingPin={hasPin}
                onSuccess={handlePinSuccess}
                onCancel={handlePinCancel}
              />
            )}
          </ConfigItem>

          {/* Correo de respaldo - CORREGIDO */}
          <ConfigItem
            icon={<EnvelopeIcon className="w-6 h-6" />}
            title="Correo de Respaldo"
            description={emailDescription}
            status={getEmailStatus()}
            action={
              <ToggleSwitch
                enabled={showEmailForm}
                setEnabled={setShowEmailForm}
                loading={loadingStates.email}
              />
            }
            onHover={() => preloadComponent("email")}
            isExpanded={showEmailForm}
          >
            {showEmailForm && (
              <EmailForm
                isDarkMode={isDarkMode}
                currentEmail={backupEmail || ''}
                onCancel={() => setShowEmailForm(false)}
                onSuccess={handleEmailSuccess}
              />
            )}
          </ConfigItem>

          {/* Cambiar contraseña */}
          <div id="password-section">
            <ConfigItem
              icon={<LockClosedIcon className="w-6 h-6" />}
              title="Contraseña de la Cuenta"
              description="Actualiza tu contraseña regularmente para mantener tu cuenta segura"
              status="active"
              action={
                <ToggleSwitch
                  enabled={showPasswordForm}
                  setEnabled={setShowPasswordForm}
                  loading={loadingStates.password}
                />
              }
              onHover={() => preloadComponent("password")}
              isExpanded={showPasswordForm}
            >
              {showPasswordForm && (
                <PasswordForm
                  isDarkMode={isDarkMode}
                  onSuccess={() => setShowPasswordForm(false)}
                  onCancel={() => setShowPasswordForm(false)}
                />
              )}
            </ConfigItem>
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-12 p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <ExclamationTriangleIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">
                Recomendaciones de Seguridad
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• <strong>Autenticación en dos pasos:</strong> La medida de seguridad más efectiva contra accesos no autorizados</li>
                <li>• <strong>PIN de seguridad:</strong> Método alternativo de recuperación en caso de olvido de contraseña</li>
                <li>• <strong>Correo de respaldo:</strong> Esencial para recuperar el acceso a tu cuenta</li>
                <li>• <strong>Contraseña segura:</strong> Utiliza una combinación de letras, números y símbolos</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isOpen}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isDarkMode={isDarkMode}
        options={options!}
      />

      {/* Estilos de animación */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}