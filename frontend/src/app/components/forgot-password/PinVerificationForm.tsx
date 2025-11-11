// app/components/forgot-password/PinVerificationForm.tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeftIcon, ExclamationTriangleIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

interface UserData {
  email: string;
  displayName?: string;
  sAMAccountName?: string;
  employeeID?: string;
  userPrincipalName?: string;
  dn: string;
  accountStatus?: string;
}

interface PinVerificationFormProps {
  userData: UserData;
  onBack: () => void;
  onPinVerified: () => void;
}

export default function PinVerificationForm({ userData, onBack, onPinVerified }: PinVerificationFormProps) {
  const [pin, setPin] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));

  // Efecto para auto-enfocar el primer campo
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Función para manejar cambios en los campos del PIN
  const handleInputChange = useCallback((value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError("");
    setSuccessMessage("");

    // Navegación automática
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (value && index === 5) {
      // Si es el último dígito, intentar verificar automáticamente
      const fullPin = newPin.join("");
      if (fullPin.length === 6) {
        // Usar setTimeout para evitar el error de validación inmediata
        setTimeout(() => {
          handleSubmit(fullPin);
        }, 10);
      }
    }
  }, [pin]);

  // Manejo de teclas
  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case "Backspace":
        if (!pin[index] && index > 0) {
          inputRefs.current[index - 1]?.focus();
        } else if (pin[index]) {
          // Limpiar valor actual
          const newPin = [...pin];
          newPin[index] = "";
          setPin(newPin);
        }
        break;

      case "ArrowLeft":
        if (index > 0) {
          e.preventDefault();
          inputRefs.current[index - 1]?.focus();
        }
        break;

      case "ArrowRight":
        if (index < 5) {
          e.preventDefault();
          inputRefs.current[index + 1]?.focus();
        }
        break;

      case "Enter":
        if (index === 5) {
          e.preventDefault();
          const fullPin = pin.join("");
          if (fullPin.length === 6) {
            handleSubmit(fullPin);
          }
        }
        break;
    }
  }, [pin]);

  // Manejo de pegado
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').slice(0, 6);
    
    if (!/^\d+$/.test(pasteData)) {
      setError("Solo se permiten números en el PIN");
      return;
    }

    const digits = pasteData.split('');
    const newPin = Array(6).fill("");
    digits.forEach((digit, index) => {
      if (index < 6) newPin[index] = digit;
    });
    setPin(newPin);
    setError("");

    // Enfocar el último campo pegado
    setTimeout(() => {
      const targetIndex = Math.min(digits.length - 1, 5);
      inputRefs.current[targetIndex]?.focus();
      
      // Si se pegaron 6 dígitos, verificar automáticamente
      if (digits.length === 6) {
        setTimeout(() => handleSubmit(pasteData), 10);
      }
    }, 0);
  }, []);

  // ✅ FUNCIÓN PRINCIPAL: Verificar el PIN (ahora acepta pin como parámetro)
  const handleSubmit = async (submittedPin?: string) => {
    const fullPin = submittedPin || pin.join("");
    
    // Validaciones básicas
    if (fullPin.length !== 6) {
      setError("Por favor, complete el PIN de 6 dígitos");
      const emptyIndex = pin.findIndex(digit => digit === "");
      if (emptyIndex !== -1) {
        inputRefs.current[emptyIndex]?.focus();
      }
      return;
    }

    if (!/^\d{6}$/.test(fullPin)) {
      setError("El PIN debe contener solo números");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      console.log("🔍 Verificando PIN para:", userData.sAMAccountName || userData.employeeID);
      
      const response = await fetch(`${API_URL}/pin/verify-for-recovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: userData.sAMAccountName || userData.employeeID,
          pin: fullPin
        }),
      });

      const result = await response.json();
      console.log("📨 Respuesta del servidor:", result);

      if (result.success) {
        setSuccessMessage("✅ PIN verificado correctamente");
        
        // Esperar un momento para mostrar el mensaje de éxito
        setTimeout(() => {
          onPinVerified();
        }, 1000);
      } else {
        setError(result.error || "PIN incorrecto. Por favor, intente nuevamente.");
        // Limpiar campos en caso de error
        setPin(Array(6).fill(""));
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error("❌ Error verificando PIN:", error);
      setError("Error de conexión. Por favor verifique su conexión a internet e intente nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para crear ref callback
  const createRefCallback = useCallback((index: number) => {
    return (el: HTMLInputElement | null) => {
      inputRefs.current[index] = el;
    };
  }, []);

  // Función para limpiar todos los campos
  const clearAllFields = useCallback(() => {
    setPin(Array(6).fill(""));
    setError("");
    setSuccessMessage("");
    inputRefs.current[0]?.focus();
  }, []);

  // Calcular progreso de llenado
  const fillProgress = pin.filter(digit => digit !== "").length;

  // ✅ Manejo seguro de userData (sin mostrar email)
  const displayName = userData?.displayName || userData?.sAMAccountName || 'Usuario';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-4 md:px-8 py-8"
    >
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors mb-4"
          disabled={isSubmitting}
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Volver
        </button>
        <h2 className="text-2xl font-bold text-gray-900">Verificación de PIN</h2>
        <p className="text-gray-600 mt-2">
          Ingrese el PIN de 6 dígitos que configuró previamente para recuperar su contraseña.
        </p>
      </div>

      <div className="space-y-6">
        {/* Información del usuario (sin email) */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-800 font-medium">
            <strong>Usuario:</strong> {displayName}
          </p>
          <p className="text-sm text-blue-600 mt-1">
            <strong>Método:</strong> PIN de Seguridad
          </p>
        </div>

        {/* Barra de progreso */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(fillProgress / 6) * 100}%` }}
          ></div>
        </div>

        {/* Campo PIN */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              PIN de seguridad (6 dígitos):
            </label>
            {fillProgress > 0 && (
              <button
                type="button"
                onClick={clearAllFields}
                className="text-xs text-gray-500 hover:text-gray-700"
                disabled={isSubmitting}
              >
                Limpiar
              </button>
            )}
          </div>
          
          <div className="flex gap-2 justify-center mb-2">
            {pin.map((digit, index) => (
              <input
                key={index}
                ref={createRefCallback(index)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onPaste={handlePaste}
                onFocus={(e) => e.target.select()}
                className={`
                  w-12 h-12 text-center text-lg font-semibold border rounded-lg 
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                  transition-all duration-200
                  ${
                    digit 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300'
                  }
                  hover:border-blue-400
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                required
                disabled={isSubmitting}
              />
            ))}
          </div>
          
          <p className="text-xs text-gray-500 text-center">
            {fillProgress === 6 && !isSubmitting ? "PIN completo. Presione Enter o espere..." : 
             fillProgress === 6 && isSubmitting ? "Verificando PIN..." :
             `Ingrese los 6 dígitos (${fillProgress}/6)`}
          </p>
        </div>

        {/* Mensaje de éxito */}
        {successMessage && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-green-700 text-sm">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Mensaje de error */}
        {error && (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-700 text-sm">{error}</p>
                {error.includes("incorrecto") && (
                  <p className="text-red-600 text-xs mt-1">
                    Verifique que esté ingresando el PIN correcto.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Botón de verificación */}
        <button
          onClick={() => handleSubmit()}
          disabled={isSubmitting || fillProgress !== 6}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Verificando...
            </>
          ) : (
            "Verificar PIN"
          )}
        </button>

        {/* Información adicional */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="font-semibold text-gray-800 text-sm mb-2">💡 Información importante</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• El PIN es el código de 6 dígitos que configuró en la sección de seguridad</li>
            <li>• Si no recuerda su PIN, puede usar el método de recuperación por correo electrónico</li>
            <li>• Después de 3 intentos fallidos, su cuenta podría bloquearse temporalmente</li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}