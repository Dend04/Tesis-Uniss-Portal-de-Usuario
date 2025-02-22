import { ReactNode, useEffect } from 'react';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
};

export default function Modal({ isOpen, onClose, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset' };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose} // Cierra el modal al hacer clic fuera
    >
      <div 
        className="animate-fade-in-up bg-white rounded-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()} // Previene cierre al hacer clic dentro
      >
        {children}
      </div>
    </div>
  );
}