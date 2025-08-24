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
} from "@heroicons/react/24/outline";

// Carga perezosa optimizada con prefetch
const PasswordForm = dynamic(
  () => import("@/app/components/config/PasswordForm"),
  {
    loading: () => <FormLoading />,
    ssr: false,
  }
);

const EmailForm = dynamic(() => import("@/app/components/config/EmailForm"), {
  loading: () => <FormLoading />,
  ssr: false,
});

const TwoFactorAuth = dynamic(
  () => import("@/app/components/config/TwoFactorAuth"),
  {
    loading: () => <FormLoading />,
    ssr: false,
  }
);

// Componente de carga optimizado
const FormLoading = memo(() => (
  <div className="flex justify-center items-center py-8 min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
));

FormLoading.displayName = "FormLoading";

// Hook personalizado para precarga
const usePreload = () => {
  const [preloaded, setPreloaded] = useState({
    twoFA: false,
    email: false,
    password: false,
  });

  const preloadComponent = useCallback(
    (component: keyof typeof preloaded) => {
      if (preloaded[component]) return;

      // Usar requestIdleCallback para precarga en momentos de inactividad
      if ("requestIdleCallback" in window) {
        requestIdleCallback(() => {
          switch (component) {
            case "twoFA":
              import("@/app/components/config/TwoFactorAuth");
              break;
            case "email":
              import("@/app/components/config/EmailForm");
              break;
            case "password":
              import("@/app/components/config/PasswordForm");
              break;
          }
          setPreloaded((prev) => ({ ...prev, [component]: true }));
        });
      } else {
        // Fallback para navegadores que no soportan requestIdleCallback
        setTimeout(() => {
          switch (component) {
            case "twoFA":
              import("@/app/components/config/TwoFactorAuth");
              break;
            case "email":
              import("@/app/components/config/EmailForm");
              break;
            case "password":
              import("@/app/components/config/PasswordForm");
              break;
          }
          setPreloaded((prev) => ({ ...prev, [component]: true }));
        }, 300);
      }
    },
    [preloaded]
  );

  return { preloaded, preloadComponent };
};

// Hook personalizado para modo oscuro
const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Aplicar clase al body para modo oscuro
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  return { isDarkMode, toggleDarkMode };
};

interface ConfigItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
  children?: React.ReactNode;
  onHover?: () => void;
}

// Componente ToggleSwitch optimizado
const ToggleSwitch = memo(
  ({
    enabled,
    setEnabled,
  }: {
    enabled: boolean;
    setEnabled: (value: boolean) => void;
  }) => (
    <button
      onClick={() => setEnabled(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
        enabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
      }`}
      aria-label={enabled ? "Desactivar" : "Activar"}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full transition-transform duration-300 ${
          enabled ? "translate-x-6" : "translate-x-1"
        } bg-white dark:bg-gray-200`}
      />
    </button>
  )
);

ToggleSwitch.displayName = "ToggleSwitch";

const ConfigItem = memo(
  ({
    icon,
    title,
    description,
    action,
    children,
    onHover,
  }: ConfigItemProps) => (
    <div
      className="flex flex-col p-6 rounded-xl bg-white dark:bg-gray-800 mb-4 transition-colors"
      onMouseEnter={onHover}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200">
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
);

ConfigItem.displayName = "ConfigItem";

export default function ConfigPage() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [showTwoFASetup, setShowTwoFASetup] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("usuario@example.com");
  const { preloadComponent } = usePreload();
  const [isPending, startTransition] = useTransition();

  const searchParams = useSearchParams();

  // Precarga estratégica después de la carga inicial
  useEffect(() => {
    // Precargar componentes después de que la página esté interactiva
    const timer = setTimeout(() => {
      preloadComponent("password");
      preloadComponent("email");
    }, 1000);

    return () => clearTimeout(timer);
  }, [preloadComponent]);

  // Efecto para manejar parámetros de URL
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "change-password") {
      startTransition(() => {
        setShowPasswordForm(true);
        preloadComponent("password");
      });

      // Scroll suave con retardo para esperar a que el componente se cargue
      setTimeout(() => {
        const passwordSection = document.getElementById("password-section");
        if (passwordSection) {
          passwordSection.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 300);
    }
  }, [searchParams, preloadComponent]);

  const handleEmailSuccess = useCallback((newEmail: string) => {
    setCurrentEmail(newEmail);
    setShowEmailForm(false);
  }, []);

  const handleTwoFAToggle = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        startTransition(() => {
          setShowTwoFASetup(true);
          preloadComponent("twoFA");
        });
      } else {
        setTwoFAEnabled(false);
      }
    },
    [preloadComponent]
  );

  // Memoizar valores para evitar recálculos innecesarios
  const emailDescription = useMemo(() => currentEmail, [currentEmail]);

  return (
    <div className="min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-gray-900">
      <Header onToggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto py-8">
          <Link
            href="/dashboard"
            className="flex items-center text-uniss-blue dark:text-uniss-gold hover:opacity-80 transition-opacity"
            prefetch={true}
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Volver al Dashboard
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-gray-100">
          Configuración de la cuenta
        </h1>

        {/* Autenticación en dos pasos */}
        <ConfigItem
          icon={<ShieldCheckIcon className="w-6 h-6" />}
          title="Autenticación en dos pasos"
          description="Protege tu cuenta con una capa adicional de seguridad"
          action={
            <ToggleSwitch
              enabled={twoFAEnabled || showTwoFASetup}
              setEnabled={handleTwoFAToggle}
            />
          }
          onHover={() => preloadComponent("twoFA")}
        >
          {showTwoFASetup && (
            <TwoFactorAuth
              isDarkMode={isDarkMode}
              onSetupComplete={(secret, backupCodes) => {
                console.log("2FA configurado:", { secret, backupCodes });
                setTwoFAEnabled(true);
                setShowTwoFASetup(false);
              }}
              onCancel={() => {
                setShowTwoFASetup(false);
                setTwoFAEnabled(false);
              }}
              userEmail={currentEmail}
            />
          )}
        </ConfigItem>

        {/* Correo de respaldo */}
        <ConfigItem
          icon={<EnvelopeIcon className="w-6 h-6" />}
          title="Correo de respaldo"
          description={emailDescription}
          action={
            <ToggleSwitch
              enabled={showEmailForm}
              setEnabled={setShowEmailForm}
            />
          }
          onHover={() => preloadComponent("email")}
        >
          {showEmailForm && (
            <EmailForm
              isDarkMode={isDarkMode}
              currentEmail={currentEmail}
              onCancel={() => setShowEmailForm(false)}
              onSuccess={handleEmailSuccess}
            />
          )}
        </ConfigItem>

        {/* Cambiar contraseña - Con ID para scroll automático */}
        <div id="password-section">
          <ConfigItem
            icon={<LockClosedIcon className="w-6 h-6" />}
            title="Seguridad de la cuenta"
            description="Actualiza tu contraseña regularmente para mayor seguridad"
            action={
              <ToggleSwitch
                enabled={showPasswordForm}
                setEnabled={setShowPasswordForm}
              />
            }
            onHover={() => preloadComponent("password")}
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
    </div>
  );
}