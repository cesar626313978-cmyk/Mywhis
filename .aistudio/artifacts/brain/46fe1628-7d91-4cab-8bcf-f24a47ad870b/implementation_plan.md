# Transcripción Simultánea en Tiempo Real y Entrega Instantánea

Optimización integral del flujo de dictado en MyWish para proporcionar reconocimiento de voz continuo en tiempo real (en escritorio y móviles) con aparición inmediata del texto al detener la grabación (0 ms de espera), reservando las llamadas a modelos de IA exclusivamente para las acciones explícitas de mejora.

### User Review & Critical Decisions

> [!IMPORTANT]
> **Decisiones confirmadas por el usuario:**
> - **Visualización en tiempo real e instantánea**: Tanto en PC como en móviles, el texto se transcribe simultáneamente a medida que el usuario habla y se consolida inmediatamente al pulsar el botón de detener la grabación.
> - **Eliminación del bloqueo de post-procesamiento**: Al detener la grabación, la app no se quedará en estado "Procesando grabación...". El texto reconocido pasa directamente al editor principal y se muestran de inmediato los botones de acción rápida.
> - **Servidor como respaldo secundario**: El endpoint `/api/transcribe` se invocará únicamente si el navegador no soporta reconocimiento nativo o si la captura en directo finalizó sin texto alguno.

- **Modo Conversación (2 voces)**: En modo conversación, se mantiene el análisis de diarización en segundo plano solo si el usuario activa deliberadamente la pestaña de conversación.
- **Acciones de Mejora**: Los cuatro botones de mejora (General, Correo, Redes sociales y Prompt) se mantienen intactos y listos para ejecutarse bajo demanda del usuario.

---

### 1. Overview & Core Concept

- **Qué hace**: Permite al usuario hablar con visualización simultánea de sus palabras en la pantalla tanto en ordenadores de sobremesa como en smartphones compatibles (Chrome, Safari iOS 14.5+, Edge, Samsung Internet). Al hacer clic en detener, el texto transcrito queda fijado en el editor al instante sin spinners ni pantallas de carga innecesarias.
- **Público objetivo**: Usuarios que necesitan dictar notas rápidas, correos electrónicos, mensajes o prompts con máxima inmediatez y sin retrasos de red.
- **Valor clave**: Experiencia de dictado fluida y de latencia cero, separando radicalmente la transcripción acústica (inmediata en el dispositivo) del enriquecimiento semántico mediante IA (bajo demanda con los 4 botones configurables).

---

### 2. User Experience & Visual Design

- **Flujo de Usuario Mejorado**:
  1. El usuario pulsa el micrófono de grabación.
  2. Mientras habla, la onda sonora reacciona y el texto transcrito va apareciendo de forma fluida y acumulativa en el visor en vivo.
  3. Al pulsar de nuevo para detener la grabación, el texto transcrito pasa **inmediatamente** a la caja de texto editable principal. No hay cartel ni bloqueo de "Procesando grabación...".
  4. Los 4 botones de mejora con IA (`Mejorar`, `Para correo`, `Para redes`, `Para prompt`) aparecen activos y listos para pulsar.
  5. Solo cuando el usuario pulsa uno de estos botones, se ejecuta la llamada a Gemini para enriquecer el texto.

- **Identidad Visual y Ergonomía Móvil**:
  - Zona de pulgar optimizada: Botón de micrófono central de $64\text{px}$ con retroalimentación táctil y micro-animación de pulso.
  - Los 4 botones de mejora mantienen su rejilla táctil de $2 \times 2$ en móviles con iconos distintivos y feedback visual al estar procesando la variante específica.
  - Indicador de estado discreto: Transición limpia de "Escuchando..." a "Listo" sin parpadeos ni demoras artificiales.

---

### 3. Key Product Decisions & Trade-Offs

- **Decisión 1: Habilitar SpeechRecognition en móviles sin interferir con la sesión de audio**
  - *Enfoque*: Inicializar `webkitSpeechRecognition` / `SpeechRecognition` universalmente. En caso de navegadores móviles donde coexistan grabadora y reconocimiento, priorizar la transmisión continua de eventos `result` para poblar el borrador en vivo y usar `MediaRecorder` como buffer de respaldo pasivo.
  - *Por qué*: El usuario percibe una velocidad instantánea porque el texto ya está procesado localmente en su dispositivo antes de pulsar el botón de parada.
  - *Alternativas descartadas*: Enviar siempre el blob de audio al backend para transcribir con Gemini (causa latencias de 4 a 12 segundos inaceptables para un dictado básico).

- **Decisión 2: Política de Respaldo Transparente**
  - *Enfoque*: Si `speech.transcript` tiene contenido al pulsar parar, se inyecta directamente a `processedText` en 0 ms. Solo si `speech.transcript` resulta vacío (por ejemplo, navegador sin Web Speech API o audio cortado) se dispara `/api/transcribe` como red de seguridad.
  - *Por qué*: Garantiza robustez técnica en navegadores antiguos sin penalizar al 95% de los usuarios que usan navegadores modernos.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FLUJO DE DICTADO Y TRANSCRIPCIÓN                │
└────────────────────────────────────────────────────────────────────────┘

  [ Usuario Habla ] ────► [ Micrófono del Dispositivo ]
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │ SpeechRecognition (Nativo)  │ ────► Live Transcript
                     └─────────────────────────────┘       (En directo en UI)
                                    │
                              [ Pulsa Parar ]
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
          ¿Hay texto capturado?               ¿Texto vacío / No soportado?
                 [ SÍ ]                                  [ NO ]
                  │                                       │
                  ▼                                       ▼
        ┌───────────────────────┐              ┌───────────────────────┐
        │ Entrega Instantánea   │              │ Respaldo en Servidor  │
        │ processedText (0 ms)  │              │ POST /api/transcribe  │
        └───────────────────────┘              └───────────────────────┘
                  │                                       │
                  ▼                                       ▼
        ┌─────────────────────────────────────────────────────────────┐
        │  Editor Principal Activo con los 4 Botones de Mejora:       │
        │  [✨ Mejorar] [✉️ Correo] [💬 Redes] [🤖 Prompt]            │
        └─────────────────────────────────────────────────────────────┘
                                    │
                        [ Usuario Pulsa un Botón ]
                                    │
                                    ▼
                      POST /api/improve (Gemini 2.5)
```

- **Componentes Afectados**:
  - `src/hooks/useRealSpeechRecognition.ts`:
    - Eliminar la restricción que impedía el uso de `SpeechRecognition` en navegadores móviles para el flujo de dictado.
    - Actualizar `stopRecording`: Si `liveTranscriptRef.current` tiene texto, devolverlo inmediatamente resolviendo la promesa en tiempo cero sin llamar a `/api/transcribe`.
    - Reservar el envío a `/api/transcribe` únicamente si el texto en vivo está vacío y existe un buffer de audio grabado.
  - `src/App.tsx`:
    - En `performStopRecording`, no activar `setIsProcessing(true)` si ya disponemos del texto en tiempo real (`speech.transcript`).
    - Actualizar inmediatamente `processedText` y `originalText` con la transcripción obtenida al instante.
