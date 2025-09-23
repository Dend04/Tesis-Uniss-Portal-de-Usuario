'use client';

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
  startTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Head from "next/head";
import dynamic from "next/dynamic";

// Tipos
import { Device } from "@/types";

// Utilidades
import TutorialModal from "@/app/components/TutorialModal";

// ✅ Definir interfaz para los datos de contraseña
interface PasswordData {
  lastPasswordChange: string;
  passwordExpirationDate: string | null;
  daysUntilExpiration: number | null;
  isPasswordExpired: boolean;
  expiresSoon: boolean;
}

// Componentes optimizados con carga diferida
const Header = dynamic(() => import("@/app/components/Header"), {
  loading: () => (
    <div className="h-16 bg-white dark:bg-gray-800 border-b dark:border-gray-700" />
  ),
  ssr: false,
});

const AddDeviceModal = dynamic(
  () => import("../../components/AddDeviceModal"),
  {
    ssr: false,
  }
);

// Pre-carga de componentes después del renderizado inicial
const preloadDashboardComponents = () => {
  if (typeof window !== "undefined") {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => {
        Promise.allSettled([
          import("../../components/dashboard/UserProfile"),
          import("../../components/dashboard/PasswordStatus"),
          import("../../components/dashboard/DevicesSection"),
        ]);
      });
    } else {
      setTimeout(() => {
        Promise.allSettled([
          import("../../components/dashboard/UserProfile"),
          import("../../components/dashboard/PasswordStatus"),
          import("../../components/dashboard/DevicesSection"),
        ]);
      }, 1000);
    }
  }
};

// Componentes de dashboard con carga diferida
const UserProfile = dynamic(
  () => import("../../components/dashboard/UserProfile"),
  {
    loading: () => (
      <div className="lg:w-2/5 rounded-xl shadow-sm p-6 bg-gray-100 dark:bg-gray-800 min-h-[500px] animate-pulse">
        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
      </div>
    ),
    ssr: false,
  }
);

const PasswordStatus = dynamic(
  () => import("../../components/dashboard/PasswordStatus"),
  {
    loading: () => (
      <div className="rounded-xl shadow-sm p-6 bg-gray-100 dark:bg-gray-800 min-h-[200px] animate-pulse">
        <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
      </div>
    ),
    ssr: false,
  }
);

const DevicesSection = dynamic(
  () => import("../../components/dashboard/DevicesSection"),
  {
    loading: () => (
      <div className="rounded-xl shadow-sm p-6 bg-gray-100 dark:bg-gray-800 min-h-[300px] animate-pulse">
        <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
      </div>
    ),
    ssr: false,
  }
);

// Hook personalizado para el modo oscuro
const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

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

// Hook para obtener datos de expiración de contraseña del backend
const usePasswordData = () => {
  const [passwordData, setPasswordData] = useState<PasswordData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPasswordData = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          throw new Error('No se encontró token de autenticación');
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/users/profile`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('authToken');
            throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
          }
          throw new Error(`Error en la petición: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success && data.user) {
          const passwordInfo: PasswordData = {
            lastPasswordChange: data.user.ultimoCambioPassword || new Date().toISOString(),
            passwordExpirationDate: data.user.fechaExpiracion || null,
            daysUntilExpiration: data.user.diasHastaVencimiento || null,
            isPasswordExpired: data.user.passwordExpirada || false,
            expiresSoon: data.user.passwordExpiraProximamente || false
          };
          setPasswordData(passwordInfo);
        } else {
          throw new Error('Formato de respuesta inválido');
        }
      } catch (err: any) {
        setError(err.message);
        const fallbackData: PasswordData = {
          lastPasswordChange: new Date().toISOString(),
          passwordExpirationDate: null,
          daysUntilExpiration: 90,
          isPasswordExpired: false,
          expiresSoon: false
        };
        setPasswordData(fallbackData);
      } finally {
        setLoading(false);
      }
    };

    fetchPasswordData();
  }, []);

  return { passwordData, loading, error };
};

