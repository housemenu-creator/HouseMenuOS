import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_NANOBANANA_API_KEY;
const MODEL_NAME = import.meta.env.VITE_NANOBANANA_MODEL || "gemini-3-pro-image-preview";

const genAI = new GoogleGenerativeAI(API_KEY);

export const nanoBananaService = {
  /**
   * Generates an image using the NanoBanana (Gemini) API.
   * @param prompt The descriptive text for the image.
   * @param options Additional generation options.
   */
  generateImage: async (prompt: string, options: { aspect_ratio?: string } = {}) => {
    try {
      if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE") {
        throw new Error("API Key no configurada. Por favor, añádela al archivo .env como VITE_NANOBANANA_API_KEY.");
      }

      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      
      // Attempt generation
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      // Note: This logic might need to be adapted based on the exact API response for images.
      // Some versions return a part with mimeType 'image/png' and data (base64).
      const textResponse = response.text();
      
      if (!textResponse) {
        throw new Error("La API no devolvió contenido. Verifica tu cuota o el prompt.");
      }

      return textResponse; 
    } catch (error: any) {
      console.error("Error en NanoBananaService:", error);
      
      // Friendly error mapping
      if (error.message?.includes("API_KEY_INVALID")) {
        throw new Error("La clave API de NanoBanana no es válida.");
      }
      if (error.message?.includes("quota")) {
        throw new Error("Has agotado la cuota de generación de imágenes por hoy.");
      }
      
      throw new Error(error.message || "Fallo crítico en el servicio de IA.");
    }
  }
};
