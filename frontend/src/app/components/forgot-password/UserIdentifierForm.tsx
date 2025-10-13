// src/app/components/forgot-password/UserIdentifierForm.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UserIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface UserData {
  email: string;
  displayName?: string;
  sAMAccountName?: string;
  employeeID?: string;
  userPrincipalName?: string;
  dn: string;
  accountStatus?: string;
}

interface UserIdentifierFormProps {
  onUserIdentified: (data: UserData, identifier: string) => void;
}

export default function UserIdentifierForm({ onUserIdentified }: UserIdentifierFormProps) {
  const [userIdentifier, setUserIdentifier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

// En tu UserIdentifierForm - manejar diferentes estados
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!userIdentifier.trim()) {
    setError("Por favor, ingrese su nombre de usuario");
    return;
  }

  setIsSubmitting(true);
  setError("");

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/email/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIdentifier }),
    });

    console.log("📨 Respuesta del servidor:", response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Error del servidor:", errorData);
      throw new Error(errorData.message || "Error al buscar usuario");
    }

    const result = await response.json();
    console.log("✅ Datos recibidos del servidor:", result);

    // ✅ Manejar diferentes estados de cuenta
    if (result.accountStatus === 'disabled') {
      setError("Su cuenta está deshabilitada permanentemente. Contacte al departamento de soporte.");
      return;
    }

    if (result.accountStatus === 'locked') {
      setError("Su cuenta está temporalmente bloqueada. Espere 30 minutos o contacte a soporte.");
      return;
    }

    // ✅ Para cuentas expiradas o activas, continuar normalmente
    if (result.accountStatus === 'expired' || result.accountStatus === 'active') {
      const userData: UserData = {
        email: result.email,
        displayName: result.displayName,
        sAMAccountName: result.sAMAccountName,
        employeeID: result.employeeID,
        dn: result.dn,
        accountStatus: result.accountStatus
      };

      // ✅ Mostrar mensaje informativo si la contraseña expiró
      if (result.accountStatus === 'expired') {
        setSuccessMessage("Su contraseña ha expirado. Se ha enviado un código de verificación para restablecerla.");
      }

      console.log("🚀 Llamando onUserIdentified con:", userData);
      onUserIdentified(userData, userIdentifier);
    } else {
      setError("Estado de cuenta no reconocido");
    }

  } catch (err: any) {
    console.error("💥 Error completo:", err);
    setError(err.message || "Error al procesar la solicitud.");
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8"
    >
      <div className="text-center mt-4 sm:mt-6 mb-4 sm:mb-6">
        <div className="mx-auto flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-100">
          <UserIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mt-3 sm:mt-4 mb-2">
          Recuperar Contraseña
        </h2>
        <p className="text-sm sm:text-base text-gray-600">
          Ingrese su nombre de usuario o carnet de identidad
        </p>
      </div>

      {error && (
        <div className="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200 mb-4">
          <p className="text-red-700 text-xs sm:text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre de usuario o Carnet de identidad
          </label>
          <div className="relative">
            <UserIcon className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
            <input
              type="text"
              value={userIdentifier}
              onChange={(e) => setUserIdentifier(e.target.value)}
              placeholder="usuario123 o número del carnet de identidad"
              className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Utilice el mismo nombre de usuario que usa para iniciar sesión en los sistemas UNISS
          </p>
        </div>

        <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
          <p className="text-blue-700 text-xs sm:text-sm">
            <strong>Nota:</strong> Se enviará un código de verificación al correo electrónico de respaldo  
            o personal que usted suministro al crear su cuenta.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !userIdentifier.trim()}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
              Buscando usuario...
            </>
          ) : (
            "Continuar"
          )}
        </button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          ¿Recordó su contraseña?{" "}
          <a href="/" className="text-blue-600 hover:underline font-medium">
            Iniciar sesión
          </a>
        </p>
      </div>
    </motion.div>
  );
}