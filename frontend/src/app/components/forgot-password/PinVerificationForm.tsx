// app/components/forgot-password/PinVerificationForm.tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

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

    // Navegación automática
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (value && index === 5) {
      // Si es el último dígito, intentar verificar automáticamente
      handleSubmit();
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
          handleInputChange("", index);
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
          handleSubmit();
        }
        break;
    }
  }, [pin, handleInputChange]);

  // Manejo de pegado
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').slice(0, 6);
    
    if (!/^\d+$/.test(pasteData)) return;

    const digits = pasteData.split('');
    const newPin = [...pin];
    digits.forEach((digit, index) => {
      if (index < 6) newPin[index] = digit;
    });
    setPin(newPin);

    // Enfocar el último campo pegado
    setTimeout(() => {
      const targetIndex = Math.min(digits.length - 1, 5);
      inputRefs.current[targetIndex]?.focus();
    }, 0);
  }, [pin]);

  // Verificar el PIN
  const handleSubmit = async () => {
    const fullPin = pin.join("");
    if (fullPin.length !== 6) {
      setError("Por favor, complete el PIN de 6 dígitos");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
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

      if (result.success) {
        onPinVerified();
      } else {
        setError(result.error || "PIN incorrecto");
        // Limpiar campos en caso de error
        setPin(Array(6).fill(""));
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      setError("Error de conexión. Por favor intenta nuevamente.");
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

  // ✅ Manejo seguro de userData
  const displayName = userData?.displayName || userData?.sAMAccountName || 'Usuario';
  const email = userData?.email || 'No disponible';

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
        {/* Información del usuario */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Usuario:</strong> {displayName}
          </p>
          <p className="text-sm text-blue-600 mt-1">
            {email}
          </p>
        </div>

        {/* Campo PIN */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            PIN de seguridad:
          </label>
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
                  ${digit ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                  hover:border-blue-400
                `}
                required
                disabled={isSubmitting}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 text-center">
            Ingrese los 6 dígitos de su PIN de seguridad
          </p>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="text-red-600 text-sm text-center p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center justify-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Botón de verificación */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || pin.join("").length !== 6}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
        <div className="text-center">
          <p className="text-xs text-gray-500">
            ¿No recuerda su PIN? Utilice otro método de recuperación.
          </p>
        </div>
      </div>
    </motion.div>
  );
}