// src/app/components/modals/WifiPolicyModal.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import IconLoader from "../IconLoader";

interface WifiPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  isDarkMode: boolean;
}

export default function WifiPolicyModal({
  isOpen,
  onClose,
  onAccept,
  isDarkMode,
}: WifiPolicyModalProps) {
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const element = contentRef.current;
    if (element) {
      const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 10;
      setIsScrolledToBottom(isAtBottom);
    }
  };

  useEffect(() => {
    const element = contentRef.current;
    if (element && isOpen) {
      element.addEventListener('scroll', handleScroll);
      // Verificar inicialmente
      handleScroll();
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, [isOpen]);

  const handleAccept = () => {
    if (isScrolledToBottom && isChecked) {
      onAccept();
      // Resetear estado para la próxima vez
      setIsChecked(false);
      setIsScrolledToBottom(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Resetear estado
    setIsChecked(false);
    setIsScrolledToBottom(false);
  };

  const policies = [
    {
      number: 1,
      text: "La Red WI-FI está destinada para el uso exclusivo de los miembros de la comunidad universitaria y sus invitados. Quienes no pertenezcan a estos grupos no tienen permitido el uso de este servicio."
    },
    {
      number: 2,
      text: "La transmisión de contenidos a través de la red WI-FI deben cumplir con lo establecido en el reglamento de la Red UNISS."
    },
    {
      number: 3,
      text: "Se prohíbe obtener acceso no autorizado a sistemas o programas tanto al interior de la red universitaria como fuera de ella. Tampoco podrá utilizar la red WI-FI para obtener, manipular y compartir cualquier tipo contenidos en la red."
    },
    {
      number: 4,
      text: "El usuario debe facilitar el acceso a su equipo para cualquier supervisión por las autoridades competentes ante la ocurrencia de cualquiera de las violaciones establecidas en este documento y en el reglamento de la red."
    },
    {
      number: 5,
      text: "Se prohíbe dañar equipos, sistemas informáticos o redes y/o perturbar el normal funcionamiento de la red, así como utilizar la Red WI-FI con fines de lucro, actividades comerciales o ilegales."
    },
    {
      number: 6,
      text: "El solicitante será responsable de cualquier violación que se realice con el equipo declarado, siendo sometido a los análisis y sanciones que se deriven de lo establecido en los reglamentos y leyes vigentes en el momento de la violación."
    },
    {
      number: 7,
      text: "En caso de pérdida/rotura/robo del equipo declarado el solicitante debe notificar al Grupo de Redes para la cancelación inmediata de este permiso."
    },
    {
      number: 8,
      text: "El permiso de acceso solo es válido por el curso académico actual y para la persona que fue emitido."
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={`w-full max-w-2xl max-h-[90vh] rounded-xl shadow-xl ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            {/* Header */}
            <div className={`p-6 border-b ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <IconLoader
                  name="WifiIcon"
                  className={`w-6 h-6 ${
                    isDarkMode ? "text-uniss-gold" : "text-uniss-blue"
                  }`}
                />
                <h2 className={`text-xl font-bold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}>
                  Políticas de Uso de la Red Wi-Fi UNISS
                </h2>
              </div>
              <p className={`text-sm ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}>
                Por favor, lea atentamente las condiciones de uso antes de continuar
              </p>
            </div>

            {/* Content */}
            <div 
              ref={contentRef}
              className="flex-1 overflow-y-auto p-6 max-h-96"
            >
              <div className={`space-y-4 text-sm ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}>
                <div className="mb-4">
                  <p className="font-semibold mb-2">
                    La Red WI-FI está sujeta a las siguientes políticas de uso:
                  </p>
                </div>

                {policies.map((policy) => (
                  <div key={policy.number} className="flex gap-3">
                    <span className={`font-semibold flex-shrink-0 ${
                      isDarkMode ? "text-uniss-gold" : "text-uniss-blue"
                    }`}>
                      {policy.number}.
                    </span>
                    <p>{policy.text}</p>
                  </div>
                ))}

                <div className={`mt-6 p-4 rounded-lg border ${
                  isDarkMode 
                    ? "bg-yellow-900 bg-opacity-20 border-yellow-700 text-yellow-200" 
                    : "bg-yellow-50 border-yellow-200 text-yellow-800"
                }`}>
                  <p className="font-semibold text-center">
                    He leído y entendido estas condiciones de uso de Red WI-FI y declaro conocer las políticas y normas establecidas por la Universidad de Sancti Spíritus "José Martí Pérez". Estoy de acuerdo en acatar las directrices anteriores y entender que el incumplimiento de éstas, pueden resultar en el bloqueo de mis derechos para usar la red WI-FI y asumir las sanciones legales si corresponde.
                  </p>
                </div>
              </div>
            </div>

            {/* Checkbox and Actions */}
            <div className={`p-6 border-t ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="policy-acceptance"
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                  className={`w-4 h-4 rounded ${
                    isDarkMode 
                      ? "bg-gray-700 border-gray-600 text-uniss-gold" 
                      : "bg-white border-gray-300 text-uniss-blue"
                  }`}
                />
                <label 
                  htmlFor="policy-acceptance"
                  className={`text-sm font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Acepto las políticas de uso de la red Wi-Fi UNISS
                </label>
              </div>

              {(!isScrolledToBottom || !isChecked) && (
                <div className="mb-4">
                  <p className={`text-xs text-center ${
                    isDarkMode ? "text-gray-500" : "text-gray-400"
                  }`}>
                    {!isScrolledToBottom && "Por favor, lea todo el documento hasta el final. "}
                    {!isChecked && "Debe aceptar las políticas para continuar."}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                    isDarkMode
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAccept}
                  disabled={!isScrolledToBottom || !isChecked}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    isDarkMode
                      ? "bg-uniss-gold text-gray-900 hover:bg-yellow-500 disabled:bg-gray-600 disabled:text-gray-400"
                      : "bg-uniss-blue text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500"
                  }`}
                >
                  <IconLoader name="CheckIcon" className="w-5 h-5" />
                  Aceptar y Continuar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}