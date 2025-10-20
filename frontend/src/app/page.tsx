"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EyeIcon, EyeSlashIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

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
  
  const router = useRouter();
  const submissionRef = useRef(false); // Referencia para evitar múltiples envíos

  // Efecto para limpiar el estado de envío cuando el componente se desmonte
  useEffect(() => {
    return () => {
      setIsSubmitting(false);
      submissionRef.current = false;
    };
  }, []);

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (!username.trim()) {
      newErrors.username = "El usuario es requerido";
    }
    
    if (!password) {
      newErrors.password = "La contraseña es requerida";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Evitar múltiples envíos simultáneos
    if (submissionRef.current) {
      return;
    }

    if (!validateForm()) return;

    setIsSubmitting(true);
    submissionRef.current = true;
    setErrors({}); // Limpiar errores anteriores

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // El backend ya nos da mensajes específicos
        throw new Error(data.message || "Error en la autenticación");
      }

      localStorage.setItem("authToken", data.accessToken);
      
      // ✅ MANTENER EL ESTADO DE CARGA HASTA QUE LA NAVEGACIÓN SE COMPLETE
      console.log("✅ Login exitoso, redirigiendo al dashboard...");
      
      // Usar replace en lugar de push para evitar que el usuario vuelva atrás
      router.replace("/dashboard");
      
      // ✅ NO RESTABLECER isSubmitting - se mantendrá cargando hasta que la página cambie
      // El estado se limpiará cuando el componente se desmonte durante la navegación
      
    } catch (error: any) {
      // ✅ SOLO RESTABLECER EN CASO DE ERROR
      setIsSubmitting(false);
      submissionRef.current = false;
      
      let errorMessage = "Error de conexión";

      if (error.name === "AbortError") {
        errorMessage = "La solicitud tardó demasiado";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setErrors({ general: errorMessage });
    }
    
    // ✅ NO USAR finally - queremos mantener el estado de carga en éxito
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl flex flex-col md:flex-row">
        {/* Columna Izquierda - Información */}
        <div className="md:w-2/5 flex flex-col justify-center items-start p-8 md:p-7">
          <div className="flex items-center gap-6 mb-12">
            <div className="bg-white p-2 rounded-xl shadow-lg">
              <Image
                src="/uniss-logo.png"
                alt="Logo UNISS"
                width={150}
                height={150}
                priority
                className="object-contain"
              />
            </div>
            <div className="h-20 w-px bg-gray-800"></div>
            <div>
              <h1 className="text-4xl font-bold text-uniss-blue leading-tight">
                Credenciales UNISS
              </h1>
            </div>
          </div>

          <div className="space-y-8">
            <p className="text-gray-700 text-2xl leading-relaxed font-light">
              Sistema centralizado para la gestión y administración de credenciales 
              institucionales de la Universidad de Sancti Spíritus.
            </p>
          </div>
        </div>

        {/* Columna Derecha - Formulario */}
        <div className="md:w-3/5 flex flex-col justify-center p-8 md:p-12">
          <div className="max-w-md w-full mx-auto">
            <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Campo Usuario */}
                <div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Usuario o correo institucional"
                    disabled={isSubmitting}
                    className={`w-full p-4 text-lg border ${
                      errors.username ? "border-red-500" : "border-gray-300"
                    } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed`}
                    aria-required="true"
                    aria-invalid={!!errors.username}
                  />
                  {errors.username && (
                    <p className="text-red-600 text-base mt-2" role="alert">
                      {errors.username}
                    </p>
                  )}
                </div>

                {/* Campo Contraseña */}
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña"
                    disabled={isSubmitting}
                    className={`w-full p-4 text-lg border ${
                      errors.password ? "border-red-500" : "border-gray-300"
                    } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-gray-50 pr-12 disabled:opacity-50 disabled:cursor-not-allowed`}
                    aria-required="true"
                    aria-invalid={!!errors.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-6 w-6" />
                    ) : (
                      <EyeIcon className="h-6 w-6" />
                    )}
                  </button>
                  {errors.password && (
                    <p className="text-red-600 text-base mt-2" role="alert">
                      {errors.password}
                    </p>
                  )}
                </div>

                {errors.general && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200" role="alert">
                    <p className="text-red-700 text-base text-center">
                      {errors.general}
                    </p>
                  </div>
                )}

                {/* Botón Iniciar Sesión */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-uniss-blue text-white py-4 rounded-lg font-bold text-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-300"
                >
                  {isSubmitting ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      Iniciando sesión...
                    </>
                  ) : (
                    "Iniciar Sesión"
                  )}
                </button>

                {/* Enlace Olvidó Contraseña */}
                <div className="text-center pt-4">
                  <Link
                    href="/forgot-password"
                    className={`text-uniss-blue hover:text-blue-700 text-lg font-medium transition-colors ${
                      isSubmitting ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    ¿Olvidó o expiró su contraseña?
                  </Link>
                </div>

                {/* Separador */}
                <div className="relative py-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-gray-500 text-lg">o</span>
                  </div>
                </div>

                {/* Botón Solicitar Credenciales */}
                <Link
                  href="/activate-account"
                  className={`w-full inline-block text-center bg-green-600 text-white py-4 rounded-lg font-bold text-xl hover:bg-green-700 shadow-md hover:shadow-lg transition-all duration-300 ${
                    isSubmitting ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  Solicitar Credenciales
                </Link>
              </form>
            </div>

            {/* Información de ayuda */}
            <div className="mt-10 text-center">
              <p className="text-gray-500 text-lg">
                ¿Necesita ayuda? Contacte al departamento de TI de UNISS
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}