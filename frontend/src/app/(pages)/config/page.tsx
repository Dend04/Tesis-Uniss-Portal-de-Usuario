// app/config/page.tsx
"use client";

import {
  ShieldCheckIcon,
  EnvelopeIcon,
  LockClosedIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { useState, useCallback, memo } from "react";
import Header from "@/app/components/Header";
import Modal from "@/app/components/Modal";
import Link from "next/link";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  children?: React.ReactNode;
}

interface ConfigItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
  children?: React.ReactNode;
  isDarkMode: boolean;
}

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

const PasswordStrength = memo(({ password }: { password: string }) => {
  const requirements = [
    { regex: /.{8,}/, text: "Mínimo 8 caracteres" },
    { regex: /[A-Z]/, text: "Al menos una mayúscula" },
    { regex: /[0-9]/, text: "Al menos un número" },
    { regex: /[^A-Za-z0-9]/, text: "Al menos un carácter especial" },
  ];

  return (
    <div className="mt-4 space-y-2">
      {requirements.map((req, index) => (
        <div key={index} className="flex items-center gap-2">
          {req.regex.test(password) ? (
            <CheckCircleIcon className="w-4 h-4 text-green-500" />
          ) : (
            <XCircleIcon className="w-4 h-4 text-red-500" />
          )}
          <span
            className={`text-sm ${
              req.regex.test(password) ? "text-green-600" : "text-red-600"
            }`}
          >
            {req.text}
          </span>
        </div>
      ))}
    </div>
  );
});

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
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("usuario@example.com");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const ConfirmationModal = useCallback(
    ({
      isOpen,
      onClose,
      onConfirm,
      title,
      message,
      children,
    }: ConfirmationModalProps) => (
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className={`p-6 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
          <h3
            className={`text-xl font-bold mb-4 ${
              isDarkMode ? "text-gray-100" : "text-gray-800"
            }`}
          >
            {title}
          </h3>
          <p
            className={`mb-6 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
          >
            {message}
          </p>
          {children}
          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg ${
                isDarkMode
                  ? "text-gray-300 hover:bg-gray-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-uniss-blue text-white rounded-lg hover:opacity-90"
            >
              Confirmar
            </button>
          </div>
        </div>
      </Modal>
    ),
    [isDarkMode]
  );

  const handlePasswordSubmit = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (newPassword !== confirmPassword) {
        throw new Error("Las contraseñas no coinciden");
      }

      setIsSuccess(true);
      setTimeout(() => {
        setShowPasswordForm(false);
        setIsSuccess(false);
      }, 2000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error desconocido"
      );
    } finally {
      setIsLoading(false);
    }
  }, [newPassword, confirmPassword]);

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
              enabled={twoFAEnabled}
              setEnabled={setTwoFAEnabled}
              isDarkMode={isDarkMode}
            />
          }
          isDarkMode={isDarkMode}
        />

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
            <div className="mt-4 space-y-4">
              <div>
                <label
                  className={`block mb-2 ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Nuevo correo electrónico
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className={`w-full p-3 rounded-lg border ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-gray-200"
                      : "bg-white border-gray-300 text-gray-800"
                  }`}
                />
              </div>
              <button
                onClick={() => setShowConfirmation(true)}
                className="px-4 py-2 bg-uniss-blue text-white rounded-lg hover:opacity-90"
              >
                Cambiar correo de respaldo
              </button>
            </div>
          )}
        </ConfigItem>

        {/* Cambiar contraseña */}
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
            <div className="mt-4 space-y-4">
              {isSuccess && (
                <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg">
                  ¡Contraseña cambiada exitosamente!
                </div>
              )}

              {errorMessage && (
                <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg">
                  {errorMessage}
                </div>
              )}

              <div>
                <label
                  className={`block mb-2 ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Contraseña actual
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={`w-full p-3 rounded-lg border ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-600 text-gray-200"
                        : "bg-white border-gray-300 text-gray-800"
                    }`}
                  />
                  <button
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-3.5"
                  >
                    {showCurrentPassword ? (
                      <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  className={`block mb-2 ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full p-3 rounded-lg border ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-600 text-gray-200"
                        : "bg-white border-gray-300 text-gray-800"
                    }`}
                  />
                  <button
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3.5"
                  >
                    {showNewPassword ? (
                      <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>
                <PasswordStrength password={newPassword} />
              </div>

              <div>
                <label
                  className={`block mb-2 ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Confirmar nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full p-3 rounded-lg border ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-600 text-gray-200"
                        : "bg-white border-gray-300 text-gray-800"
                    }`}
                  />
                  <button
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3.5"
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={handlePasswordSubmit}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-uniss-blue text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? "Procesando..." : "Cambiar contraseña"}
              </button>
            </div>
          )}
        </ConfigItem>

        {/* Modal de confirmación para correo */}
        <ConfirmationModal
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          onConfirm={() => {
            setCurrentEmail(newEmail);
            setShowConfirmation(false);
            setShowEmailForm(false);
          }}
          title="Confirmar cambio de correo"
          message={`¿Estás seguro de cambiar tu correo de respaldo a ${newEmail}?`}
        />
      </div>
    </div>
  );
}
