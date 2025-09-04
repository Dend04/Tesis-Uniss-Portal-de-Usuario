// src/components/EmailConfirm.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { CheckCircleIcon, ArrowLeftIcon, HomeIcon } from '@heroicons/react/24/outline';
import Head from 'next/head';

export default function OperationSuccess() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [operationType] = useState(router.query.type || 'completada');
  
  // Animación de entrada
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleGoBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <>
      <Head>
        <title>Operación Completada | UNISS</title>
        <meta name="description" content="Operación completada exitosamente" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className={`max-w-md w-full bg-white rounded-2xl shadow-xl p-8 transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="text-center">
            {/* Icono de verificación con animación */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
                <CheckCircleIcon className="w-20 h-20 text-green-500 relative z-10" />
              </div>
            </div>
            
            {/* Título y mensaje */}
            <h1 className="text-3xl font-bold text-gray-800 mb-4">¡Operación Exitosa!</h1>
            <p className="text-gray-600 mb-8">
              La operación ha sido {operationType} satisfactoriamente.
            </p>
            
            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleGoBack}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-300"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                Volver atrás
              </button>
              
              <button
                onClick={handleGoHome}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-uniss-blue text-white rounded-lg hover:bg-uniss-blue transition-colors duration-300"
              >
                <HomeIcon className="w-5 h-5" />
                Ir al inicio
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}