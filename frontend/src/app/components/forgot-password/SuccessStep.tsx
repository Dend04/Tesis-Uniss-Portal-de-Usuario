// src/app/components/forgot-password/SuccessStep.tsx
"use client";

import { motion } from "framer-motion";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

interface SuccessStepProps {
  onComplete: () => void;
}

export default function SuccessStep({ onComplete }: SuccessStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8 text-center"
    >
      <div className="mt-6 sm:mt-8 mb-6 sm:mb-8">
        <div className="mx-auto flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-green-100">
          <CheckCircleIcon className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mt-4 sm:mt-6 mb-2">
          ¡Contraseña Restablecida!
        </h2>
        <p className="text-gray-600 mb-4 sm:mb-6">
          Su contraseña ha sido cambiada exitosamente. Ahora puede iniciar sesión con su nueva contraseña.
        </p>
        
        <div className="bg-green-50 p-4 sm:p-6 rounded-lg border border-green-200 max-w-md mx-auto">
          <p className="text-green-700 text-sm sm:text-base">
            <strong>Recuerde:</strong> Utilice su nueva contraseña la próxima vez que inicie sesión en el Portal de Usuario UNISS.
          </p>
        </div>
      </div>

      <button
        onClick={onComplete}
        className="w-full max-w-xs mx-auto bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium"
      >
        Iniciar Sesión
      </button>
    </motion.div>
  );
}