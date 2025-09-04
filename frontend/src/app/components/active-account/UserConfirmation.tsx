// src/app/components/active-account/UserConfirmation.tsx
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { IdentityVerificationResponse } from "@/app/(pages)/activate-account/page";
import { useState } from "react";

interface UserConfirmationProps {
  userData: IdentityVerificationResponse;
  email: string;
  onComplete: () => void;
}

export default function UserConfirmation({
  userData,
  email,
  onComplete
}: UserConfirmationProps) {
  const [isSending, setIsSending] = useState(false);

  const handleComplete = async () => {
    setIsSending(true);
    try {
      // Enviar correo de bienvenida
      const welcomeResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/email/bienvenido`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email: email,
          userName: userData.fullName,
          userType: userData.type
        }),
      });

      if (!welcomeResponse.ok) {
        throw new Error("Error al enviar correo de bienvenida");
      }

      // Llamar a onComplete para redirigir
      onComplete();
    } catch (error) {
      console.error("Error:", error);
      // Aunque falle el envío del correo, permitimos continuar
      onComplete();
    } finally {
      setIsSending(false);
    }
  };

  const getUserTypeInSpanish = (type: string) => {
    switch (type) {
      case 'student':
        return 'Estudiante';
      case 'employee':
        return 'Trabajador';
      default:
        return type;
    }
  };

  return (
    <div className="px-8 pb-8">
      <div className="text-center mt-6 mb-6">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <CheckCircleIcon className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mt-4 mb-2">
          ¡Cuenta Activada Exitosamente!
        </h2>
        <p className="text-gray-600">
          Su cuenta ha sido verificada y activada correctamente.
        </p>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Información de la Cuenta</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Nombre completo:</span>
            <span className="font-medium">{userData.fullName}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Tipo de usuario:</span>
            <span className="font-medium">{getUserTypeInSpanish(userData.type)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Carnet de identidad:</span>
            <span className="font-medium">{userData.ci}</span>
          </div>
          
          {userData.type === 'student' && (
            <div className="flex justify-between">
              <span className="text-gray-600">Carrera:</span>
              <span className="font-medium">{userData.career}</span>
            </div>
          )}
          
          {userData.type === 'employee' && (
            <div className="flex justify-between">
              <span className="text-gray-600">Departamento:</span>
              <span className="font-medium">{userData.department}</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-gray-600">Correo verificado:</span>
            <span className="font-medium text-blue-600">{email}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Estado:</span>
            <span className="font-medium text-green-600">Activo</span>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
        <p className="text-blue-700 text-sm">
          <strong>Nota:</strong> Su cuenta ha sido activada exitosamente. 
          Se le enviará un correo de bienvenida a <strong>{email}</strong> con información importante.
          Puede iniciar sesión con su nombre de usuario y la contraseña que estableció.
        </p>
      </div>

      <button
        onClick={handleComplete}
        disabled={isSending}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium text-center shadow-md hover:shadow-lg disabled:opacity-50"
      >
        {isSending ? "Enviando correo..." : "Finalizar"}
      </button>
    </div>
  );
}