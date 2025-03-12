import { NextFunction, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const geminiController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { text } = req.body;
    
    if (!text?.trim()) {
      res.status(400).json({ error: 'Texto requerido' });
      return;
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { maxOutputTokens: 1000 }
    });

    const result = await model.generateContent(text);
    const response = await result.response;

    res.json({ text: response.text() });

  } catch (error: any) {
    console.error('Error en Gemini:', error);
    res.status(500).json({ 
      error: error.message || 'Error interno del servidor',
      details: error.response?.data?.error
    });
  }
};