"use client";

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
import { useDarkModeContext } from "@/app/contexts/DarkModeContext";

// Importar iconos de Heroicons para loading states
import { ArrowPathIcon } from "@heroicons/react/24/outline";

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
  () => import("../../components/modals/AddDeviceModal"),
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
        <div className="flex items-center justify-center h-full">
          <ArrowPathIcon className="w-8 h-8 animate-spin text-gray-400" />
        </div>
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
        <div className="flex items-center justify-center h-full">
          <ArrowPathIcon className="w-6 h-6 animate-spin text-gray-400" />
        </div>
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
        <div className="flex items-center justify-center h-full">
          <ArrowPathIcon className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    ),
    ssr: false,
  }
);

// Hook para obtener datos de expiración de contraseña del backend
const usePasswordData = () => {
  const [passwordData, setPasswordData] = useState<PasswordData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPasswordData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          throw new Error("No se encontró token de autenticación");
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/users/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              "Sesión expirada. Por favor, inicia sesión nuevamente."
            );
          }
          throw new Error(`Error en la petición: ${response.status}`);
        }

        const data = await response.json();
        if (data.success && data.user) {
          const passwordInfo: PasswordData = {
            lastPasswordChange:
              data.user.ultimoCambioPassword || new Date().toISOString(),
            passwordExpirationDate: data.user.fechaExpiracion || null,
            daysUntilExpiration: data.user.diasHastaVencimiento || null,
            isPasswordExpired: data.user.passwordExpirada || false,
            expiresSoon: data.user.passwordExpiraProximamente || false,
          };
          setPasswordData(passwordInfo);
        } else {
          throw new Error("Formato de respuesta inválido");
        }
      } catch (err: any) {
        setError(err.message);
        const fallbackData: PasswordData = {
          lastPasswordChange: new Date().toISOString(),
          passwordExpirationDate: null,
          daysUntilExpiration: 90,
          isPasswordExpired: false,
          expiresSoon: false,
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

// ✅ HOOK CORREGIDO para obtener dispositivos del usuario
const useUserDevices = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ FUNCIÓN MEJORADA para cargar dispositivos
  const fetchUserDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔄 [DASHBOARD] Cargando dispositivos del usuario...");

      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("No se encontró token de autenticación");
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/portal/dispositivos`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("📡 [DASHBOARD] Respuesta de dispositivos:", {
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "Sesión expirada. Por favor, inicia sesión nuevamente."
          );
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📦 [DASHBOARD] Datos de dispositivos recibidos:", data);

      if (data.success && data.data && Array.isArray(data.data)) {
        // Mapear los datos de la API al tipo Device
        const mappedDevices: Device[] = data.data.map((device: any) => ({
          id: device.id?.toString() || Math.random().toString(),
          mac: device.mac || "No disponible",
          nombre: device.nombre || "Dispositivo sin nombre",
          tipo: device.tipo || "OTRO",
          username: device.username || "Usuario no disponible",
          createdAt: device.createdAt,
          updatedAt: device.updatedAt,
        }));

        setDevices(mappedDevices);
        console.log(
          `✅ [DASHBOARD] ${mappedDevices.length} dispositivos cargados`
        );
      } else if (data.success && (!data.data || data.data.length === 0)) {
        // ✅ CASO: Éxito pero no hay dispositivos
        console.log("✅ [DASHBOARD] Usuario no tiene dispositivos");
        setDevices([]);
      } else {
        throw new Error(data.error || "Formato de respuesta inesperado");
      }
    } catch (error) {
      console.error("❌ [DASHBOARD] Error cargando dispositivos:", error);
      setError(
        error instanceof Error ? error.message : "Error al cargar dispositivos"
      );
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ FUNCIÓN PARA AGREGAR DISPOSITIVO (SIMPLIFICADA - ya no se usa directamente)
  const addDevice = async (deviceData: Omit<Device, "id">): Promise<void> => {
    try {
      console.log(
        "🔄 [DASHBOARD] Intentando agregar dispositivo (legacy):",
        deviceData
      );

      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("No se encontró token de autenticación");
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/portal/dispositivos`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mac: deviceData.mac,
            nombre: deviceData.nombre,
            tipo: deviceData.tipo,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al crear dispositivo");
      }

      // Recargar la lista de dispositivos
      await fetchUserDevices();
    } catch (error) {
      console.error("Error adding device:", error);
      throw error;
    }
  };

  // ✅ FUNCIÓN PARA ELIMINAR DISPOSITIVO
  const deleteDevice = async (deviceId: string): Promise<void> => {
    try {
      console.log("🔄 [DASHBOARD] Eliminando dispositivo:", deviceId);

      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("No se encontró token de autenticación");
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/portal/dispositivos/${deviceId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Error al eliminar dispositivo");
      }

      // Recargar la lista de dispositivos
      await fetchUserDevices();
    } catch (error) {
      console.error("Error deleting device:", error);
      throw error;
    }
  };

  // ✅ FUNCIÓN PARA ACTUALIZAR DISPOSITIVO
  const updateDevice = async (
    deviceId: string,
    deviceData: Partial<Device>
  ): Promise<void> => {
    try {
      console.log("🔄 [DASHBOARD] Actualizando dispositivo:", deviceId);

      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("No se encontró token de autenticación");
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/portal/dispositivos/${deviceId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mac: deviceData.mac,
            nombre: deviceData.nombre,
            tipo: deviceData.tipo,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al actualizar dispositivo");
      }

      // Recargar la lista de dispositivos
      await fetchUserDevices();
    } catch (error) {
      console.error("Error updating device:", error);
      throw error;
    }
  };

  useEffect(() => {
    fetchUserDevices();
  }, [fetchUserDevices]);

  return {
    devices,
    loading,
    error,
    refetch: fetchUserDevices,
    addDevice,
    deleteDevice,
    updateDevice,
  };
};

