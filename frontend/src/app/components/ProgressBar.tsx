"use client";

import { useEffect, useState, useRef } from "react";

interface ProgressBarProps {
  percentage: number;
  darkMode: boolean;
  thickness?: "thin" | "medium" | "thick";
  triggerAnimation?: boolean;
  "aria-label"?: string; // Agregar para accesibilidad
}

const ProgressBar = ({
  percentage,
  darkMode,
  thickness = "medium",
  triggerAnimation = false,
  "aria-label": ariaLabel = "Progress bar"
}: ProgressBarProps) => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousPercentageRef = useRef(percentage);
  const animationTriggerRef = useRef(triggerAnimation);

  // Efecto para manejar la animación
  useEffect(() => {
    // Si triggerAnimation cambió a true, reiniciamos la animación
    if (triggerAnimation && !animationTriggerRef.current) {
      setAnimatedPercentage(0);
      setIsAnimating(true);
      animationTriggerRef.current = true;
      
      const timer = setTimeout(() => {
        setAnimatedPercentage(percentage);
        setIsAnimating(false);
      }, 100);
      
      return () => clearTimeout(timer);
    }
    
    // Si el porcentaje cambió significativamente, animar
    if (Math.abs(percentage - previousPercentageRef.current) > 5 || isAnimating) {
      setIsAnimating(true);
      
      const timer = setTimeout(() => {
        setAnimatedPercentage(percentage);
        setIsAnimating(false);
        previousPercentageRef.current = percentage;
        animationTriggerRef.current = triggerAnimation;
      }, 100);
      
      return () => clearTimeout(timer);
    } else {
      // Si el cambio es pequeño, actualizar directamente
      setAnimatedPercentage(percentage);
      previousPercentageRef.current = percentage;
      animationTriggerRef.current = triggerAnimation;
    }
  }, [percentage, triggerAnimation, isAnimating]);

  const heightClass = {
    thin: "h-2",
    medium: "h-3",
    thick: "h-4",
  }[thickness];

  // Usar animatedPercentage para la visualización
  const displayPercentage = animatedPercentage;

  return (
    <div className="w-full" aria-label={ariaLabel} role="progressbar" 
         aria-valuenow={displayPercentage} aria-valuemin={0} aria-valuemax={100}>
      <div className="flex justify-between mb-1">
        <span
          className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
        >
          Progreso
        </span>
        <span
          className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
        >
          {displayPercentage.toFixed(0)}%
        </span>
      </div>
      <div
        className={`rounded-full ${
          darkMode ? "bg-gray-700" : "bg-gray-200"
        } ${heightClass}`}
      >
        <div
          className={`rounded-full transition-all duration-500 ease-out ${
            displayPercentage >= 90
              ? "bg-green-500"
              : displayPercentage >= 50
              ? "bg-uniss-blue"
              : displayPercentage >= 25
              ? "bg-yellow-500"
              : "bg-red-500"
          } ${heightClass}`}
          style={{ 
            width: `${displayPercentage}%`,
            transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;