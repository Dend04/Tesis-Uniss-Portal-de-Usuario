// src/app/components/active-account/UserConfirmation.tsx
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { IdentityVerificationResponse } from "@/app/(pages)/activate-account/page";
import { useState } from "react";

interface UserConfirmationProps {
  userData: IdentityVerificationResponse;
  email: string;
  username: string;
  userPrincipalName: string;
  onComplete: () => void;
}

export default function UserConfirmation({
  userData,
  email,
  username,
  userPrincipalName,
  onComplete
}: UserConfirmationProps) {
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      onComplete();
    } catch (error) {
      console.error("Error:", error);
      onComplete();
    } finally {
      setIsCompleting(false);
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
    <div className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8">
      <div className="text-center mt-4 sm:mt-6 mb-4 sm:mb-6">
        <div className="mx-auto flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-green-100">
          <CheckCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mt-3 sm:mt-4 mb-2">
          ¡Cuenta Activada Exitosamente!
        </h2>
        <p className="text-gray-600">
          Su cuenta ha sido verificada y activada correctamente.
        </p>
      </div>

      <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-200 mb-4 sm:mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Información de la Cuenta</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Nombre completo:</span>
            <span className="font-medium text-right">{userData.fullName}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Tipo de usuario:</span>
            <span className="font-medium">{getUserTypeInSpanish(userData.type)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Carnet de identidad:</span>
            <span className="font-medium">{userData.ci}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Nombre de usuario:</span>
            <span className="font-medium">{username}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Correo Institucional:</span>
            <span className="font-medium text-blue-600">{userPrincipalName}</span>
          </div>
          
          {userData.type === 'student' && (
            <div className="flex justify-between">
              <span className="text-gray-600">Carrera:</span>
              <span className="font-medium text-right">{userData.career}</span>
            </div>
          )}
          
          {userData.type === 'employee' && (
            <div className="flex justify-between">
              <span className="text-gray-600">Departamento:</span>
              <span className="font-medium text-right">{userData.department}</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-gray-600">Correo de respaldo:</span>
            <span className="font-medium text-blue-600">{email}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Estado:</span>
            <span className="font-medium text-green-600">Activo</span>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200 mb-4 sm:mb-6">
        <p className="text-blue-700 text-xs sm:text-sm">
          <strong>Nota:</strong> Su cuenta ha sido activada exitosamente. 
          Puede iniciar sesión con su nombre de usuario <strong>{username}</strong>, 
          su correo institucional <strong>{userPrincipalName}</strong>,
          y la contraseña que estableció.
        </p>
      </div>

      <button
        onClick={handleComplete}
        disabled={isCompleting}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium text-center shadow-md hover:shadow-lg disabled:opacity-50 text-sm sm:text-base"
      >
        {isCompleting ? "Redirigiendo..." : "Ir al Dashboard"}
      </button>
    </div>
  );
}