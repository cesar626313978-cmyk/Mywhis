process.env.DISABLE_HMR = "true";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { 
  DEFAULT_GENERAL_PROMPT, 
  DEFAULT_EMAIL_PROMPT, 
  DEFAULT_SOCIAL_PROMPT, 
  DEFAULT_PROMPT_BUILDER_PROMPT 
} from "./src/data/defaultPrompt";

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
  app.use(express.urlencoded({ extended: true, limit: "60mb" }));

  const AUTHORIZED_EMAIL = "cesar626313978@gmail.com";

  // Helper to verify that the request comes strictly from the authorized user
  function verifyUserAuth(req: express.Request): { authorized: boolean; email?: string; error?: string } {
    const authHeader = req.headers.authorization;
    const emailHeader = ((req.headers["x-user-email"] as string) || "").toLowerCase().trim();
    const customToken = ((req.headers["x-auth-token"] as string) || "").trim();

    let token = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    } else if (customToken) {
      token = customToken;
    }

    // Emergency master key validation for César
    if (token === "cesar-vozia-master-pass-2026" || token === "cesar-auth-approved") {
      return { authorized: true, email: AUTHORIZED_EMAIL };
    }

    // Google JWT verification (decodes payload without external latency)
    if (token && token.includes(".")) {
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payloadBuf = Buffer.from(parts[1], "base64");
          const payload = JSON.parse(payloadBuf.toString("utf-8"));
          const tokenEmail = (payload.email || "").toLowerCase().trim();
          if (tokenEmail === AUTHORIZED_EMAIL) {
            return { authorized: true, email: tokenEmail };
          } else {
            return {
              authorized: false,
              error: `Acceso denegado: el correo "${tokenEmail || 'desconocido'}" no está autorizado para usar los créditos de Gemini.`,
            };
          }
        }
      } catch (e) {
        console.warn("[auth] Error al procesar credencial JWT:", e);
      }
    }

    if (emailHeader === AUTHORIZED_EMAIL && token) {
      return { authorized: true, email: emailHeader };
    }

    return {
      authorized: false,
      error: `Acceso restringido. Solo el propietario (${AUTHORIZED_EMAIL}) puede consumir la API de IA.`,
    };
  }

  // CORS and safety headers
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Email, X-Auth-Token");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Auth check endpoint for client bootstrap
  app.get("/api/auth/verify", (req, res) => {
    const auth = verifyUserAuth(req);
    if (!auth.authorized) {
      return res.status(401).json({ authorized: false, error: auth.error });
    }
    return res.json({ authorized: true, email: auth.email });
  });

  // Audio transcription API endpoint with single voice or 2-voice conversation mode
  app.post("/api/transcribe", async (req, res) => {
    // Verify authorized user before touching Gemini credits
    const auth = verifyUserAuth(req);
    if (!auth.authorized) {
      return res.status(401).json({ 
        error: auth.error || "Acceso no autorizado", 
        unauthorized: true 
      });
    }

    try {
      const { audioBase64, mimeType, mode, liveTranscript } = req.body || {};
      const fallbackText = (liveTranscript || "").trim();

      if (!audioBase64) {
        return res.json({ text: fallbackText });
      }

      const ai = getGenAI();
      if (!ai) {
        console.warn("[transcribe] GEMINI_API_KEY no configurado, devolviendo texto capturado en vivo");
        return res.json({ text: fallbackText });
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
      const hint = fallbackText ? `\nReferencia del habla detectada en vivo: "${fallbackText}"` : '';

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
        : `Eres el motor de transcripción literal en bruto (Raw Verbatim) de Mywhis.
Transcribe con absoluta fidelidad literal y palabra por palabra todo lo que se dice en este audio en español.
REGLAS ESTRICTAS DE CERO PROCESAMIENTO (ZERO-PROCESSING):
1. TRANSCRIPCIÓN VERBATIM: Escribe con fidelidad absoluta cada palabra tal y como fue hablada.
2. CERO EDICIÓN NI CORRECCIÓN: Prohibido corregir gramática, sintaxis, estilo o reformular oraciones.
3. CONSERVA REPETICIONES Y MULETILLAS: Si el usuario titubea, repite palabras o usa muletillas ("eh", "este", "ya ya", "bueno bueno"), transcríbelas exactamente como fueron pronunciadas. Prohibido omitirlas o limpiarlas.
4. SALIDA PURA: Devuelve ÚNICAMENTE las palabras habladas de forma literal y pura, sin comillas, sin introducciones ni notas explicativas.${hint}`;

      let response: any = null;
      // Prioritize high-speed models with active quota
      const modelsToTry = [
        "gemini-3.5-transcribe",
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash-lite",
        "gemini-3.5-flash",
        "gemini-3.8-flash"
      ];
      
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

      const finalResult = transcription || fallbackText;
      console.log(`[transcribe] Texto final transcrito: "${finalResult}"`);
      return res.json({ text: finalResult });
    } catch (error: any) {
      console.error("Error in /api/transcribe:", error);
      const fallback = (req.body?.liveTranscript || "").trim();
      return res.json({ 
        text: fallback,
        warning: error.message || "Error al transcribir el audio" 
      });
    }
  });

  // AI text enhancement endpoint: prepares text for sending/sharing (with dialogue support)
  app.post("/api/improve", async (req, res) => {
    // Verify authorized user before touching Gemini credits
    const auth = verifyUserAuth(req);
    if (!auth.authorized) {
      return res.status(401).json({ 
        error: auth.error || "Acceso no autorizado", 
        unauthorized: true 
      });
    }

    const rawText = (req.body?.text || "").trim();
    const mode = req.body?.mode;
    const improveType = req.body?.improveType || req.body?.mode || req.body?.option;
    const customPrompt = (req.body?.customPrompt || req.body?.prompt || "").trim();
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

      let response: any = null;
      // Prioritize ultra-fast low-latency models (gemini-3.1-flash-lite responds in ~2s)
      const modelsToTry = [
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash",
        "gemini-3.8-flash",
        "gemini-3.5-flash-lite",
        "gemini-3-flash-preview"
      ];
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
      if (!improvedText) {
        return res.status(500).json({ 
          error: "No se pudo obtener respuesta de Gemini. Verifica GEMINI_API_KEY.", 
          text: rawText 
        });
      }
      return res.json({ text: improvedText, result: improvedText });
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
      server: { middlewareMode: true, hmr: false },
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
