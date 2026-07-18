# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Always Do First
- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.

## Architecture

Static store + admin panel. No build step, no framework, no npm.

| File | Role |
|---|---|
| `index.html` + `index.js` + `styles.css` | Catalog page: category cards → product grid → cart modal → WhatsApp checkout |
| `producto.html` + `producto.js` + `producto.css` | Product detail page: image, extras, qty, add-to-cart |
| `admin/index.html` | Admin SPA: login → dashboard with full product CRUD + Cloudinary image upload |
| `serve.mjs` | Local dev server (Node built-in HTTP) |

> **Note:** `README.md` documents an older Google Sheets–based version of this project. It is outdated. The current data source is Firestore, as described in this file.

**Data source:** Firestore collection `productos`. Both `index.js` and `producto.js` read from it via the Firebase compat SDK (loaded from CDN before each script). The "↻ Actualizar" button re-fetches from Firestore.

**Admin panel:** `admin/index.html` handles Firebase Auth (email/password), then reads/writes the `productos` collection. Images are uploaded to Cloudinary (cloud: `foodiewebdev`, preset: `tienda_online_v.1.2_unsigned`) and the returned URL is stored in Firestore.

**Product schema (Firestore `productos` collection):**
```
nombre           string   — required
descripcion      string
precio           number   — 0 = show "Consultar" button
categoria        string   — required
imagen           string   — Cloudinary URL
texto_adicional  string   — shown as badge on product card (formerly "badge")
disponible       boolean  — false = shown as "Agotado"
createdAt        timestamp — set on creation by admin
```

**Store config (Firestore `config/tienda` document):**
```
nombre           string   — overrides CONFIG.nombre in index.js and producto.js
heroTitle        string   — overrides CONFIG.heroTitle in index.js
heroSubtitle     string   — overrides CONFIG.heroSubtitle in index.js
heroImagen       string   — Cloudinary URL; applied as inline backgroundImage on .preview-hero-bg
whatsappNumero   string   — overrides CONFIG.whatsappNumero in index.js and producto.js
heroImagePrompt  string   — user-editable ChatGPT prompt for generating hero images; falls back to DEFAULT_HERO_PROMPT in admin/index.html if absent
```
All fields are managed via the admin Configuración panel. The hardcoded `CONFIG` values in `index.js` and `producto.js` are fallbacks shown before Firestore responds. `producto.js` reads only `nombre` and `whatsappNumero`.

**Cross-page state:**
- Cart: `localStorage.tienda_cart` (JSON array of cart items)
- Product catalog: `sessionStorage.tienda_products` (written by `index.js:render()`, read by `producto.js:init()` to avoid a second fetch)
- Product IDs are Firestore string document IDs (not numeric). URL params and cart use these string IDs.
- `producto.html` navigates back by posting `#cart` hash: `index.html#cart` → `index.js:init()` auto-opens the cart modal

**Three-view system in index.js:** `viewMode` is `"homepage" | "categories" | "products"`. `"homepage"` is the landing view; `"categories"` shows a grid of category cards; `"products"` shows a filtered product list with a horizontal categories bar. `goToCategory()` / `backToCategories()` switch between them.

**Horarios system:** `CONFIG.horarios.activo = false` disables it entirely (store always open). When enabled and outside the defined time windows: a closed banner appears at the top, all add-to-cart buttons are disabled, and the WhatsApp checkout button is blocked. `checkHorarios()` runs on a 30-second interval. A schedule modal shows the weekly timetable. Split shifts (e.g., morning + afternoon) are supported as an array of `{abre, cierra}` objects per day; `null` means closed all day.

**Firestore security rules needed:**
```
match /productos/{docId} {
  allow read: if true;
  allow write: if request.auth != null;
}
match /config/{docId} {
  allow read: if true;
  allow write: if request.auth != null;
}
match /admins/{docId} {
  allow read, write: if request.auth != null;
}
```

## Critical Sync Points

**CONFIG is duplicated** — `index.js` and `producto.js` each have their own `CONFIG` and `FIREBASE_CONFIG` objects. They must be kept in sync. When editing `nombre`, `moneda`, or `whatsappNumero`, update **both** files.

**Delivery/payment labels must match select values** — `index.js:sendToWhatsApp()` maps `<select>` `value` attributes to human-readable labels via `dLabels` and `pLabels`. If you add or rename a `<option value="...">` in `index.html`, update the corresponding entry in those objects.

