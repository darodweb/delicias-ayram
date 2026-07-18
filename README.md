# Tienda Online WhatsApp — Guía de Onboarding

Template de tienda online estática con catálogo desde Firestore y pedidos por WhatsApp.  
Cada cliente es un proyecto independiente derivado de este template.

---

## Índice

1. [Checklist de información a pedirle al cliente](#1-checklist-de-información-a-pedirle-al-cliente)
2. [Crear el proyecto del cliente](#2-crear-el-proyecto-del-cliente)
3. [Logo y assets de marca](#3-logo-y-assets-de-marca)
4. [Colores (CSS variables)](#4-colores-css-variables)
5. [Tipografías](#5-tipografías)
6. [CONFIG en index.js y producto.js](#6-config-en-indexjs-y-productojs)
7. [Firebase y Firestore](#7-firebase-y-firestore)
8. [Panel de administración](#8-panel-de-administración)
9. [Horarios de atención](#9-horarios-de-atención)
10. [Opciones de entrega y pago](#10-opciones-de-entrega-y-pago)
11. [Textos del sitio](#11-textos-del-sitio)
12. [Test local](#12-test-local)
13. [Deploy en Netlify](#13-deploy-en-netlify)
14. [Cambios y actualizaciones en producción](#14-cambios-y-actualizaciones-en-producción)
15. [Entrega al cliente](#15-entrega-al-cliente)
16. [Referencia rápida de archivos](#16-referencia-rápida-de-archivos)
17. [Imagen Hero con IA](#17-imagen-hero-con-ia)
18. [SEO](#18-seo)

---

## 1. Checklist de información a pedirle al cliente

Antes de arrancar pedile al cliente **todo esto junto** para no ir de a uno:

```
[ ] Nombre del negocio
[ ] Tagline / slogan (ej: "Pedí fácil, comé rico")
[ ] Número de WhatsApp con código de país (ej: +5493547604687)
[ ] Logo en PNG o JPG (fondo transparente si es posible)
[ ] Colores de marca (puede ser "usá los colores del logo")
[ ] Tipografías preferidas (o indicar el estilo: moderno, clásico, divertido, etc.)
[ ] Catálogo de productos (nombre, descripción, precio, categoría, foto, badge)
[ ] Horarios de atención (días y horas, si aplica)
[ ] Formas de entrega que ofrece (retiro en local, envío a domicilio, ambos)
[ ] Formas de pago que acepta (efectivo, transferencia, tarjeta, etc.)
[ ] Textos del hero: título principal y subtítulo
```

---

## 2. Crear el proyecto del cliente

```bash
# Duplicar la carpeta del template
cp -r tienda-online-v2 nombre-cliente

# Entrar al proyecto
cd nombre-cliente

# Iniciar repositorio nuevo (no heredar el historial del template)
git init
git add .
git commit -m "Initial commit — tienda online [Nombre Cliente]"
```

Crear un repositorio nuevo en GitHub para el cliente y conectarlo:
```bash
git remote add origin https://github.com/darodweb/nombre-cliente.git
git push -u origin main
```

---

## 3. Logo y assets de marca

1. Guardar el logo recibido (PNG/JPG) en la carpeta `branding/` con el nombre `logo.png`
2. Si hay versión oscura o variantes, guardarlas también ahí (`logo-dark.png`, etc.)
3. Referenciar el logo en `index.html` — reemplazar el bloque del nombre en el header:

```html
<!-- Antes (solo texto): -->
<div class="store-name" id="storeName">Mi Tienda</div>

<!-- Después (con logo): -->
<img src="branding/logo.png" alt="Nombre del negocio" class="store-logo">
```

4. Agregar el estilo en `styles.css`:

```css
.store-logo {
  height: 40px;
  width: auto;
  object-fit: contain;
}
```

> Si el cliente **no tiene logo**, dejar el bloque de texto y personalizar solo tipografía y color.

---

## 4. Colores (CSS variables)

Abrir `styles.css` y editar el bloque `:root` al inicio del archivo.  
Cambiar estas variables cambia toda la paleta del sitio.

```css
:root {
  /* ── Paleta base ── */
  --bg:        #FDF8F5;   /* fondo general de la página */
  --surface:   #FFFFFF;   /* tarjetas, modales */
  --surface-2: #FBF0EC;   /* superficies secundarias */
  --surface-3: #F0DDD8;   /* bordes suaves, elementos deshabilitados */

  /* ── Color de acento (el más importante — derivar del logo) ── */
  --accent:      #C75449;              /* color principal de botones y highlights */
  --accent-dim:  rgba(199,84,73,0.10); /* fondo suave del acento */
  --accent-glow: rgba(199,84,73,0.22); /* sombra con color */

  /* ── Textos ── */
  --text:   #2A1410;   /* texto principal */
  --text-2: #7A4840;   /* texto secundario */
  --text-3: #B08880;   /* texto terciario / placeholder */

  /* ── Bordes ── */
  --border:   rgba(42,20,16,0.08);
  --border-2: rgba(42,20,16,0.13);
}
```

Hacer lo mismo en `admin/index.html` (tiene su propio bloque `:root` con los mismos tokens).

### Workflow para extraer colores del logo

1. Abrir el logo en [imagecolorpicker.com](https://imagecolorpicker.com) o con el eyedropper del sistema
2. Tomar el **color dominante** del logo → ese es tu `--accent`
3. Calcular `--accent-dim` y `--accent-glow` con el mismo HEX y opacidad reducida:
   ```
   --accent-dim:  rgba(R, G, B, 0.10)
   --accent-glow: rgba(R, G, B, 0.22)
   ```
4. Ajustar `--bg`, `--surface-2` y `--surface-3` a tonos neutros o muy desaturados del mismo matiz
5. Ajustar `--text`, `--text-2`, `--text-3` a versiones oscuras y desaturadas del acento

> **Regla práctica:** acento cálido (rojo, naranja, terracota) → fondos hacia cremas. Acento frío (azul, verde, violeta) → fondos hacia blancos fríos o grises claros.

---

## 5. Tipografías

Las fuentes se definen con dos variables en `styles.css`:

```css
--font-display: 'Cormorant Garamond', Georgia, serif;  /* títulos grandes y hero */
--font-body:    'Archivo', system-ui, sans-serif;       /* todo el cuerpo de texto */
```

### Cambiar tipografías

1. Elegir el par en [fonts.google.com](https://fonts.google.com)
2. En `index.html` reemplazar el `<link>` de Google Fonts (~línea 8):

```html
<link href="https://fonts.googleapis.com/css2?family=DISPLAY:wght@400;600;700&family=BODY:wght@400;500;600&display=swap" rel="stylesheet">
```

3. En `styles.css` actualizar las variables:

```css
--font-display: 'Nombre Display', serif;
--font-body:    'Nombre Body', sans-serif;
```

4. Actualizar también el `<link>` y las variables en `admin/index.html`.

### Pares recomendados por estilo

| Estilo del negocio | Display | Body |
|---|---|---|
| Artesanal / elegante | Cormorant Garamond | Archivo |
| Moderno / urbano | Plus Jakarta Sans | Inter |
| Divertido / juvenil | Nunito | Quicksand |
| Clásico / formal | Playfair Display | Lato |
| Natural / orgánico | Lora | Nunito Sans |

---

## 6. CONFIG en `index.js` y `producto.js`

Abrir `index.js` y editar el objeto `CONFIG` al inicio del archivo:

```js
const CONFIG = {
  nombre:         "",           // fallback hasta que Firestore responda
  heroTitle:      "",
  heroSubtitle:   "",
  moneda:         "$",
  whatsappNumero: "+549XXXXXXXXXX",   // código de país + número sin espacios ni +

  horarios: {
    activo: false,   // false = siempre abierto (puede activarse desde admin)
    semana: { ... }
  },
};
```

> Estos valores son **fallbacks**: se muestran mientras Firestore carga. Los valores reales se sobreescriben desde el documento `config/tienda` en Firestore (gestionado por el admin).

`producto.js` tiene su propio `CONFIG` con solo `nombre`, `moneda` y `whatsappNumero`. **Mantenerlos sincronizados.** También tiene su propio `FIREBASE_CONFIG`. Al configurar un cliente nuevo hay que actualizar ambos archivos.

### Actualizar FIREBASE_CONFIG

Reemplazar en `index.js`, `producto.js` y `admin/index.html`:

```js
const FIREBASE_CONFIG = {
  apiKey:            "...",
  authDomain:        "proyecto.firebaseapp.com",
  projectId:         "proyecto",
  storageBucket:     "proyecto.firebasestorage.app",
  messagingSenderId: "...",
  appId:             "...",
};
```

---

## 7. Firebase y Firestore

### Crear el proyecto Firebase

1. Ir a [console.firebase.google.com](https://console.firebase.google.com) → **Agregar proyecto**
2. Habilitar **Firestore Database** (modo producción)
3. Habilitar **Authentication → Email/Password** para el acceso al admin
4. Crear el usuario admin: `Authentication → Users → Agregar usuario`
5. Copiar las claves del proyecto (`Project settings → Your apps → Web app`) y pegarlas en `FIREBASE_CONFIG`

### Reglas de seguridad de Firestore

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

### Estructura de datos

**Colección `productos`** — cada documento es un producto:

| Campo | Tipo | Descripción |
|---|---|---|
| `nombre` | string | Obligatorio |
| `descripcion` | string | Descripción corta |
| `precio` | number | 0 = muestra botón "Consultar" |
| `categoria` | string | Obligatorio — case-sensitive |
| `imagen` | string | URL de Cloudinary |
| `texto_adicional` | string | Badge/etiqueta sobre la tarjeta (ej: "Nuevo", "Oferta") |
| `disponible` | boolean | false = "Agotado" |
| `createdAt` | timestamp | Asignado automáticamente al crear |

**Documento `config/tienda`** — configuración general de la tienda:

| Campo | Tipo | Descripción |
|---|---|---|
| `nombre` | string | Nombre del negocio |
| `heroTitle` | string | Título principal del hero |
| `heroSubtitle` | string | Subtítulo del hero |
| `heroImagen` | string | URL Cloudinary — imagen de fondo del hero |
| `whatsappNumero` | string | Número de WhatsApp con código de país |
| `heroImagePrompt` | string | Prompt de ChatGPT para generar la imagen hero; si está ausente se usa `DEFAULT_HERO_PROMPT` del admin |

**Documento `config/horarios`** — horarios de atención (gestionado desde admin):

Mismo formato que `CONFIG.horarios` en `index.js`.

**Documento `config/extras`** — adicionales por categoría (gestionado desde admin):

```js
{
  "Hamburguesas": [
    { "id": "cheddar", "nombre": "Extra queso cheddar", "precio": 500 },
    { "id": "jamon",   "nombre": "Extra jamón",          "precio": 600 }
  ],
  "Pizzas": [ ... ]
}
```

Las claves deben coincidir exactamente (case-sensitive) con los valores de `categoria` en Firestore.

### Cloudinary

Las imágenes se suben a Cloudinary desde el admin. Actualizar en `admin/index.html`:

```js
const CLOUD_NAME    = "tu-cloud-name";
const UPLOAD_PRESET = "tu-upload-preset-unsigned";
```

---

## 8. Panel de administración

Acceder en `http://localhost:3000/admin/` (o en la URL de producción).

Usa Firebase Auth (email/password). El admin tiene tres secciones:

### Productos

CRUD completo de la colección `productos` en Firestore:
- Ver todos los productos en una tabla con búsqueda por nombre o categoría
- Crear producto: formulario con todos los campos del schema
- Editar producto: modal precargado con los datos actuales
- Eliminar producto: confirmación antes de borrar
- Subir imagen: drag & drop o selector de archivo → se sube a Cloudinary, la URL se guarda en Firestore
- Toggle de disponibilidad desde la tabla (sin abrir el modal)

### Horarios

Editor visual de horarios de atención por día:
- Activar/desactivar el sistema de horarios
- Configurar franjas horarias por día (turno simple o dividido)
- Guardar en `config/horarios` en Firestore

### Configuración

Editor de la configuración general de la tienda:
- Nombre, título hero, subtítulo hero
- Imagen hero: drag & drop → Cloudinary → actualiza `config/tienda.heroImagen`
- WhatsApp número
- Adicionales (extras) por categoría: editor de JSON estructurado que guarda en `config/extras`
- Prompt de imagen hero: campo de texto editable con botones **Copiar prompt** y **Restaurar por defecto** — se guarda en `config/tienda.heroImagePrompt`
- Guardar todo en `config/tienda`

---

## 9. Horarios de atención

Los horarios se gestionan desde el panel admin (sección Horarios), que escribe en `config/horarios` en Firestore.

Los valores de fallback en `CONFIG.horarios` de `index.js` se usan mientras Firestore carga:

```js
horarios: {
  activo: false,   // false = desactivar (siempre abierto)
  semana: {
    lunes:     [{ abre: "09:00", cierra: "20:00" }],
    martes:    [{ abre: "09:00", cierra: "20:00" }],
    miercoles: [{ abre: "09:00", cierra: "20:00" }],
    jueves:    [{ abre: "09:00", cierra: "20:00" }],
    viernes:   [{ abre: "09:00", cierra: "20:00" }],
    sabado:    [{ abre: "10:00", cierra: "14:00" }],
    domingo:   null,   // null = cerrado todo el día
  }
},
```

**Horario cortado** (mañana y tarde):
```js
lunes: [{ abre: "09:00", cierra: "13:00" }, { abre: "17:00", cierra: "21:00" }],
```

Cuando el negocio está fuera de horario:
- Se muestra un banner en la parte superior
- Los botones de agregar al carrito se deshabilitan
- El botón de enviar pedido por WhatsApp se bloquea

---

## 10. Opciones de entrega y pago

Editar en `index.html` los `<select>` del formulario del carrito:

```html
<!-- Formas de entrega -->
<select required id="deliveryMethod">
  <option value="retiro">Retiro en local</option>
  <option value="envio">Envío a domicilio</option>
</select>

<!-- Formas de pago -->
<select required id="paymentMethod">
  <option value="efectivo">Efectivo</option>
  <option value="transferencia">Transferencia</option>
</select>
```

También actualizar los labels en `index.js` función `sendToWhatsApp()`:

```js
const dLabels = { retiro: "Retiro en local", envio: "Envio a domicilio" };
const pLabels = { efectivo: "Efectivo", transferencia: "Transferencia" };
```

> Los `value` de los `<option>` deben coincidir exactamente con las keys de `dLabels` y `pLabels`.

---

## 11. Textos del sitio

Los textos del hero y el nombre del negocio se gestionan desde el admin (sección **Configuración**) y se guardan en el documento `config/tienda` de Firestore. Se cargan automáticamente al visitar la tienda.

Los valores en `CONFIG` de `index.js` son fallbacks visibles solo durante la carga inicial.

| Campo | Dónde editarlo | Descripción |
|---|---|---|
| Nombre del negocio | Admin → Configuración | Header y tab del navegador |
| Título del hero | Admin → Configuración | Título grande de bienvenida |
| Subtítulo del hero | Admin → Configuración | Descripción debajo del título |
| Imagen del hero | Admin → Configuración | Fondo del hero, sube a Cloudinary |

---

## 12. Test local

```bash
node serve.mjs
# → http://localhost:3000
```

**Checklist antes de entregar:**

```
[ ] Logo se ve correctamente en el header
[ ] Colores coinciden con la marca del cliente
[ ] Catálogo carga desde Firestore
[ ] Categorías filtran correctamente
[ ] Se puede agregar al carrito y modificar cantidades
[ ] El pedido por WhatsApp llega con todos los datos correctos
[ ] Admin: crear, editar y eliminar producto funciona
[ ] Admin: subir imagen funciona (sube a Cloudinary)
[ ] Admin: horarios se guardan y se reflejan en la tienda
[ ] Admin: configuración guarda nombre, hero y WhatsApp
[ ] Si horarios activos: el banner aparece fuera de horario
[ ] El modal de horarios abre y muestra días y franjas correctos
[ ] Botones de agregar deshabilitados cuando está cerrado
[ ] Link "DR" en el footer funciona (click to chat)
[ ] Probado en celular (responsive)
```

---

## 13. Deploy en Netlify

El proyecto incluye `netlify.toml` en la raíz con la configuración necesaria (directorio de publicación, redirects para `/admin`, headers de seguridad). No requiere configuración adicional en el dashboard de Netlify.

### Setup inicial (una sola vez por cliente)

1. Asegurarse de que el repo del cliente está en GitHub (privado está bien — Netlify gratuito lo soporta)
2. En [app.netlify.com](https://app.netlify.com): `Add new site → Import an existing project → GitHub`
3. Seleccionar el repo y el branch `main`
4. Build command: **dejar vacío** — Netlify detecta `netlify.toml` automáticamente
5. Deploy

A partir de este momento, **cada `git push` a `main` deploya a producción automáticamente**.

### Dominio custom

En Netlify → **Domain management → Add custom domain** → ingresar el dominio del cliente.  
Pedirle al cliente que agregue en su DNS:
- Un registro `A` apuntando a la IP que Netlify indica, o
- Un registro `CNAME` de `www` al subdominio `*.netlify.app` del sitio

Netlify provisiona HTTPS automáticamente (Let's Encrypt) una vez que los DNS propagan.

> El plan gratuito de GitHub permite repositorios privados ilimitados. No es necesario hacer el repo público para conectarlo a Netlify.

---

## 14. Cambios y actualizaciones en producción

El sitio tiene dos partes con ciclos de deploy independientes:

| Parte | Cómo se deploya |
|---|---|
| Frontend (HTML/JS/CSS) | `git push origin main` → Netlify CD automático |
| Cloudflare Worker (`/worker`) | `wrangler deploy` desde la carpeta `worker/` |

Los datos (productos, configuración, horarios) se gestionan desde el admin y se guardan en Firestore — no requieren ningún deploy.

---

### Flujo estándar para cualquier cambio de código

```bash
# 1. Crear un branch para el cambio
git checkout -b fix/nombre-del-cambio

# 2. Hacer los cambios en el código

# 3. Pushear el branch
git push origin fix/nombre-del-cambio
# → Netlify genera automáticamente una Preview URL para probar
#    (aparece en el dashboard del site y en el PR de GitHub)

# 4. Verificar el cambio en la Preview URL

# 5. Mergear a main → deploy automático a producción
git checkout main
git merge fix/nombre-del-cambio
git push origin main
```

El deploy de Netlify para este sitio estático tarda menos de 10 segundos.

---

### Cambios al Cloudflare Worker

El Worker se deploya por separado, independientemente de Netlify:

```bash
cd worker
# hacer cambios en src/index.js
wrangler deploy
# → Cloudflare actualiza instantáneamente, sin downtime
```

**Cuando un cambio afecta a ambos** (frontend + Worker), deployar primero el Worker y luego mergear a `main`. El orden inverso puede causar una ventana breve de incompatibilidad.

---

### Rollback

- **Frontend:** Netlify dashboard → pestaña **Deploys** → click en cualquier deploy anterior → **Publish deploy**. Instantáneo, sin tocar Git.
- **Worker:** redesployar el commit anterior con `wrangler deploy` desde ese commit.

---

### Qué no requiere deploy

Estos cambios se aplican en tiempo real desde el admin, sin tocar código ni hacer push:

- Agregar, editar o eliminar productos
- Cambiar nombre, textos del hero o imagen hero
- Modificar el número de WhatsApp
- Activar/desactivar horarios o cambiar franjas horarias
- Editar adicionales (extras) por categoría

---

## 15. Entrega al cliente

Una vez desplegado, enviar al cliente:

```
✅ URL del sitio: https://nombre-cliente.netlify.app
✅ URL del admin: https://nombre-cliente.netlify.app/admin/
✅ Credenciales de acceso al admin (email + contraseña)
✅ Instrucciones: gestionar productos, horarios y configuración desde el admin
✅ Contacto para soporte
```

---

## 16. Referencia rápida de archivos

| Archivo | Qué editar |
|---|---|
| `index.js` | `CONFIG` (fallbacks), `FIREBASE_CONFIG`, `dLabels`/`pLabels`, `sendToWhatsApp()` |
| `producto.js` | `CONFIG` y `FIREBASE_CONFIG` — mantener sincronizados con `index.js` |
| `styles.css` | Variables de color y tipografía (`:root` al inicio) |
| `index.html` | Opciones de entrega/pago, logo en header, Google Fonts |
| `producto.html` | Página de detalle de producto |
| `admin/index.html` | `FIREBASE_CONFIG`, `CLOUD_NAME`, `UPLOAD_PRESET`, variables CSS |
| `branding/` | Logo e imágenes estáticas del cliente |
| `serve.mjs` | Servidor local (`node serve.mjs` → localhost:3000) |

---

## 17. Imagen Hero con IA

Parte del onboarding de cada cliente. Usás 2-3 fotos de sus productos para generar una imagen hero fotorrealista para la homepage.

### Herramienta
ChatGPT (GPT-4o con generación de imágenes)

### Pasos

1. Pedile al cliente 2-3 fotos de sus productos (las mejores que tenga)
2. Abrí ChatGPT, adjuntá las fotos en el mensaje
3. Pegá el siguiente prompt y enviá:

---

**Prompt:**
Tengo [2 / 3] fotos reales de productos de una hamburguesería que voy a adjuntar.
No edites ni uses las fotos directamente. Úsalas SOLO como referencia visual para:
- El estilo, color y textura de la comida
- El mood y la paleta de colores general
- El tipo de presentación (rústica, premium, casual, etc.)

Generá una imagen NUEVA, fotorrealista, que funcione como hero banner para un sitio web.

COMPOSICIÓN:
- Una hamburguesa principal en primer plano, ligeramente descentrada hacia la izquierda (regla de tercios)
- Uno o dos elementos secundarios del menú en segundo plano, desenfocados (bokeh suave)
- Fondo oscuro, con iluminación de estudio: una fuente de luz cálida desde arriba-izquierda generando sombras dramáticas
- Superficie de presentación: tabla de madera oscura o mármol negro mate

ESTILO FOTOGRÁFICO:
- Food photography editorial de nivel profesional
- Profundidad de campo reducida (f/2.8 simulado)
- Sin filtros Instagram ni sobreexposición
- Colores: cálidos en los alimentos (dorados, marrones, rojos), fondo neutro oscuro

RESTRICCIONES TÉCNICAS:
- Proporción: 16:9 (landscape), apta para banner web full-width
- Sin texto, logos, watermarks ni elementos gráficos
- Sin manos, personas ni utensilios en el encuadre
- Sin fondos blancos ni estilo e-commerce

RESULTADO: una sola imagen, fotorrealista, lista para usar como hero de homepage.

---

Una vez generada, subirla desde el admin (sección **Configuración → Imagen hero**).

### Personalizar el prompt desde el admin

El prompt usado para generar la imagen se guarda en `config/tienda.heroImagePrompt` y es editable directamente desde el admin (sección **Configuración**). Desde ahí podés:

- Editarlo y guardarlo junto al resto de la configuración
- **Copiar prompt** — lo copia al portapapeles listo para pegar en ChatGPT
- **Restaurar por defecto** — vuelve al `DEFAULT_HERO_PROMPT` definido en `admin/index.html`

Si el campo está vacío en Firestore, el admin siempre usa el prompt por defecto.

---

## 18. SEO

El sitio incluye optimización SEO completa. Las etiquetas se rellenan dinámicamente con el nombre del negocio guardado en Firestore (`config/tienda.nombre`), sin hardcodear ningún nombre en el HTML.

### Qué está implementado

| Elemento | Página | Cómo se genera |
|---|---|---|
| `<title>` rico | Ambas | JS — `nombre` en catálogo, `producto \| nombre` en detalle |
| `<meta description>` | Ambas | JS — tagline en catálogo, descripción del producto en detalle |
| Open Graph (og:title, og:description, og:image, og:url) | Ambas | JS — dinámico |
| Twitter Card | Ambas | JS — dinámico |
| `<link rel="canonical">` | Ambas | JS — URL actual con `window.location.origin` |
| JSON-LD `FoodEstablishment` | Catálogo | JS — inyectado por `updateIndexSEO()` en `index.js` |
| JSON-LD `Product` | Detalle | JS — inyectado por `updateSEO()` en `producto.js` |
| `<meta name="robots" content="noindex, nofollow">` | Admin | HTML estático — evita que Google indexe el panel |
| `robots.txt` | Raíz | Bloquea `/admin/`, apunta al sitemap |
| `sitemap.xml` | Raíz | Lista el catálogo (productos no se pueden enumerar estáticamente) |
| `alt` en imágenes | Ambas | JS — nombre del producto/categoría |
| `loading="lazy"` | Ambas | HTML — ya implementado |
| Scripts con `defer` | Ambas | HTML — mejora Core Web Vitals |

### Activar con dominio real

Buscar y reemplazar `TU-DOMINIO.COM` en estos tres archivos:

```
index.html   →  canonical, og:url, og:image, og:url del JSON-LD
robots.txt   →  Sitemap:
sitemap.xml  →  <loc>
```

Las etiquetas `og:url` y `canonical` de `producto.html` usan `window.location.origin` → se actualizan solas con cualquier dominio.

### Imagen OG (og:image)

Para que las previsualizaciones en WhatsApp, Instagram y LinkedIn se vean bien:

1. Crear una imagen de `1200 × 630 px` con el logo y el nombre del negocio
2. Guardarla en `branding/og-image.jpg`
3. Reemplazar `TU-DOMINIO.COM/branding/og-image.jpg` con la URL pública real

### Checklist SEO antes de entregar

```
[ ] Reemplazar TU-DOMINIO.COM en index.html, robots.txt y sitemap.xml
[ ] Subir og-image.jpg a branding/ y actualizar la URL en index.html
[ ] Verificar con Google Rich Results Test que el JSON-LD no tenga errores
[ ] Enviar sitemap.xml a Google Search Console
[ ] Verificar en DevTools → Elements → <head> que los metas se rellenan al cargar
```

---

*Template desarrollado por [DR](https://wa.me/5493547604687?text=Hola%20Daniel.%20Estoy%20interesado(a)%20en%20un%20sitio%20para%20mi%20negocio.)*
