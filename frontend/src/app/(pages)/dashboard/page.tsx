'use client';

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import Head from "next/head";
import dynamic from "next/dynamic";

// Tipos
import { UserInfo, Device } from "@/types";

// Utilidades
import { formatMAC } from "../../utils/format";
import { deviceSchema } from "../../validations/device";

// Componentes optimizados con carga diferida
const Header = dynamic(() => import("@/app/components/Header"), {
  loading: () => <div className="h-16 bg-white dark:bg-gray-800 border-b dark:border-gray-700" />,
  ssr: false
});

const AddDeviceModal = dynamic(() => import("../../components/AddDeviceModal"), {
  ssr: false,
});

// Pre-carga de componentes después del renderizado inicial
const preloadDashboardComponents = () => {
  import("../../components/dashboard/UserProfile");
  import("../../components/dashboard/AccountStatus");
  import("../../components/dashboard/DevicesSection");
};

// Componentes de dashboard
const UserProfile = dynamic(() => import("../../components/dashboard/UserProfile"), {
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

export default function Dashboard() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  
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

  // Simulación de carga optimizada con cleanup
  useEffect(() => {
    const timer = setTimeout(() => {
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

    return () => clearTimeout(timer);
  }, []);

  const handleAddDevice = useCallback((data: Device) => {
    setDevices(prev => [...prev, data]);
    setShowDeviceModal(false);
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
        <link
          rel="preload"
          href="/fonts/geist/GeistVariableVF.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        
        {/* Preload de imágenes críticas */}
        <link rel="preload" href="/path/to/critical-image.jpg" as="image" />
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
              {/* Solo pasamos fechas, el cálculo se hace internamente */}
              <AccountStatus 
                isDarkMode={isDarkMode}
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
        <AddDeviceModal 
          isOpen={showDeviceModal}
          onClose={() => setShowDeviceModal(false)}
          onAddDevice={handleAddDevice}
          isDarkMode={isDarkMode}
        />
      </div>
    </>
  );
}