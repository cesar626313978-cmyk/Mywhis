import { GoogleGenAI } from "@google/genai";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
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

  try {
    const { audioBase64, mimeType, mode, liveTranscript } = req.body || {};
    if (!audioBase64) {
      return res.status(400).json({ error: "Falta el archivo de audio para transcribir", text: "" });
    }

    const rawKey = process.env.GEMINI_API_KEY || "";
    const apiKey = rawKey.trim().replace(/^["']|["']$/g, "");

    if (!apiKey) {
      return res.status(503).json({ 
        error: "Falta configurar GEMINI_API_KEY en Vercel (Settings > Environment Variables)", 
        text: "" 
      });
    }

    const cleanMimeType = (mimeType || "audio/webm").split(";")[0];

    const audioPart = {
      inlineData: {
        mimeType: cleanMimeType,
        data: audioBase64,
      },
    };

    const isConversation = mode === 'conversation';
    const hint = liveTranscript ? `\nReferencia del habla detectada en vivo: "${liveTranscript}"` : '';

    const prompt = isConversation
      ? `Eres el transcriptor inteligente y separador de hablantes de Mywhis.
En este audio conversan dos personas en español.
REGLAS:
1. Transcribe fielmente lo que dice cada persona con puntuación correcta (comas, puntos, signos ¿?, ¡!).
2. Separa las intervenciones usando exactamente:
Persona 1: [frase dicha]
Persona 2: [frase dicha]
3. Elimina tartamudeos y repeticiones accidentales (ej. "ya ya" -> "ya", "que que" -> "que").
4. Si solo habla una persona, transcríbela normalmente sin etiquetas.
5. Devuelve ÚNICAMENTE la transcripción final sin preámbulos ni notas explicativas. Si no hay ninguna voz humana inteligible, responde únicamente: ""${hint}`
      : `Eres el transcriptor de voz a texto de Mywhis.
Transcribe con total fidelidad el audio en español dejando un texto limpio, fluido y listo para enviar.
REGLAS:
1. PUNTUACIÓN Y ORTOGRAFÍA: Añade puntos para separar las ideas y comas para las pausas naturales. Mayúscula inicial, punto final.
2. ELIMINA REPETICIONES Y TARTAMUDEOS: Si la persona repite palabras al hablar (ej: "ya ya está" -> "ya está", "que que" -> "que", "cuando cuando" -> "cuando", "las las" -> "las", "los que los que" -> "los que", "no no" -> "no"), déjala una sola vez.
3. Si detectas claramente una conversación entre dos personas, usa "Persona 1:" y "Persona 2:".
4. Devuelve ÚNICAMENTE el texto transcrito sin comillas ni explicaciones adicionales. Si no hay ninguna voz humana inteligible en la grabación, responde únicamente: ""${hint}`;

    let transcription = "";
    let lastError = "";

    // 1. Intento principal con SDK oficial
    try {
      const ai = new GoogleGenAI({ apiKey });
      const modelsToTry = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite"];
      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts: [audioPart, { text: prompt }] },
          });
          if (response?.text !== undefined && response?.text !== null) {
            transcription = response.text.trim();
            break;
          }
        } catch (err: any) {
          lastError = err?.message || String(err);
          console.warn(`[transcribe-sdk] ${modelName} falló:`, lastError);
        }
      }
    } catch (sdkErr: any) {
      lastError = sdkErr?.message || String(sdkErr);
    }

    // 2. Fallback directo REST
    if (!transcription) {
      const restModels = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite"];
      for (const m of restModels) {
        try {
          const restRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(apiKey)}`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey
            },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { inline_data: { mime_type: cleanMimeType, data: audioBase64 } },
                  { text: prompt }
                ]
              }]
            })
          });
          const restData = await restRes.json();
          if (restRes.ok && restData.candidates?.[0]?.content?.parts?.[0]?.text) {
            transcription = restData.candidates[0].content.parts[0].text.trim();
            break;
          } else if (restData.error?.message) {
            lastError = restData.error.message;
          }
        } catch (fetchErr: any) {
          lastError = fetchErr?.message || String(fetchErr);
        }
      }
    }

    if (
      transcription === "[SILENCIO]" ||
      transcription === "SILENCIO" ||
      transcription === "[silencio]" ||
      transcription === "..." ||
      transcription === "."
    ) {
      transcription = "";
    }

    if (!transcription && lastError) {
      return res.status(500).json({ 
        error: `Error Gemini: ${lastError}`, 
        text: "" 
      });
    }

    return res.status(200).json({ text: transcription });
  } catch (error: any) {
    console.error("Error in Vercel /api/transcribe:", error);
    return res.status(500).json({ 
      error: error.message || "Error al transcribir el audio", 
      text: "" 
    });
  }
}
