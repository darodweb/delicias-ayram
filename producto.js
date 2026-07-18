// ============================================================
//  FIREBASE
// ============================================================
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDPZtciDRN4f7PvjJPXGl_qm9M2aNjdMJI",
  authDomain:        "delicias-ayram.firebaseapp.com",
  projectId:         "delicias-ayram",
  storageBucket:     "delicias-ayram.firebasestorage.app",
  messagingSenderId: "67443020524",
  appId:             "1:67443020524:web:fdf4caca518e1c5b4f8bc9",
};
firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();

// ============================================================
//  CONFIGURACIÓN — mantener sincronizado con index.js
// ============================================================
const CONFIG = {
  nombre:         "",
  moneda:         "$",
  whatsappNumero: "+5493515554665",
  horarios: {
    activo: false,
    semana: {}
  },
};

// ============================================================
//  ADICIONALES POR CATEGORÍA
//  La clave debe coincidir exactamente con el valor del campo
//  "categoria" en Firestore.
//  Las categorías sin entrada aquí no muestran adicionales.
//
//  Ejemplo:
//  "Pizzas": [
//    { id: 'cheddar', nombre: 'Extra queso cheddar', precio: 150 },
//    { id: 'jamon',   nombre: 'Extra jamón',          precio: 180 },
//  ],
// ============================================================
let extrasConfig = {};
const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

// ── Horarios ──────────────────────────────────────────────────────────────

let storeIsOpen = true;

function isOpen() {
  if (!CONFIG.horarios || !CONFIG.horarios.activo) return true;
  const DAYS = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
  const now = new Date();
  const dayIdx = now.getDay();
  const cur = now.getHours() * 60 + now.getMinutes();

  function checkFranjas(franjas, onlyCarryover) {
    if (!franjas || franjas.length === 0) return false;
    return franjas.some(f => {
      const [ah, am] = f.abre.split(':').map(Number);
      const [ch, cm] = f.cierra.split(':').map(Number);
      const openMin = ah * 60 + am;
      const rawClose = ch * 60 + cm;
      if (rawClose > 0 && rawClose < openMin) {
        // Cross-midnight range (e.g. 09:00–00:30)
        return onlyCarryover ? cur < rawClose : (cur >= openMin || cur < rawClose);
      }
      if (onlyCarryover) return false;
      const closeMin = rawClose || 1440; // "00:00" → end of day
      return cur >= openMin && cur < closeMin;
    });
  }

  if (checkFranjas(CONFIG.horarios.semana[DAYS[dayIdx]], false)) return true;

  // Check yesterday for cross-midnight carryover
  const prevIdx = (dayIdx + 6) % 7;
  return checkFranjas(CONFIG.horarios.semana[DAYS[prevIdx]], true);
}

function checkHorarios() {
  if (!CONFIG.horarios || !CONFIG.horarios.activo) { storeIsOpen = true; return; }
  storeIsOpen = isOpen();
  renderBottomBar();
}

async function loadSchedule() {
  try {
    const doc = await db.collection("config").doc("horarios").get();
    if (doc.exists) CONFIG.horarios = doc.data();
  } catch {}
}

async function loadExtrasConfig() {
  try {
    const doc = await db.collection("config").doc("extras").get();
    if (doc.exists) extrasConfig = doc.data();
  } catch {}
}

function getExtras() {
  return (product && extrasConfig[product.categoria]) || [];
}

// ============================================================

function injectJSONLD(id, obj) {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const s = document.createElement("script");
  s.type = "application/ld+json";
  s.id = id;
  s.textContent = JSON.stringify(obj);
  document.head.appendChild(s);
}

function updateSEO(p) {
  const storeName = CONFIG.nombre || "Tienda Online";
  const url  = window.location.origin + window.location.pathname + "?id=" + p.id;
  const desc = p.descripcion || p.nombre;
  const title = p.nombre + " | " + storeName;

  document.title = title;
  const setById = (id, value) => { const el = document.getElementById(id); if (el) el.content = value; };
  const setCanonical = () => { const el = document.getElementById("canonical"); if (el) el.href = url; };

  setById("metaDesc",   desc);
  setCanonical();
  setById("ogTitle",    title);
  setById("ogDesc",     desc);
  setById("ogImage",    p.imagen || "");
  setById("ogUrl",      url);
  setById("ogSiteName", storeName);
  setById("twTitle",    title);
  setById("twDesc",     desc);
  setById("twImage",    p.imagen || "");

  injectJSONLD("product-jsonld", {
    "@context": "https://schema.org",
    "@type":    "Product",
    "name":        p.nombre,
    "description": p.descripcion || "",
    "image":       p.imagen || "",
    "offers": {
      "@type":        "Offer",
      "price":        p.precio,
      "priceCurrency":"ARS",
      "availability": p.disponible
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock"
    }
  });
}

