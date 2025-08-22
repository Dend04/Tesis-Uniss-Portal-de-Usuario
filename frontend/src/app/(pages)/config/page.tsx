// app/config/page.tsx
"use client";

import { useState, useCallback, memo, useEffect } from "react";
import Header from "@/app/components/Header";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PasswordForm from "@/app/components/config/PasswordForm";
import EmailForm from "@/app/components/config/EmailForm";
import TwoFactorAuth from "@/app/components/config/TwoFactorAuth";
import {
  ShieldCheckIcon,
  EnvelopeIcon,
  LockClosedIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

interface ConfigItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
  children?: React.ReactNode;
  isDarkMode: boolean;
}

// Componente ToggleSwitch
const ToggleSwitch = memo(
  ({
    enabled,
    setEnabled,
    isDarkMode,
  }: {
    enabled: boolean;
    setEnabled: (value: boolean) => void;
    isDarkMode: boolean;
  }) => (
    <button
      onClick={() => setEnabled(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
        enabled
          ? "bg-green-500"
          : `${isDarkMode ? "bg-gray-600" : "bg-gray-300"}`
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full transition-transform duration-300 ${
          enabled ? "translate-x-6" : "translate-x-1"
        } ${isDarkMode ? "bg-gray-200" : "bg-white"}`}
      />
    </button>
  )
);

const ConfigItem = memo(
  ({
    icon,
    title,
    description,
    action,
    children,
    isDarkMode,
  }: ConfigItemProps) => (
    <div
      className={`flex flex-col p-6 rounded-xl ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } mb-4 transition-colors`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-lg ${
              isDarkMode
                ? "bg-gray-700 text-gray-200"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {icon}
          </div>
          <div>
            <h3
              className={`text-lg font-semibold ${
                isDarkMode ? "text-gray-100" : "text-gray-800"
              }`}
            >
              {title}
            </h3>
            <p
              className={`text-sm ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {description}
            </p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
);

export default function ConfigPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [showTwoFASetup, setShowTwoFASetup] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("usuario@example.com");
  
  const searchParams = useSearchParams();
  
  // Efecto para manejar parámetros de URL y activar automáticamente el formulario de contraseña
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'change-password') {
      setShowPasswordForm(true);
      
      // Hacer scroll suave hasta la sección de contraseña
      setTimeout(() => {
        const passwordSection = document.getElementById('password-section');
        if (passwordSection) {
          passwordSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [searchParams]);

  const handleEmailSuccess = (newEmail: string) => {
    setCurrentEmail(newEmail);
    setShowEmailForm(false);
  };

  const handleTwoFAToggle = (enabled: boolean) => {
    if (enabled) {
      // Mostrar formulario de configuración de 2FA
      setShowTwoFASetup(true);
    } else {
      // Desactivar 2FA directamente
      setTwoFAEnabled(false);
    }
  };

  const handleTwoFASetupComplete = () => {
    setTwoFAEnabled(true);
    setShowTwoFASetup(false);
  };

  const handleTwoFACancel = () => {
    setShowTwoFASetup(false);
    setTwoFAEnabled(false);
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <Header
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        isDarkMode={isDarkMode}
      />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto py-8">
          <Link
            href="/dashboard"
            className={`flex items-center ${
              isDarkMode ? "text-uniss-gold" : "text-uniss-blue"
            } hover:opacity-80`}
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Volver al Dashboard
          </Link>
        </div>
        
        <h1
          className={`text-3xl font-bold mb-8 ${
            isDarkMode ? "text-gray-100" : "text-gray-800"
          }`}
        >
          Configuración de la cuenta
        </h1>

        {/* Autenticación en dos pasos */}
        <ConfigItem
          icon={<ShieldCheckIcon className="w-6 h-6" />}
          title="Autenticación en dos pasos"
          description="Protege tu cuenta con una capa adicional de seguridad"
          action={
            <ToggleSwitch
              enabled={twoFAEnabled || showTwoFASetup}
              setEnabled={handleTwoFAToggle}
              isDarkMode={isDarkMode}
            />
          }
          isDarkMode={isDarkMode}
        >
          {showTwoFASetup && (
          <TwoFactorAuth 
          isDarkMode={isDarkMode}
          onSetupComplete={(secret, backupCodes) => {
            // Aquí enviarías el secret y backupCodes al servidor
            console.log('2FA configurado:', { secret, backupCodes });
            setTwoFAEnabled(true);
            setShowTwoFASetup(false);
          }}
          onCancel={() => {
            setShowTwoFASetup(false);
            setTwoFAEnabled(false);
          }}
          userEmail={currentEmail}
        />
          )}
        </ConfigItem>

        {/* Correo de respaldo */}
        <ConfigItem
          icon={<EnvelopeIcon className="w-6 h-6" />}
          title="Correo de respaldo"
          description={currentEmail}
          action={
            <ToggleSwitch
              enabled={showEmailForm}
              setEnabled={setShowEmailForm}
              isDarkMode={isDarkMode}
            />
          }
          isDarkMode={isDarkMode}
        >
          {showEmailForm && (
            <EmailForm 
              isDarkMode={isDarkMode}
              currentEmail={currentEmail}
              onCancel={() => setShowEmailForm(false)}
              onSuccess={handleEmailSuccess}
            />
          )}
        </ConfigItem>

        {/* Cambiar contraseña - Con ID para scroll automático */}
        <div id="password-section">
          <ConfigItem
            icon={<LockClosedIcon className="w-6 h-6" />}
            title="Seguridad de la cuenta"
            description="Actualiza tu contraseña regularmente para mayor seguridad"
            action={
              <ToggleSwitch
                enabled={showPasswordForm}
                setEnabled={setShowPasswordForm}
                isDarkMode={isDarkMode}
              />
            }
            isDarkMode={isDarkMode}
          >
            {showPasswordForm && (
              <PasswordForm 
                isDarkMode={isDarkMode} 
                onSuccess={() => setShowPasswordForm(false)}
                onCancel={() => setShowPasswordForm(false)}
              />
            )}
          </ConfigItem>
        </div>
      </div>
    </div>
  );
}