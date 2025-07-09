"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Head from "next/head";
import Image from "next/image";

// Componentes optimizados con carga diferida
const Header = dynamic(() => import("@/app/components/Header"), {
  loading: () => (
    <div className="h-16 bg-white dark:bg-gray-800 border-b dark:border-gray-700" />
  ),
  ssr: false
});

const Loader = dynamic(() => import("@/app/components/Loader"), {
  ssr: false
});

const Modal = dynamic(() => import("@/app/components/Modal"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-black/10 backdrop-blur-sm" />
});

const ProgressBar = dynamic(() => import("@/app/components/ProgressBar"), {
  ssr: false,
  loading: () => <div className="h-3 bg-gray-200 rounded-full" />
});

// Iconos optimizados con carga diferida para móviles
const IconLoader = ({ name, ...props }: { name: string; className: string }) => {
  const Icon = dynamic(
    () => import("@heroicons/react/24/outline").then((mod) => {
      const IconComponent = mod[name as keyof typeof mod] as React.ComponentType<React.SVGProps<SVGSVGElement>>;
      return IconComponent;
    }),
    {
      loading: () => <div className={props.className} />,
      ssr: false
    }
  );
  return <Icon {...props} aria-hidden="true" />;
};

// Validación optimizada
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

interface Device {
  type: "phone" | "laptop" | "tablet" | "pc";
  mac: string;
  model: string;
}

interface InfoItemProps {
  icon?: string;
  label: string;
  value: string;
  darkMode: boolean;
}

// Componente InfoItem optimizado para rendimiento
const InfoItem = ({ icon, label, value, darkMode }: InfoItemProps) => (
  <div
    className={`flex items-start gap-4 p-4 rounded-xl ${
      darkMode
        ? "bg-gray-700 text-gray-100"
        : "bg-gray-100 text-gray-800"
    }`}
    aria-label={`${label}: ${value}`}
  >
    {icon && (
      <div
        className={`${
          darkMode ? "text-uniss-gold" : "text-uniss-blue"
        } w-7 h-7`}
        aria-hidden="true"
      >
        <IconLoader name={icon} className="w-7 h-7" />
      </div>
    )}
    <div className="flex-1">
      <p
        className={`text-base font-medium ${
          darkMode ? "text-gray-300" : "text-gray-600"
        }`}
      >
        {label}
      </p>
      <p
        className={`text-lg ${
          darkMode ? "text-gray-100" : "text-gray-800"
        }`}
      >
        {value}
      </p>
    </div>
  </div>
);

