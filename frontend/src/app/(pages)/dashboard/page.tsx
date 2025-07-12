'use client';

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Head from "next/head";

// Tipos
import { UserInfo, Device } from "@/types";

// Componentes optimizados con carga diferida
const Header = dynamic(() => import("@/app/components/Header"), {
  loading: () => <div className="h-16 bg-white dark:bg-gray-800 border-b dark:border-gray-700" />,
  ssr: false
});

const Modal = dynamic(() => import("@/app/components/Modal"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-black/10 backdrop-blur-sm" />
});

// Pre-carga de componentes después del renderizado inicial
const preloadDashboardComponents = () => {
  import("../../components/dashboard/UserProfile");
  import("../../components/dashboard/AccountStatus");
  import("../../components/dashboard/DevicesSection");
};

// Componentes de dashboard
const UserProfile = dynamic(() => import("../..//components/dashboard/UserProfile"), {
  loading: () => <div className="lg:w-2/5 rounded-xl shadow-sm p-6 bg-gray-100 dark:bg-gray-800 min-h-[500px]" />,
  ssr: false
});

const AccountStatus = dynamic(() => import("../../components/dashboard/AccountStatus"), {
  loading: () => <div className="rounded-xl shadow-sm p-6 bg-gray-100 dark:bg-gray-800 min-h-[200px]" />,
  ssr: false
});

const DevicesSection = dynamic(() => import("../../components/dashboard/DevicesSection"), {
  loading: () => <div className="rounded-xl shadow-sm p-6 bg-gray-100 dark:bg-gray-800 min-h-[300px]" />,
  ssr: false
});

// Validación
const deviceSchema = z.object({
  type: z.enum(["phone", "laptop", "tablet", "pc"]),
  model: z.string().min(2, "Mínimo 2 caracteres"),
  mac: z
    .string()
    .regex(
      /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
      "MAC inválida"
    ),
});

type DeviceFormData = z.infer<typeof deviceSchema>;

