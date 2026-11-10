# Recepción, Transcripción y Respuesta Inteligente de Audios de WhatsApp en Mywhis

Este plan detalla la arquitectura y experiencia de usuario para permitir que cualquier nota de voz recibida en WhatsApp pueda compartirse directamente con **Mywhis** (o cargarse desde un botón en pantalla), transcribirse de inmediato, generar una propuesta de respuesta automática con IA y mostrar el mensaje recibido en la parte superior mientras dictas o ajustas tu contestación.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Se han incorporado las tres decisiones confirmadas para garantizar que el flujo sea rápido, natural en el teléfono y sin pasos innecesarios:

- **Vía de entrada doble (Confirmado)**: Soportar tanto el menú nativo **"Compartir" de WhatsApp en Android** (seleccionando el icono de *Mywhis* gracias a Web Share Target en la PWA instalada) como un botón directo **"Subir Audio"** en la barra de control para elegir cualquier archivo (`.opus`, `.ogg`, `.mp3`, `.m4a`, `.wav`, `.aac`, `.webm`).
- **Procesamiento automático con IA (Confirmado)**: Al recibir el audio de WhatsApp, el sistema **transcribe el mensaje al instante** y simultáneamente **genera un borrador de respuesta sugerida por IA** lista para usar o modificar.
- **Vista de contexto superior para responder (Confirmado)**: El mensaje transcrito del contacto se fija en una **tarjeta plegable superior ("Mensaje recibido de WhatsApp")** con reproductor de audio integrado, dejando libre el cuadro principal inferior para que veas lo que te dijeron mientras dictas tu propia respuesta con el micrófono o editas la respuesta sugerida por la IA.

---

## 1. Overview & Core Concept

- **Qué hace**: Convierte a Mywhis en un centro de lectura y respuesta rápida de audios de WhatsApp. Cuando te envían un audio largo o no puedes escucharlo, lo compartes con Mywhis; en menos de 2 segundos lees lo que te han dicho, tienes una respuesta coherente sugerida en el editor y puedes dictar con tu voz cualquier matiz antes de pulsar **"Enviar a WhatsApp"**.
- **Escenario de uso**: Usuarios en movilidad (Android y escritorio) que reciben notas de voz frecuentes en WhatsApp (`.opus` / `.ogg`) y desean leerlas al vuelo y contestar con un mensaje impecablemente redactado sin salir del flujo de trabajo.
- **Valor principal**: Elimina la fricción de escuchar audios largos a ciegas o recordar todos los puntos mientras intentas responder, mostrando siempre el texto recibido arriba mientras compones tu contestación abajo.

---

## 2. User Experience & Visual Design

### Flujo de Usuario Paso a Paso

1. **Entrada del Audio (2 caminos)**:
   - **Desde WhatsApp (Android)**: Mantienes pulsada la nota de voz en WhatsApp $\rightarrow$ tocas **Compartir** $\rightarrow$ eliges **Mywhis**. La aplicación se abre y procesa el audio automáticamente sin tocar nada más.
   - **Desde dentro de Mywhis**: Pulsas el nuevo botón **"Audio WhatsApp / Subir"** situado en la barra de controles de grabación (junto a *IA Audio*) y seleccionas el archivo de audio.
2. **Transcripción + Propuesta de Respuesta Simultánea**:
   - Aparece un indicador de progreso ágil (*"Transcribiendo nota de voz de WhatsApp y preparando respuesta..."*).
3. **Panel Superior de "Mensaje Recibido" + Editor de Respuesta Inferior**:
   - **Arriba (Contexto del audio recibido)**: Se despliega una tarjeta compacta con el texto íntegro de lo que te acaban de decir en el audio, un mini-reproductor para escuchar el audio original si lo necesitas, un botón para copiar el mensaje recibido y un botón para cerrar la tarjeta cuando termines.
   - **Abajo (Tu contestación)**: En el editor principal aparece lista la **respuesta sugerida por la IA** (que puedes enviar tal cual, refinar con los 6 botones inferiores o **reemplazar/ampliar pulsando el micrófono** para dictar tu propia respuesta mientras lees arriba lo que te preguntaron).
4. **Envío directo a WhatsApp**:
   - Al pulsar **Compartir** o el botón rápido **Responder en WhatsApp**, se abre WhatsApp con tu texto de respuesta listo para enviarlo al contacto.

### Identidad Visual, Ergonomía Táctil y Tema

- **Dirección Estética**: Utilitaria de alta precisión en modo oscuro profundo (`#090d16`), conservando intacta la vista sin scroll (*Zero-Scroll*) y la botonera de 6 acciones que ya utilizas.
- **Paleta y Acentos Semánticos**:
  - Superficie base: `#090d16` y contenedores en `slate-900/70` con bordes sutiles `border-slate-800/90`.
  - Tarjeta de audio de WhatsApp recibido: acento esmeralda sutil (`emerald-500/15`, borde `border-emerald-500/30` y texto `emerald-300`) para distinguir de un vistazo el **mensaje entrante** frente a **tu respuesta** en el editor (`indigo-500`).
- **Ergonomía Móvil y Zonas de Pulgar**:
  - Todos los botones interactivos mantienen un área táctil mínima de $44 \times 44\text{px}$.
  - La tarjeta superior de *"Mensaje recibido"* tiene altura máxima controlada (`max-h-32 overflow-y-auto`) y opción de plegar/desplegar con un toque para no restar espacio al editor principal en pantallas móviles verticales.

---

## 3. Key Product Decisions & Trade-Offs

