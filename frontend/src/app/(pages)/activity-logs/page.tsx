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
  ExclamationTriangleIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState, useEffect } from "react";
import Header from "@/app/components/Header";
import { useDarkModeContext } from "@/app/contexts/DarkModeContext";

interface DateRange {
  start: string;
  end: string;
}

interface Log {
  id: number;
  accion: string;
  username: string;
  exitoso: boolean;
  detalles: string | null;
  ip: string | null;
  userAgent: string | null;
  dispositivo: string | null;
  createdAt: string;
}

interface ActivityLog {
  id: number;
  type: "login" | "password_change" | "failed_attempt" | "device_change";
  date: string;
  device: string;
  deviceType: "mobile" | "tablet" | "desktop" | "unknown";
  status: "success" | "failed";
  ip: string;
  username: string;
  os: string;
  browser: string;
  httpStatus?: number;
}

interface PaginationInfo {
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
}

interface LogsResponse {
  success: boolean;
  message?: string;
  data: {
    logs: Log[];
    paginacion: PaginationInfo;
    filtros: any;
  };
}

interface StatisticsResponse {
  success: boolean;
  message?: string;
  data: {
    totalLogins: number;
    loginsExitosos: number;
    loginsFallidos: number;
    tasaExito: number;
    actividadReciente: {
      ultimaSemana: number;
      promedioDiario: number;
    };
    dispositivosMasUsados: any[];
    periodo: {
      fechaInicio: string;
      fechaFin: string;
    };
    usuario: string;
  };
}

// Servicio de logs actualizado
class LogsService {
  private baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5550/api";

  private async fetchWithAuth(endpoint: string, params?: Record<string, any>): Promise<any> {
    try {
      const token = localStorage.getItem("authToken");
      
      if (!token) {
        throw new Error("No hay token de autenticación");
      }

      const url = new URL(`${this.baseURL}${endpoint}`);
      
      // Agregar parámetros de consulta
      if (params) {
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
            url.searchParams.append(key, params[key].toString());
          }
        });
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("No autorizado - token inválido o expirado");
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error("Error en fetchWithAuth:", error);
      throw error;
    }
  }

  // Solo usamos el endpoint de mis logs
  async obtenerMisLogins(params?: {
    pagina?: number;
    limite?: number;
    exitoso?: boolean;
    fechaInicio?: string;
    fechaFin?: string;
  }): Promise<LogsResponse> {
    return this.fetchWithAuth("/logs/mis-logins", params);
  }

  // Solo usamos el endpoint de mis estadísticas
  async obtenerMisEstadisticas(params?: {
    fechaInicio?: string;
    fechaFin?: string;
  }): Promise<StatisticsResponse> {
    return this.fetchWithAuth("/logs/mis-estadisticas", params);
  }
}

export const logsService = new LogsService();

// ✅ DETECCIÓN MEJORADA DE SISTEMAS OPERATIVOS
const detectOS = (userAgent: string | null): string => {
  if (!userAgent) return 'Sistema desconocido';
  
  const ua = userAgent.toLowerCase();
  
  // Detección mejorada de Windows
  if (ua.includes('windows nt 10.0')) return 'Windows 10/11';
  if (ua.includes('windows nt 6.3')) return 'Windows 8.1';
  if (ua.includes('windows nt 6.2')) return 'Windows 8';
  if (ua.includes('windows nt 6.1')) return 'Windows 7';
  if (ua.includes('windows nt 6.0')) return 'Windows Vista';
  if (ua.includes('windows nt 5.1')) return 'Windows XP';
  if (ua.includes('windows nt 5.0')) return 'Windows 2000';
  if (ua.includes('windows')) return 'Windows';
  
  // Detección mejorada de macOS
  if (ua.includes('mac os x 10_15') || ua.includes('mac os x 10.15')) return 'macOS Catalina';
  if (ua.includes('mac os x 10_14') || ua.includes('mac os x 10.14')) return 'macOS Mojave';
  if (ua.includes('mac os x 10_13') || ua.includes('mac os x 10.13')) return 'macOS High Sierra';
  if (ua.includes('mac os x')) return 'macOS';
  
  // Detección mejorada de Linux
  if (ua.includes('ubuntu')) return 'Ubuntu Linux';
  if (ua.includes('fedora')) return 'Fedora Linux';
  if (ua.includes('debian')) return 'Debian Linux';
  if (ua.includes('redhat')) return 'Red Hat Linux';
  if (ua.includes('linux')) return 'Linux';
  
  // Detección mejorada de Android
  if (ua.includes('android 13')) return 'Android 13';
  if (ua.includes('android 12')) return 'Android 12';
  if (ua.includes('android 11')) return 'Android 11';
  if (ua.includes('android 10')) return 'Android 10';
  if (ua.includes('android')) return 'Android';
  
  // Detección mejorada de iOS
  if (ua.includes('iphone os 16')) return 'iOS 16';
  if (ua.includes('iphone os 15')) return 'iOS 15';
  if (ua.includes('iphone os 14')) return 'iOS 14';
  if (ua.includes('iphone')) return 'iOS';
  if (ua.includes('ipad')) return 'iPadOS';
  
  // Otros sistemas
  if (ua.includes('chrome os')) return 'Chrome OS';
  if (ua.includes('freebsd')) return 'FreeBSD';
  if (ua.includes('openbsd')) return 'OpenBSD';
  
  return 'Sistema operativo desconocido';
};

