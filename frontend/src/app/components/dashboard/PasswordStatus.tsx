'use client';

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const ProgressBar = dynamic(() => import("@/app/components/ProgressBar"), {
  ssr: false,
  loading: () => <div className="h-3 bg-gray-200 rounded-full dark:bg-gray-600" />
});

interface PasswordStatusProps {
  isDarkMode: boolean;
  lastPasswordChange: string;
  passwordExpirationDate: string | null;
  daysUntilExpiration: number | null;
  isPasswordExpired: boolean;
  expiresSoon: boolean;
  className?: string;
}

export default function PasswordStatus({ 
  isDarkMode,
  lastPasswordChange,
  passwordExpirationDate,
  daysUntilExpiration,
  isPasswordExpired,
  expiresSoon,
  className
}: PasswordStatusProps) {
  
  const router = useRouter();
  const [animationTrigger, setAnimationTrigger] = useState(0);
  
  // Forzar animación cuando el componente se monte
  useEffect(() => {
    setAnimationTrigger(prev => prev + 1);
  }, []);

  const handlePasswordChange = useCallback(() => {
    router.push('/config?action=change-password');
  }, [router]);
  
  // Determinar el color del texto según el estado
  const getStatusColor = () => {
    if (isPasswordExpired) return "text-red-500";
    if (expiresSoon) return "text-yellow-500";
    return isDarkMode ? "text-gray-400" : "text-gray-600";
  };
  
  // Determinar el mensaje de estado
  const getStatusMessage = () => {
    if (!passwordExpirationDate) return "Tu contraseña no expira";
    if (isPasswordExpired) return "¡CONTRASEÑA EXPIRADA!";
    if (expiresSoon) return "Contraseña expira pronto";
    return "Estado de la contraseña";
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === "Nunca") return "Nunca";
    try {
      if (dateString.includes('/')) {
        return dateString.split(',')[0];
      }
      return new Date(dateString).toLocaleDateString("es-ES");
    } catch (error) {
      return dateString;
    }
  };

  const formattedLastChange = formatDate(lastPasswordChange);
  const formattedExpires = passwordExpirationDate ? 
    formatDate(passwordExpirationDate) : "Nunca";

  const calculateProgressPercentage = () => {
    if (daysUntilExpiration === null) return 100;
    
    const totalDays = 90;
    const percentage = (daysUntilExpiration / totalDays) * 100;
    
    return Math.max(0, Math.min(100, percentage));
  };

  const progressPercentage = calculateProgressPercentage();

  return (
    <section
      className={`rounded-xl shadow-lg p-6 transition-colors ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } ${className || ''}`}
      aria-labelledby="password-status-heading"
    >
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <h2
          id="password-status-heading"
          className={`text-xl font-bold ${
            isDarkMode ? "text-uniss-gold" : "text-uniss-black"
          }`}
        >
          Estado de tu contraseña
        </h2>
        <button
          onClick={handlePasswordChange}
          className={`px-4 py-2 rounded-lg text-base transition-opacity ${
            isDarkMode
              ? "bg-uniss-gold text-gray-900 hover:bg-yellow-600"
              : "bg-uniss-blue text-white hover:bg-blue-700"
          } w-full md:w-auto`}
          aria-label="Cambiar contraseña"
        >
          Cambiar contraseña
        </button>
      </div>

      <div className="space-y-4">
        <p className={`text-base font-medium ${getStatusColor()}`}>
          {getStatusMessage()}
        </p>

        {daysUntilExpiration !== null && (
          <p className={`text-base ${getStatusColor()}`} aria-live="polite">
            Tiempo restante: {daysUntilExpiration} días
          </p>
        )}

        {passwordExpirationDate && daysUntilExpiration !== null && (
          <div className="relative pt-2">
            <ProgressBar
              percentage={progressPercentage}
              darkMode={isDarkMode}
              thickness="thick"
              aria-label="Progreso de expiración de contraseña"
              triggerAnimation={animationTrigger > 0} // ✅ Forzar animación
              key={`progress-${animationTrigger}`} // ✅ Key única para forzar re-mount
            />
            <div className="flex justify-between text-sm mt-2">
              <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                Último cambio: {formattedLastChange}
              </span>
              <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                Expira: {formattedExpires}
              </span>
            </div>
            
            <div className="mt-2 text-xs text-gray-500">
              <span>Progreso: {progressPercentage.toFixed(1)}% </span>
              <span>({daysUntilExpiration} días restantes de 90)</span>
            </div>
          </div>
        )}

        {isPasswordExpired && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">
            <strong>¡Atención!</strong> Tu contraseña ha expirado. Debes cambiarla inmediatamente.
          </div>
        )}
        
        {expiresSoon && !isPasswordExpired && (
          <div className="p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-200">
            <strong>Recordatorio:</strong> Tu contraseña expirará pronto. Te recomendamos cambiarla.
          </div>
        )}

        <p className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
          * La contraseña se renovará automáticamente al cambiarla
        </p>
      </div>
    </section>
  );
}