export default function Dashboard() {
  const router = useRouter();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [dashboardKey, setDashboardKey] = useState(0);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Obtener datos de expiración de contraseña del backend
  const { passwordData, loading: passwordLoading, error: passwordError } = usePasswordData();

  // Efecto para verificar si es la primera vez que el usuario ve el dashboard
  useEffect(() => {
    const tutorialSeen = localStorage.getItem("tutorialSeen");
    if (!tutorialSeen) {
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Precargar componentes después de la carga inicial
  useEffect(() => {
    preloadDashboardComponents();
  }, []);

  // Efecto para resetear la key cuando se entre al dashboard
  useEffect(() => {
    setDashboardKey(prev => prev + 1);
  }, [pathname, searchParams]);  // Se ejecuta cuando la ruta cambia al dashboard

  // Pre-carga de rutas optimizada
  useEffect(() => {
    startTransition(() => {
      router.prefetch("/config");
      router.prefetch("/activity-logs");
      router.prefetch("/perfil");
    });
  }, [router]);

  // Datos de contraseña con fallback seguro
  const passwordProps = useMemo((): PasswordData => {
    if (passwordData) {
      return passwordData;
    }
    
    // Fallback mientras carga o si hay error
    return {
      lastPasswordChange: new Date().toISOString(),
      passwordExpirationDate: null,
      daysUntilExpiration: 90,
      isPasswordExpired: false,
      expiresSoon: false
    };
  }, [passwordData]);

  // Simulación de carga optimizada con cleanup
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setDevices([
          {
            type: "phone",
            mac: "00:1A:2B:3C:4D:5E",
            model: "Xiaomi Redmi Note 10",
          },
          { type: "laptop", mac: "00:1A:2B:3C:4D:5F", model: "Dell XPS 13" },
        ]);
        setLoading(false);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const handleAddDevice = useCallback((data: Device) => {
    setDevices((prev) => [...prev, data]);
    setShowDeviceModal(false);
  }, []);

  const handleOpenDeviceModal = useCallback(() => {
    setShowDeviceModal(true);
  }, []);

  // Loading combinado: datos principales + datos de contraseña
  const isLoading = loading || passwordLoading;

  return (
    <>
      <Head>
        <title>Dashboard - Plataforma UNISS</title>
        <meta
          name="description"
          content="Panel de control del estudiante en la Plataforma UNISS"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={isDarkMode ? "#1f2937" : "#f9fafb"} />

        {/* Preload de recursos críticos */}
        <link
          rel="preload"
          href="/fonts/geist/GeistVariableVF.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />

        <link
          rel="preload"
          href={isDarkMode ? "/uniss-logoDark.png" : "/uniss-logo.png"}
          as="image"
        />
      </Head>

      <div
        className={`min-h-screen transition-colors duration-300 ${
          isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50"
        }`}
      >
        <Suspense
          fallback={
            <div className="h-16 bg-white dark:bg-gray-800 border-b dark:border-gray-700" />
          }
        >
          <Header onToggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
        </Suspense>

        {isLoading ? (
          <div className="flex flex-col lg:flex-row gap-8 p-8">
            <div className="lg:w-2/5 rounded-xl shadow-sm p-6 bg-gray-100 dark:bg-gray-800 min-h-[500px] animate-pulse">
              <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
            </div>
            <div className="lg:w-3/5 space-y-8">
              <div className="rounded-xl shadow-sm p-6 bg-gray-100 dark:bg-gray-800 min-h-[200px] animate-pulse">
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
              </div>
              <div className="rounded-xl shadow-sm p-6 bg-gray-100 dark:bg-gray-800 min-h-[300px] animate-pulse">
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
              </div>
            </div>
          </div>
        ) : (
          <main className="flex flex-col lg:flex-row gap-8 p-8">
            {/* ✅ CORREGIDO: Solo pasar isDarkMode al UserProfile */}
            <UserProfile isDarkMode={isDarkMode} />

            <div className="lg:w-3/5 space-y-8">
              {/* REEMPLAZADO: AccountStatus por PasswordStatus con datos reales */}
              <PasswordStatus
                key={`password-status-${dashboardKey}`}
                isDarkMode={isDarkMode}
                lastPasswordChange={passwordProps.lastPasswordChange}
                passwordExpirationDate={passwordProps.passwordExpirationDate}
                daysUntilExpiration={passwordProps.daysUntilExpiration}
                isPasswordExpired={passwordProps.isPasswordExpired}
                expiresSoon={passwordProps.expiresSoon}
                className="password-status-section"
              />

              <DevicesSection
                isDarkMode={isDarkMode}
                devices={devices}
                onAddDeviceClick={handleOpenDeviceModal}
                className="devices-section"
              />
            </div>
          </main>
        )}

        {/* Modal para agregar dispositivo */}
        <AddDeviceModal
          isOpen={showDeviceModal}
          onClose={() => setShowDeviceModal(false)}
          onAddDevice={handleAddDevice}
          isDarkMode={isDarkMode}
        />
        
        <TutorialModal
          isOpen={showTutorial}
          onClose={() => setShowTutorial(false)}
          isDarkMode={isDarkMode}
        />

        {/* Mostrar error de contraseña si existe (sin interrumpir la UI) */}
        {passwordError && (
          <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg shadow-lg max-w-sm">
            <strong>Nota:</strong> Los datos de expiración de contraseña podrían no estar actualizados.
          </div>
        )}
      </div>
    </>
  );
}