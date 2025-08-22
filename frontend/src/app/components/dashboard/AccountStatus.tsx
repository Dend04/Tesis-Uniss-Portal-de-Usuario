// app/components/AccountStatus.tsx
'use client';

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const ProgressBar = dynamic(() => import("@/app/components/ProgressBar"), {
  ssr: false,
  loading: () => <div className="h-3 bg-gray-200 rounded-full" />
});

interface AccountStatusProps {
  isDarkMode: boolean;
  creationDate: string;
  expirationDate: string;
}

// Hook personalizado para cálculos de tiempo eficientes
const useDaysRemaining = (expirationDate: string) => {
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);

  // Calcular valores iniciales
  useEffect(() => {
    const calculate = () => {
      const expirationTime = new Date(expirationDate).getTime();
      const totalDays = 6 * 30;
      const remainingDays = Math.ceil((expirationTime - Date.now()) / (1000 * 60 * 60 * 24));
      const percentage = Math.max(0, Math.min(100, (remainingDays / totalDays) * 100));
      
      setDaysRemaining(Math.floor(remainingDays));
      setProgressPercentage(percentage);
    };

    calculate();
  }, [expirationDate]);

  // Actualizar solo cuando cambie el día
  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = nextMidnight.getTime() - now.getTime();

    const timerId = setTimeout(() => {
      const expirationTime = new Date(expirationDate).getTime();
      const totalDays = 6 * 30;
      const remainingDays = Math.ceil((expirationTime - Date.now()) / (1000 * 60 * 60 * 24));
      const percentage = Math.max(0, Math.min(100, (remainingDays / totalDays) * 100));
      
      setDaysRemaining(Math.floor(remainingDays));
      setProgressPercentage(percentage);
      
      // Programar siguiente actualización diaria
      const dailyTimer = setInterval(() => {
        setDaysRemaining(prev => {
          const newValue = prev - 1;
          setProgressPercentage(Math.max(0, Math.min(100, (newValue / (6 * 30)) * 100)));
          return newValue;
        });
      }, 24 * 60 * 60 * 1000);

      return () => clearInterval(dailyTimer);
    }, msUntilMidnight);

    return () => clearTimeout(timerId);
  }, [expirationDate]);

  return { daysRemaining, progressPercentage };
};

export default function AccountStatus({ 
  isDarkMode,
  creationDate,
  expirationDate
}: AccountStatusProps) {
  const { daysRemaining, progressPercentage } = useDaysRemaining(expirationDate);
  const router = useRouter();
  
  const handlePasswordChange = () => {
    // Navegar a la página de configuración con parámetro para activar el formulario de contraseña
    router.push('/config?action=change-password');
  };
  
  // Memoizar todo el contenido para evitar re-renders innecesarios
  const content = useMemo(() => {
    const formattedCreated = new Date(creationDate).toLocaleDateString("es-ES");
    const formattedExpires = new Date(expirationDate).toLocaleDateString("es-ES");
    
    return (
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
            onClick={handlePasswordChange}
            className={`px-4 py-2 rounded-lg text-base transition-opacity ${
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
              <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                Creada: {formattedCreated}
              </span>
              <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                Expira: {formattedExpires}
              </span>
            </div>
          </div>

          <p
            className={`text-sm ${
              isDarkMode ? "text-gray-500" : "text-gray-400"
            }`}
          >
            * La renovación de contraseña restablecerá el período por 6 meses adicionales
          </p>
        </div>
      </section>
    );
  }, [isDarkMode, creationDate, expirationDate, daysRemaining, progressPercentage, handlePasswordChange]);

  return content;
}