// ✅ DETECCIÓN MEJORADA DE NAVEGADORES Y HERRAMIENTAS DE API
const detectBrowser = (userAgent: string | null): string => {
  if (!userAgent) return 'Navegador desconocido';
  
  const ua = userAgent.toLowerCase();
  
  // Detección de herramientas de API y testing
  if (ua.includes('thunder client')) return 'Thunder Client (VS Code)';
  if (ua.includes('postman')) return 'Postman';
  if (ua.includes('insomnia')) return 'Insomnia';
  if (ua.includes('rapidapi')) return 'RapidAPI';
  if (ua.includes('curl')) return 'cURL';
  if (ua.includes('wget')) return 'Wget';
  if (ua.includes('httpie')) return 'HTTPie';
  if (ua.includes('rest client')) return 'REST Client';
  if (ua.includes('api platform')) return 'API Platform';
  if (ua.includes('swagger')) return 'Swagger UI';
  if (ua.includes('postwoman')) return 'Postwoman';
  if (ua.includes('bruno')) return 'Bruno';
  if (ua.includes('paw')) return 'Paw';
  if (ua.includes('soapui')) return 'SoapUI';
  
  // Detección mejorada de Chrome y derivados
  if (ua.includes('edg/')) return 'Microsoft Edge';
  if (ua.includes('opr/') || ua.includes('opera')) return 'Opera';
  if (ua.includes('chrome') && !ua.includes('edg/')) return 'Google Chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('firefox')) return 'Mozilla Firefox';
  if (ua.includes('trident') || ua.includes('msie')) return 'Internet Explorer';
  if (ua.includes('samsung')) return 'Samsung Internet';
  if (ua.includes('ucbrowser')) return 'UC Browser';
  
  // Detección de bots y crawlers
  if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')) {
    return 'Bot/Crawler';
  }
  
  // Si no coincide con nada conocido pero tiene "client" en el nombre
  if (ua.includes('client') && ua.length < 100) {
    return 'Aplicación de Cliente API';
  }
  
  return 'Cliente HTTP Desconocido';
};

// ✅ DETECCIÓN DE STATUS HTTP (basado en la acción y éxito)
const detectHttpStatus = (log: Log): number => {
  if (log.exitoso) {
    return 200; // OK
  } else {
    if (log.accion.includes('LOGIN') || log.accion.includes('AUTH')) {
      return 401; // Unauthorized
    } else if (log.accion.includes('PASSWORD')) {
      return 400; // Bad Request
    } else {
      return 500; // Internal Server Error
    }
  }
};

