"use client";

import { useState, useEffect, useRef } from "react";
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
import ChevronDownIcon from "@heroicons/react/24/outline/ChevronDownIcon";

// Prefijo para URLs de la API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Frases de José Martí sobre educación - Mezcla de frases para todos
const MARTI_PHRASES = [
  "Educar es depositar en cada hombre toda la obra humana que le ha antecedido: es hacer a cada hombre resumen del mundo viviente, hasta el día en que vive.",
  "El pueblo más feliz es el que tenga mejor educados a sus hijos, en la instrucción del pensamiento y en la dirección de los sentimientos.",
  "Ser bueno es el único modo de ser dichoso. Ser culto es el único modo de ser libre.",
  "La educación ha de ser desde la cuna, si se quiere que sea de provecho duradero y de raíces hondas.",
  "Los jóvenes deben ir a las universidades a aprender los elementos de los conocimientos que han de poner en práctica para el bien de su país.",
  "Leer es andar, meditar es llegar. El estudio es el trabajo del pensamiento, y la educación es la formación del carácter.",
  "La libertad cuesta muy cara, y es necesario, o resignarse a vivir sin ella, o decidirse a comprarla por su precio."
];

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
  
  // Estados para el efecto máquina de escribir
  const [displayText, setDisplayText] = useState("");
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Estado para controlar la visibilidad de la flecha
  const [showScrollArrow, setShowScrollArrow] = useState(false);
  
  const formRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Efecto para el texto de José Martí con animación de máquina de escribir
  useEffect(() => {
    const currentPhrase = MARTI_PHRASES[currentPhraseIndex];
    
    if (!isPaused && !isDeleting && displayText === currentPhrase) {
      // Pausa antes de empezar a borrar
      setIsPaused(true);
      setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, 3000);
      return;
    }
    
    if (!isPaused && isDeleting && displayText === "") {
      // Cambiar a la siguiente frase
      setIsDeleting(false);
      setCurrentPhraseIndex((prev) => (prev + 1) % MARTI_PHRASES.length);
      return;
    }

    const timeout = setTimeout(() => {
      if (isDeleting) {
        setDisplayText(currentPhrase.substring(0, displayText.length - 1));
      } else {
        setDisplayText(currentPhrase.substring(0, displayText.length + 1));
      }
    }, isDeleting ? 30 : 40);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentPhraseIndex, isPaused]);

  // Efecto para controlar la visibilidad de la flecha según el scroll
  useEffect(() => {
    const handleScroll = () => {
      // Mostrar flecha solo cuando está en la parte superior (cerca del top)
      setShowScrollArrow(window.scrollY < 100);
    };

    window.addEventListener('scroll', handleScroll);
    // Verificar posición inicial
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Función para desplazarse al final de la página
  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  };

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
    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(estudiante\.)?uniss\.edu\.cu$/;
    const USERNAME_REGEX = /^[a-zA-Z0-9]{4,20}$/;

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

      localStorage.setItem("authToken", data.accessToken);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4 relative">
      {/* Flecha animada para desplazarse - Esquina inferior derecha */}
      {showScrollArrow && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-8 right-8 bg-uniss-blue text-white p-3 rounded-full shadow-2xl hover:bg-blue-700 transition-all duration-300 z-40"
          aria-label="Desplazarse al final de la página"
          style={{ animation: "bounce 2s infinite" }}
        >
          <ChevronDownIcon className="h-5 w-5" />
        </button>
      )}

      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-blue-100 mt-4">
        {/* Columna Izquierda - Información */}
        <div className="bg-gradient-to-br from-uniss-blue to-blue-700 p-8 md:p-12 md:w-2/5 flex flex-col justify-center items-center text-center text-white relative overflow-hidden">
          {/* Elementos decorativos de fondo */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full"></div>
            <div className="absolute bottom-20 right-10 w-16 h-16 bg-white rounded-full"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white rounded-full"></div>
          </div>
          
          <div className="relative z-10 w-full">
            <div className="mb-8 transform hover:scale-105 transition-transform duration-300">
              <div className="bg-white p-4 rounded-2xl shadow-lg inline-block">
                <Image
                  src="/uniss-logo.png"
                  alt="Logo de UNISS - Universidad de Sancti Spíritus"
                  width={140}
                  height={140}
                  priority
                  quality={100}
                  className="object-contain"
                />
              </div>
            </div>

            <div className="space-y-6">
              <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                Sistema de Credenciales <span className="text-blue-200">UNISS</span>
              </h1>
              
              {/* Texto animado con frases de José Martí */}
              <div className="min-h-[120px] flex items-center justify-center">
                <div className="bg-blue-600 bg-opacity-30 rounded-xl p-4 border border-blue-400 border-opacity-30">
                  <p className="text-lg md:text-xl leading-relaxed text-blue-100 text-left italic">
                    "{displayText}"
                    <span className="ml-1 inline-block w-0.5 h-6 bg-blue-200 animate-pulse"></span>
                  </p>
                  <p className="text-right text-blue-200 text-sm mt-2">— José Martí</p>
                </div>
              </div>
              
              <div className="mt-4 space-y-4 text-left max-w-xs mx-auto">
                <div className="flex items-start gap-3 p-3 bg-blue-600 bg-opacity-30 rounded-lg">
                  <IdentificationIcon className="h-7 w-7 text-blue-200 mt-0.5 flex-shrink-0" />
                  <span className="text-lg">Acceso seguro</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-600 bg-opacity-30 rounded-lg">
                  <LockClosedIcon className="h-7 w-7 text-blue-200 mt-0.5 flex-shrink-0" />
                  <span className="text-lg">Protección de datos</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-600 bg-opacity-30 rounded-lg">
                  <UserCircleIcon className="h-7 w-7 text-blue-200 mt-0.5 flex-shrink-0" />
                  <span className="text-lg">Interfaz accesible e intuitiva</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha - Formulario */}
        <div ref={formRef} className="p-8 md:p-12 md:w-3/5 flex flex-col justify-center bg-white">
          <div className="max-w-md mx-auto w-full">
            <div className="mb-8 text-center md:text-left">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Iniciar Sesión
              </h2>
              <p className="text-xl text-gray-600">
                Ingrese sus credenciales institucionales
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-7"
              aria-label="Formulario de inicio de sesión"
            >
              {/* ... (mantener igual el resto del formulario) ... */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-xl font-semibold text-gray-800 mb-4"
                >
                  <span className="text-red-500 text-2xl">*</span> Usuario o Correo Institucional
                </label>
                <div className="relative">
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ej: usuario123 o nombre@uniss.edu.cu"
                    className={`w-full p-5 text-lg border-3 ${
                      errors.username ? "border-red-400 bg-red-50" : "border-gray-300 hover:border-blue-400"
                    } rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-white shadow-md hover:shadow-lg`}
                    aria-required="true"
                    aria-invalid={!!errors.username}
                    aria-describedby={
                      errors.username ? "username-error" : undefined
                    }
                    style={{ fontSize: '18px' }}
                  />
                  {errors.username && (
                    <p
                      id="username-error"
                      className="text-red-600 text-lg mt-3 font-medium flex items-center gap-2"
                      role="alert"
                    >
                      <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                      {errors.username}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xl font-semibold text-gray-800 mb-4"
                >
                  <span className="text-red-500 text-2xl">*</span> Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full p-5 text-lg border-3 ${
                      errors.password ? "border-red-400 bg-red-50" : "border-gray-300 hover:border-blue-400"
                    } rounded-xl pr-16 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-white shadow-md hover:shadow-lg`}
                    aria-required="true"
                    aria-invalid={!!errors.password}
                    aria-describedby={
                      errors.password ? "password-error" : undefined
                    }
                    style={{ fontSize: '18px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 bottom-5 text-gray-500 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-7 w-7" aria-hidden="true" />
                    ) : (
                      <EyeIcon className="h-7 w-7" aria-hidden="true" />
                    )}
                  </button>
                  {errors.password && (
                    <p
                      id="password-error"
                      className="text-red-600 text-lg mt-3 font-medium flex items-center gap-2"
                      role="alert"
                    >
                      <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                      {errors.password}
                    </p>
                  )}
                </div>
              </div>

              {errors.general && (
                <div
                  className="bg-red-50 p-5 rounded-xl border-2 border-red-200 shadow-md"
                  role="alert"
                >
                  <p className="text-red-700 text-lg text-center font-semibold flex items-center justify-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    {errors.general}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-uniss-blue to-blue-600 text-white py-5 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-bold text-xl flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none disabled:hover:shadow-lg"
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <ArrowPathIcon
                      className="h-7 w-7 animate-spin"
                      aria-hidden="true"
                    />
                    Verificando credenciales...
                  </>
                ) : (
                  <>
                    <LockClosedIcon className="h-6 w-6" />
                    Iniciar Sesión
                  </>
                )}
              </button>

              <div className="mt-10 space-y-6">
                <div className="text-center">
                  <Link
                    href="/forgot-password"
                    prefetch={false}
                    className="text-blue-700 hover:text-blue-900 text-xl font-semibold underline transition-colors"
                    aria-label="Recuperar contraseña"
                  >
                    ¿No recuerda su contraseña o su ceunta a expirado, click aqui?
                  </Link>
                </div>

                <div className="relative" aria-hidden="true">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-6 text-gray-500 text-xl font-medium">o</span>
                  </div>
                </div>

                <Link
                  href="/activate-account"
                  prefetch={false}
                  className="w-full inline-block text-center bg-white text-gray-800 py-5 rounded-xl hover:bg-gray-50 transition-all duration-300 font-semibold text-xl border-3 border-dashed border-blue-200 hover:border-blue-300 shadow-md hover:shadow-lg"
                  aria-label="Solicitar credenciales"
                >
                  <div className="flex items-center justify-center gap-3">
                    <UserCircleIcon className="h-6 w-6" />
                    Solicitar credenciales
                  </div>
                </Link>
              </div>
            </form>

            {/* Información de ayuda */}
            <div className="mt-12 p-5 bg-blue-50 rounded-xl border border-blue-200 shadow-sm">
              <p className="text-lg text-blue-800 text-center font-medium">
                <strong>¿Necesita ayuda?</strong> Contacte al departamento de TI de UNISS
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos para la flecha animada */}
      <style jsx>{`
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-5px);
          }
          60% {
            transform: translateY(-3px);
          }
        }
      `}</style>
    </div>
  );
}