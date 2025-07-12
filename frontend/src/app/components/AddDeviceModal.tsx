'use client';

import { useForm, SubmitHandler } from "react-hook-form";
import { Device } from "@/types";


import { zodResolver } from "@hookform/resolvers/zod";
import dynamic from "next/dynamic";
import { formatMAC } from "../utils/format";
import { deviceSchema } from "../validations/device";

// Carga diferida para iconos
const IconLoader = dynamic(() => import("../components/IconLoader"), {
  ssr: false
});

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDevice: (data: Device) => void;
  isDarkMode: boolean;
}

export default function AddDeviceModal({ 
  isOpen, 
  onClose, 
  onAddDevice,
  isDarkMode
}: AddDeviceModalProps) {
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isValid }, 
    reset,
    setValue,
    watch
  } = useForm<Device>({
    resolver: zodResolver(deviceSchema),
    mode: 'onChange',
    defaultValues: {
      type: 'phone',
      model: '',
      mac: ''
    }
  });

  const macValue = watch("mac");

  const onSubmit: SubmitHandler<Device> = (data) => {
    onAddDevice(data);
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className={`p-8 rounded-xl max-w-md w-full ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-device-title"
      >
        <h2 id="add-device-title" className="text-2xl font-bold mb-6">
          Agregar dispositivo
        </h2>
        <form 
          onSubmit={handleSubmit(onSubmit)} 
          className="space-y-6"
          aria-labelledby="add-device-title"
        >
          <div>
            <label htmlFor="deviceType" className="block text-lg font-medium mb-2">
              Tipo de dispositivo
            </label>
            <select
              id="deviceType"
              {...register("type")}
              className={`w-full p-3 text-lg rounded-xl border-2 ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
              aria-required="true"
            >
              <option value="phone">Teléfono</option>
              <option value="laptop">Laptop</option>
              <option value="tablet">Tablet</option>
              <option value="pc">Computadora</option>
            </select>
          </div>

          <div>
            <label htmlFor="deviceModel" className="block text-lg font-medium mb-2">
              Modelo
            </label>
            <input
              id="deviceModel"
              {...register("model")}
              className={`w-full p-3 text-lg rounded-xl border-2 ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
              placeholder="Ej: iPhone 12, Dell XPS 15"
              aria-required="true"
            />
            {errors.model && (
              <span className="text-red-500 text-base block mt-2" role="alert">
                {errors.model.message}
              </span>
            )}
          </div>

          <div>
            <label htmlFor="deviceMAC" className="block text-lg font-medium mb-2">
              Dirección MAC
            </label>
            <input
              id="deviceMAC"
              {...register("mac", {
                onChange: (e) => {
                  setValue("mac", formatMAC(e.target.value));
                }
              })}
              value={macValue || ""}
              placeholder="Formato: 00:1A:2B:3C:4D:5E"
              className={`w-full p-3 text-lg rounded-xl border-2 ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
              maxLength={17}
              aria-required="true"
            />
            {errors.mac && (
              <span className="text-red-500 text-base block mt-2" role="alert">
                {errors.mac.message}
              </span>
            )}
          </div>

          <div className="flex flex-col md:flex-row justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className={`px-6 py-3 rounded-xl text-lg ${
                isDarkMode
                  ? "text-gray-300 hover:bg-gray-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              aria-label="Cancelar"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className={`px-6 py-3 rounded-xl text-lg disabled:opacity-50 ${
                isDarkMode
                  ? "bg-uniss-gold text-gray-900 hover:bg-gray-100"
                  : "bg-uniss-blue text-white hover:bg-gray-700"
              } hover:opacity-90`}
              aria-label="Guardar dispositivo"
            >
              Guardar Dispositivo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}