- **Decisión 1: Recepción directa mediante Web Share Target + Cola en Memoria/IndexedDB del Service Worker**
  - *Enfoque elegido*: Registrar `share_target` con método `POST` y `multipart/form-data` en el manifiesto PWA, aceptando `audio/*`, `.opus`, `.ogg`, `.mp3`, `.m4a`, `.wav` y `.aac`. El Service Worker intercepta el archivo enviado por WhatsApp, lo guarda temporalmente en caché local y redirige a `/?shared_audio=1`, donde la interfaz lo recoge y transcribe al instante.
  - *Por qué*: Es el estándar oficial de Android/Chromium para que una aplicación web instalada aparezca en la hoja nativa de "Compartir" de WhatsApp cuando seleccionas un mensaje de voz.
  - *Alternativa descartada*: Subida exclusiva por selector de archivos; obligaría al usuario a guardar primero el audio de WhatsApp en la carpeta de descargas del teléfono antes de poder abrirlo.

- **Decisión 2: Normalización de MIME Types de WhatsApp (`audio/ogg; codecs=opus` y `audio/opus`)**
  - *Enfoque elegido*: WhatsApp codifica sus notas de voz en formato `.opus` / `.ogg`. El backend limpiará y normalizará automáticamente las cabeceras MIME (`audio/ogg`, `audio/opus`, `audio/mp4`, `audio/mpeg`, `audio/webm`) antes de pasarlas a Gemini para asegurar compatibilidad total con notas de voz de Android y iOS.
  - *Por qué*: Algunos navegadores móviles reportan los archivos `.opus` de WhatsApp como `application/octet-stream` o `audio/ogg; codecs=opus`, lo que provocaría rechazos si no se normaliza por extensión y cabecera.

- **Decisión 3: Una sola llamada ultrarrápida o pipeline paralelo para Transcripción + Respuesta Sugerida**
  - *Enfoque elegido*: Al subir o compartir un audio de WhatsApp, el endpoint dedicado devuelve en un único flujo tanto la **transcripción literal (`incomingTranscript`)** como la **respuesta sugerida (`suggestedReply`)**, además de permitir regenerar la respuesta o dictar encima con el micrófono.
  - *Por qué*: Reduce la latencia total a la mitad y evita hacer esperar dos veces al usuario.

---

## 4. Technical Architecture & Data Strategy

### Diagrama de Arquitectura y Flujo de Datos

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     ENTRADA DE AUDIO DE WHATSAPP                         │
│                                                                          │
│  [WhatsApp Android -> "Compartir"]          [Botón "Audio WhatsApp"]     │
│                 │                                      │                 │
│                 ▼                                      ▼                 │
│   ┌───────────────────────────┐          ┌───────────────────────────┐   │
│   │ PWA Web Share Target POST │          │ Selector Nativo de Archivo│   │
│   │ (Service Worker Cache)    │          │ (.opus, .ogg, .m4a, .mp3) │   │
│   └─────────────┬─────────────┘          └─────────────┬─────────────┘   │
└─────────────────┼──────────────────────────────────────┼─────────────────┘
                  └──────────────────┬───────────────────┘
                                     ▼
            ┌────────────────────────────────────────────────┐
            │     Manejador de Audio Recibido (Frontend)     │
            │  • Normaliza MIME (.opus/.ogg -> audio/ogg)    │
            │  • Crea URL local para mini-reproductor        │
            └────────────────────────┬───────────────────────┘
                                     ▼
            ┌────────────────────────────────────────────────┐
            │     POST /api/whatsapp-audio (Backend)         │
            │  1. Transcribe el audio con fidelidad          │
            │  2. Genera borrador de respuesta contextual    │
            └────────────────────────┬───────────────────────┘
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         ▼                                                       ▼
┌─────────────────────────────────────┐ ┌──────────────────────────────────┐
│ TARJETA SUPERIOR: MENSAJE RECIBIDO  │ │ EDITOR PRINCIPAL: TU RESPUESTA   │
│ • Texto transcrito del contacto     │ │ • Borrador IA listo para editar  │
│ • Mini-reproductor de audio         │ │ • O pulsa el Micrófono para      │
│ • Plegable / Copiar / Cerrar        │ │   dictar tu propia respuesta     │
│                                     │ │   viendo el mensaje arriba       │
└─────────────────────────────────────┘ └────────────────┬─────────────────┘
                                                         ▼
                                        ┌──────────────────────────────────┐
                                        │  Acción: Compartir / Enviar a    │
                                        │  WhatsApp o Aplicar 6 Botones IA │
                                        └──────────────────────────────────┘
```

### Modelo de Estado en la Interfaz

- `incomingWhatsAppAudio`: Estado que almacena el mensaje recibido actual:
  - `transcript`: Texto transcrito de la nota de voz que te enviaron.
  - `audioUrl`: URL local (`URL.createObjectURL`) para poder reproducir el audio original desde la tarjeta superior si quieres comprobar un dato.
  - `fileName`: Nombre del archivo o etiqueta `"Nota de voz de WhatsApp"`.
  - `isCollapsed`: Booleano para contraer o expandir la tarjeta superior en pantallas pequeñas.
- Sincronización con el Editor Principal:
  - Cuando llega un audio de WhatsApp, `incomingWhatsAppAudio.transcript` se muestra en la tarjeta superior, mientras que la **respuesta sugerida por la IA** se carga en la vista de respuesta del editor principal.
  - Si decides pulsar el **Micrófono** para dictar tu propia contestación con tu voz, la tarjeta superior permanece visible para que puedas leer punto por punto lo que te dijeron mientras hablas.
