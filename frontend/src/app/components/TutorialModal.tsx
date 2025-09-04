// components/TutorialModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

interface TutorialStep {
  title: string;
  content: string;
  target?: string;
  position?: "top" | "bottom" | "left" | "right";
}

export default function TutorialModal({ isOpen, onClose, isDarkMode }: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  const tutorialSteps: TutorialStep[] = [
    {
      title: "Bienvenido al Dashboard",
      content: "Esta es tu página principal donde podrás gestionar tu cuenta y dispositivos conectados a la red UNISS.",
    },
    {
      title: "Perfil de Usuario",
      content: "Aquí encontrarás toda tu información personal: nombre, ID, facultad, carrera y datos de contacto.",
      target: ".user-profile-section",
      position: "right"
    },
    {
      title: "Estado de la Cuenta",
      content: "Consulta la fecha de creación y expiración de tu cuenta, así como el estado actual de la misma.",
      target: ".account-status-section",
      position: "right"
    },
    {
      title: "Gestión de Dispositivos",
      content: "Gestiona todos los dispositivos conectados a tu cuenta. Puedes agregar nuevos o eliminar los existentes.",
      target: ".devices-section",
      position: "right"
    },
    {
      title: "Header y Navegación",
      content: "Desde aquí puedes cambiar el modo oscuro/claro, acceder a notificaciones y configurar tu perfil.",
      target: "header",
      position: "bottom"
    },
    {
      title: "¿Necesitas ayuda?",
      content: "Si tienes dudas en cualquier momento, busca el ícono de ayuda (?) que encontrarás en diferentes secciones.",
    }
  ];

  // Función para obtener el elemento con retry
  const getElementWithRetry = (selector: string, retries = 5, delay = 100): Promise<HTMLElement | null> => {
    return new Promise((resolve) => {
      let attempts = 0;
      
      const tryGetElement = () => {
        const element = document.querySelector(selector) as HTMLElement;
        
        if (element) {
          resolve(element);
        } else if (attempts < retries) {
          attempts++;
          setTimeout(tryGetElement, delay);
        } else {
          resolve(null);
        }
      };
      
      tryGetElement();
    });
  };

  // Calcular posición del modal
  const calculateModalPosition = (element: HTMLElement, position: string = "right") => {
    if (!modalRef.current) return { top: 0, left: 0 };
    
    const rect = element.getBoundingClientRect();
    const modalWidth = modalRef.current.offsetWidth;
    const modalHeight = modalRef.current.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let top = 0;
    let left = 0;
    
    switch (position) {
      case "right":
        top = rect.top + (rect.height / 2) - (modalHeight / 2);
        left = rect.right + 20;
        if (left + modalWidth > windowWidth - 20) {
          left = rect.left - modalWidth - 20;
        }
        break;
      case "left":
        top = rect.top + (rect.height / 2) - (modalHeight / 2);
        left = rect.left - modalWidth - 20;
        if (left < 20) {
          left = rect.right + 20;
        }
        break;
      case "top":
        top = rect.top - modalHeight - 20;
        left = rect.left + (rect.width / 2) - (modalWidth / 2);
        if (top < 20) {
          top = rect.bottom + 20;
        }
        break;
      case "bottom":
        top = rect.bottom + 20;
        left = rect.left + (rect.width / 2) - (modalWidth / 2);
        if (top + modalHeight > windowHeight - 20) {
          top = rect.top - modalHeight - 20;
        }
        break;
      default:
        top = windowHeight / 2 - modalHeight / 2;
        left = windowWidth / 2 - modalWidth / 2;
    }
    
    return { top: Math.max(20, top), left: Math.max(20, left) };
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      const currentStepData = tutorialSteps[currentStep];
      
      const setupStep = async () => {
        if (currentStepData.target) {
          const element = await getElementWithRetry(currentStepData.target);
          
          if (element) {
            // Añadir clase temporal para asegurar visibilidad
            element.classList.add('z-60', 'relative');
            
            const rect = element.getBoundingClientRect();
            setSpotlightRect(rect);
            
            // Scroll suave al elemento
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Esperar a que termine el scroll
            setTimeout(() => {
              const position = calculateModalPosition(element, currentStepData.position);
              setModalPosition(position);
            }, 500);
          }
        } else {
          setSpotlightRect(null);
          setModalPosition({
            top: window.innerHeight / 2 - 150,
            left: window.innerWidth / 2 - 200
          });
        }
      };
      
      setupStep();
    } else {
      document.body.style.overflow = 'auto';
      
      // Limpiar clases temporales
      tutorialSteps.forEach(step => {
        if (step.target) {
          const element = document.querySelector(step.target);
          if (element) {
            element.classList.remove('z-60', 'relative');
          }
        }
      });
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [currentStep, isOpen]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      localStorage.setItem('tutorialSeen', 'true');
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('tutorialSeen', 'true');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay con opacidad reducida */}
      <div className="absolute inset-0 bg-black bg-opacity-60">
        {spotlightRect && (
          <div
            className="absolute rounded-lg transition-all duration-500"
            style={{
              top: `${spotlightRect.top}px`,
              left: `${spotlightRect.left}px`,
              width: `${spotlightRect.width}px`,
              height: `${spotlightRect.height}px`,
              boxShadow: `
                0 0 0 100vmax rgba(0, 0, 0, 0.6),
                inset 0 0 0 2px rgba(59, 130, 246, 0.8)
              `
            }}
          />
        )}
      </div>
      
      {/* Modal del tutorial con texto aumentado */}
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={`fixed z-70 w-full max-w-2xl p-8 rounded-2xl shadow-xl ${
          isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
        }`}
        style={{
          top: `${modalPosition.top}px`,
          left: `${modalPosition.left}px`,
        }}
      >
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-4 text-center">{tutorialSteps[currentStep].title}</h2>
          <p className="text-xl leading-relaxed text-center">{tutorialSteps[currentStep].content}</p>
        </div>
        
        {/* Indicadores de progreso */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-3">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`w-4 h-4 rounded-full ${
                  index === currentStep
                    ? "bg-uniss-blue"
                    : isDarkMode
                    ? "bg-gray-600"
                    : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
        
        {/* Botones de navegación - Diseño mejorado con grid */}
        <div className="grid grid-cols-3 gap-4 items-center">
          {/* Botón Anterior */}
          <div className="flex justify-start">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className={`px-5 py-3 rounded-lg text-lg font-semibold ${
                  isDarkMode 
                    ? "bg-gray-700 hover:bg-gray-600" 
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                ← Anterior
              </button>
            )}
          </div>
          
          {/* Botón Omitir (centrado) */}
          <div className="flex justify-center">
            <button
              onClick={handleSkip}
              className={`px-5 py-3 rounded-lg text-lg font-semibold ${
                isDarkMode 
                  ? "bg-gray-700 hover:bg-gray-600" 
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              Omitir Tutorial
            </button>
          </div>
          
          {/* Botón Siguiente/Finalizar */}
          <div className="flex justify-end">
            <button
              onClick={handleNext}
              className="px-5 py-3 bg-uniss-blue text-white rounded-lg hover:bg-uniss-blue-600 text-lg font-semibold"
            >
              {currentStep === tutorialSteps.length - 1 ? "Finalizar →" : "Siguiente →"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}