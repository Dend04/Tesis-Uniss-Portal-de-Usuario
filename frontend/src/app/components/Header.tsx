import {
  Cog6ToothIcon,
  ChartBarIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  SunIcon,
  MoonIcon,
  ChatBubbleOvalLeftIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface HeaderProps {
  onToggleDarkMode: () => void;
  isDarkMode: boolean;
}

export const Header = ({ onToggleDarkMode, isDarkMode }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const user = {
    name: "Juan Pérez",
    avatar: null,
  };

   // Pre-carga de rutas
    useEffect(() => {
      router.prefetch("/config");
      router.prefetch("/activity-logs");
    }, [router]);

  return (
    <header
      className={`${
        isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      } shadow-sm transition-colors duration-300 px-4 border-b`}
    >
      <div className="max-w-7xl mx-auto">
        <nav className="flex justify-between items-center h-16">
          {/* Logo como enlace al Dashboard */}
          <Link href="/dashboard" className="flex items-center">
            <img
              src={isDarkMode ? "/uniss-logoDark.png" : "/uniss-logo.png"}
              alt="UNISS Logo"
              className="h-8 w-8"
            />
            <span
              className={`ml-2 text-xl font-bold ${
                isDarkMode ? "text-gray-100" : "text-gray-800"
              }`}
            >
              Plataforma UNISS
            </span>
          </Link>

          {/* Menú derecho */}
          <div className="flex items-center gap-4">
            {/* Botón de tema oscuro */}
            <button
              onClick={onToggleDarkMode}
              className="flex items-center gap-2 group relative px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
            >
              <div className="flex items-center gap-1">
                {isDarkMode ? (
                  <SunIcon className="h-6 w-6 text-yellow-400" />
                ) : (
                  <MoonIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                )}
                <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 opacity-0 group-hover:opacity-100 translate-y-0 group-hover:translate-y-1 transition-all duration-200 whitespace-nowrap text-sm bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-2 py-1 rounded-md">
                  {isDarkMode ? "Modo claro" : "Modo oscuro"}
                  <div className="absolute w-2 h-2 bg-gray-800 dark:bg-gray-200 -top-1 left-1/2 -translate-x-1/2 rotate-45" />
                </span>
              </div>
            </button>

            {/* Botones con hover animado */}
            <div className="hidden md:flex items-center gap-6">
              {/*Botón de chatIA */}
            <Link
              href="/chatIa"
              className="flex items-center gap-2 group relative px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
            >
              <div className="flex items-center gap-1">
                <ChatBubbleOvalLeftIcon
                  className={`h-6 w-6 ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  } group-hover:text-uniss-blue dark:group-hover:text-uniss-gold transition-colors`}
                />
                <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 opacity-0 group-hover:opacity-100 translate-y-0 group-hover:translate-y-1 transition-all duration-200 whitespace-nowrap text-sm bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-2 py-1 rounded-md">
                  Asistente Virtual
                  <div className="absolute w-2 h-2 bg-gray-800 dark:bg-gray-200 -top-1 left-1/2 -translate-x-1/2 rotate-45" />
                </span>
              </div>
            </Link>
              {/* Botón de Configuración */}
              <Link
                href="/config"
                className="flex items-center gap-2 group relative px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
              >
                <div className="flex items-center gap-1">
                  <Cog6ToothIcon
                    className={`h-6 w-6 ${
                      isDarkMode ? "text-gray-300" : "text-gray-600"
                    } group-hover:text-uniss-blue dark:group-hover:text-uniss-gold transition-colors`}
                  />
                  <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 opacity-0 group-hover:opacity-100 translate-y-0 group-hover:translate-y-1 transition-all duration-200 whitespace-nowrap text-sm bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-2 py-1 rounded-md">
                    Configuración
                    <div className="absolute w-2 h-2 bg-gray-800 dark:bg-gray-200 -top-1 left-1/2 -translate-x-1/2 rotate-45" />
                  </span>
                </div>
              </Link>

              {/* Botón de Actividad */}
              <Link
                href="/activity-logs"
                className="flex items-center gap-2 group relative px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
              >
                <div className="flex items-center gap-1">
                  <ChartBarIcon
                    className={`h-6 w-6 ${
                      isDarkMode ? "text-gray-300" : "text-gray-600"
                    } group-hover:text-uniss-blue dark:group-hover:text-uniss-gold transition-colors`}
                  />
                  <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 opacity-0 group-hover:opacity-100 translate-y-0 group-hover:translate-y-1 transition-all duration-200 whitespace-nowrap text-sm bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-2 py-1 rounded-md">
                    Actividad
                    <div className="absolute w-2 h-2 bg-gray-800 dark:bg-gray-200 -top-1 left-1/2 -translate-x-1/2 rotate-45" />
                  </span>
                </div>
              </Link>

              {/* Botón de Notificaciones */}
              <button className="flex items-center gap-2 group relative px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
                <div className="flex items-center gap-1">
                  <BellIcon
                    className={`h-6 w-6 ${
                      isDarkMode ? "text-gray-300" : "text-gray-600"
                    } group-hover:text-uniss-blue dark:group-hover:text-uniss-gold transition-colors`}
                  />
                  <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 opacity-0 group-hover:opacity-100 translate-y-0 group-hover:translate-y-1 transition-all duration-200 whitespace-nowrap text-sm bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-2 py-1 rounded-md">
                    Notificaciones
                    <div className="absolute w-2 h-2 bg-gray-800 dark:bg-gray-200 -top-1 left-1/2 -translate-x-1/2 rotate-45" />
                  </span>
                </div>
              </button>
            </div>

            {/* Separador */}
            <div
              className={`h-6 w-px ${
                isDarkMode ? "bg-gray-700" : "bg-gray-200"
              } mx-2`}
            />

            {/* Perfil de usuario */}
            <Link
              href="/perfil"
              className="flex items-center gap-2 group relative px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
            >
              <div className="flex items-center gap-2 group relative px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt="Perfil"
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <UserCircleIcon
                    className={`h-8 w-8 ${
                      isDarkMode ? "text-gray-300" : "text-gray-600"
                    }`}
                  />
                )}
                <span
                  className={`hidden md:block text-sm font-medium ${
                    isDarkMode ? "text-gray-200" : "text-gray-700"
                  }`}
                >
                  {user.name}
                </span>
              </div>
            </Link>

            {/* Botón de cerrar sesión */}
            <button className="flex items-center gap-2 group relative px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
              <div className="flex items-center gap-1">
                <ArrowRightOnRectangleIcon
                  className={`h-6 w-6 ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  } group-hover:text-red-500 transition-colors`}
                />
                <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 opacity-0 group-hover:opacity-100 translate-y-0 group-hover:translate-y-1 transition-all duration-200 whitespace-nowrap text-sm bg-red-500 text-white px-2 py-1 rounded-md">
                  Cerrar sesión
                  <div className="absolute w-2 h-2 bg-red-500 -top-1 left-1/2 -translate-x-1/2 rotate-45" />
                </span>
              </div>
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
