"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Importar solo los iconos necesarios para reducir el tamaño del paquete
import EyeIcon from "@heroicons/react/24/outline/EyeIcon";
import EyeSlashIcon from "@heroicons/react/24/outline/EyeSlashIcon";
import ArrowPathIcon from "@heroicons/react/24/outline/ArrowPathIcon";
import UserCircleIcon from "@heroicons/react/24/outline/UserCircleIcon";
import IdentificationIcon from "@heroicons/react/24/outline/IdentificationIcon";
import LockClosedIcon from "@heroicons/react/24/outline/LockClosedIcon";

// Prefijo para URLs de la API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
    general?: string;
  }>({});

  // Expresiones regulares para validación
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(estudiante\.)?uniss\.edu\.cu$/;
  const USERNAME_REGEX = /^[a-zA-Z0-9]{4,20}$/;

  const router = useRouter();

  // Prefetch estratégico de rutas
  useEffect(() => {
    const handleInteraction = () => {
      router.prefetch("/dashboard");
      window.removeEventListener("mousedown", handleInteraction);
    };

    window.addEventListener("mousedown", handleInteraction);

    return () => window.removeEventListener("mousedown", handleInteraction);
  }, [router]);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (username.includes("@")) {
      if (!EMAIL_REGEX.test(username)) {
        newErrors.username = "Correo institucional inválido";
      }
    } else {
      if (!USERNAME_REGEX.test(username)) {
        newErrors.username = "Usuario inválido (4-20 caracteres alfanuméricos)";
      }
    }

    if (password.length < 8) {
      newErrors.password = "La contraseña debe tener al menos 8 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error en la autenticación");
      }

      // Guardar token en localStorage
      localStorage.setItem("authToken", data.accessToken);

      // Redirigir al dashboard
      router.push("/dashboard");
    } catch (error: any) {
      let errorMessage = "Error de conexión";

      if (error.name === "AbortError") {
        errorMessage = "La solicitud tardó demasiado";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setErrors({ general: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-lg overflow-hidden flex flex-col md:flex-row">
        {/* Columna Izquierda - Información */}
        <div className="bg-uniss-blue p-8 md:p-12 md:w-1/2 flex flex-col justify-center items-center text-center">
          <div className="mb-8">
            <Image
              src="/uniss-logo.png"
              alt="Logo de UNISS - Universidad de Sancti Spíritus"
              width={160}
              height={160}
              priority
              quality={85}
              className="object-contain mx-auto"
            />
          </div>

          <div className="space-y-4 text-white">
            <h1 className="text-3xl font-bold">
              Bienvenido al Sistema de Credenciales UNISS
            </h1>
            <p className="text-xl leading-relaxed">
              Sistema integral para la visualización de credenciales académica y
              vinculación de dispositivos institucionales
            </p>
            <div className="mt-6 space-y-2 text-left">
              <div className="flex items-center gap-2">
                <IdentificationIcon
                  className="h-6 w-6 text-white"
                  aria-hidden="true"
                />
                <span>Acceso seguro y personalizado</span>
              </div>
              <div className="flex items-center gap-2">
                <LockClosedIcon
                  className="h-6 w-6 text-white"
                  aria-hidden="true"
                />
                <span>Protección de datos garantizada</span>
              </div>
              <div className="flex items-center gap-2">
                <UserCircleIcon
                  className="h-6 w-6 text-white"
                  aria-hidden="true"
                />
                <span>Simple y sencillo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha - Formulario */}
        <div className="p-8 md:p-12 md:w-1/2 flex flex-col justify-center">
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            aria-label="Formulario de inicio de sesión"
          >
            <div>
              <label
                htmlFor="username"
                className="block text-lg font-semibold text-gray-800 mb-3"
              >
                <span className="text-blue-700">*</span> Usuario o Correo
              </label>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej: usuario123 o nombre@uniss.edu.cu"
                  className={`w-full p-4 text-lg border-2 ${
                    errors.username ? "border-red-500" : "border-gray-300"
                  } rounded-lg focus:ring-4 focus:ring-blue-200 focus:border-blue-500`}
                  aria-required="true"
                  aria-invalid={!!errors.username}
                  aria-describedby={
                    errors.username ? "username-error" : undefined
                  }
                />
                {errors.username && (
                  <p
                    id="username-error"
                    className="text-red-600 text-sm mt-2"
                    role="alert"
                  >
                    {errors.username}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-lg font-semibold text-gray-800 mb-3"
              >
                <span className="text-blue-700">*</span> Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full p-4 text-lg border-2 ${
                    errors.password ? "border-red-500" : "border-gray-300"
                  } rounded-lg pr-12 focus:ring-4 focus:ring-blue-200 focus:border-blue-500`}
                  aria-required="true"
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 bottom-4 text-gray-600 hover:text-blue-700"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-6 w-6" aria-hidden="true" />
                  ) : (
                    <EyeIcon className="h-6 w-6" aria-hidden="true" />
                  )}
                </button>
                {errors.password && (
                  <p
                    id="password-error"
                    className="text-red-600 text-sm mt-2"
                    role="alert"
                  >
                    {errors.password}
                  </p>
                )}
              </div>
            </div>

            {errors.general && (
              <div
                className="bg-red-50 p-3 rounded-lg border border-red-200"
                role="alert"
              >
                <p className="text-red-700 text-center font-medium">
                  ⚠️ {errors.general}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-uniss-blue text-white py-4 rounded-lg hover:bg-uniss-green transition-all font-semibold text-lg flex items-center justify-center gap-2 shadow-md"
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <ArrowPathIcon
                    className="h-6 w-6 animate-spin"
                    aria-hidden="true"
                  />
                  Verificando...
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </button>

            <div className="mt-8 space-y-4">
              <div className="text-center">
                <Link
                  href="/forgot-password"
                  prefetch={false}
                  className="text-blue-700 hover:text-blue-900 text-lg font-medium underline"
                  aria-label="Recuperar contraseña"
                >
                  ¿No recuerda su contraseña?
                </Link>
              </div>

              <div className="relative" aria-hidden="true">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-gray-500 text-lg">o</span>
                </div>
              </div>

              <Link
                href="/activate-account"
                prefetch={false}
                className="w-full inline-block text-center bg-gray-100 text-gray-800 py-4 rounded-lg hover:bg-gray-200 transition-all font-semibold text-lg border-2 border-dashed border-gray-300"
                aria-label="Solicitar credenciales"
              >
                Solicitar credenciales
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