export default function Dashboard() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Precargar componentes después de la carga inicial
  useEffect(() => {
    preloadDashboardComponents();
  }, []);

  // Datos estáticos para mejor rendimiento
  const userInfo = useMemo((): UserInfo => ({
    name: "Ana María Pérez",
    id: "95020123456",
    faculty: "Ingeniería Informática",
    major: "Ciencia de la Computación",
    year: "3er Año",
    phone: "+53 51234567",
    backupEmail: "ana.perez@gmail.com",
    universityEmail: "u20231234@uniss.edu.cu",
    lastLogin: "Hace 2 horas",
    status: "Estudiante",
  }), []);

  const { 
    register, 
    handleSubmit, 
    formState: { errors, isValid }, 
    reset, 
    setValue, 
    watch 
  } = useForm<DeviceFormData>({
    resolver: zodResolver(deviceSchema),
    mode: 'onChange',
    defaultValues: {
      type: 'phone',
      model: '',
      mac: ''
    }
  });

  const macValue = watch("mac");

  // Pre-carga de rutas optimizada
  useEffect(() => {
    router.prefetch("/config");
    router.prefetch("/activity-logs");
  }, [router]);

  // Datos de cuenta optimizados
  const { creationDate, expirationDate } = useMemo(() => {
    const accountCreationDate = new Date();
    const expirationMonths = 6;
    const expDate = new Date(accountCreationDate);
    expDate.setMonth(expDate.getMonth() + expirationMonths);
    
    return {
      creationDate: accountCreationDate.toISOString(),
      expirationDate: expDate.toISOString()
    };
  }, []);

  // Cálculo de tiempo restante optimizado
  const { daysRemaining, progressPercentage } = useMemo(() => {
    const totalDays = 6 * 30; // 6 meses
    const expirationTime = new Date(expirationDate).getTime();
    const remainingDays = Math.ceil((expirationTime - currentTime) / (1000 * 60 * 60 * 24));
    const percentage = Math.max(0, Math.min(100, (remainingDays / totalDays) * 100));
    
    return {
      daysRemaining: Math.floor(remainingDays),
      progressPercentage: percentage
    };
  }, [currentTime, expirationDate]);

  // Actualizar tiempo cada minuto con cleanup
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Simulación de carga optimizada con cleanup
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(() => {
      setDevices([
        {
          type: "phone",
          mac: "00:1A:2B:3C:4D:5E",
          model: "Xiaomi Redmi Note 10",
        },
        { type: "laptop", mac: "00:1A:2B:3C:4D:5F", model: "Dell XPS 13" },
      ]);
      setLoading(false);
    }, 300); // Reducido a 300ms

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleAddDevice: SubmitHandler<DeviceFormData> = useCallback((data) => {
    setDevices(prev => [...prev, data]);
    setShowDeviceModal(false);
    reset();
  }, [reset]);

  const formatMAC = useCallback((value: string) => {
    return value
      .replace(/[^a-fA-F0-9]/g, "")
      .toUpperCase()
      .substring(0, 12)
      .replace(/(.{2})(?!$)/g, "$1:");
  }, []);

  const handleOpenDeviceModal = useCallback(() => {
    setShowDeviceModal(true);
  }, []);

  // Evitar cambios de diseño (Layout Shifts)
  const minHeightRef = useRef<HTMLDivElement>(null);
  const [minHeight, setMinHeight] = useState(0);

  useEffect(() => {
    if (minHeightRef.current) {
      const height = minHeightRef.current.clientHeight;
      setMinHeight(height);
    }
  }, []);

  return (
    <>
      <Head>
        <title>Dashboard - Plataforma UNISS</title>
        <meta name="description" content="Panel de control del estudiante en la Plataforma UNISS" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={isDarkMode ? "#1f2937" : "#f9fafb"} />
        {/* Preload de recursos críticos */}
        <link rel="preload" href="/path/to/critical.css" as="style" />
        {/* Preconnect a orígenes importantes */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Preload de fuentes locales */}
        <link
          rel="preload"
          href="/fonts/geist/GeistVariableVF.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </Head>
      
      <div
        className={`min-h-screen transition-colors duration-300 ${
          isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50"
        }`}
      >
        <Suspense fallback={
          <div className="h-16 bg-white dark:bg-gray-800 border-b dark:border-gray-700" />
        }>
          <Header
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            isDarkMode={isDarkMode}
          />
        </Suspense>

        {loading ? (
          <div className="flex flex-col lg:flex-row gap-8 p-8">
            <div className="lg:w-2/5 rounded-xl shadow-sm p-6 bg-gray-100 dark:bg-gray-800 min-h-[500px]" />
            <div className="lg:w-3/5 space-y-8">
              <div className="rounded-xl shadow-sm p-6 bg-gray-100 dark:bg-gray-800 min-h-[200px]" />
              <div className="rounded-xl shadow-sm p-6 bg-gray-100 dark:bg-gray-800 min-h-[300px]" />
            </div>
          </div>
        ) : (
             <main className="flex flex-col lg:flex-row gap-8 p-8">
            <UserProfile 
              userInfo={userInfo} 
              isDarkMode={isDarkMode} 
            />
            
            <div className="lg:w-3/5 space-y-8">
              <AccountStatus 
                isDarkMode={isDarkMode}
                daysRemaining={daysRemaining}
                progressPercentage={progressPercentage}
                creationDate={creationDate}
                expirationDate={expirationDate}
              />
              
              <DevicesSection 
                isDarkMode={isDarkMode}
                devices={devices}
                onAddDeviceClick={handleOpenDeviceModal}
              />
            </div>
          </main>
        )}

        {/* Modal para agregar dispositivo */}
        {showDeviceModal && (
          <Modal isOpen={showDeviceModal} onClose={() => setShowDeviceModal(false)}>
            <div
              className={`p-8 rounded-xl ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              }`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-device-title"
            >
              <h2 id="add-device-title" className="text-2xl font-bold mb-6">
                Agregar dispositivo
              </h2>
              <form 
                onSubmit={handleSubmit(handleAddDevice)} 
                className="space-y-6"
                aria-labelledby="add-device-title"
              >
                <div>
                  <label htmlFor="deviceType" className="block text-lg font-medium mb-2">
                    Tipo de dispositivo
                  </label>
                  <select
                    id="deviceType"
                    {...register("type")}
                    className={`w-full p-3 text-lg rounded-xl border-2 ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                    aria-required="true"
                  >
                    <option value="phone">Teléfono</option>
                    <option value="laptop">Laptop</option>
                    <option value="tablet">Tablet</option>
                    <option value="pc">Computadora</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="deviceModel" className="block text-lg font-medium mb-2">
                    Modelo
                  </label>
                  <input
                    id="deviceModel"
                    {...register("model")}
                    className={`w-full p-3 text-lg rounded-xl border-2 ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                    placeholder="Ej: iPhone 12, Dell XPS 15"
                    aria-required="true"
                  />
                  {errors.model && (
                    <span className="text-red-500 text-base block mt-2" role="alert">
                      {errors.model.message}
                    </span>
                  )}
                </div>

                <div>
                  <label htmlFor="deviceMAC" className="block text-lg font-medium mb-2">
                    Dirección MAC
                  </label>
                  <input
                    id="deviceMAC"
                    {...register("mac", {
                      onChange: (e) => {
                        setValue("mac", formatMAC(e.target.value));
                      }
                    })}
                    value={macValue || ""}
                    placeholder="Formato: 00:1A:2B:3C:4D:5E"
                    className={`w-full p-3 text-lg rounded-xl border-2 ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                    maxLength={17}
                    aria-required="true"
                  />
                  {errors.mac && (
                    <span className="text-red-500 text-base block mt-2" role="alert">
                      {errors.mac.message}
                    </span>
                  )}
                </div>

                <div className="flex flex-col md:flex-row justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setShowDeviceModal(false)}
                    className={`px-6 py-3 rounded-xl text-lg ${
                      isDarkMode
                        ? "text-gray-300 hover:bg-gray-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                    aria-label="Cancelar"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!isValid}
                    className={`px-6 py-3 rounded-xl text-lg disabled:opacity-50 ${
                      isDarkMode
                        ? "bg-uniss-gold text-gray-900 hover:bg-gray-100"
                        : "bg-uniss-blue text-white hover:bg-gray-700"
                    } hover:opacity-90`}
                    aria-label="Guardar dispositivo"
                  >
                    Guardar Dispositivo
                  </button>
                </div>
              </form>
            </div>
          </Modal>
        )}
      </div>
    </>
  );
}