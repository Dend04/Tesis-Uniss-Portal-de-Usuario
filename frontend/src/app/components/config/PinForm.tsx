// app/components/config/PinForm.tsx
"use client";

import { useState, useRef, useEffect, memo, useCallback } from "react";

interface PinFormProps {
  isDarkMode: boolean;
  hasExistingPin: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

const PinForm = memo(({ isDarkMode, hasExistingPin, onSuccess, onCancel }: PinFormProps) => {
  const [pin, setPin] = useState<string[]>(Array(6).fill(""));
  const [confirmPin, setConfirmPin] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTips, setShowTips] = useState(true);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));
  const confirmInputRefs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));

  // Efecto para auto-enfocar el primer campo
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Función optimizada para manejar cambios en cualquier campo
  const handleInputChange = useCallback((
    value: string, 
    index: number, 
    isConfirm: boolean = false
  ) => {
    if (!/^\d?$/.test(value)) return;

    const currentState = isConfirm ? confirmPin : pin;
    const setState = isConfirm ? setConfirmPin : setPin;
    const refs = isConfirm ? confirmInputRefs : inputRefs;

    const newValues = [...currentState];
    newValues[index] = value;
    setState(newValues);
    setError("");

    // Navegación automática
    if (value && index < 5) {
      refs.current[index + 1]?.focus();
    } else if (value && index === 5 && !isConfirm) {
      confirmInputRefs.current[0]?.focus();
    }
  }, [pin, confirmPin]);

  // Manejo unificado de teclas
  const handleKeyDown = useCallback((
    e: React.KeyboardEvent, 
    index: number, 
    isConfirm: boolean = false
  ) => {
    const currentValues = isConfirm ? confirmPin : pin;
    const refs = isConfirm ? confirmInputRefs : inputRefs;

    switch (e.key) {
      case "Backspace":
        if (!currentValues[index] && index > 0) {
          refs.current[index - 1]?.focus();
        } else if (currentValues[index]) {
          // Limpiar valor actual
          handleInputChange("", index, isConfirm);
        }
        break;

      case "ArrowLeft":
        if (index > 0) {
          e.preventDefault();
          refs.current[index - 1]?.focus();
        }
        break;

      case "ArrowRight":
        if (index < 5) {
          e.preventDefault();
          refs.current[index + 1]?.focus();
        }
        break;

      case "Enter":
        if (isConfirm && index === 5) {
          e.preventDefault();
          handleSubmit(e as unknown as React.FormEvent);
        }
        break;
    }
  }, [pin, confirmPin, handleInputChange]);

  // Manejo de pegado optimizado
  const handlePaste = useCallback((
    e: React.ClipboardEvent, 
    isConfirm: boolean = false
  ) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').slice(0, 6);
    
    if (!/^\d+$/.test(pasteData)) return;

    const digits = pasteData.split('');
    const emptyArray = Array(6).fill("");
    digits.forEach((digit, index) => {
      if (index < 6) emptyArray[index] = digit;
    });

    if (isConfirm) {
      setConfirmPin(emptyArray);
    } else {
      setPin(emptyArray);
    }

    // Enfocar el campo apropiado después del pegado
    setTimeout(() => {
      const targetIndex = Math.min(digits.length - 1, 5);
      const targetRefs = isConfirm ? confirmInputRefs : inputRefs;
      
      if (digits.length === 6 && !isConfirm) {
        confirmInputRefs.current[0]?.focus();
      } else {
        targetRefs.current[targetIndex]?.focus();
      }
    }, 0);
  }, []);

  // Validaciones del PIN
  const validatePin = useCallback((pinValue: string) => {
    if (pinValue.length !== 6) {
      return "El PIN debe tener exactamente 6 dígitos";
    }

    if (/^(\d)\1{5}$/.test(pinValue)) {
      return "El PIN no puede ser el mismo dígito repetido 6 veces";
    }

    if (/012345|123456|234567|345678|456789|567890/.test(pinValue) ||
        /098765|987654|876543|765432|654321|543210/.test(pinValue)) {
      return "El PIN no puede ser una secuencia consecutiva";
    }

    if (/^\d{2}(\d{2})\1$/.test(pinValue)) {
      return "El PIN no puede ser un patrón repetitivo";
    }

    return null;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const fullPin = pin.join("");
    const fullConfirmPin = confirmPin.join("");

    // Validaciones básicas
    if (fullPin.length !== 6 || fullConfirmPin.length !== 6) {
      setError("Complete ambos campos de 6 dígitos");
      setIsSubmitting(false);
      return;
    }

    if (fullPin !== fullConfirmPin) {
      setError("Los PINs no coinciden");
      setIsSubmitting(false);
      return;
    }

    // Validaciones de seguridad
    const validationError = validatePin(fullPin);
    if (validationError) {
      setError(validationError);
      setIsSubmitting(false);
      return;
    }

    try {
      // TODO: Llamar API para guardar el PIN
      console.log("PIN a guardar:", fullPin);
      
      // Simular llamada a API
      await new Promise(resolve => setTimeout(resolve, 800));
      
      onSuccess();
    } catch (err) {
      setError("Error al guardar el PIN. Por favor intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para limpiar todos los campos
  const clearAllFields = useCallback(() => {
    setPin(Array(6).fill(""));
    setConfirmPin(Array(6).fill(""));
    setError("");
    inputRefs.current[0]?.focus();
  }, []);

  // Función para crear ref callback
  const createRefCallback = useCallback((index: number, isConfirm: boolean = false) => {
    return (el: HTMLInputElement | null) => {
      if (isConfirm) {
        confirmInputRefs.current[index] = el;
      } else {
        inputRefs.current[index] = el;
      }
    };
  }, []);

  // Calcular progreso de llenado
  const fillProgress = useCallback(() => {
    const pinFilled = pin.filter(d => d !== "").length;
    const confirmFilled = confirmPin.filter(d => d !== "").length;
    return ((pinFilled + confirmFilled) / 12) * 100;
  }, [pin, confirmPin]);

  return (
    <div className="mt-6 p-6 border-t border-gray-200 dark:border-gray-700">
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
              {hasExistingPin ? "Actualizar PIN de Seguridad" : "Configurar PIN de Seguridad"}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {hasExistingPin 
                ? "Actualice su PIN de 6 dígitos para recuperar su contraseña"
                : "Configure un PIN opcional de 6 dígitos para recuperar su contraseña en caso de olvido"
              }
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Opcional</span>
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${fillProgress()}%` }}
          ></div>
        </div>

        {showTips && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h5 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                  💡 Consejos de seguridad
                </h5>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Elija un PIN que no sea su fecha de nacimiento</li>
                  <li>• Evite patrones simples como 123456 o 000000</li>
                  <li>• Guarde su PIN en un lugar seguro y físico</li>
                  <li>• Este PIN le ayudará a recuperar su cuenta si olvida la contraseña</li>
                </ul>
              </div>
              <button
                onClick={() => setShowTips(false)}
                className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
              >
                Ocultar
              </button>
            </div>
          </div>
        )}

        {!showTips && (
          <button
            onClick={() => setShowTips(true)}
            className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm mb-4 flex items-center gap-1"
          >
            Mostrar consejos de seguridad
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campo PIN principal */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Ingrese su PIN de 6 dígitos:
            </label>
            {pin.some(d => d !== "") && (
              <button
                type="button"
                onClick={clearAllFields}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Limpiar todo
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
                  ${digit ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}
                  dark:bg-gray-700 dark:text-white
                  hover:border-blue-400
                `}
                required
              />
            ))}
          </div>
        </div>

        {/* Campo de confirmación */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Confirme su PIN:
          </label>
          <div className="flex gap-2 justify-center mb-4">
            {confirmPin.map((digit, index) => (
              <input
                key={index}
                ref={createRefCallback(index, true)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(e.target.value, index, true)}
                onKeyDown={(e) => handleKeyDown(e, index, true)}
                onPaste={(e) => handlePaste(e, true)}
                onFocus={(e) => e.target.select()}
                className={`
                  w-12 h-12 text-center text-lg font-semibold border rounded-lg 
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                  transition-all duration-200
                  ${digit ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600'}
                  dark:bg-gray-700 dark:text-white
                  hover:border-green-400
                `}
                required
              />
            ))}
          </div>
        </div>

        {/* Indicador de fortaleza del PIN */}
        {pin.join("").length === 6 && !error && (
          <div className="text-center">
            <div className="text-sm text-green-600 dark:text-green-400">
              ✓ PIN válido
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Confirme su PIN para continuar
            </div>
          </div>
        )}

        {/* Mensaje de error */}
        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 border border-gray-300 dark:border-gray-600"
          >
            {hasExistingPin ? "Mantener PIN actual" : "Omitir por ahora"}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || pin.join("").length !== 6 || confirmPin.join("").length !== 6}
            className="flex-1 px-4 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Guardando...
              </>
            ) : hasExistingPin ? (
              "Actualizar PIN"
            ) : (
              "Guardar PIN"
            )}
          </button>
        </div>

        {/* Información adicional */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Puede activar o desactivar esta opción en cualquier momento desde la configuración
          </p>
        </div>
      </form>
    </div>
  );
});

PinForm.displayName = "PinForm";

export default PinForm;