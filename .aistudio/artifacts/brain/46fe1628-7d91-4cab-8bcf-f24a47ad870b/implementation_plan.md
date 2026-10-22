# Blindaje de VozIA Studio: Autenticación con Google y Acceso Privado Exclusivo

Sistema de control de acceso y autenticación mediante Google (Gmail) para proteger la aplicación y garantizar que exclusivamente el propietario (`cesar626313978@gmail.com`) pueda acceder a la herramienta y consumir los créditos de la API de Gemini.

### User Review & Critical Decisions

> [!IMPORTANT]
> **Decisiones confirmadas por el usuario:**
> - **Cuentas autorizadas**: Acceso exclusivo restringido a `cesar626313978@gmail.com`. Cualquier otra cuenta de Google es rechazada de inmediato.
> - **Comportamiento sin sesión**: Pantalla de bloqueo completa que impide acceder a la app y a los controles de dictado hasta identificarse con éxito.
> - **Persistencia de sesión**: La sesión se mantiene permanentemente activa en el dispositivo hasta que el usuario pulse deliberadamente "Cerrar sesión".

---

### 1. Overview & Core Concept

- **Qué hace**: Bloquea el acceso público a VozIA Studio mediante una pantalla de acceso seguro. El usuario pulsa "Iniciar sesión con Google", selecciona su cuenta y, si coincide con `cesar626313978@gmail.com`, se desbloquea el editor de dictado y el motor de IA. Las peticiones a `/api/improve` y `/api/transcribe` viajan autenticadas para evitar consumo no autorizado de cuotas.
- **Público objetivo**: Uso personal y exclusivo de César en ordenadores de sobremesa y dispositivos móviles (Android/iOS).
- **Valor clave**: Máxima tranquilidad contra consumo accidental o malintencionado de tokens de IA por visitas casuales o indexación web, sin perder la agilidad de uso en el día a día.

---

### 2. User Experience & Visual Design

- **Flujo de Usuario**:
  1. **Pantalla de Bloqueo (Lock Screen)**: Al abrir la app sin sesión previa, se presenta una pantalla de bienvenida elegante y minimalista en modo oscuro (`#090d16`), con el logotipo de VozIA Studio, un distintivo de "Acceso Privado" y el botón oficial de Google Sign-In.
  2. **Autenticación con Google**:
     - El usuario pulsa en "Iniciar sesión con Google".
     - Se abre el selector nativo de Google o Google One Tap.
     - Al completar la selección, se valida el correo devuelto por el token.
  3. **Comprobación de Acceso**:
     - Si el correo es `cesar626313978@gmail.com`: Se muestra animación de bienvenida ("¡Bienvenido, César!"), se persiste la sesión en el navegador y se muestra la interfaz completa de dictado.
     - Si el correo es diferente: Se muestra una alerta amigable pero estricta ("Acceso denegado: Esta aplicación es privada. La cuenta conectada no tiene permisos") con botón para reintentar con otra cuenta.
  4. **Cabecera Autenticada**: En el header de VozIA Studio se muestra un avatar discreto o chip con el correo del usuario y un botón rápido de "Cerrar sesión" (junto al botón de ajustes ⚙️).

- **Estética Visual**:
  - Paleta oscura coherente con el resto de la aplicación (`bg-[#090d16]`, bordes `border-white/10`, tarjeta con desenfoque de fondo `backdrop-blur-xl`).
  - Botón de Google conforme a las guías de diseño oficiales (Google Identity Services) con soporte táctil grande para móviles.
  - Opción secundaria de acceso con PIN maestro de rescate para contingencias o pruebas sin conexión.

---

### 3. Key Product Decisions & Trade-Offs

- **Decisión 1: Integración con Google Identity Services (GIS) en Frontend y Token en Headers**
  - *Enfoque*: Cargar el SDK oficial de Google Identity Services (`https://accounts.google.com/gsi/client`) para obtener el JWT firmado de Google. Almacenar el token verificado y los datos de perfil en `localStorage` con expiración prolongada.
  - *Por qué*: Proporciona la experiencia de login con Google nativa, moderna y directa sin requerir redirecciones complejas de OAuth en iframes o ventanas emergentes bloqueadas.
  - *Alternativas consideradas*: Autenticación con usuario/contraseña tradicional (más engorrosa de recordar en el móvil y propensa a filtraciones si el código es visible).

- **Decisión 2: Doble Barrera de Protección (Cliente + Servidor Express)**
  - *Enfoque*: 
    1. En el **Frontend**, la pantalla de bloqueo impide interactuar con el micrófono, el editor y los botones.
    2. En el **Backend** (`server.ts`), los endpoints `/api/improve` y `/api/transcribe` exigen la cabecera `Authorization: Bearer <token>` y comprueban la identidad del correo antes de ejecutar cualquier llamada al SDK de Gemini.
  - *Por qué*: Si alguien intenta realizar peticiones `curl` o llamadas directas a la API sin pasar por la interfaz, el servidor las rechazará con `HTTP 401 Unauthorized` o `HTTP 403 Forbidden`, protegiendo la cuota de la API en Google AI Studio.

---

### 4. Technical Architecture & Data Strategy

```
┌──────────────────────────────────────────────────────────────┐
│                       VozIA Studio                           │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                     Lock Screen                        │  │
│  │  - Google Identity Services (GSI)                      │  │
│  │  - Email validation: cesar626313978@gmail.com           │  │
│  │  - PIN de respaldo opcional                            │  │
│  └──────────────────────────┬─────────────────────────────┘  │
│                             │ (Token validado)               │
│                             ▼                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │               Main App (Desbloqueada)                  │  │
│  │  - Dictado continuo (30-40 min)                        │  │
│  │  - Editor de texto + Selector Original / IA            │  │
│  │  - Header con Avatar de César + Botón "Cerrar sesión"  │  │
│  └──────────────────────────┬─────────────────────────────┘  │
└─────────────────────────────┼────────────────────────────────┘
                              │
                     Bearer Token en Headers
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    Express Backend (server.ts)               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Middleware de Autorización:                            │  │
│  │ - Extrae y valida JWT / email del usuario             │  │
│  │ - Rechaza con 401 si email != cesar626313978@gmail.com │  │
│  └──────────────────────────┬─────────────────────────────┘  │
│                             │ (Permitido)                    │
│                             ▼                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Endpoints protegidos:                                  │  │
│  │ - POST /api/improve    --> Gemini 2.5 Flash            │  │
│  │ - POST /api/transcribe --> Gemini Multimodal Audio     │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

- **Manejo de Estado**:
  - `isAuthenticated`: Booleano que controla si se muestra la pantalla de bloqueo o el estudio de voz.
  - `currentUser`: Objeto con `{ email, name, picture }` cargado desde `localStorage` al iniciar.
  - `logout()`: Función que limpia la sesión y vuelve a la pantalla de bloqueo inmediatamente.
