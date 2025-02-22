// app/dashboard/page.tsx
"use client";

import {
  IdentificationIcon,
  UserCircleIcon,
  AcademicCapIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  DeviceTabletIcon,
  ClockIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dynamic from "next/dynamic";
import Header from "@/app/components/Header";
import Loader from "@/app/components/Loader";

const Modal = dynamic(() => import("@/app/components/Modal"), { ssr: false });
const ProgressBar = dynamic(() => import("@/app/components/ProgressBar"), {
  ssr: false,
  loading: () => <div className="h-2 bg-gray-200 rounded-full" />,
});

const deviceSchema = z.object({
  type: z.enum(["phone", "laptop", "tablet", "pc"]),
  model: z.string().min(2, "Mínimo 2 caracteres"),
  mac: z
    .string()
    .regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, "MAC inválida"),
});

type DeviceFormData = z.infer<typeof deviceSchema>;

interface Device {
  type: "phone" | "laptop" | "tablet" | "pc";
  mac: string;
  model: string;
}

interface InfoItemProps {
  icon?: React.ReactNode;
  label: string;
  value: string;
  darkMode: boolean;
}

const InfoItem = ({ icon, label, value, darkMode }: InfoItemProps) => (
  <div className="flex items-start gap-3">
    {icon && (
      <div className={`${darkMode ? "text-gray-400" : "text-uniss-blue"}`}>
        {icon}
      </div>
    )}
    <div>
      <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
        {label}
      </p>
      <p
        className={`font-medium ${
          darkMode ? "text-gray-100" : "text-gray-800"
        }`}
      >
        {value}
      </p>
    </div>
  </div>
);