export default function ActivityLogsPage() {
  const { isDarkMode } = useDarkModeContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedDevice, setSelectedDevice] = useState<string>("all");
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>({ start: "", end: "" });
  const [filterOpen, setFilterOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  
  // Estados para datos reales
  const [logs, setLogs] = useState<Log[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [statistics, setStatistics] = useState<StatisticsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    pagina: 1,
    limite: 50,
    total: 0,
    totalPaginas: 0
  });

  // Obtener usuario actual del token
  useEffect(() => {
    const getCurrentUser = () => {
      try {
        const token = localStorage.getItem("authToken");
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setCurrentUser(payload.username || payload.email || 'Usuario');
        }
      } catch (error) {
        console.error('Error obteniendo usuario actual:', error);
        setCurrentUser('Usuario');
      }
    };

    getCurrentUser();
  }, []);

  // ✅ FUNCIÓN PARA EXTRAER IP REAL (eliminar ::ffff:)
  const extractRealIP = (ip: string | null): string => {
    if (!ip) return 'IP no disponible';
    
    // Eliminar prefijo IPv6 ::ffff: para obtener IPv4
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7); // Extrae solo la parte IPv4
    }
    
    return ip;
  };

  // ✅ FUNCIÓN PARA DETECTAR TIPO DE DISPOSITIVO
  const detectDeviceType = (userAgent: string | null): "mobile" | "tablet" | "desktop" | "unknown" => {
    if (!userAgent) return 'unknown';
    
    const ua = userAgent.toLowerCase();
    
    // Detectar móviles
    if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) {
      return 'mobile';
    }
    
    // Detectar tablets
    if (/tablet|ipad|playbook|silk|kindle/i.test(ua)) {
      return 'tablet';
    }
    
    // Detectar desktop (Windows, Mac, Linux)
    if (/windows|macintosh|mac os|linux|ubuntu|fedora/i.test(ua)) {
      return 'desktop';
    }
    
    return 'unknown';
  };

  // ✅ FUNCIÓN MEJORADA PARA OBTENER INFORMACIÓN DEL DISPOSITIVO
  const parseUserAgent = (userAgent: string | null): { device: string; os: string; browser: string } => {
    if (!userAgent) return { 
      device: 'Desconocido', 
      os: 'Sistema desconocido', 
      browser: 'Cliente desconocido' 
    };
    
    const deviceType = detectDeviceType(userAgent);
    const os = detectOS(userAgent);
    const browser = detectBrowser(userAgent);
    
    const deviceTypeText = 
      deviceType === 'mobile' ? 'Móvil' :
      deviceType === 'tablet' ? 'Tablet' :
      deviceType === 'desktop' ? 'Computadora' : 'Dispositivo';
    
    return {
      device: `${deviceTypeText}`,
      os,
      browser
    };
  };

  // Mapear logs de la API al formato del frontend
  const mapLogToActivity = (log: Log): ActivityLog => {
    let type: ActivityLog['type'] = 'login';
    
    // Determinar el tipo basado en la acción
    if (log.accion.includes('PASSWORD') || log.accion.includes('CONTRASEÑA')) {
      type = 'password_change';
    } else if (log.accion.includes('DEVICE') || log.accion.includes('DISPOSITIVO')) {
      type = 'device_change';
    } else if (!log.exitoso && log.accion.includes('LOGIN')) {
      type = 'failed_attempt';
    }

    const deviceType = detectDeviceType(log.userAgent);
    const { device, os, browser } = parseUserAgent(log.userAgent);
    const httpStatus = detectHttpStatus(log);

    return {
      id: log.id,
      type,
      date: log.createdAt,
      device,
      deviceType,
      status: log.exitoso ? 'success' : 'failed',
      ip: extractRealIP(log.ip),
      username: log.username,
      os,
      browser,
      httpStatus
    };
  };

  // Cargar logs - SOLO MIS LOGS
  const cargarLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        pagina: pagination.pagina,
        limite: pagination.limite
      };

      if (selectedStatus !== 'all') params.exitoso = selectedStatus === 'success';
      if (dateRange.start) params.fechaInicio = dateRange.start;
      if (dateRange.end) params.fechaFin = dateRange.end;

      console.log("📡 Cargando mis logs con parámetros:", params);

      const response = await logsService.obtenerMisLogins(params);
      
      if (response.success) {
        console.log("✅ Mis logs cargados exitosamente:", response.data.logs.length, "registros");
        setLogs(response.data.logs);
        
        // Mapear logs
        const mappedLogs = response.data.logs.map(log => mapLogToActivity(log));
        
        setActivityLogs(mappedLogs);
        setPagination(response.data.paginacion);
      } else {
        throw new Error(response.message || "Error en la respuesta del servidor");
      }
    } catch (err: any) {
      console.error('❌ Error cargando mis logs:', err);
      const errorMessage = err.message || 'Error al cargar mis logs';
      setError(errorMessage);
      
      if (err.message.includes("No autorizado") || err.message.includes("401")) {
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  // Cargar estadísticas - SOLO MIS ESTADÍSTICAS
  const cargarEstadisticas = async () => {
    try {
      const params: any = {};
      if (dateRange.start) params.fechaInicio = dateRange.start;
      if (dateRange.end) params.fechaFin = dateRange.end;

      const response = await logsService.obtenerMisEstadisticas(params);
      
      if (response.success) {
        setStatistics(response.data);
      } else {
        console.error('Error en respuesta de mis estadísticas:', response.message);
      }
    } catch (err: any) {
      console.error('Error cargando mis estadísticas:', err);
    }
  };

  // Efecto para cargar datos iniciales
  useEffect(() => {
    cargarLogs();
    cargarEstadisticas();
  }, [pagination.pagina, pagination.limite]);

  // Efecto para recargar cuando cambien los filtros
  useEffect(() => {
    // Resetear a página 1 cuando cambien los filtros
    setPagination(prev => ({ ...prev, pagina: 1 }));
  }, [searchTerm, selectedStatus, selectedDeviceType, dateRange]);

  // Efecto para cargar datos cuando cambien los filtros (con debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!loading) {
        cargarLogs();
        cargarEstadisticas();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedStatus, selectedDeviceType, dateRange]);

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

  // ✅ ICONO PARA TIPO DE DISPOSITIVO
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "mobile":
        return <DevicePhoneMobileIcon className="w-4 h-4 text-blue-500" />;
      case "tablet":
        return <DeviceTabletIcon className="w-4 h-4 text-purple-500" />;
      case "desktop":
        return <ComputerDesktopIcon className="w-4 h-4 text-green-500" />;
      default:
        return <ComputerDesktopIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  // ✅ FUNCIÓN PARA OBTENER COLOR DEL STATUS HTTP
  const getHttpStatusColor = (status?: number) => {
    if (!status) return 'text-gray-500';
    
    if (status >= 200 && status < 300) return 'text-green-500';
    if (status >= 300 && status < 400) return 'text-blue-500';
    if (status >= 400 && status < 500) return 'text-yellow-500';
    if (status >= 500) return 'text-red-500';
    
    return 'text-gray-500';
  };

  // ✅ FUNCIÓN PARA OBTENER COLOR DEL NAVEGADOR/CLIENTE
  const getBrowserColor = (browser: string) => {
    if (browser.includes('Thunder Client')) return 'text-purple-500';
    if (browser.includes('Postman')) return 'text-orange-500';
    if (browser.includes('Insomnia')) return 'text-pink-500';
    if (browser.includes('cURL')) return 'text-green-600';
    if (browser.includes('Chrome')) return 'text-green-500';
    if (browser.includes('Firefox')) return 'text-orange-500';
    if (browser.includes('Safari')) return 'text-blue-500';
    if (browser.includes('Edge')) return 'text-blue-400';
    if (browser.includes('Bot')) return 'text-gray-500';
    return 'text-gray-600';
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Fecha inválida";
    }
  };

  const filteredLogs = activityLogs.filter((log) => {
    const matchesSearch = 
      log.device.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.os.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.browser.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === "all" || log.type === selectedType;
    const matchesStatus = selectedStatus === "all" || log.status === selectedStatus;
    const matchesDevice = selectedDevice === "all" || log.device === selectedDevice;
    const matchesDeviceType = selectedDeviceType === "all" || log.deviceType === selectedDeviceType;

    return matchesSearch && matchesType && matchesStatus && matchesDevice && matchesDeviceType;
  });

  const clearFilters = () => {
    setSelectedType("all");
    setSelectedStatus("all");
    setSelectedDevice("all");
    setSelectedDeviceType("all");
    setSearchTerm("");
    setDateRange({ start: "", end: "" });
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, pagina: newPage }));
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
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
            Mi Historial de Actividades
          </h1>
        </div>

        {/* Panel de Estadísticas */}
        {statistics && (
          <div className={`${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} rounded-lg shadow-sm border p-6 mb-6`}>
            <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
              Mis Estadísticas de Actividad
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`text-center p-4 rounded-lg ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                <p className={`text-2xl font-bold ${isDarkMode ? "text-uniss-gold" : "text-uniss-blue"}`}>
                  {statistics.totalLogins}
                </p>
                <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Total de Accesos</p>
              </div>
              <div className={`text-center p-4 rounded-lg ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                <p className={`text-2xl font-bold text-green-500`}>
                  {statistics.loginsExitosos}
                </p>
                <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Exitosos</p>
              </div>
              <div className={`text-center p-4 rounded-lg ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                <p className={`text-2xl font-bold text-red-500`}>
                  {statistics.loginsFallidos}
                </p>
                <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Fallidos</p>
              </div>
              <div className={`text-center p-4 rounded-lg ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                <p className={`text-2xl font-bold ${isDarkMode ? "text-uniss-gold" : "text-uniss-blue"}`}>
                  {statistics.tasaExito}%
                </p>
                <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Tasa de Éxito</p>
              </div>
            </div>
            {statistics.usuario && (
              <div className="mt-4 text-center">
                <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                  Mostrando actividad de: <span className="font-semibold">{statistics.usuario}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Filtros y Búsqueda */}
        <div className={`${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} rounded-lg shadow-sm border p-6 mb-6`}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar por dispositivo, SO, navegador o IP..."
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
                <label className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Tipo de Actividad</label>
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

              {/* Filtro Tipo de Dispositivo */}
              <div className="space-y-2">
                <label className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Tipo de Dispositivo</label>
                <select
                  className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-uniss-blue dark:focus:ring-uniss-gold ${
                    isDarkMode 
                      ? "bg-gray-700 border-gray-600 text-gray-200" 
                      : "bg-white border-gray-300 text-gray-800"
                  }`}
                  value={selectedDeviceType}
                  onChange={(e) => setSelectedDeviceType(e.target.value)}
                >
                  <option value="all">Todos</option>
                  <option value="desktop">Computadora</option>
                  <option value="mobile">Móvil</option>
                  <option value="tablet">Tablet</option>
                  <option value="unknown">Desconocido</option>
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
              {pagination.total} actividades encontradas • {filteredLogs.length} filtradas
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

        {/* Estado de carga y error */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-uniss-blue mx-auto"></div>
            <p className={`mt-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Cargando mi historial de actividades...
            </p>
          </div>
        )}

        {error && (
          <div className={`${isDarkMode ? "bg-red-900/50 border-red-700" : "bg-red-50 border-red-200"} border rounded-lg p-4 mb-6`}>
            <div className="flex items-center gap-2 text-red-500">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
            {error.includes("No autorizado") && (
              <p className="text-sm mt-2 text-red-400">
                Redirigiendo al login...
              </p>
            )}
          </div>
        )}

        {/* Tabla de resultados */}
        {!loading && !error && (
          <div className={`${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} rounded-lg shadow-sm border overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${isDarkMode ? "border-gray-700 bg-gray-750" : "border-gray-200 bg-gray-50"}`}>
                    <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Tipo</th>
                    <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Fecha</th>
                    <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Dispositivo</th>
                    <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Sistema Operativo</th>
                    <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Navegador/Cliente</th>
                    <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Estado</th>
                    <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Status HTTP</th>
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
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(log.deviceType)}
                          <span className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                            {log.device}
                          </span>
                        </div>
                      </td>
                      <td className={`py-4 px-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                        {log.os}
                      </td>
                      <td className={`py-4 px-4 font-medium ${getBrowserColor(log.browser)}`}>
                        {log.browser}
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
                      <td className={`py-4 px-4 font-mono text-sm ${getHttpStatusColor(log.httpStatus)}`}>
                        {log.httpStatus || 'N/A'}
                      </td>
                      <td className={`py-4 px-4 font-mono text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                        {log.ip}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredLogs.length === 0 && !loading && (
              <div className="text-center py-8">
                <p className={`${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  No se encontraron actividades con los filtros aplicados
                </p>
              </div>
            )}

            {/* Paginación */}
            {pagination.totalPaginas > 1 && (
              <div className={`px-4 py-3 border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"} flex items-center justify-between`}>
                <div>
                  <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                    Mostrando {(pagination.pagina - 1) * pagination.limite + 1} - {Math.min(pagination.pagina * pagination.limite, pagination.total)} de {pagination.total} actividades
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.pagina - 1)}
                    disabled={pagination.pagina === 1}
                    className={`px-3 py-1 rounded ${
                      pagination.pagina === 1
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : isDarkMode
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Anterior
                  </button>
                  <span className={`px-3 py-1 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                    Página {pagination.pagina} de {pagination.totalPaginas}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.pagina + 1)}
                    disabled={pagination.pagina === pagination.totalPaginas}
                    className={`px-3 py-1 rounded ${
                      pagination.pagina === pagination.totalPaginas
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : isDarkMode
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}