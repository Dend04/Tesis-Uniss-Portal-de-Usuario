import { useState } from 'react';
import { 
  ExclamationTriangleIcon, 
  EnvelopeIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';

interface EmailHelpModalProps {
  email: string;
  isDarkMode: boolean;
  onClose: () => void;
  onResendGmail?: () => Promise<void>;
}

export default function EmailHelpModal({ 
  email, 
  isDarkMode, 
  onClose,
  onResendGmail 
}: EmailHelpModalProps) {
  const [isResendingGmail, setIsResendingGmail] = useState(false);
  const [resendStatus, setResendStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleResendGmail = async () => {
    if (!onResendGmail) return;
    
    setIsResendingGmail(true);
    setResendStatus(null);
    
    try {
      await onResendGmail();
      setResendStatus({
        success: true,
        message: "✅ Código reenviado exitosamente. Por favor revise su bandeja de entrada."
      });
    } catch (error: any) {
      setResendStatus({
        success: false,
        message: `❌ ${error.message}`
      });
    } finally {
      setIsResendingGmail(false);
    }
  };

  return (
    <div className="p-6">
      <div className="text-center mb-6">
        <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
          <EnvelopeIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className={`text-lg font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
          ¿No recibiste el código?
        </h3>
        <p className={`text-sm mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
          Hemos enviado el código a <span className="font-medium text-blue-600 dark:text-blue-400">{email}</span>
        </p>
      </div>

      {resendStatus && (
        <div className={`p-3 rounded-lg mb-4 text-sm ${
          resendStatus.success 
            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
            : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          {resendStatus.message}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h4 className={`font-medium mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>Recomendaciones:</h4>
          <ul className={`text-sm space-y-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            <li className="flex items-start gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 text-yellow-500 flex-shrink-0" />
              <span>Revisa tu carpeta de spam o correo no deseado.</span>
            </li>
            <li className="flex items-start gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 text-yellow-500 flex-shrink-0" />
              <span>Asegúrate de que el correo electrónico proporcionado sea correcto.</span>
            </li>
            <li className="flex items-start gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 text-yellow-500 flex-shrink-0" />
              <span>Espera unos minutos, a veces los correos pueden tardar en llegar.</span>
            </li>
          </ul>
        </div>

        {onResendGmail && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className={`font-medium mb-3 ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>Alternativa:</h4>
            <button
              onClick={handleResendGmail}
              disabled={isResendingGmail}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isResendingGmail ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Reenviando ...
                </>
              ) : (
                <>
                  <EnvelopeIcon className="w-4 h-4" />
                  Espere ...
                </>
              )}
            </button>
            <p className={`text-xs mt-2 text-center ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
             Toque aqui para recibir el codigo 
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
            isDarkMode 
              ? "border-gray-600 text-gray-300 hover:bg-gray-700" 
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}