export default function Dashboard() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [showDeviceModal, setShowDeviceModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [creationDate, setCreationDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [isClient, setIsClient] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<DeviceFormData>({
    resolver: zodResolver(deviceSchema),
  });

  const macValue = watch("mac");

  useEffect(() => {
    setIsClient(true);
    
    const accountCreationDate = new Date();
    const expirationMonths = 6;
    const expDate = new Date(accountCreationDate);
    expDate.setMonth(expDate.getMonth() + expirationMonths);

    // Usar formato ISO para consistencia
    setCreationDate(accountCreationDate.toISOString());
    setExpirationDate(expDate.toISOString());

    const calculateTime = () => {
      const remaining = Math.ceil(
        (expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      const totalDays = expirationMonths * 30;
      const percentage = Math.max(0, Math.min(100, (remaining / totalDays) * 100));
      setDaysRemaining(remaining);
      setProgressPercentage(percentage);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000 * 60 * 60);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setTimeout(() => {
      setDevices([
        {
          type: "phone",
          mac: "00:1A:2B:3C:4D:5E",
          model: "Xiaomi Redmi Note 10",
        },
        { type: "laptop", mac: "00:1A:2B:3C:4D:5F", model: "Dell XPS 13" },
      ]);
      setLoading(false);
    }, 1500);
  }, []);

  const handleAddDevice: SubmitHandler<DeviceFormData> = (data) => {
    setDevices([...devices, data]);
    setShowDeviceModal(false);
    reset();
  };

  const formatMAC = (value: string) => {
    let mac = value.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
    if (mac.length > 12) mac = mac.substring(0, 12);

    let formatted = "";
    for (let i = 0; i < mac.length; i++) {
      if (i > 0 && i % 2 === 0) formatted += ":";
      formatted += mac[i];
    }

    setValue("mac", formatted);
  };

  const studentInfo = {
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
  };

  if (!isClient) return <Loader className="" />;

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50"
      }`}
    >
      <Header onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} />

      {loading ? (
        <div className="flex flex-col lg:flex-row gap-8 p-8">
          <div className="lg:w-2/5 rounded-xl shadow-sm p-6 bg-gray-100 animate-pulse h-96" />
          <div className="lg:w-3/5 space-y-8">
            <div className="rounded-xl shadow-sm p-6 bg-gray-100 animate-pulse h-48" />
            <div className="rounded-xl shadow-sm p-6 bg-gray-100 animate-pulse h-64" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8 p-8">
          {/* Sección izquierda - Datos del estudiante */}
          <div
            className={`lg:w-2/5 rounded-xl shadow-sm p-6 transition-colors ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-4">
                <UserCircleIcon
                  className={`w-20 h-20 ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                />
                <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></span>
              </div>
              <h2
                className={`text-xl font-bold mb-2 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {studentInfo.name}
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-sm ${
                  isDarkMode
                    ? "bg-gray-700 text-green-400"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {studentInfo.status}
              </span>
            </div>

            <div className="space-y-4">
              <InfoItem
                icon={<IdentificationIcon className="w-5 h-5" />}
                label="Carnet de Identidad"
                value={studentInfo.id}
                darkMode={isDarkMode}
              />
              <InfoItem
                icon={<AcademicCapIcon className="w-5 h-5" />}
                label="Facultad/Carrera"
                value={`${studentInfo.faculty} - ${studentInfo.major}`}
                darkMode={isDarkMode}
              />
              <InfoItem
                icon={<ClockIcon className="w-5 h-5" />}
                label="Año Académico"
                value={studentInfo.year}
                darkMode={isDarkMode}
              />
              <InfoItem
                icon={<DevicePhoneMobileIcon className="w-5 h-5" />}
                label="Teléfono"
                value={studentInfo.phone}
                darkMode={isDarkMode}
              />
              <InfoItem
                icon={<UserCircleIcon className="w-5 h-5" />}
                label="Correo Personal"
                value={studentInfo.backupEmail}
                darkMode={isDarkMode}
              />
              <InfoItem
                icon={<AcademicCapIcon className="w-5 h-5" />}
                label="Correo Institucional"
                value={studentInfo.universityEmail}
                darkMode={isDarkMode}
              />
              <InfoItem
                icon={<ClockIcon className="w-5 h-5" />}
                label="Último acceso"
                value={studentInfo.lastLogin}
                darkMode={isDarkMode}
              />
            </div>
          </div>

          {/* Sección derecha - Seguridad y dispositivos */}
          <div className="lg:w-3/5 space-y-8">
            {/* Tarjeta de estado de cuenta */}
            <div
              className={`rounded-xl shadow-sm p-6 transition-colors ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <h3
                  className={`text-lg font-semibold ${
                    isDarkMode ? "text-uniss-gold" : "text-uniss-black"
                  }`}
                >
                  Estado de tu cuenta
                </h3>
                <button
                  className={`px-3 py-1 rounded-md text-sm ${
                    isDarkMode
                      ? "bg-uniss-gold text-gray-900"
                      : "bg-uniss-blue text-white"
                  } hover:opacity-90`}
                >
                  Cambiar contraseña
                </button>
              </div>

              <div className="space-y-3">
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Tiempo restante: {Math.floor(daysRemaining / 30)} meses (
                  {daysRemaining} días)
                </p>

                <div className="relative pt-2">
                  <ProgressBar
                    percentage={progressPercentage}
                    darkMode={isDarkMode}
                  />
                  <div className="flex justify-between text-xs mt-1">
                    <span
                      className={isDarkMode ? "text-gray-400" : "text-gray-600"}
                    >
                      Creada: {new Date(creationDate).toLocaleDateString("es-ES")}
                    </span>
                    <span
                      className={isDarkMode ? "text-gray-400" : "text-gray-600"}
                    >
                      Expira: {new Date(expirationDate).toLocaleDateString("es-ES")}
                    </span>
                  </div>
                </div>

                <p
                  className={`text-xs ${
                    isDarkMode ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  * La renovación de contraseña restablecerá el período por 6
                  meses adicionales
                </p>
              </div>
            </div>

            {/* Tarjeta de dispositivos */}
            <div
              className={`rounded-xl shadow-sm p-6 transition-colors ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <div className="flex justify-between items-center mb-6">
                <h2
                  className={`text-xl font-title flex items-center gap-2 ${
                    isDarkMode ? "text-uniss-gold" : "text-uniss-black"
                  }`}
                >
                  Dispositivos vinculados
                  <span className="text-sm text-gray-500">
                    ({devices.length}/4)
                  </span>
                </h2>

                {devices.length < 4 && (
                  <button onClick={() => setShowDeviceModal(true)}>
                    <PlusIcon className="w-6 h-6" />
                  </button>
                )}
              </div>

              {devices.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <p
                    className={`mb-4 ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    No hay dispositivos vinculados
                  </p>
                  <button
                    onClick={() => setShowDeviceModal(true)}
                    className={`px-6 py-3 rounded-lg flex items-center gap-2 
                      ${
                        isDarkMode
                          ? "bg-uniss-gold text-gray-900"
                          : "bg-uniss-blue text-white"
                      } 
                      hover:opacity-90 transition-opacity`}
                  >
                    <PlusIcon className="w-6 h-6" />
                    <span className="text-lg">Agregar primer dispositivo</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {devices.map((device, index) => (
                    <div
                      key={index}
                      className={`p-4 border rounded-lg flex items-center justify-between transition-colors
                        ${
                          isDarkMode
                            ? "border-gray-700 hover:bg-gray-700"
                            : "hover:bg-gray-50"
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        {device.type === "phone" && (
                          <DevicePhoneMobileIcon className={`w-8 h-8${isDarkMode ? "text-white" : "text-uniss-black"}`} />
                        )}
                        {device.type === "laptop" && (
                          <ComputerDesktopIcon className={`w-8 h-8${isDarkMode ? "text-white" : "text-uniss-black"}`} />
                        )}
                        {device.type === "tablet" && (
                          <DeviceTabletIcon className={`w-8 h-8${isDarkMode ? "text-white" : "text-uniss-black"}`} />
                        )}
                        {device.type === "pc" && (
                          <ComputerDesktopIcon className={`w-8 h-8${isDarkMode ? "text-white" : "text-uniss-black"}`} />
                        )}
                        <div>
                          <p
                            className={`font-medium ${
                              isDarkMode ? "text-gray-100" : "text-gray-800"
                            }`}
                          >
                            {device.model}
                          </p>
                          <p
                            className={`text-sm ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {device.mac}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="text-uniss-blue hover:text-opacity-80">
                          <PencilSquareIcon className="w-5 h-5" />
                        </button>
                        <button className="text-red-500 hover:text-opacity-80">
                          <TrashIcon className="w-5 h-5" />
                        </button>
                        <button className="text-gray-600 hover:text-opacity-80">
                          <EyeIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar dispositivo */}
      <Modal isOpen={showDeviceModal} onClose={() => setShowDeviceModal(false)}>
        <div className={`p-6 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
          <h3 className="text-xl font-bold mb-4">Agregar dispositivo</h3>
          <form onSubmit={handleSubmit(handleAddDevice)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Tipo de dispositivo
              </label>
              <select
                {...register("type")}
                className={`w-full p-2 rounded-lg border ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                <option value="phone">Teléfono</option>
                <option value="laptop">Laptop</option>
                <option value="tablet">Tablet</option>
                <option value="pc">Computadora</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Modelo</label>
              <input
                {...register("model")}
                className={`w-full p-2 rounded-lg border ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
              {errors.model && (
                <span className="text-red-500 text-sm">
                  {errors.model.message}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Dirección MAC
              </label>
              <input
                {...register("mac")}
                value={macValue || ""}
                onChange={(e) => formatMAC(e.target.value)}
                placeholder="Ej: 00:1A:2B:3C:4D:5E"
                className={`w-full p-2 rounded-lg border ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                maxLength={17}
              />
              {errors.mac && (
                <span className="text-red-500 text-sm">
                  {errors.mac.message}
                </span>
              )}
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setShowDeviceModal(false)}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode
                    ? "text-gray-300 hover:bg-gray-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode
                    ? "bg-uniss-gold text-gray-900 hover:bg-gray-100"
                    : "bg-uniss-blue text-white hover:bg-gray-700"
                } hover:opacity-90`}
              >
                Guardar Dispositivo
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