**EXTRAS_POR_CATEGORIA** in `producto.js` — maps exact `categoria` values from Firestore to arrays of add-on items. Category names are case-sensitive and must match Firestore exactly.

## Installation Guide (new client)

### Servicios globales (una sola vez, ya configurados)

- **Resend:** dominio `darodriguez.com` verificado. Remitente: `noreply@darodriguez.com`.
- **Cloudinary:** cuenta en `foodiewebdev`. Upload presets se crean por cliente.
- **Cloudflare:** cuenta activa con Wrangler instalado globalmente (`npm install -g wrangler`).

---

### Paso 1 — Firebase

1. Crear nuevo proyecto en [console.firebase.google.com](https://console.firebase.google.com)
2. Habilitar **Firestore Database** (modo producción)
3. Habilitar **Authentication** → Sign-in method → **Email/Password**
4. Habilitar la **Identity Toolkit API** en Google Cloud Console (proyectos nuevos a veces no la activan automáticamente): [console.cloud.google.com/apis/library](https://console.cloud.google.com/apis/library) → buscar "Identity Toolkit API" → Enable. Sin esto, el login del admin falla con error "not found on this server".
5. Ir a **Project Settings** → copiar los valores de `firebaseConfig` (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId)
6. Aplicar reglas de seguridad en Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /productos/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /config/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /admins/{docId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

7. Crear la cuenta de admin inicial: Authentication → Users → Add user (email + contraseña)
8. Obtener la **Service Account** para el Worker: Project Settings → Service accounts → Generate new private key → guardar el JSON

---

### Paso 2 — Cloudinary

1. En la cuenta `foodiewebdev`, ir a Settings → Upload → Add upload preset
2. Nombre del preset: `tienda_{cliente}_unsigned` (ej: `tienda_panaderia_unsigned`)
3. Signing mode: **Unsigned**
4. Guardar

---

### Paso 3 — Personalizar el código

**3.1 — `index.js` y `producto.js` (ambos, siempre en sincronía):**

```javascript
const CONFIG = {
  nombre: 'Nombre de la tienda',
  heroTitle: 'Título del hero',
  heroSubtitle: 'Subtítulo del hero',
  whatsappNumero: '5491112345678',   // sin + ni espacios
  moneda: '$',
  // ...
};

const FIREBASE_CONFIG = {
  apiKey: '...',
  authDomain: '...',
  projectId: '...',
  storageBucket: '...',
  messagingSenderId: '...',
  appId: '...',
};
```

**3.2 — `admin/index.html`:**

```javascript
const CLOUD_NAME = 'foodiewebdev';
const UPLOAD_PRESET = 'tienda_{cliente}_unsigned';

const FIREBASE_CONFIG = { /* mismos valores */ };
```

**3.3 — Opciones de envío y pago en `index.html`:**

- Editar los `<option>` dentro del modal del carrito (entrega y pago)
- Sincronizar `dLabels` y `pLabels` en `index.js:sendToWhatsApp()` con los nuevos `value`

**3.4 — Marca visual:**

- CSS variables en `styles.css` `:root`: `--accent`, `--accent-dim`, `--accent-glow`
- Google Fonts `<link>` en `index.html` → actualizar `--font-display` / `--font-body` en `styles.css`
- Logo: guardar en `branding/`, reemplazar el `#storeName` en el header de `index.html` con un `<img>`

---

### Paso 4 — Resend: crear API key para este cliente

1. Ir a [resend.com](https://resend.com) → **API Keys** → Create API Key
2. Nombre: `tienda-{nombre-cliente}` (ej: `tienda-panaderia-sol`)
3. Permission: **Sending access**
4. Domain: `darodriguez.com`
5. Copiar la key — solo se muestra una vez

---

### Paso 5 — Cloudflare Worker

**5.1 — Copiar la carpeta `worker/` en el nuevo repo y renombrar:**

Editar `worker/wrangler.toml`:

```toml
name = "tienda-email-worker-{cliente}"   # ej: tienda-email-worker-panaderia
main = "src/index.js"
compatibility_date = "2024-11-01"
```

**5.2 — Cargar secrets y hacer deploy:**

```bash
cd worker

wrangler secret put RESEND_API_KEY
# → pegar la API key de Resend del paso anterior

wrangler secret put FIREBASE_SERVICE_ACCOUNT < /ruta/al/service-account.json
# → usar redirección de archivo, NO pegar interactivamente (falla por los \n de la private_key)
# En PowerShell: Get-Content "C:\ruta\sa.json" -Raw | wrangler secret put FIREBASE_SERVICE_ACCOUNT
# Eliminar el archivo JSON después de cargarlo

wrangler secret put FIREBASE_PROJECT_ID
# → pegar solo el projectId (ej: panaderia-sol-f3a21)

wrangler deploy
# → Cloudflare devuelve la URL: https://tienda-email-worker-{cliente}.{subdominio}.workers.dev
```

**5.3 — Actualizar la URL del Worker en `admin/index.html`:**

Al final del bloque `<script>`, actualizar:

```javascript
const WORKER_URL = 'https://tienda-email-worker-{cliente}.{subdominio}.workers.dev';
```

---

### Paso 6 — Verificación final

| Escenario | Cómo probar | Resultado esperado |
|---|---|---|
| Reset de contraseña | Panel admin → Administradores → Resetear | Admin recibe email con link de Firebase branded |
| Nuevo admin | Panel admin → Administradores → Crear | Nuevo admin recibe email con email + contraseña temporal |
| Cambio de WhatsApp | Panel admin → Configuración → cambiar número → Guardar | `darodweb@gmail.com` recibe alerta con número anterior y nuevo |

---

### Estructura del Worker (`worker/src/index.js`)

El Worker maneja 3 tipos de email vía `POST { tipo, ...datos }`:

| `tipo` | Datos adicionales | Acción |
|---|---|---|
| `reset` | `email` | Genera link con Firebase Identity Toolkit → envía email branded |
| `nuevo_admin` | `email`, `password`, `storeName` | Envía credenciales al nuevo admin |
| `cambio_whatsapp` | `numero_nuevo`, `numero_anterior`, `tienda` | Alerta a `darodweb@gmail.com` |

Secrets requeridos en Cloudflare: `RESEND_API_KEY`, `FIREBASE_SERVICE_ACCOUNT` (JSON completo), `FIREBASE_PROJECT_ID`.

## Local Server

```bash
node serve.mjs
# → http://localhost:3000
```

Always serve on localhost — never screenshot a `file:///` URL. Start `serve.mjs` in the background before taking any screenshots. Do not start a second instance if already running.

## Reference Images
- If a reference image is provided: match layout, spacing, typography, and color exactly. Swap in placeholder content (images via `https://placehold.co/`, generic copy). Do not improve or add to the design.
- If no reference image: design from scratch with high craft (see guardrails below).
- Screenshot your output, compare against reference, fix mismatches, re-screenshot. Do at least 2 comparison rounds. Stop only when no visible differences remain or user says so.

## Brand Assets
- Logo lives in `branding/`. Check there before designing.
- If a color palette is defined, use those exact values — do not invent brand colors.

## Anti-Generic Guardrails
- **Colors:** Never use default Tailwind palette (indigo-500, blue-600, etc.). Pick a custom brand color and derive from it.
- **Shadows:** Never use flat `shadow-md`. Use layered, color-tinted shadows with low opacity.
- **Typography:** Never use the same font for headings and body. Pair a display/serif with a clean sans. Apply tight tracking (`-0.03em`) on large headings, generous line-height (`1.7`) on body.
- **Gradients:** Layer multiple radial gradients. Add grain/texture via SVG noise filter for depth.
- **Animations:** Only animate `transform` and `opacity`. Never `transition-all`. Use spring-style easing.
- **Interactive states:** Every clickable element needs hover, focus-visible, and active states. No exceptions.
- **Images:** Add a gradient overlay (`bg-gradient-to-t from-black/60`) and a color treatment layer with `mix-blend-multiply`.
- **Spacing:** Use intentional, consistent spacing tokens — not random Tailwind steps.
- **Depth:** Surfaces should have a layering system (base → elevated → floating), not all sit at the same z-plane.

## Hard Rules
- Do not add sections, features, or content not in the reference
- Do not "improve" a reference design — match it
- Do not stop after one screenshot pass
- Do not use `transition-all`
- Do not use default Tailwind blue/indigo as primary color
