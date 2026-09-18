import { GoogleGenAI } from "@google/genai";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
};

let aiClient: GoogleGenAI | null = null;
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

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

  try {
    if (!rawText) {
      return res.status(400).json({ error: "No hay texto para mejorar", text: "" });
    }

    const ai = getGenAI();
    if (!ai) {
      return res.status(503).json({ 
        error: "Falta configurar GEMINI_API_KEY en las variables de entorno de Vercel (Settings > Environment Variables)", 
        text: rawText 
      });
    }

    const isConversation = mode === 'conversation' || rawText.includes("Persona 1:") || rawText.includes("Persona 2:");

    const prompt = isConversation
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
      : `Eres el redactor y corrector de inteligencia artificial de Mywhis.
Tu misión es transformar este texto dictado por voz en un mensaje impecable, perfectamente redactado y listo para compartir por WhatsApp o correo.

REGLAS OBLIGATORIAS:
1. PUNTUACIÓN PERFECTA: Divide las oraciones largas en frases bien construidas con sus puntos (.) y comas (,). Añade signos de interrogación (¿?) o exclamación (¡!) donde sea natural.
2. ELIMINA PALABRAS REPETIDAS Y TARTAMUDEOS: Corrige duplicaciones involuntarias del habla (ej. "ya ya" -> "ya", "que que" -> "que", "cuando cuando" -> "cuando", "las las" -> "las", "los que los que" -> "los que", "no no" -> "no").
3. FLUIDEZ Y MULETILLAS: Suprime muletillas o frases enredadas manteniendo 100% fiel la idea original, todas las fechas, números (ej. 217 euros, 8 personas) y acuerdos.
4. FORMATO: Comienza con mayúscula, termina con punto. Si hay dos interlocutores ("Persona 1:", "Persona 2:"), mantén ese formato.
5. Devuelve ÚNICAMENTE el texto final resultante. NO agregues comillas, ni títulos, ni "Aquí tienes el texto corregido:".

Texto a mejorar:
"""${rawText}"""`;

    let response: any = null;
    const modelsToTry = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite"];
    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });
        if (response?.text) break;
      } catch (err: any) {
        console.warn(`[improve] Modelo ${modelName} falló:`, err?.message?.slice(0, 100));
      }
    }

    const improved = (response?.text || "").trim();
    if (!improved) {
      return res.status(500).json({ 
        error: "No se pudo obtener respuesta de Gemini. Verifica tu clave GEMINI_API_KEY.", 
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