async function loadStoreConfig() {
  try {
    const doc = await db.collection("config").doc("tienda").get();
    if (doc.exists) {
      const d = doc.data();
      if (d.whatsappNumero) CONFIG.whatsappNumero = d.whatsappNumero;
      if (d.nombre) {
        CONFIG.nombre = d.nombre;
        const navTitle = document.getElementById("navTitle");
        if (navTitle && navTitle.textContent && navTitle.textContent !== "Cargando…") {
          document.title = `${navTitle.textContent} — ${CONFIG.nombre}`;
        }
      }
    }
  } catch {}
}

let product  = null;
let qty      = 1;
const extrasQty = {};

// ===== INIT =====

async function init() {
  const params    = new URLSearchParams(window.location.search);
  const productId = params.get("id"); // string Firestore ID

  if (!productId) { goBack(); return; }

  await Promise.all([loadStoreConfig(), loadExtrasConfig(), loadSchedule()]);
  checkHorarios();
  setInterval(checkHorarios, 30_000);

  try {
    const raw = localStorage.getItem("tienda_products");
    if (raw) {
      const { data } = JSON.parse(raw);
      product = (data || []).find(p => p.id === productId) || null;
    }
  } catch {}

  if (product) {
    render();
  } else {
    fetchProduct(productId);
  }
}

async function fetchProduct(targetId) {
  try {
    const docSnap = await db.collection("productos").doc(targetId).get();
    if (docSnap.exists) {
      const d = docSnap.data();
      product = {
        id:              docSnap.id,
        nombre:          d.nombre          || "",
        descripcion:     d.descripcion     || "",
        precio:          parseFloat(d.precio) || 0,
        categoria:       d.categoria       || "General",
        imagen:          d.imagen          || "",
        texto_adicional: d.texto_adicional || "",
        disponible:      d.disponible !== false,
      };
      try {
        const raw = localStorage.getItem("tienda_products");
        const { data = [], ts = 0 } = raw ? JSON.parse(raw) : {};
        if (!data.find(p => p.id === product.id)) {
          data.push(product);
          localStorage.setItem("tienda_products", JSON.stringify({ data, ts }));
        }
      } catch {}
      render();
    } else {
      document.getElementById("navTitle").textContent = "No encontrado";
    }
  } catch {
    document.getElementById("navTitle").textContent = "Error al cargar";
  }
}

// ===== LOADER =====

function hideLoader() {
  const el = document.getElementById('pageLoader');
  if (!el) return;
  el.classList.add('is-hiding');
  setTimeout(() => el.remove(), 350);
}

// ===== RENDER =====

function render() {
  hideLoader();
  updateSEO(product);
  document.getElementById("navTitle").textContent = product.nombre;

  const hero = document.getElementById("productHero");
  hero.innerHTML = "";
  if (product.imagen) {
    const img = document.createElement("img");
    img.src = product.imagen;
    img.alt = product.nombre;
    hero.appendChild(img);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "product-hero-placeholder";
    const span = document.createElement("span");
    span.textContent = product.nombre.charAt(0).toUpperCase();
    placeholder.appendChild(span);
    hero.appendChild(placeholder);
  }

  const badgeWrap = document.getElementById("productBadgeWrap");
  badgeWrap.innerHTML = "";
  if (product.texto_adicional) {
    const badge = document.createElement("span");
    badge.className = "product-badge";
    badge.style.cssText = "margin-bottom:0.8rem;display:inline-block";
    badge.textContent = product.texto_adicional;
    badgeWrap.appendChild(badge);
  }

  document.getElementById("productName").textContent = product.nombre;
  document.getElementById("productDesc").textContent = product.descripcion || "";

  renderPrice();
  renderExtras();
  renderBottomBar();

  document.getElementById("aclaraciones").addEventListener("input", function () {
    document.getElementById("charCount").textContent = `${this.value.length} / 200`;
  });
}

function renderPrice() {
  const el = document.getElementById("priceSection");

  if (!product.disponible) {
    el.innerHTML = `<p class="price-consultar-text" style="font-style:normal;color:var(--text-3)">Este producto no está disponible.</p>`;
    return;
  }
  if (!product.precio) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = `
    <p class="price-label">Precio</p>
    <p class="price-value">${CONFIG.moneda}&nbsp;${product.precio.toLocaleString("es-AR")}</p>`;
}

// ===== ADICIONALES =====

function renderExtras() {
  if (!product.precio) return;
  const extras = getExtras();
  if (!extras.length) return;

  extras.forEach(e => { extrasQty[e.id] = 0; });

  const section = document.getElementById("extrasSection");
  const list    = document.getElementById("extrasList");

  list.innerHTML = extras.map(e => `
    <div class="extra-item">
      <div class="extra-info">
        <div class="extra-name">${esc(e.nombre)}</div>
        <div class="extra-price">${e.precio > 0 ? `+ ${CONFIG.moneda} ${e.precio.toLocaleString("es-AR")}` : 'Gratis'}</div>
      </div>
      <div class="extra-control">
        <button class="extra-btn" onclick="changeExtra('${esc(e.id)}', -1)">−</button>
        <span class="extra-qty" id="extqty-${esc(e.id)}">0</span>
        <button class="extra-btn plus" onclick="changeExtra('${esc(e.id)}', 1)">+</button>
      </div>
    </div>`).join("");

  section.style.display = "block";
}

