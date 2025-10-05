// app/components/ConfirmationModal.tsx
"use client";

import { ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isDarkMode: boolean;
  options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning';
  };
}

export default function ConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  isDarkMode,
  options,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const {
    title,
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = "danger"
  } = options;

  // Configuración de colores según la variante y modo oscuro
  const getVariantStyles = () => {
    if (variant === 'warning') {
      return {
        iconBg: isDarkMode ? "bg-yellow-900/20" : "bg-yellow-100",
        iconColor: isDarkMode ? "text-yellow-400" : "text-yellow-600",
        confirmButton: isDarkMode 
          ? "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500" 
          : "bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-400",
        border: isDarkMode ? "border-yellow-800" : "border-yellow-200"
      };
    }
    
    // Variante danger (por defecto)
    return {
      iconBg: isDarkMode ? "bg-red-900/20" : "bg-red-100",
      iconColor: isDarkMode ? "text-red-400" : "text-red-600",
      confirmButton: isDarkMode 
        ? "bg-red-600 hover:bg-red-700 focus:ring-red-500" 
        : "bg-red-500 hover:bg-red-600 focus:ring-red-400",
      border: isDarkMode ? "border-red-800" : "border-red-200"
    };
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className={`relative max-w-md w-full rounded-xl border ${styles.border} ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } shadow-xl transform transition-all`}
      >
        {/* Header con botón de cerrar */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-300 dark:border-gray-600">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${styles.iconBg}`}>
              <ExclamationTriangleIcon className={`w-6 h-6 ${styles.iconColor}`} />
            </div>
            <h3 className={`text-xl font-bold ${
              isDarkMode ? "text-white" : "text-gray-800"
            }`}>
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className={`p-2 rounded-full transition-colors ${
              isDarkMode
                ? "text-gray-400 hover:bg-gray-700 hover:text-white"
                : "text-gray-500 hover:bg-gray-200 hover:text-gray-700"
            }`}
            aria-label="Cerrar modal"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido del mensaje */}
        <div className="p-6">
          <p className={`text-sm leading-relaxed whitespace-pre-line ${
            isDarkMode ? "text-gray-300" : "text-gray-600"
          }`}>
            {message}
          </p>
        </div>

        {/* Footer con botones */}
        <div className="flex gap-3 p-6 pt-4 border-t border-gray-300 dark:border-gray-600">
          <button
            onClick={onCancel}
            className={`flex-1 py-3 px-4 rounded-lg border font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isDarkMode
                ? "border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-gray-100 focus:ring-gray-500 focus:ring-offset-gray-800"
                : "border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-800 focus:ring-gray-400 focus:ring-offset-white"
            }`}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.confirmButton} ${
              isDarkMode ? "focus:ring-offset-gray-800" : "focus:ring-offset-white"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}