export default function Dashboard() {
  const router = useRouter();
  const { isDarkMode } = useDarkModeContext();
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [dashboardKey, setDashboardKey] = useState(0);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Obtener datos de expiración de contraseña del backend
  const {
    passwordData,
    loading: passwordLoading,
    error: passwordError,
  } = usePasswordData();

  // ✅ Obtener dispositivos del usuario con el hook corregido
  const {
    devices,
    loading: devicesLoading,
    error: devicesError,
    refetch: refetchDevices,
    deleteDevice,
    updateDevice,
  } = useUserDevices();

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
    setDashboardKey((prev) => prev + 1);
  }, [pathname, searchParams]);

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
      expiresSoon: false,
    };
  }, [passwordData]);

  // ✅ FUNCIÓN SIMPLIFICADA: Solo notificar éxito después de que el modal creó el dispositivo
  const handleDeviceAdded = useCallback(() => {
    console.log(
      "✅ [DASHBOARD] Dispositivo agregado exitosamente, recargando lista..."
    );
    refetchDevices(); // Recargar la lista de dispositivos
  }, [refetchDevices]);

  // ✅ FUNCIÓN PARA GUARDAR DISPOSITIVO (solo para modo edición)
  const handleSaveDevice = useCallback(
    async (deviceData: Omit<Device, "id">) => {
      try {
        if (editingDevice) {
          // Modo edición
          console.log(
            "🔄 [DASHBOARD] Actualizando dispositivo:",
            editingDevice.id
          );
          await updateDevice(editingDevice.id, deviceData);
          setShowDeviceModal(false);
          setEditingDevice(null);
        }
        // ✅ NOTA: Para agregar, el modal se encarga directamente
      } catch (error) {
        console.error("Error saving device:", error);
        throw error;
      }
    },
    [updateDevice, editingDevice]
  );

  // Manejar editar dispositivo
  const handleEditDevice = useCallback((device: Device) => {
    setEditingDevice(device);
    setShowDeviceModal(true);
  }, []);

  // Manejar eliminar dispositivo
  const handleDeleteDevice = useCallback(
    async (device: Device) => {
      if (
        window.confirm(
          `¿Estás seguro de que quieres eliminar el dispositivo "${device.nombre}"?`
        )
      ) {
        try {
          await deleteDevice(device.id);
        } catch (error) {
          console.error("Error deleting device:", error);
          alert("Error al eliminar el dispositivo");
        }
      }
    },
    [deleteDevice]
  );

  // Manejar ver detalles del dispositivo
  const handleViewDetails = useCallback((device: Device) => {
    console.log("Detalles del dispositivo:", device);
    const formattedDate = device.createdAt
      ? new Date(device.createdAt).toLocaleString("es-ES")
      : "Fecha no disponible";
    alert(
      `Detalles del dispositivo:\n\nNombre: ${device.nombre}\nMAC: ${device.mac}\nTipo: ${device.tipo}\nUsuario: ${device.username}\nCreado: ${formattedDate}`
    );
  }, []);

  // Manejar abrir modal para agregar dispositivo
  const handleOpenDeviceModal = useCallback(() => {
    setEditingDevice(null);
    setShowDeviceModal(true);
  }, []);

  // Manejar cerrar modal
  const handleCloseDeviceModal = useCallback(() => {
    setShowDeviceModal(false);
    setEditingDevice(null);
  }, []);

  // Loading combinado: datos principales + datos de contraseña + dispositivos
  const isLoading = passwordLoading || devicesLoading;

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
          <Header />
        </Suspense>

        {isLoading ? (
          <div className="flex flex-col lg:flex-row gap-8 p-8">
            <div className="lg:w-2/5 rounded-xl shadow-sm p-6 bg-gray-100 dark:bg-gray-800 min-h-[500px] flex items-center justify-center">
              <ArrowPathIcon className="w-8 h-8 animate-spin text-gray-400" />
            </div>
            <div className="lg:w-3/5 space-y-8">
              <div className="rounded-xl shadow-sm p-6 bg-gray-100 dark:bg-gray-800 min-h-[200px] flex items-center justify-center">
                <ArrowPathIcon className="w-6 h-6 animate-spin text-gray-400" />
              </div>
              <div className="rounded-xl shadow-sm p-6 bg-gray-100 dark:bg-gray-800 min-h-[300px] flex items-center justify-center">
                <ArrowPathIcon className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            </div>
          </div>
        ) : (
          <main className="flex flex-col lg:flex-row gap-8 p-8">
            <UserProfile isDarkMode={isDarkMode} />

            <div className="lg:w-3/5 space-y-8">
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

              <DevicesSection isDarkMode={isDarkMode} />
            </div>
          </main>
        )}

        {/* Modal para agregar/editar dispositivo */}
        {showDeviceModal && (
          <AddDeviceModal
            isOpen={showDeviceModal}
            onClose={handleCloseDeviceModal}
            onSave={editingDevice ? handleSaveDevice : undefined} // ✅ Solo para edición
            onSuccess={handleDeviceAdded} // ✅ Para notificar éxito en creación
            device={editingDevice}
            isDarkMode={isDarkMode}
          />
        )}

        <TutorialModal
          isOpen={showTutorial}
          onClose={() => setShowTutorial(false)}
          isDarkMode={isDarkMode}
        />

        {/* Mostrar error de contraseña si existe (sin interrumpir la UI) */}
        {passwordError && (
          <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg shadow-lg max-w-sm">
            <strong>Nota:</strong> Los datos de expiración de contraseña podrían
            no estar actualizados.
          </div>
        )}
      </div>
    </>
  );
}
