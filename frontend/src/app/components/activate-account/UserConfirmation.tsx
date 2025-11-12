import { CheckCircleIcon, ExclamationTriangleIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import { IdentityVerificationResponse } from "@/app/(pages)/activate-account/page";
import { useState } from "react";

interface UserConfirmationProps {
  userData: IdentityVerificationResponse;
  email: string;
  username: string;
  userPrincipalName: string;
  onComplete: (tokenData: { accessToken: string; refreshToken: string }) => void;
}

export default function UserConfirmation({
  userData,
  email,
  username,
  userPrincipalName,
  onComplete
}: UserConfirmationProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      // Generar tokens para el usuario recién creado
      const tokenResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/generate-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          userPrincipalName: userPrincipalName,
          fullName: userData.fullName,
          userType: userData.type,
          email: email
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error("Error generando token de acceso");
      }

      const tokenData = await tokenResponse.json();
      
      // Pasar los tokens al callback
      await onComplete(tokenData);
    } catch (error) {
      console.error("Error:", error);
      // Incluso si hay error, permitimos la redirección
      await onComplete({ accessToken: '', refreshToken: '' });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleResendEmail = async () => {
    setIsResending(true);
    setResendStatus(null);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/email/resend-welcome-gmail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          username: username,
          userPrincipalName: userPrincipalName,
          fullName: userData.fullName,
          userType: userData.type
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "Error al reenviar el correo");
      }

      setResendStatus({
        success: true,
        message: "✅ Correo reenviado exitosamente. Por favor revise su bandeja de entrada."
      });
    } catch (error: any) {
      setResendStatus({
        success: false,
        message: `❌ ${error.message}`
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleConfirmReceipt = () => {
    setShowEmailModal(false);
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
      {/* Modal de confirmación de recepción de correo */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="text-center mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                <EnvelopeIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mt-3 mb-2">
                ¿Ha recibido el correo de bienvenida?
              </h3>
              <p className="text-gray-600 text-sm">
                Hemos enviado toda la información de su cuenta a:
              </p>
              <p className="text-blue-600 font-semibold my-2">{email}</p>
              <p className="text-gray-600 text-sm">
                Esta información es <span className="font-bold text-red-600">IMPORTANTE</span> para el uso de la plataforma.
              </p>
            </div>

            {resendStatus && (
              <div className={`p-3 rounded-lg mb-4 text-sm ${
                resendStatus.success 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-red-100 text-red-700 border border-red-200'
              }`}>
                {resendStatus.message}
              </div>
            )}

            <div className="flex flex-col space-y-3">
              {/* Botón NO - Verde (para hacer dudar) */}
              <button
                onClick={handleResendEmail}
                disabled={isResending}
                className="w-full bg-green-600 text-white py-2.5 px-4 rounded-lg hover:bg-green-700 transition-all font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isResending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Reenviando...</span>
                  </>
                ) : (
                  <>
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    <span>No, no lo he recibido</span>
                  </>
                )}
              </button>

              {/* Botón SÍ - Rojo (para confirmación) */}
              <button
                onClick={handleConfirmReceipt}
                className="w-full bg-red-600 text-white py-2.5 px-4 rounded-lg hover:bg-red-700 transition-all font-medium flex items-center justify-center space-x-2"
              >
                <CheckCircleIcon className="h-4 w-4" />
                <span>Sí, lo he recibido</span>
              </button>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-yellow-700 text-xs text-center">
                <strong>Recomendación:</strong> Verifique en su bandeja de spam o correo no deseado antes de continuar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal (solo visible cuando el modal está cerrado) */}
      {!showEmailModal && (
        <>
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

          <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200 mb-4 sm:mb-6">
            <p className="text-green-700 text-xs sm:text-sm">
              <strong>✅ Confirmado:</strong> Usted ha verificado la recepción del correo electrónico. 
              Toda la información de su cuenta ha sido enviada a <strong>{email}</strong>.
            </p>
          </div>

          <button
            onClick={handleComplete}
            disabled={isCompleting}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium text-center shadow-md hover:shadow-lg disabled:opacity-50 text-sm sm:text-base"
          >
            {isCompleting ? "Generando acceso..." : "Ir al Dashboard"}
          </button>
        </>
      )}
    </div>
  );
}