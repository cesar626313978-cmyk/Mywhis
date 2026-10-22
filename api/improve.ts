import { GoogleGenAI } from "@google/genai";
import { 
  DEFAULT_GENERAL_PROMPT, 
  DEFAULT_EMAIL_PROMPT, 
  DEFAULT_SOCIAL_PROMPT, 
  DEFAULT_PROMPT_BUILDER_PROMPT 
} from "../src/data/defaultPrompt";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido', text: '' });
  }

  const rawText = (req.body?.text || "").trim();
  const mode = req.body?.mode;
  const improveType = req.body?.improveType || req.body?.option;
  const customPrompt = (req.body?.customPrompt || "").trim();

  try {
    if (!rawText) {
      return res.status(400).json({ error: "No hay texto para mejorar", text: "" });
    }

    const rawKey = process.env.GEMINI_API_KEY || "";
    const apiKey = rawKey.trim().replace(/^["']|["']$/g, "");

    if (!apiKey) {
      return res.status(503).json({ 
        error: "Falta configurar GEMINI_API_KEY en Vercel (Settings > Environment Variables)", 
        text: rawText 
      });
    }

    const isConversation = mode === 'conversation' || rawText.includes("Persona 1:") || rawText.includes("Persona 2:");

    let prompt = "";
    if (customPrompt) {
      if (customPrompt.includes("{TEXTO}") || customPrompt.includes("{texto}")) {
        prompt = customPrompt.replace(/\{TEXTO\}|\{texto\}/g, rawText);
      } else {
        prompt = `${customPrompt}\n\nTexto a mejorar:\n"""${rawText}"""`;
      }
    } else if (improveType === 'email') {
      prompt = `${DEFAULT_EMAIL_PROMPT}\n\nTexto a mejorar:\n"""${rawText}"""`;
    } else if (improveType === 'social') {
      prompt = `${DEFAULT_SOCIAL_PROMPT}\n\nTexto a mejorar:\n"""${rawText}"""`;
    } else if (improveType === 'prompt') {
      prompt = `${DEFAULT_PROMPT_BUILDER_PROMPT}\n\nTexto a mejorar:\n"""${rawText}"""`;
    } else {
      prompt = isConversation
        ? `Eres el redactor experto de Mywhis para conversaciones.
Pule el siguiente diálogo para dejarlo impecable, perfectamente redactado y listo para compartir.

REGLAS OBLIGATORIAS:
1. Mantén la separación de las dos personas:
Persona 1: [frase mejorada]
Persona 2: [frase mejorada]
2. Puntuación perfecta: añade puntos, comas, signos de interrogación (¿?) y admiración (¡!).
3. Elimina tartamudeos y palabras repetidas accidentalmente (ej. "que que", "ya ya", "las las").
4. Elimina muletillas vacías conservando intacto el sentido de la charla y todos los datos.
5. Devuelve ÚNICAMENTE el diálogo final, sin introducciones ni notas.

Texto a mejorar:
"""${rawText}"""`
        : `${DEFAULT_GENERAL_PROMPT}\n\nTexto a mejorar:\n"""${rawText}"""`;
    }

    let improved = "";
    let lastError = "";

    // 1. Intento principal con SDK oficial
    try {
      const ai = new GoogleGenAI({ apiKey });
      const modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3.6-flash"];
      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
          });
          if (response?.text) {
            improved = response.text.trim();
            break;
          }
        } catch (err: any) {
          lastError = err?.message || String(err);
          console.warn(`[improve-sdk] ${modelName} falló:`, lastError);
        }
      }
    } catch (sdkErr: any) {
      lastError = sdkErr?.message || String(sdkErr);
    }

    // 2. Fallback REST directo (soporta claves AQ. directamente vía HTTP)
    if (!improved) {
      const restModels = ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3.6-flash"];
      for (const m of restModels) {
        try {
          const restRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(apiKey)}`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          });
          const restData = await restRes.json();
          if (restRes.ok && restData.candidates?.[0]?.content?.parts?.[0]?.text) {
            improved = restData.candidates[0].content.parts[0].text.trim();
            break;
          } else if (restData.error?.message) {
            lastError = restData.error.message;
          }
        } catch (fetchErr: any) {
          lastError = fetchErr?.message || String(fetchErr);
        }
      }
    }

    if (!improved) {
      return res.status(500).json({ 
        error: lastError ? `Error Gemini: ${lastError}` : "No se pudo obtener respuesta de Gemini. Verifica tu clave GEMINI_API_KEY.", 
        text: rawText 
      });
    }

    return res.status(200).json({ text: improved });
  } catch (error: any) {
    console.error("Error in Vercel /api/improve:", error);
    return res.status(500).json({ 
      error: error.message || "Error al procesar con IA", 
      text: rawText 
    });
  }
}
