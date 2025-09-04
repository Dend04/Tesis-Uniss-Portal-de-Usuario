// src/app/components/active-account/UsernameSelection.tsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface UsernameSelectionProps {
  userData: any;
  userType: 'student' | 'employee';
  onSelect: (username: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function UsernameSelection({ 
  userData, 
  userType,
  onSelect, 
  onBack, 
  onNext 
}: UsernameSelectionProps) {
  const [usernameOptions, setUsernameOptions] = useState<string[]>([]);
  const [selectedUsername, setSelectedUsername] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [resetCount, setResetCount] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const [currentOptionSet, setCurrentOptionSet] = useState(0); // Para navegar entre conjuntos de opciones

  // Almacenar todos los conjuntos de opciones generados
  const [allOptions, setAllOptions] = useState<string[][]>([]);

  useEffect(() => {
    if (userType && userData) {
      fetchUsernameOptions();
    }
  }, [userData, userType]);

  const getUserId = () => {
    if (userType === 'student') {
      return userData.rawData?.identification || userData.ci;
    } else {
      return userData.No_CI || userData.ci;
    }
  };

  const fetchUsernameOptions = async (reset: boolean = false) => {
    setIsLoading(true);
    setError("");
    
    try {
      const userId = getUserId();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5550/api';
      
      if (!userType || !userId) {
        setError("Faltan datos necesarios para generar opciones de usuario");
        setIsLoading(false);
        return;
      }

      if (reset) {
        setResetCount(prev => prev + 1);
        setIsResetting(true);
      }

      const url = `${apiUrl}/usernameOptions/${userType}/${userId}/options${
        reset ? '?reset=true' : ''
      }`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setUsernameOptions(result.options);
        
        // Guardar el nuevo conjunto de opciones
        if (reset) {
          setAllOptions(prev => [...prev, result.options]);
          setCurrentOptionSet(allOptions.length); // Navegar al nuevo conjunto
          setSelectedUsername("");
          onSelect("");
        } else {
          // Primera carga
          setAllOptions([result.options]);
          setCurrentOptionSet(0);
        }
      } else {
        setError(result.error || "Error generando opciones de usuario");
      }
    } catch (error) {
      setError("Error de conexión al servidor");
      console.error("Error fetching username options:", error);
    } finally {
      setIsLoading(false);
      setIsResetting(false);
    }
  };

  const handleSelect = (username: string) => {
    setSelectedUsername(username);
    onSelect(username);
  };

  const handleSubmit = () => {
    if (selectedUsername) {
      onNext();
    }
  };

  const handleRetry = () => {
    fetchUsernameOptions();
  };

  const handleReset = () => {
    if (resetCount < 3) {
      fetchUsernameOptions(true);
    }
  };

  const navigateOptionSets = (direction: 'prev' | 'next') => {
    if (allOptions.length <= 1) return;
    
    if (direction === 'prev') {
      setCurrentOptionSet(prev => 
        prev === 0 ? allOptions.length - 1 : prev - 1
      );
    } else {
      setCurrentOptionSet(prev => 
        prev === allOptions.length - 1 ? 0 : prev + 1
      );
    }
    
    // Actualizar las opciones visibles
    setUsernameOptions(allOptions[currentOptionSet]);
    setSelectedUsername("");
    onSelect("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="p-6"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          Elige tu nombre de usuario
        </h2>
        
        {/* Botón de reset con icono */}
        <button
          type="button"
          onClick={handleReset}
          disabled={resetCount >= 3 || isResetting}
          className={`p-2 rounded-full transition-colors ${
            resetCount >= 3 || isResetting
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-blue-100 text-blue-600 hover:bg-blue-200"
          }`}
          title="Generar nuevas opciones"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <p className="text-gray-600 mb-6">
        Este será tu nombre de usuario para acceder a todos los servicios institucionales.
        Debe ser único y no estar en uso por otro usuario.
      </p>

      {/* Contador de intentos y navegación entre conjuntos */}
      <div className="mb-4 text-sm text-gray-500 flex justify-between items-center">
        <span>Intentos de generación: {resetCount}/3</span>
        
        {allOptions.length > 1 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateOptionSets('prev')}
              className="p-1 bg-gray-100 rounded-full hover:bg-gray-200"
              title="Conjunto anterior"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <span className="text-blue-600">
              Conjunto {currentOptionSet + 1}/{allOptions.length}
            </span>
            
            <button
              onClick={() => navigateOptionSets('next')}
              className="p-1 bg-gray-100 rounded-full hover:bg-gray-200"
              title="Siguiente conjunto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={handleRetry}
            className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 text-sm"
          >
            Reintentar
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 mb-6">
            {usernameOptions.map((username, index) => (
              <div
                key={index}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedUsername === username
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
                onClick={() => handleSelect(username)}
              >
                <div className="flex items-center">
                  <div
                    className={`w-5 h-5 rounded-full border mr-3 flex items-center justify-center ${
                      selectedUsername === username
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-400"
                    }`}
                  >
                    {selectedUsername === username && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="font-medium text-gray-800">{username}</p>
                </div>
              </div>
            ))}
          </div>

          {usernameOptions.length === 0 && !error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800">
                No hemos encontrado nombres de usuario disponibles con las combinaciones habituales.
                Por favor, contacta con soporte técnico para ayudarte a crear uno.
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedUsername}
              className={`px-5 py-2.5 text-sm font-medium text-white rounded-lg ${
                selectedUsername
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-400 cursor-not-allowed"
              } transition-colors`}
            >
              Continuar
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}