export default function Dashboard() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  // Datos estáticos para mejor rendimiento
  const studentInfo = useMemo(() => ({
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
    formState: { errors }, 
    reset, 
    setValue, 
    watch 
  } = useForm<DeviceFormData>({
    resolver: zodResolver(deviceSchema),
    mode: 'onChange'
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
    const totalDays = 6 * 30;
    const remaining = Math.ceil(
      (new Date(expirationDate).getTime() - currentTime) / (1000 * 60 * 60 * 24)
    );
    
    const percentage = Math.max(0, Math.min(100, (remaining / totalDays) * 100));
    
    return {
      daysRemaining: Math.floor(remaining),
      progressPercentage: percentage
    };
  }, [currentTime, expirationDate]);

  // Actualizar tiempo cada minuto (en lugar de cada hora)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  // Simulación de carga optimizada
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
    }, 500); // Reducido a 500ms

    return () => clearTimeout(timer);
  }, []);

  const handleAddDevice: SubmitHandler<DeviceFormData> = useCallback((data) => {
    setDevices(prev => [...prev, data]);
    setShowDeviceModal(false);
    reset();
  }, [devices, reset]);

  const formatMAC = useCallback((value: string) => {
    return value
      .replace(/[^a-fA-F0-9]/g, "")
      .toUpperCase()
      .substring(0, 12)
      .replace(/(.{2})(?!$)/g, "$1:");
  }, []);

  // Componentes optimizados para secciones
  const StudentProfileSection = useMemo(() => (
    <section
      className={`lg:w-2/5 rounded-xl shadow-lg p-6 transition-colors ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      }`}
      aria-labelledby="student-info-heading"
    >
      <div className="flex flex-col items-center mb-6">
        <div className="relative mb-4">
          <IconLoader 
            name="UserCircleIcon" 
            className={`w-24 h-24 ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`} 
          />
          <span 
            className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-white" 
            aria-label="Estado en línea"
          />
        </div>
        <h1
          id="student-info-heading"
          className={`text-2xl font-bold mb-2 text-center ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          {studentInfo.name}
        </h1>
        <span
          className={`px-4 py-2 rounded-full text-base ${
            isDarkMode
              ? "bg-gray-700 text-green-400"
              : "bg-green-100 text-green-800"
          }`}
          aria-label="Estado de la cuenta"
        >
          {studentInfo.status}
        </span>
      </div>

      <div className="space-y-4" role="list" aria-label="Información del estudiante">
        <InfoItem
          icon="IdentificationIcon"
          label="Carnet de Identidad"
          value={studentInfo.id}
          darkMode={isDarkMode}
        />
        <InfoItem
          icon="AcademicCapIcon"
          label="Facultad/Carrera"
          value={`${studentInfo.faculty} - ${studentInfo.major}`}
          darkMode={isDarkMode}
        />
        <InfoItem
          icon="ClockIcon"
          label="Año Académico"
          value={studentInfo.year}
          darkMode={isDarkMode}
        />
        <InfoItem
          icon="DevicePhoneMobileIcon"
          label="Teléfono"
          value={studentInfo.phone}
          darkMode={isDarkMode}
        />
        <InfoItem
          icon="UserCircleIcon"
          label="Correo Personal"
          value={studentInfo.backupEmail}
          darkMode={isDarkMode}
        />
        <InfoItem
          icon="AcademicCapIcon"
          label="Correo Institucional"
          value={studentInfo.universityEmail}
          darkMode={isDarkMode}
        />
        <InfoItem
          icon="ClockIcon"
          label="Último acceso"
          value={studentInfo.lastLogin}
          darkMode={isDarkMode}
        />
      </div>
    </section>
  ), [isDarkMode, studentInfo]);

  const AccountStatusSection = useMemo(() => (
    <section
      className={`rounded-xl shadow-lg p-6 transition-colors ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      }`}
      aria-labelledby="account-status-heading"
    >
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <h2
          id="account-status-heading"
          className={`text-xl font-bold ${
            isDarkMode ? "text-uniss-gold" : "text-uniss-black"
          }`}
        >
          Estado de tu cuenta
        </h2>
        <button
          className={`px-4 py-2 rounded-lg text-base ${
            isDarkMode
              ? "bg-uniss-gold text-gray-900"
              : "bg-uniss-blue text-white"
          } hover:opacity-90 w-full md:w-auto`}
          aria-label="Cambiar contraseña"
        >
          Cambiar contraseña
        </button>
      </div>

      <div className="space-y-4">
        <p
          className={`text-base ${
            isDarkMode ? "text-gray-400" : "text-gray-600"
          }`}
          aria-live="polite"
        >
          Tiempo restante: {Math.floor(daysRemaining / 30)} meses (
          {daysRemaining} días)
        </p>

        <div className="relative pt-2">
          <ProgressBar
            percentage={progressPercentage}
            darkMode={isDarkMode}
            thickness="thick"
            aria-label="Progreso de la cuenta"
          />
          <div className="flex justify-between text-sm mt-2">
            <span
              className={isDarkMode ? "text-gray-400" : "text-gray-600"}
            >
              Creada:{" "}
              {new Date(creationDate).toLocaleDateString("es-ES")}
            </span>
            <span
              className={isDarkMode ? "text-gray-400" : "text-gray-600"}
            >
              Expira:{" "}
              {new Date(expirationDate).toLocaleDateString("es-ES")}
            </span>
          </div>
        </div>

        <p
          className={`text-sm ${
            isDarkMode ? "text-gray-500" : "text-gray-400"
          }`}
        >
          * La renovación de contraseña restablecerá el período por 6
          meses adicionales
        </p>
      </div>
    </section>
  ), [isDarkMode, daysRemaining, progressPercentage, creationDate, expirationDate]);

  const DevicesSection = useMemo(() => (
    <section
      className={`rounded-xl shadow-lg p-6 transition-colors ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      }`}
      aria-labelledby="devices-heading"
    >
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2
          id="devices-heading"
          className={`text-2xl font-bold flex items-center gap-2 ${
            isDarkMode ? "text-uniss-gold" : "text-uniss-black"
          }`}
        >
          Dispositivos vinculados
          <span className="text-base text-gray-500">
            ({devices.length}/4)
          </span>
        </h2>

        {devices.length < 4 && (
          <button
            onClick={() => setShowDeviceModal(true)}
            className="w-full md:w-auto"
            aria-label="Agregar dispositivo"
          >
            <IconLoader 
              name="PlusIcon" 
              className="w-8 h-8 text-uniss-blue dark:text-uniss-gold" 
            />
          </button>
        )}
      </div>

      {devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-6">
          <p
            className={`text-xl ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            No hay dispositivos vinculados
          </p>
          <button
            onClick={() => setShowDeviceModal(true)}
            className={`px-8 py-4 rounded-xl flex items-center gap-3 
              ${
                isDarkMode
                  ? "bg-uniss-gold text-gray-900"
                  : "bg-uniss-blue text-white"
              } 
              hover:opacity-90 transition-opacity text-lg`}
            aria-label="Agregar primer dispositivo"
          >
            <IconLoader name="PlusIcon" className="w-8 h-8" />
            <span>Agregar primer dispositivo</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4" role="list" aria-label="Lista de dispositivos">
          {devices.map((device, index) => (
            <div
              key={index}
              className={`p-4 border-2 rounded-xl flex items-center justify-between transition-colors
                ${
                  isDarkMode
                    ? "border-gray-700 hover:bg-gray-700"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              role="listitem"
              aria-label={`Dispositivo: ${device.model}, MAC: ${device.mac}`}
            >
              <div className="flex items-center gap-4">
                {device.type === "phone" && (
                  <IconLoader 
                    name="DevicePhoneMobileIcon" 
                    className={`w-10 h-10 ${
                      isDarkMode ? "text-white" : "text-uniss-black"
                    }`} 
                  />
                )}
                {device.type === "laptop" && (
                  <IconLoader 
                    name="ComputerDesktopIcon" 
                    className={`w-10 h-10 ${
                      isDarkMode ? "text-white" : "text-uniss-black"
                    }`} 
                  />
                )}
                {device.type === "tablet" && (
                  <IconLoader 
                    name="DeviceTabletIcon" 
                    className={`w-10 h-10 ${
                      isDarkMode ? "text-white" : "text-uniss-black"
                    }`} 
                  />
                )}
                {device.type === "pc" && (
                  <IconLoader 
                    name="ComputerDesktopIcon" 
                    className={`w-10 h-10 ${
                      isDarkMode ? "text-white" : "text-uniss-black"
                    }`} 
                  />
                )}
                <div>
                  <p
                    className={`text-xl font-medium ${
                      isDarkMode ? "text-gray-100" : "text-gray-800"
                    }`}
                  >
                    {device.model}
                  </p>
                  <p
                    className={`text-base ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {device.mac}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  className="text-uniss-blue hover:text-opacity-80"
                  title="Editar dispositivo"
                  aria-label={`Editar dispositivo ${device.model}`}
                >
                  <IconLoader name="PencilSquareIcon" className="w-7 h-7" />
                </button>
                <button
                  className="text-red-500 hover:text-opacity-80"
                  title="Eliminar dispositivo"
                  aria-label={`Eliminar dispositivo ${device.model}`}
                >
                  <IconLoader name="TrashIcon" className="w-7 h-7" />
                </button>
                <button
                  className="text-gray-600 hover:text-opacity-80 dark:text-gray-400"
                  title="Ver detalles"
                  aria-label={`Ver detalles de ${device.model}`}
                >
                  <IconLoader name="EyeIcon" className="w-7 h-7" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  ), [isDarkMode, devices, setShowDeviceModal]);

  return (
    <>
      <Head>
        <title>Dashboard - Plataforma UNISS</title>
        <meta name="description" content="Panel de control del estudiante en la Plataforma UNISS" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={isDarkMode ? "#1f2937" : "#f9fafb"} />
      </Head>
      
      <div
        className={`min-h-screen transition-colors duration-300 ${
          isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50"
        }`}
      >
        <Suspense fallback={<div className="h-16 bg-white dark:bg-gray-800 border-b dark:border-gray-700" />}>
          <Header
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            isDarkMode={isDarkMode}
          />
        </Suspense>

        {loading ? (
          <div className="flex flex-col lg:flex-row gap-8 p-8">
            <div className="lg:w-2/5 rounded-xl shadow-sm p-6 bg-gray-100 dark:bg-gray-800 animate-pulse h-96" />
            <div className="lg:w-3/5 space-y-8">
              <div className="rounded-xl shadow-sm p-6 bg-gray-100 dark:bg-gray-800 animate-pulse h-48" />
              <div className="rounded-xl shadow-sm p-6 bg-gray-100 dark:bg-gray-800 animate-pulse h-64" />
            </div>
          </div>
        ) : (
          <main className="flex flex-col lg:flex-row gap-8 p-8">
            {StudentProfileSection}
            
            <div className="lg:w-3/5 space-y-8">
              {AccountStatusSection}
              {DevicesSection}
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
              <h3 id="add-device-title" className="text-2xl font-bold mb-6">
                Agregar dispositivo
              </h3>
              <form onSubmit={handleSubmit(handleAddDevice)} className="space-y-6">
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
                    {...register("mac")}
                    value={macValue || ""}
                    onChange={(e) => formatMAC(e.target.value)}
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
                    className={`px-6 py-3 rounded-xl text-lg ${
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