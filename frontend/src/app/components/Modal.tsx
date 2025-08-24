// components/Modal.tsx
"use client";

import { ReactNode, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  isDarkMode: boolean;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  isDarkMode,
  maxWidth = "md",
  showCloseButton = true
}: ModalProps) {
  // Cerrar modal con la tecla Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl"
  }[maxWidth];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className={`relative w-full rounded-lg p-6 ${maxWidthClass} ${
          isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
        }`}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-1 rounded-full ${
              isDarkMode ? "text-gray-400 hover:bg-gray-700" : "text-gray-500 hover:bg-gray-200"
            }`}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        )}
        
        <h3 className="text-xl font-bold mb-4">
          {title}
        </h3>
        
        <div className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
          {children}
        </div>
      </div>
    </div>
  );
}