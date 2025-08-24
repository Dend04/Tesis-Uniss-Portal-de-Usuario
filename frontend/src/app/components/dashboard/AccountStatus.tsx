'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const ProgressBar = dynamic(() => import("@/app/components/ProgressBar"), {
  ssr: false,
  loading: () => <div className="h-3 bg-gray-200 rounded-full dark:bg-gray-600" />
});

interface AccountStatusProps {
  isDarkMode: boolean;
  creationDate: string;
  expirationDate: string;
}

// Hook optimizado para cálculos de tiempo
const useDaysRemaining = (expirationDate: string) => {
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);

  useEffect(() => {
    let dailyTimer: NodeJS.Timeout | null = null;
    
    const calculateValues = () => {
      const expirationTime = new Date(expirationDate).getTime();
      const currentTime = Date.now();
      
      // Evitar cálculos si la fecha ya expiró
      if (expirationTime <= currentTime) {
        setDaysRemaining(0);
        setProgressPercentage(0);
        return;
      }
      
      const totalDays = 6 * 30; // 6 meses
      const remainingDays = Math.ceil((expirationTime - currentTime) / (1000 * 60 * 60 * 24));
      const percentage = Math.max(0, Math.min(100, (remainingDays / totalDays) * 100));
      
      setDaysRemaining(Math.floor(remainingDays));
      setProgressPercentage(Math.round(percentage));
    };

    // Calcular valores iniciales
    calculateValues();

    // Programar actualización diaria a la medianoche
    const scheduleDailyUpdate = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      const msUntilMidnight = nextMidnight.getTime() - now.getTime();

      const timerId = setTimeout(() => {
        calculateValues();
        
        // Establecer intervalo diario después de la primera ejecución a medianoche
        dailyTimer = setInterval(calculateValues, 24 * 60 * 60 * 1000);
      }, msUntilMidnight);

      return timerId;
    };

    const initialTimer = scheduleDailyUpdate();

    // Cleanup
    return () => {
      clearTimeout(initialTimer);
      if (dailyTimer) clearInterval(dailyTimer);
    };
  }, [expirationDate]);

  return { daysRemaining, progressPercentage };
};

// Formateador de fecha memoizado
const useFormattedDates = (creationDate: string, expirationDate: string) => {
  return useMemo(() => {
    return {
      formattedCreated: new Date(creationDate).toLocaleDateString("es-ES"),
      formattedExpires: new Date(expirationDate).toLocaleDateString("es-ES")
    };
  }, [creationDate, expirationDate]);
};

export default function AccountStatus({ 
  isDarkMode,
  creationDate,
  expirationDate
}: AccountStatusProps) {
  const { daysRemaining, progressPercentage } = useDaysRemaining(expirationDate);
  const { formattedCreated, formattedExpires } = useFormattedDates(creationDate, expirationDate);
  const router = useRouter();
  
  const handlePasswordChange = useCallback(() => {
    router.push('/config?action=change-password');
  }, [router]);
  
  // Memoizar todo el contenido para evitar re-renders innecesarios
  const content = useMemo(() => {
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
                ? "bg-uniss-gold text-gray-900 hover:bg-yellow-600"
                : "bg-uniss-blue text-white hover:bg-blue-700"
            } w-full md:w-auto`}
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
  }, [
    isDarkMode, 
    daysRemaining, 
    progressPercentage, 
    formattedCreated, 
    formattedExpires, 
    handlePasswordChange
  ]);

  return content;
}