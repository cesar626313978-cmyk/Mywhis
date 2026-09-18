import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "60mb" }));

  // Audio transcription API endpoint with single voice or 2-voice conversation mode
  app.post("/api/transcribe", async (req, res) => {
    try {
      const { audioBase64, mimeType, mode, liveTranscript } = req.body;
      if (!audioBase64) {
        return res.status(400).json({ error: "Falta el archivo de audio para transcribir", text: "" });
      }

      const ai = getGenAI();
      if (!ai) {
        return res.status(503).json({ 
          error: "API key no disponible", 
          text: "" 
        });
      }

      const cleanMimeType = (mimeType || "audio/webm").split(";")[0];
      console.log(`[transcribe] Recibido audio (${cleanMimeType}), base64 length: ${audioBase64.length}, modo: ${mode}`);

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

      let response: any = null;
      const modelsToTry = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite"];
      
      for (const modelName of modelsToTry) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: { parts: [audioPart, { text: prompt }] },
          });
          if (response?.text !== undefined && response?.text !== null) {
            console.log(`[transcribe] Transcripción completada con ${modelName}`);
            break;
          }
        } catch (err: any) {
          console.warn(`[transcribe] Modelo ${modelName} falló:`, err?.message?.slice(0, 100));
        }
      }

      let transcription = (response?.text || "").trim();

      // Clean up brackets or silent flags
      if (
        transcription === "[SILENCIO]" ||
        transcription === "SILENCIO" ||
        transcription === "[silencio]" ||
        transcription === "..." ||
        transcription === "."
      ) {
        transcription = "";
      }

      console.log(`[transcribe] Texto final transcrito: "${transcription}"`);
      return res.json({ text: transcription });
    } catch (error: any) {
      console.error("Error in /api/transcribe:", error);
      return res.status(500).json({ 
        error: error.message || "Error al transcribir el audio", 
        text: "" 
      });
    }
  });

  // AI text enhancement endpoint: prepares text for sending/sharing (with dialogue support)
  app.post("/api/improve", async (req, res) => {
    const rawText = (req.body?.text || "").trim();
    const mode = req.body?.mode;
    try {
      if (!rawText) {
        return res.status(400).json({ error: "No hay texto para mejorar", text: "" });
      }

      const ai = getGenAI();
      if (!ai) {
        return res.status(503).json({ 
          error: "API key no disponible", 
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

      const improvedText = (response?.text || "").trim();
      return res.json({ text: improvedText || rawText });
    } catch (error: any) {
      console.error("Error in /api/improve:", error);
      return res.status(500).json({ 
        error: error.message || "Error al mejorar el texto", 
        text: rawText 
      });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Mywhis server running on http://0.0.0.0:${PORT}`);
  });
  server.setTimeout(300000); // 5 minutes timeout for long-duration audio uploads
}

startServer();