function changeExtra(id, delta) {
  extrasQty[id] = Math.max(0, (extrasQty[id] || 0) + delta);
  document.getElementById(`extqty-${id}`).textContent = extrasQty[id];
  renderBottomBar();
}

// ===== BARRA INFERIOR =====

function renderBottomBar() {
  if (!product) return;
  const bar = document.getElementById("bottomBar");

  if (!product.disponible) {
    bar.innerHTML = `<button class="agregar-btn" disabled style="justify-content:center">Producto agotado</button>`;
    return;
  }

  if (!storeIsOpen) {
    bar.innerHTML = `<button class="agregar-btn" disabled style="justify-content:center">⏰ Estamos cerrados</button>`;
    return;
  }

  if (!product.precio) {
    bar.innerHTML = `
      <button class="consultar-wa-btn" onclick="consultarWhatsApp()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Consultar precio por WhatsApp
      </button>`;
    return;
  }

  const extrasTotal = getExtras().reduce((sum, e) => sum + (extrasQty[e.id] || 0) * e.precio, 0);
  const total       = (product.precio + extrasTotal) * qty;

  bar.innerHTML = `
    <div class="qty-bar-control">
      <button class="qty-bar-btn" onclick="changeQty(-1)">−</button>
      <span class="qty-bar-num" id="qtyNum">${qty}</span>
      <button class="qty-bar-btn" onclick="changeQty(1)">+</button>
    </div>
    <button class="agregar-btn" onclick="agregarAlCarrito()">
      <span>Agregar al pedido</span>
      <span class="agregar-btn-price">${CONFIG.moneda}&nbsp;${total.toLocaleString("es-AR")}</span>
    </button>`;
}

function changeQty(delta) {
  qty = Math.max(1, qty + delta);
  const el = document.getElementById("qtyNum");
  if (el) el.textContent = qty;
  renderBottomBar();
}

// ===== CARRITO =====

function agregarAlCarrito() {
  if (!storeIsOpen) return;
  const aclaraciones   = document.getElementById("aclaraciones").value.trim();
  const selectedExtras = getExtras()
    .filter(e => (extrasQty[e.id] || 0) > 0)
    .map(e => ({ id: e.id, nombre: e.nombre, precio: e.precio, qty: extrasQty[e.id] }));

  let cart = [];
  try { cart = JSON.parse(localStorage.getItem("tienda_cart") || "[]"); } catch {}

  const existing = cart.find(i => i.id === product.id);
  if (existing) {
    existing.qty += qty;
    if (aclaraciones) existing.aclaraciones = aclaraciones;
  } else {
    cart.push({
      id:          product.id,
      nombre:      product.nombre,
      precio:      product.precio,
      qty,
      aclaraciones,
      extras:      selectedExtras,
    });
  }

  localStorage.setItem("tienda_cart", JSON.stringify(cart));
  showConfirmation();
}

function showConfirmation() {
  const selectedExtras = getExtras().filter(e => (extrasQty[e.id] || 0) > 0);
  const extrasHtml = selectedExtras.length
    ? `<ul style="list-style:none;margin:0 0 1.2rem;padding:0;text-align:left">${
        selectedExtras.map(e =>
          `<li style="font-size:0.8rem;color:var(--text-2);padding:0.15rem 0">+ ${esc(e.nombre)} × ${extrasQty[e.id]}</li>`
        ).join("")
      }</ul>`
    : "";

  const overlay = document.createElement("div");
  overlay.className = "added-overlay";
  overlay.innerHTML = `
    <div class="added-card">
      <div class="added-check">✓</div>
      <p class="added-title">¡Agregado al pedido!</p>
      <p class="added-subtitle">${esc(product.nombre)} × ${qty}</p>
      ${extrasHtml}
      <div class="added-actions">
        <button class="added-secondary-btn" onclick="window.location.href='index.html'">
          Seguir eligiendo
        </button>
        <button class="added-primary-btn" onclick="window.location.href='index.html#cart'">
          Ver carrito →
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

// ===== WHATSAPP CONSULTA =====

function consultarWhatsApp() {
  const aclaraciones = document.getElementById("aclaraciones").value.trim();
  let msg = `Hola, te quiero consultar que precio tiene ${product.nombre}`;
  if (aclaraciones) msg += `\n\nAclaraciones: ${aclaraciones}`;
  window.open(`https://wa.me/${CONFIG.whatsappNumero}?text=${encodeURIComponent(msg)}`, "_blank");
}

// ===== NAVEGACIÓN =====

function goBack() {
  if (product && product.categoria) {
    window.location.href = `index.html?cat=${encodeURIComponent(product.categoria)}`;
  } else {
    window.location.href = "index.html";
  }
}

init();
