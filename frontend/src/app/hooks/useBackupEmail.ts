// hooks/useBackupEmail.ts
import { useState, useEffect } from 'react';

export const useBackupEmail = () => {
  const [backupEmail, setBackupEmail] = useState<string>('usuario@example.com');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBackupEmail = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          throw new Error('No se encontró token de autenticación');
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/users/profile`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Error en la petición: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success && data.user) {
          // Usa la misma lógica de mapeo que en UserProfile
          const userEmail = data.user.company || 'usuario@example.com';
          setBackupEmail(userEmail);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        console.error('Error obteniendo correo de respaldo:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBackupEmail();
  }, []);

  const updateBackupEmail = (newEmail: string) => {
    setBackupEmail(newEmail);
  };

  return { backupEmail, loading, error, updateBackupEmail };
};