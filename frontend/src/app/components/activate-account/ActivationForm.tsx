// src/app/components/activate-account/components/ActivationForm.tsx
import { UseFormRegister, UseFormHandleSubmit, FormState, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import Link from 'next/link';
import { ActivationFormData } from '@/app/(pages)/activate-account/page';

interface ActivationFormProps {
  register: UseFormRegister<ActivationFormData>;
  handleSubmit: UseFormHandleSubmit<ActivationFormData>;
  errors: FieldErrors<ActivationFormData>;
  setValue: UseFormSetValue<ActivationFormData>;
  watch: UseFormWatch<ActivationFormData>;
  onSubmit: (data: ActivationFormData) => void;
  isSubmitting: boolean;
}

export default function ActivationForm({
  register,
  handleSubmit,
  errors,
  setValue,
  watch,
  onSubmit,
  isSubmitting
}: ActivationFormProps) {
  const handleNumericInput = (field: keyof ActivationFormData, maxLength: number) => 
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const numericValue = e.target.value.replace(/\D/g, "").slice(0, maxLength);
      setValue(field, numericValue, { shouldValidate: true });
    };

  return (
    <div className="px-8 pb-8">
      <h1 className="text-2xl font-bold text-center text-gray-800 mt-6 mb-2">
        Activación de Cuenta Institucional
      </h1>
      <p className="text-center text-gray-600 mb-6">
        Ingrese los datos de su carnet de identidad para verificar su identidad
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Carnet de Identidad
          </label>
          <input
            {...register("carnet")}
            value={watch("carnet") || ""}
            onChange={handleNumericInput("carnet", 11)}
            placeholder="Ej: 01234567891"
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all bg-white text-gray-800 ${
              errors.carnet 
                ? "border-red-500 focus:ring-red-300" 
                : "border-gray-300 focus:ring-blue-400"
            }`}
            inputMode="numeric"
          />
          {errors.carnet && (
            <p className="text-red-500 text-xs mt-1">
              {errors.carnet.message}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tomo
            </label>
            <input
              {...register("tomo")}
              value={watch("tomo") || ""}
              onChange={handleNumericInput("tomo", 3)}
              placeholder="Ej: 213"
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all bg-white text-gray-800 ${
                errors.tomo 
                  ? "border-red-500 focus:ring-red-300" 
                  : "border-gray-300 focus:ring-blue-400"
              }`}
              inputMode="numeric"
            />
            {errors.tomo && (
              <p className="text-red-500 text-xs mt-1">
                {errors.tomo.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Folio
            </label>
            <input
              {...register("folio")}
              value={watch("folio") || ""}
              onChange={handleNumericInput("folio", 2)}
              placeholder="Ej: 21"
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all bg-white text-gray-800 ${
                errors.folio 
                  ? "border-red-500 focus:ring-red-300" 
                  : "border-gray-300 focus:ring-blue-400"
              }`}
              inputMode="numeric"
            />
            {errors.folio && (
              <p className="text-red-500 text-xs mt-1">
                {errors.folio.message}
              </p>
            )}
          </div>
        </div>
        {errors.root && (
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <p className="text-red-700 text-sm text-center">
              Lo sentimos, no hemos podido verificar sus datos. Por favor:
            </p>
            <ul className="text-red-700 text-sm mt-2 list-disc list-inside">
              <li>Verifique que haya proporcionado correctamente los datos de su carnet de identidad</li>
              <li>Es posible que aún no haya sido registrado en nuestro sistema</li>
            </ul>
          </div>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
              Verificando...
            </>
          ) : (
            "Validar Identidad"
          )}
        </button>
        <div className="text-center text-sm text-gray-600 pt-4 border-t border-gray-100">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </form>
    </div>
  );
}