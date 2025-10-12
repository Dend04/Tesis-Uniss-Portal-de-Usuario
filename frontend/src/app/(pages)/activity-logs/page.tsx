"use client";

import {
  CheckCircleIcon,
  XCircleIcon,
  ShieldExclamationIcon,
  ComputerDesktopIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState } from "react";
import Header from "@/app/components/Header";
import { useDarkModeContext } from "@/app/contexts/DarkModeContext";

interface ActivityLog {
  id: number;
  type: "login" | "password_change" | "failed_attempt" | "device_change";
  date: string;
  device: string;
  status: "success" | "failed";
  ip: string;
}

interface DateRange {
  start: string;
  end: string;
}

export default function ActivityLogsPage() {
  const { isDarkMode } = useDarkModeContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedDevice, setSelectedDevice] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange>({ start: "", end: "" });
  const [filterOpen, setFilterOpen] = useState(false);

  const activityLogs: ActivityLog[] = [
    // Inicios de sesión
    {
      id: 1,
      type: "login",
      date: "2024-03-15T09:30:00",
      device: "Chrome 122 en Windows 11",
      status: "success",
      ip: "192.168.1.101",
    },
    {
      id: 2,
      type: "login",
      date: "2024-03-14T22:15:00",
      device: "Safari 17 en iPhone 15",
      status: "success",
      ip: "192.168.1.105",
    },
    {
      id: 3,
      type: "login",
      date: "2024-03-14T19:45:00",
      device: "Firefox 115 en Linux",
      status: "failed",
      ip: "192.168.1.106",
    },

    // Intentos fallidos
    {
      id: 4,
      type: "failed_attempt",
      date: "2024-03-13T14:30:00",
      device: "Chrome Mobile en Xiaomi Redmi Note 12",
      status: "failed",
      ip: "192.168.1.107",
    },
    {
      id: 5,
      type: "failed_attempt",
      date: "2024-03-12T08:15:00",
      device: "Edge 120 en Windows 10",
      status: "failed",
      ip: "192.168.1.108",
    },

    // Cambios de contraseña
    {
      id: 6,
      type: "password_change",
      date: "2024-03-11T16:20:00",
      device: "Chrome 122 en macOS Sonoma",
      status: "success",
      ip: "192.168.1.109",
    },
    {
      id: 7,
      type: "password_change",
      date: "2024-03-10T11:05:00",
      device: "Safari 17 en iPad Pro",
      status: "success",
      ip: "192.168.1.110",
    },

    // Cambios de dispositivo
    {
      id: 8,
      type: "device_change",
      date: "2024-03-09T18:30:00",
      device: "Nuevo: Firefox en Ubuntu 22.04",
      status: "success",
      ip: "192.168.1.111",
    },
    {
      id: 9,
      type: "device_change",
      date: "2024-03-08T10:15:00",
      device: "Dispositivo eliminado: Chrome en Android 14",
      status: "success",
      ip: "192.168.1.112",
    },

    // Ejemplo de actividad mixta
    {
      id: 10,
      type: "login",
      date: "2024-03-07T07:45:00",
      device: "Opera 95 en Windows 11",
      status: "failed",
      ip: "192.168.1.113",
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "login":
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case "failed_attempt":
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case "password_change":
        return <ShieldExclamationIcon className="w-5 h-5 text-blue-500" />;
      case "device_change":
        return <ComputerDesktopIcon className="w-5 h-5 text-purple-500" />;
      default:
        return <CheckCircleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredLogs = activityLogs.filter((log) => {
    const matchesSearch = Object.values(log).some((value) =>
      value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesType = selectedType === "all" || log.type === selectedType;
    const matchesStatus =
      selectedStatus === "all" || log.status === selectedStatus;
    const matchesDevice =
      selectedDevice === "all" || log.device === selectedDevice;
    const matchesDate =
      !dateFilter ||
      new Date(log.date).toDateString() === new Date(dateFilter).toDateString();

    // Filtrado por rango de fechas
    const logDate = new Date(log.date).getTime();
    const startDate = dateRange.start ? new Date(dateRange.start).getTime() : 0;
    const endDate = dateRange.end
      ? new Date(dateRange.end).getTime() + 86400000
      : Infinity;

    return (
      matchesSearch &&
      matchesType &&
      matchesStatus &&
      matchesDevice &&
      matchesDate
    );
  });

  const clearFilters = () => {
    setSelectedType("all");
    setSelectedStatus("all");
    setSelectedDevice("all");
    setDateFilter("");
    setSearchTerm("");
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      {/* ✅ Header sin props - usa el contexto internamente */}
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/dashboard"
            className={`flex items-center ${isDarkMode ? "text-uniss-gold" : "text-uniss-blue"} hover:opacity-80`}
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Volver al Dashboard
          </Link>
          <h1 className={`text-3xl font-bold ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
            Registro de Actividades
          </h1>
        </div>

        {/* Filtros y Búsqueda */}
        <div className={`${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} rounded-lg shadow-sm border p-6 mb-6`}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar en Dispositivos..."
                className={`w-full pl-10 pr-4 py-2 border ${isDarkMode ? "border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400" : "border-gray-300 bg-white text-gray-800 placeholder-gray-500"} rounded-lg focus:outline-none focus:ring-2 focus:ring-uniss-blue dark:focus:ring-uniss-gold`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <MagnifyingGlassIcon className={`w-5 h-5 ${isDarkMode ? "text-gray-400" : "text-gray-600"} absolute left-3 top-2.5`} />
            </div>

            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className={`flex items-center gap-2 px-4 py-2 border ${isDarkMode ? "border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-300" : "border-gray-300 bg-white hover:bg-gray-50 text-gray-600"} rounded-lg transition-colors`}
            >
              <FunnelIcon className="w-5 h-5" />
              <span>Filtros</span>
            </button>
          </div>

          {filterOpen && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filtro Tipo */}
              <div className="space-y-2">
                <label className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Tipo</label>
                <select
                  className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-uniss-blue dark:focus:ring-uniss-gold ${
                    isDarkMode 
                      ? "bg-gray-700 border-gray-600 text-gray-200" 
                      : "bg-white border-gray-300 text-gray-800"
                  }`}
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="all">Todos</option>
                  <option value="login">Inicio de sesión</option>
                  <option value="failed_attempt">Intento fallido</option>
                  <option value="password_change">Cambio de contraseña</option>
                  <option value="device_change">Dispositivo</option>
                </select>
              </div>

              {/* Filtro Estado */}
              <div className="space-y-2">
                <label className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Estado</label>
                <select
                  className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-uniss-blue dark:focus:ring-uniss-gold ${
                    isDarkMode 
                      ? "bg-gray-700 border-gray-600 text-gray-200" 
                      : "bg-white border-gray-300 text-gray-800"
                  }`}
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="all">Todos</option>
                  <option value="success">Éxito</option>
                  <option value="failed">Fallido</option>
                </select>
              </div>

              {/* Filtro Dispositivo */}
              <div className="space-y-2">
                <label className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Dispositivo</label>
                <select
                  className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-uniss-blue dark:focus:ring-uniss-gold ${
                    isDarkMode 
                      ? "bg-gray-700 border-gray-600 text-gray-200" 
                      : "bg-white border-gray-300 text-gray-800"
                  }`}
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                >
                  <option value="all">Todos</option>
                  {[...new Set(activityLogs.map((log) => log.device))].map((device) => (
                    <option key={device} value={device}>
                      {device}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro Fechas */}
              <div className="space-y-2">
                <label className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Rango de fechas</label>
                <div className="space-y-2">
                  <div className="relative">
                    <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Desde</span>
                    <input
                      type="date"
                      className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-uniss-blue dark:focus:ring-uniss-gold ${
                        isDarkMode 
                          ? "bg-gray-700 border-gray-600 text-gray-200" 
                          : "bg-white border-gray-300 text-gray-800"
                      }`}
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    />
                  </div>
                  <div className="relative">
                    <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Hasta</span>
                    <input
                      type="date"
                      className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-uniss-blue dark:focus:ring-uniss-gold ${
                        isDarkMode 
                          ? "bg-gray-700 border-gray-600 text-gray-200" 
                          : "bg-white border-gray-300 text-gray-800"
                      }`}
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    />
                  </div>
                  {(dateRange.start || dateRange.end) && (
                    <button
                      onClick={() => setDateRange({ start: "", end: "" })}
                      className="w-full text-red-500 hover:text-red-600 flex items-center justify-center gap-1 text-sm"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      Limpiar fechas
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-between items-center">
            <span className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              {filteredLogs.length} resultados encontrados
              {(dateRange.start || dateRange.end) && (
                <span className="ml-2 italic">
                  ({dateRange.start && `Desde: ${new Date(dateRange.start).toLocaleDateString("es-ES")} `}
                  {dateRange.end && `Hasta: ${new Date(dateRange.end).toLocaleDateString("es-ES")}`})
                </span>
              )}
            </span>
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-red-500 hover:text-red-600 text-sm"
            >
              <XMarkIcon className="w-4 h-4" />
              Limpiar filtros
            </button>
          </div>
        </div>

        {/* Tabla de resultados */}
        <div className={`${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} rounded-lg shadow-sm border overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDarkMode ? "border-gray-700 bg-gray-750" : "border-gray-200 bg-gray-50"}`}>
                  <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Tipo</th>
                  <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Fecha</th>
                  <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Dispositivo</th>
                  <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Estado</th>
                  <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>IP</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className={`border-b ${isDarkMode ? "border-gray-700 hover:bg-gray-750" : "border-gray-200 hover:bg-gray-50"} transition-colors`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {getActivityIcon(log.type)}
                        <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
                          {log.type === "login" && "Inicio de sesión"}
                          {log.type === "failed_attempt" && "Intento fallido"}
                          {log.type === "password_change" && "Cambio de contraseña"}
                          {log.type === "device_change" && "Dispositivo registrado"}
                        </span>
                      </div>
                    </td>
                    <td className={`py-4 px-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                      {formatDate(log.date)}
                    </td>
                    <td className={`py-4 px-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                      {log.device}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          log.status === "success"
                            ? isDarkMode 
                              ? "bg-green-900/50 text-green-300 border border-green-700" 
                              : "bg-green-100 text-green-800 border border-green-200"
                            : isDarkMode 
                              ? "bg-red-900/50 text-red-300 border border-red-700" 
                              : "bg-red-100 text-red-800 border border-red-200"
                        }`}
                      >
                        {log.status === "success" ? "Éxito" : "Fallido"}
                      </span>
                    </td>
                    <td className={`py-4 px-4 font-mono text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                      {log.ip}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredLogs.length === 0 && (
            <div className="text-center py-8">
              <p className={`${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                No se encontraron resultados con los filtros aplicados
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}