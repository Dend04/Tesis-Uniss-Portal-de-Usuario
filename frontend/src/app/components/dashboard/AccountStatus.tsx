'use client';

import dynamic from "next/dynamic";
import IconLoader from "../IconLoader";

const ProgressBar = dynamic(() => import("@/app/components/ProgressBar"), {
  ssr: false,
  loading: () => <div className="h-3 bg-gray-200 rounded-full" />
});

interface AccountStatusProps {
  isDarkMode: boolean;
  daysRemaining: number;
  progressPercentage: number;
  creationDate: string;
  expirationDate: string;
}

export default function AccountStatus({ 
  isDarkMode,
  daysRemaining,
  progressPercentage,
  creationDate,
  expirationDate
}: AccountStatusProps) {
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
  );
}