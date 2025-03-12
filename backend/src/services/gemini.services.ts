// src/api/services/gemini.service.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

// Configuración inicial
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const askGemini = async (prompt: string): Promise<string> => {
  try {
    // Elige el modelo correcto (gemini-1.5-flash o gemini-1.0-pro)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash" // Modelo actualizado
    });

    const result = await model.generateContent(prompt);
    return result.response.text();
    
  } catch (error) {
    const errorMessage = (error as Error).message || "Error desconocido";
    throw new Error(`Error en Gemini: ${errorMessage}`);
  }
};