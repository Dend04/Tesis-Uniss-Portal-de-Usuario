"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PasswordForm from "@/app/components/config/PasswordForm";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = searchParams.get('username');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSuccess = () => {
    setIsSuccess(true);
    setTimeout(() => {
      router.push('/login?message=password-reset');
    }, 2000);
  };

  if (!username) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-uniss-black mb-2">Error</h1>
          <p className="text-gray-600 mb-6">No se ha proporcionado el nombre de usuario</p>
          <button
            onClick={() => router.push('/forgot-password')}
            className="w-full bg-uniss-blue text-white py-3 rounded-lg hover:bg-opacity-90 transition-all font-medium"
          >
            Volver a recuperación
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-uniss-black mb-2 text-center">Restablecer Contraseña</h1>
        <p className="text-gray-600 mb-6 text-center">Ingrese su nueva contraseña</p>

        {isSuccess ? (
          <div className="bg-green-50 text-green-800 p-4 rounded-lg text-center">
            <p>¡Contraseña cambiada exitosamente! Redirigiendo al login...</p>
          </div>
        ) : (
          <PasswordForm
            isDarkMode={false}
            onSuccess={handleSuccess}
            mode="reset"
            username={username}
          />
        )}
      </div>
    </div>
  );
}