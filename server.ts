process.env.DISABLE_HMR = "true";
import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import {
  DEFAULT_GENERAL_PROMPT,
  DEFAULT_EMAIL_PROMPT,
  DEFAULT_SOCIAL_PROMPT,
  DEFAULT_PROMPT_BUILDER_PROMPT,
  DEFAULT_SHOPPING_LIST_PROMPT,
  DEFAULT_TRANSLATE_PROMPT,
} from "./src/data/defaultPrompt";

export const TARGET_GCP_PROJECT_ID = "mywish-512809";
export const TARGET_GCP_PROJECT_NUMBER = "902024763956";

function getCleanApiKey(): string {
  const candidates = [
    process.env.API_KEY,
    process.env.GEMINI_API_KEY,
    process.env.VITE_GEMINI_API_KEY,
  ];
  for (const raw of candidates) {
    if (raw) {
      const cleaned = raw.trim().replace(/^["']|["']$/g, "");
      if (cleaned && cleaned !== "MY_GEMINI_API_KEY" && cleaned !== "MY_VITE_GEMINI_API_KEY") {
        return cleaned;
      }
    }
  }
  return "";
}

function createGenAIClient(vertexai = false): GoogleGenAI | null {
  const apiKey = getCleanApiKey();
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    ...(vertexai ? { vertexai: true } : {}),
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Normalización para detector Anti-Eco (compara si el LLM devolvió el mismo texto de entrada)
function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isEchoOfInput(input: string, output: string): boolean {
  if (!output || !output.trim()) return true;
  const normIn = normalizeForComparison(input);
  const normOut = normalizeForComparison(output);
  if (!normOut) return true;
  if (normIn === normOut) return true;
  return false;
}

function buildSystemInstruction(
  modeKey?: string,
  customPrompt?: string,
  isConversation?: boolean,
  forceRewrite = false
): string {
  let baseInstruction = "";

  if (customPrompt && customPrompt.trim()) {
    baseInstruction = customPrompt.trim();
  } else if (modeKey === "email") {
    baseInstruction = DEFAULT_EMAIL_PROMPT;
  } else if (modeKey === "social") {
    baseInstruction = DEFAULT_SOCIAL_PROMPT;
  } else if (modeKey === "prompt" || modeKey === "ai_prompt") {
    baseInstruction = DEFAULT_PROMPT_BUILDER_PROMPT;
  } else if (modeKey === "shopping_list") {
    baseInstruction = DEFAULT_SHOPPING_LIST_PROMPT;
  } else if (modeKey === "translate") {
    baseInstruction = DEFAULT_TRANSLATE_PROMPT;
  } else if (isConversation) {
    baseInstruction = `Eres el redactor experto de Mywhis para conversaciones.
Pule el siguiente diálogo para dejarlo impecable, perfectamente redactado y listo para compartir, manteniendo Persona 1: y Persona 2:.`;
  } else {
    baseInstruction = DEFAULT_GENERAL_PROMPT;
  }

  const antiEchoRules = `
REGLAS ESTRICTAS DE EJECUCIÓN Y ANTI-ECO:
1. PROHIBIDO HACER ECO DEL INPUT: Bajo ninguna circunstancia devuelvas el mismo texto literal de entrada solo con puntos o comas. Debes transformar, elevar el vocabulario, estructurar y mejorar activamente la redacción para que el cambio sea evidente y profesional desde el primer intento.
2. SALIDA DIRECTA Y ÚNICA: Devuelve ÚNICAMENTE el texto final transformado. Prohibido incluir introducciones ("Aquí tienes...", "Opción 1:"), listas de opciones o notas explicativas.${
    forceRewrite
      ? "\n3. REESCRITURA OBLIGATORIA: Tu intento previo fue demasiado similar al original. Reestructura completamente las frases con un registro ejecutivo, fluido y pulido."
      : ""
  }`;

  return `${baseInstruction}\n${antiEchoRules}`;
}

async function generateTransformFast(
  rawText: string,
  modeKey?: string,
  customPrompt?: string,
  isConversation?: boolean
): Promise<{
  text: string;
  modelUsed: string;
  latencyMs: number;
}> {
  const t0 = Date.now();
  // Priorizamos siempre el cliente estándar (vertexai=false) que opera en ~650ms con el proxy de AI Studio
  const client = createGenAIClient(false);
  if (!client) {
    throw new Error("GEMINI_API_KEY no configurada en el servidor.");
  }

  // gemini-3.1-flash-lite con thinkingBudget: 0 ofrece ~650ms de latencia y alta fiabilidad al primer toque
  const modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];

  for (const modelName of modelsToTry) {
    // Hasta 2 pasadas silenciosas: si la 1ª devuelve eco del texto original, fuerza reescritura con mayor temperatura
    for (let attempt = 0; attempt < 2; attempt++) {
      const forceRewrite = attempt > 0;
      const systemInstruction = buildSystemInstruction(modeKey, customPrompt, isConversation, forceRewrite);
      const userContent = `Transforma y reescribe el siguiente texto:\n"""\n${rawText}\n"""`;

      try {
        const response = await client.models.generateContent({
          model: modelName,
          contents: userContent,
          config: {
            systemInstruction,
            temperature: forceRewrite ? 0.65 : 0.45,
            topP: 0.9,
            thinkingConfig: { thinkingBudget: 0 },
          },
        });

        const candidateText = (response?.text || "").trim();
        if (candidateText && !isEchoOfInput(rawText, candidateText)) {
          return {
            text: candidateText,
            modelUsed: modelName,
            latencyMs: Date.now() - t0,
          };
        }

        // Si es la segunda pasada y aún así devolvió texto válido, lo entregamos
        if (candidateText && attempt === 1) {
          return {
            text: candidateText,
            modelUsed: modelName,
            latencyMs: Date.now() - t0,
          };
        }
        console.warn(`[improve] Eco detectado en ${modelName} (intento ${attempt + 1}), forzando reescritura...`);
      } catch (err: any) {
        const msg = err?.message || String(err);
        console.warn(`[improve] Modelo ${modelName} falló:`, msg.slice(0, 140));
        break; // Pasar al siguiente modelo inmediatamente
      }
    }
  }

  throw new Error("No se pudo generar la transformación con ninguno de los modelos activos.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "60mb" }));
  app.use(express.urlencoded({ extended: true, limit: "60mb" }));

  const AUTHORIZED_EMAIL = "cesar626313978@gmail.com";

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

    if (token === "cesar-vozia-master-pass-2026" || token === "cesar-auth-approved") {
      return { authorized: true, email: AUTHORIZED_EMAIL };
    }

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
              error: `Acceso denegado: el correo "${tokenEmail || "desconocido"}" no está autorizado.`,
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

  // CORS and No-Cache headers to prevent stale responses
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Email, X-Auth-Token");
    if (req.path.startsWith("/api/")) {
      res.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.header("Pragma", "no-cache");
      res.header("Expires", "0");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.get("/api/auth/verify", (req, res) => {
    const auth = verifyUserAuth(req);
    if (!auth.authorized) {
      return res.status(401).json({ authorized: false, error: auth.error });
    }
    return res.json({ authorized: true, email: auth.email });
  });

  app.get("/api/health", async (_req, res) => {
    const apiKey = getCleanApiKey();
    const keyPrefix = apiKey ? `${apiKey.slice(0, 6)}... (${apiKey.length} chars)` : "No definida";
    try {
      const test = await generateTransformFast("hola prueba de sistema", "improve");
      return res.json({
        status: "ok",
        targetProject: {
          name: "Mywish",
          projectId: TARGET_GCP_PROJECT_ID,
          projectNumber: TARGET_GCP_PROJECT_NUMBER,
        },
        cloudConnected: true,
        modelUsed: test.modelUsed,
        latencyMs: test.latencyMs,
        keyPrefix,
        diagnostic: `Conexión ultrarrápida (${test.latencyMs}ms) con ${test.modelUsed} en proyecto ${TARGET_GCP_PROJECT_ID}.`,
        fallbackActive: false,
      });
    } catch (err: any) {
      return res.status(500).json({
        status: "error",
        cloudConnected: false,
        keyPrefix,
        diagnostic: err?.message || "Error de conexión con Gemini",
      });
    }
  });

  // Normalizador de MIME types para notas de voz de WhatsApp (.opus, .ogg, .m4a, .mp3, .amr, .aac)
  function normalizeAudioMimeType(rawMime?: string, fileName?: string): string {
    const lowerName = (fileName || "").toLowerCase().trim();
    const baseMime = (rawMime || "").split(";")[0].toLowerCase().trim();

    if (lowerName.endsWith(".opus") || lowerName.endsWith(".ogg") || baseMime.includes("opus") || baseMime.includes("ogg")) {
      return "audio/ogg";
    }
    if (lowerName.endsWith(".m4a") || lowerName.endsWith(".mp4") || baseMime === "audio/x-m4a" || baseMime === "audio/m4a") {
      return "audio/mp4";
    }
    if (lowerName.endsWith(".mp3") || baseMime === "audio/mp3" || baseMime === "audio/mpeg") {
      return "audio/mpeg";
    }
    if (lowerName.endsWith(".wav") || baseMime.includes("wav")) {
      return "audio/wav";
    }
    if (lowerName.endsWith(".aac") || baseMime.includes("aac")) {
      return "audio/aac";
    }
    if (lowerName.endsWith(".amr") || baseMime.includes("amr")) {
      return "audio/amr";
    }
    if (!baseMime || baseMime === "application/octet-stream") {
      return "audio/ogg";
    }
    return baseMime;
  }

  // Almacén temporal en memoria para el audio compartido directamente desde WhatsApp en Android (Web Share Target)
  let latestSharedWhatsAppAudio: {
    audioBase64: string;
    mimeType: string;
    fileName: string;
    receivedAt: number;
  } | null = null;

  // Receptor nativo Web Share Target (POST /api/share-target multipart/form-data desde WhatsApp Android)
  app.post(
    "/api/share-target",
    express.raw({ type: () => true, limit: "60mb" }),
    (req, res) => {
      try {
        const contentType = req.headers["content-type"] || "";
        const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
        const bodyBuf: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "");

        if (boundaryMatch && bodyBuf.length > 0) {
          const boundary = `--${boundaryMatch[1] || boundaryMatch[2]}`;
          const latin1Body = bodyBuf.toString("latin1");
          const parts = latin1Body.split(boundary);

          for (const part of parts) {
            if (part.includes("Content-Disposition") && (part.includes('name="audio"') || part.includes("filename="))) {
              const headerEndIndex = part.indexOf("\r\n\r\n");
              if (headerEndIndex !== -1) {
                const headerSection = part.slice(0, headerEndIndex);
                let fileContentLatin1 = part.slice(headerEndIndex + 4);
                if (fileContentLatin1.endsWith("\r\n")) {
                  fileContentLatin1 = fileContentLatin1.slice(0, -2);
                }

                const fnMatch = headerSection.match(/filename="([^"]+)"/i);
                const ctMatch = headerSection.match(/Content-Type:\s*([^\r\n]+)/i);
                const fileName = fnMatch ? fnMatch[1] : "Audio-WhatsApp.opus";
                const rawMime = ctMatch ? ctMatch[1].trim() : "audio/ogg";
                const fileBuffer = Buffer.from(fileContentLatin1, "latin1");

                if (fileBuffer.length > 0) {
                  latestSharedWhatsAppAudio = {
                    audioBase64: fileBuffer.toString("base64"),
                    mimeType: normalizeAudioMimeType(rawMime, fileName),
                    fileName,
                    receivedAt: Date.now(),
                  };
                  break;
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("[share-target] Error al procesar audio compartido desde WhatsApp:", err);
      }

      return res.redirect(303, "/?shared_audio=1");
    }
  );

  // Endpoint para que el frontend recoja el audio recién compartido desde WhatsApp
  app.get("/api/shared-audio/latest", (_req, res) => {
    if (!latestSharedWhatsAppAudio || Date.now() - latestSharedWhatsAppAudio.receivedAt > 5 * 60 * 1000) {
      latestSharedWhatsAppAudio = null;
      return res.json({ found: false });
    }
    const payload = latestSharedWhatsAppAudio;
    latestSharedWhatsAppAudio = null;
    return res.json({
      found: true,
      ...payload,
    });
  });

  // Pipeline unificado para Notas de Voz de WhatsApp: Transcripción + Propuesta de Respuesta con IA
  app.post("/api/whatsapp-audio", async (req, res) => {
    const auth = verifyUserAuth(req);
    if (!auth.authorized) {
      return res.status(401).json({
        error: auth.error || "Acceso no autorizado",
        unauthorized: true,
      });
    }

    try {
      const { audioBase64, mimeType, fileName } = req.body || {};
      if (!audioBase64) {
        return res.status(400).json({ error: "No se recibió el archivo de audio de WhatsApp." });
      }

      const client = createGenAIClient(false);
      if (!client) {
        return res.status(503).json({ error: "GEMINI_API_KEY no configurada en el servidor." });
      }

      const normalizedMime = normalizeAudioMimeType(mimeType, fileName);
      const audioPart = {
        inlineData: {
          mimeType: normalizedMime,
          data: audioBase64,
        },
      };

      const transcribePrompt = `Transcribe con total fidelidad, claridad y puntuación correcta esta nota de voz recibida por WhatsApp.
REGLAS:
1. Conserva todos los detalles, preguntas, nombres, fechas o recados que menciona la persona.
2. Añade signos de puntuación (comas, puntos, ¿?, ¡!) para que sea cómodo de leer de un vistazo.
3. Devuelve ÚNICAMENTE el texto transcrito del audio, sin introducciones ni comillas.`;

      const modelsToTry = ["gemini-3.5-transcribe", "gemini-3.1-flash-lite", "gemini-3.8-flash"];
      let transcript = "";

      for (const modelName of modelsToTry) {
        try {
          const response = await client.models.generateContent({
            model: modelName,
            contents: [{ role: "user", parts: [audioPart, { text: transcribePrompt }] }],
          });
          if (response?.text && response.text.trim()) {
            transcript = response.text.trim();
            break;
          }
        } catch (err: any) {
          console.warn(`[whatsapp-audio] Modelo ${modelName} falló:`, err?.message?.slice(0, 120));
        }
      }

      if (!transcript) {
        return res.status(502).json({
          error: "No se pudo transcribir la nota de voz. Verifica que el archivo contenga voz audible.",
        });
      }

      // Generar respuesta sugerida automática con IA (~500ms con gemini-3.1-flash-lite y thinkingBudget: 0)
      let suggestedReply = "";
      try {
        const replyRes = await client.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: `Mensaje de voz recibido por WhatsApp:\n"""\n${transcript}\n"""`,
          config: {
            systemInstruction: `Actúa como el usuario que acaba de recibir este mensaje de voz por WhatsApp.
Redacta una respuesta directa, natural, cercana y bien estructurada lista para enviar por WhatsApp contestando a todos los puntos o preguntas del mensaje recibido.
REGLAS:
1. Responde en el mismo idioma del mensaje recibido (por defecto español).
2. Usa un tono natural de WhatsApp (claro, educado y directo, sin sonar robótico).
3. Devuelve ÚNICAMENTE el texto de la respuesta sugerida, sin comillas ni explicaciones previas.`,
            temperature: 0.45,
            thinkingConfig: { thinkingBudget: 0 },
          },
        });
        suggestedReply = (replyRes?.text || "").trim();
      } catch (replyErr: any) {
        console.warn("[whatsapp-audio] Error generando respuesta sugerida:", replyErr?.message);
      }

      return res.json({
        transcript,
        suggestedReply,
        fileName: fileName || "Nota de voz de WhatsApp",
        mimeType: normalizedMime,
      });
    } catch (error: any) {
      console.error("Error in /api/whatsapp-audio:", error);
      return res.status(500).json({
        error: error?.message || "Error al procesar el audio de WhatsApp.",
      });
    }
  });

  // Audio transcription API endpoint
  app.post("/api/transcribe", async (req, res) => {
    const auth = verifyUserAuth(req);
    if (!auth.authorized) {
      return res.status(401).json({
        error: auth.error || "Acceso no autorizado",
        unauthorized: true,
      });
    }

    try {
      const { audioBase64, mimeType, fileName, mode, liveTranscript } = req.body || {};
      const fallbackText = (liveTranscript || "").trim();

      if (!audioBase64) {
        return res.json({ text: fallbackText });
      }

      const client = createGenAIClient(false);
      if (!client) {
        return res.json({ text: fallbackText });
      }

      const cleanMimeType = normalizeAudioMimeType(mimeType, fileName);

      const audioPart = {
        inlineData: {
          mimeType: cleanMimeType,
          data: audioBase64,
        },
      };

      const isConversation = mode === "conversation";
      const hint = fallbackText ? `\nReferencia del habla detectada en vivo: "${fallbackText}"` : "";

      const prompt = isConversation
        ? `Eres el transcriptor inteligente y separador de hablantes de Mywhis.
En este audio conversan dos personas en español.
Separa las intervenciones usando Persona 1: y Persona 2:. Devuelve ÚNICAMENTE la transcripción final.${hint}`
        : `Eres el motor de transcripción literal en bruto (Raw Verbatim) de Mywhis.
Transcribe con absoluta fidelidad literal y palabra por palabra todo lo que se dice en este audio en español.
Devuelve ÚNICAMENTE las palabras habladas de forma literal y pura, sin comillas ni notas.${hint}`;

      const modelsToTry = ["gemini-3.5-transcribe", "gemini-3.1-flash-lite", "gemini-3.8-flash"];
      let response: any = null;

      for (const modelName of modelsToTry) {
        try {
          response = await client.models.generateContent({
            model: modelName,
            contents: [{ role: "user", parts: [audioPart, { text: prompt }] }],
          });
          if (response?.text !== undefined && response?.text !== null) {
            break;
          }
        } catch (err: any) {
          console.warn(`[transcribe] Modelo ${modelName} falló:`, err?.message?.slice(0, 120));
        }
      }

      let transcription = (response?.text || "").trim();

      if (
        transcription === "[SILENCIO]" ||
        transcription === "SILENCIO" ||
        transcription === "[silencio]" ||
        transcription === "..." ||
        transcription === "."
      ) {
        transcription = "";
      }

      return res.json({ text: transcription || fallbackText });
    } catch (error: any) {
      console.error("Error in /api/transcribe:", error);
      const fallback = (req.body?.liveTranscript || "").trim();
      return res.json({
        text: fallback,
        warning: error.message || "Error al transcribir el audio",
      });
    }
  });

  // Ultra-fast AI text transformation endpoint (~650ms with anti-echo validation)
  app.post("/api/improve", async (req, res) => {
    const auth = verifyUserAuth(req);
    if (!auth.authorized) {
      return res.status(401).json({
        error: auth.error || "Acceso no autorizado",
        unauthorized: true,
      });
    }

    const rawText = (req.body?.text || "").trim();
    const mode = req.body?.mode;
    const improveType = req.body?.improveType || req.body?.mode || req.body?.option;
    const customPrompt = (req.body?.customPrompt || req.body?.prompt || "").trim();

    if (!rawText) {
      return res.status(400).json({ error: "No hay texto para mejorar" });
    }

    const isConversation =
      mode === "conversation" || rawText.includes("Persona 1:") || rawText.includes("Persona 2:");

    try {
      const genResult = await generateTransformFast(rawText, improveType, customPrompt, isConversation);
      return res.json({
        text: genResult.text,
        result: genResult.text,
        modelUsed: genResult.modelUsed,
        latencyMs: genResult.latencyMs,
        usedFallback: false,
      });
    } catch (error: any) {
      console.error("Error in /api/improve:", error);
      return res.status(502).json({
        error: error.message || "Error al transformar con Gemini",
      });
    }
  });

  // Ultra-fast streaming endpoint using gemini-3.1-flash-lite + thinkingBudget: 0
  app.post("/api/improve/stream", async (req, res) => {
    const auth = verifyUserAuth(req);
    if (!auth.authorized) {
      return res.status(401).json({ error: auth.error || "Acceso no autorizado", unauthorized: true });
    }

    const rawText = (req.body?.text || "").trim();
    const mode = req.body?.mode;
    const improveType = req.body?.improveType || req.body?.mode;
    const customPrompt = (req.body?.customPrompt || req.body?.prompt || "").trim();

    if (!rawText) {
      return res.status(400).json({ error: "No hay texto para mejorar" });
    }

    const isConversation =
      mode === "conversation" || rawText.includes("Persona 1:") || rawText.includes("Persona 2:");

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    if (typeof (res as any).flushHeaders === "function") {
      (res as any).flushHeaders();
    }

    try {
      const genResult = await generateTransformFast(rawText, improveType, customPrompt, isConversation);
      res.write(
        `data: ${JSON.stringify({
          text: genResult.text,
          modelUsed: genResult.modelUsed,
          latencyMs: genResult.latencyMs,
          usedFallback: false,
        })}\n\n`
      );
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ error: err?.message || "Error en transformación" })}\n\n`);
      res.end();
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Mywhis server running on http://0.0.0.0:${PORT}`);
  });
  server.setTimeout(300000);
}

startServer();
