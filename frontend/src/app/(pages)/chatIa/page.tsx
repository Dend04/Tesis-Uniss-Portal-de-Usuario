// components/GeminiChat.tsx (Diseño mejorado y funcional)
'use client';
import { DeepChat } from 'deep-chat-react';
import { useEffect, useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import Loader from '@/app/components/Loader';

export default function GeminiChat() {
  const [isCuba, setIsCuba] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLocation = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        setIsCuba(data.country === 'CU');
      } catch (error) {
        console.error('Error detectando ubicación:', error);
        setIsCuba(false);
      } finally {
        setLoading(false);
      }
    };
    checkLocation();
  }, []);

  if (loading) return <Loader className="min-h-[400px]" />;

  if (isCuba) {
    return (
      <div className="max-w-2xl mx-auto p-6 my-8 bg-yellow-50 border border-yellow-200 rounded-xl">
        <div className="flex flex-col items-center text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-600 mb-4" />
          <h2 className="text-2xl font-semibold text-yellow-800 mb-2">
            Acceso Requiere VPN
          </h2>
          <p className="text-yellow-700 text-lg mb-4">
            Para usar el asistente virtual desde Cuba:
          </p>
          <ol className="space-y-2 text-yellow-700 text-left text-lg list-decimal pl-6">
            <li>Activa tu aplicación de VPN</li>
            <li>Conéctate a un servidor internacional</li>
            <li>Recarga esta página</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 min-h-screen">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <DeepChat
         demo={true}
          style={{ 
            height: '70vh',
            borderRadius: '0.75rem',
            fontSize: '1.1rem',
            backgroundColor: '#f8fafc'
          }}
          request={{ 
            url: `${process.env.NEXT_PUBLIC_API_URL}/gemini/chat`,/* http://localhost:5000/api/gemini/chat */
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          }}
          textInput={{ 
            placeholder: {
              text: 'Escribe tu pregunta aquí...' // ✅ Estructura correcta
            },
            styles: {
              container: {
                padding: '1rem',
                backgroundColor: '#ffffff'
              },
              text: {
                fontSize: '1.1rem',
                color: '#1e293b'
              }
            }
          }}
          messageStyles={{
            user: { 
              background: '#3b82f6',
              color: '#ffffff',
              borderRadius: '1rem',
              padding: '1rem',
              fontSize: '1.1rem',
              margin: '0.5rem 0'
            },
            ai: { 
              background: '#ffffff',
              color: '#1e293b',
              borderRadius: '1rem',
              padding: '1rem',
              fontSize: '1.1rem',
              margin: '0.5rem 0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }
          }}
          initialMessages={[
            { 
              text: '¡Hola! Soy tu asistente virtual UNISS. ¿En qué puedo ayudarte hoy?',
              role: 'ai',
              styles: {
                text: {
                  fontSize: '1.2rem',
                  fontWeight: '500'
                }
              }
            }
          ]}
          errorMessages={{
            userError: (error: any) => (
              <div className="flex items-center gap-2 text-red-600">
                <ExclamationTriangleIcon className="h-5 w-5" />
                {error.message || 'Error al procesar la solicitud'}
              </div>
            ),
            default: (
              <div className="flex items-center gap-2 text-gray-600">
                <Loader className="h-5 w-5" />
                Conectando con el servicio...
              </div>
            )
          }}
          streaming={true}
          streamSpeed={50}
          streamBubbleColor="#3b82f6"
        />
      </div>
    </div>
  );
}