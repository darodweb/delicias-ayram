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
//  CONFIGURACIÓN — EDITÁ ESTOS VALORES
// ============================================================
const CONFIG = {
  nombre:      "",

  heroTitle:   "",
  heroSubtitle:"",
  moneda:      "$",
  whatsappNumero: "",

  // ── Horarios de atención ──────────────────────────────────────────────────
  horarios: {
    activo: false,
    semana: {}
  },
};
// ============================================================

const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
function plural(s) {
  if (!s) return s;
  if (/s$/i.test(s)) return s;
  if (/[aeiouáéíóú]$/i.test(s)) return s + 's';
  return s + 'es';
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let products = [];
let cart = [];
let activeCategory = "Todos";
let storeIsOpen = true;
let viewMode = "categories"; // "categories" | "products"

// ── Horarios ──────────────────────────────────────────────────────────────

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

function updateBadge() {
  const badge = document.getElementById('homepageBadge');
  if (!badge) return;
  if (storeIsOpen) {
    badge.textContent = '🔥 Abierto ahora';
    badge.classList.remove('badge-closed');
  } else {
    badge.textContent = '🔴 Cerrado';
    badge.classList.add('badge-closed');
  }
}

function checkHorarios() {
  if (!CONFIG.horarios || !CONFIG.horarios.activo) {
    storeIsOpen = true;
    updateBadge();
    return;
  }
  const wasOpen = storeIsOpen;
  storeIsOpen = isOpen();
  document.getElementById('closedBanner').style.display = storeIsOpen ? 'none' : 'block';
  updateBadge();
  if (wasOpen !== storeIsOpen && products.length) renderProducts();
}

function openScheduleModal() {
  const ORDER  = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
  const LABELS = { lunes:'Lunes', martes:'Martes', miercoles:'Miércoles', jueves:'Jueves', viernes:'Viernes', sabado:'Sábado', domingo:'Domingo' };
  document.getElementById('scheduleModalContent').innerHTML = ORDER.map(day => {
    const franjas = CONFIG.horarios.semana[day];
    const closed = !franjas || franjas.length === 0;
    const val = closed ? 'Cerrado' : franjas.map(f => `${f.abre} – ${f.cierra}`).join('<br>');
    return `<div class="sched-row${closed ? ' sched-row-closed' : ''}">
      <span class="sched-day">${LABELS[day]}</span>
      <span class="sched-hours">${val}</span>
    </div>`;
  }).join('');
  document.getElementById('scheduleModal').classList.add('open');
}

function closeScheduleModal() {
  document.getElementById('scheduleModal').classList.remove('open');
}

function setMetaById(id, value) {
  const el = document.getElementById(id);
  if (el) el.content = value;
}

function injectJSONLD(obj) {
  const existing = document.getElementById("org-jsonld");
  if (existing) existing.remove();
  const s = document.createElement("script");
  s.type = "application/ld+json";
  s.id = "org-jsonld";
  s.textContent = JSON.stringify(obj);
  document.head.appendChild(s);
}

function updateIndexSEO(nombre) {
  const desc = "Pedidos por WhatsApp.";
  document.title = nombre;
  setMetaById("metaDesc",    desc);
  setMetaById("ogTitle",     nombre);
  setMetaById("ogDesc",      desc);
  setMetaById("ogSiteName",  nombre);
  setMetaById("twTitle",     nombre);
  setMetaById("twDesc",      desc);
  injectJSONLD({
    "@context": "https://schema.org",
    "@type":    "FoodEstablishment",
    "name":        nombre,
    "telephone":   CONFIG.whatsappNumero
  });
}

async function loadStoreConfig() {
  try {
    const doc = await db.collection("config").doc("tienda").get();
    if (!doc.exists) return;
    const d = doc.data();

    if (d.nombre) {
      CONFIG.nombre = d.nombre;
      const storeNameEl = document.getElementById("storeName");
      if (storeNameEl) storeNameEl.textContent = CONFIG.nombre;
    }
    if (d.whatsappNumero) CONFIG.whatsappNumero = d.whatsappNumero;

    const heroTitle = document.getElementById("heroTitle");
    const heroSub   = document.getElementById("heroSubtitle");
    if (d.heroTitle)    { CONFIG.heroTitle    = d.heroTitle;    if (heroTitle) heroTitle.textContent = CONFIG.heroTitle; }
    if (d.heroSubtitle) { CONFIG.heroSubtitle = d.heroSubtitle; if (heroSub)   heroSub.textContent  = CONFIG.heroSubtitle; }
    if (d.heroImagen) {
      const heroBg = document.querySelector(".preview-hero-bg");
      if (heroBg) heroBg.style.backgroundImage = `url(${d.heroImagen})`;
    }

    const locationSection = document.getElementById("locationSection");
    const addressBlock    = document.getElementById("addressBlock");
    const mapContainer    = document.getElementById("mapContainer");

    if (d.direccion) {
      const el = document.getElementById("storeAddress");
      if (el) el.textContent = d.direccion;
      if (addressBlock) addressBlock.style.display = "flex";
      if (locationSection) locationSection.style.display = "";
    }
    if (d.mapEmbedHtml) {
      const parser = new DOMParser();
      const parsed = parser.parseFromString(d.mapEmbedHtml, "text/html");
      const iframeEl = parsed.querySelector("iframe");
      const src = iframeEl && iframeEl.getAttribute("src");
      if (src && src.startsWith("https://www.google.com/maps/embed")) {
        const frame = document.getElementById("storeMapFrame");
        if (frame) frame.src = src;
        if (mapContainer) mapContainer.style.display = "";
        if (locationSection) locationSection.style.display = "";
      }
    }

    updateIndexSEO(CONFIG.nombre);
  } catch {}
}

async function loadSchedule() {
  try {
    const doc = await db.collection("config").doc("horarios").get();
    if (doc.exists) CONFIG.horarios = doc.data();
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────

// ── Homepage ──────────────────────────────────────────────────────────────

function renderHomepageCategories() {
  const grid = document.getElementById('previewCatGrid');
  if (!grid) return;

  const cats = {};
  products.filter(p => p.disponible && p.categoria).forEach(p => {
    if (!cats[p.categoria]) cats[p.categoria] = { count: 0, imagen: '' };
    cats[p.categoria].count++;
    if (!cats[p.categoria].imagen && p.imagen) cats[p.categoria].imagen = p.imagen;
  });

  const sorted = Object.keys(cats)
    .map(n => ({ name: n, count: cats[n].count, imagen: cats[n].imagen }))
    .sort((a, b) => b.count - a.count);

  grid.innerHTML = '';
  sorted.forEach((cat, i) => {
    const card = document.createElement('div');
    card.className = 'preview-cat-card';
    card.style.transitionDelay = (i * 80) + 'ms';
    card.innerHTML = '<div class="preview-cat-img"></div><div class="preview-cat-overlay"><span class="preview-cat-name"></span></div>';
    if (cat.imagen) card.querySelector('.preview-cat-img').style.backgroundImage = `url(${cat.imagen})`;
    card.querySelector('.preview-cat-name').textContent = cap(plural(cat.name));
    card.onclick = () => goToCategory(cat.name);
    grid.appendChild(card);
  });
}

function initHomepageObservers() {
  if (initHomepageObservers._done) return;
  initHomepageObservers._done = true;

  function makeObs(childSel) {
    return new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        (childSel ? entry.target.querySelectorAll(childSel) : [entry.target])
          .forEach(el => el.classList.add('is-visible'));
        this.unobserve(entry.target);
      }.bind(this));
    }, { threshold: 0.2 });
  }

  const headObs = makeObs(null);
  document.querySelectorAll('.preview-section-heading').forEach(el => headObs.observe(el));

  const catGrid = document.getElementById('previewCatGrid');
  if (catGrid) makeObs('.preview-cat-card').observe(catGrid);

  const stepsList = document.querySelector('.preview-steps-list');
  if (stepsList) makeObs('.preview-step-row').observe(stepsList);
}

function backToHomepage() {
  backToCategories();
}

// ── Products cache ────────────────────────────────────────────────────────
const PRODUCTS_CACHE_KEY = 'tienda_products';
const PRODUCTS_CACHE_TTL = 2 * 60 * 60 * 1000;

function getProductsCache() {
  try {
    const raw = localStorage.getItem(PRODUCTS_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > PRODUCTS_CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function setProductsCache(data) {
  try {
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

// ── View routing ──────────────────────────────────────────────────────────

async function init() {
  try {
    const saved = localStorage.getItem("tienda_cart");
    if (saved) cart = JSON.parse(saved);
  } catch {}

  const storeNameEl = document.getElementById("storeName");
  if (storeNameEl) storeNameEl.textContent = CONFIG.nombre;

  const heroTitleEl = document.getElementById("heroTitle");
  if (heroTitleEl) heroTitleEl.textContent = CONFIG.heroTitle || CONFIG.nombre;
  const heroSubEl = document.getElementById("heroSubtitle");
  if (heroSubEl) heroSubEl.textContent = CONFIG.heroSubtitle || "";

  updateIndexSEO(CONFIG.nombre);

  document.getElementById("deliveryMethod").addEventListener("change", function () {
    document.getElementById("addressGroup").style.display = this.value === "envio" ? "block" : "none";
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      try {
        const saved = localStorage.getItem("tienda_cart");
        if (saved) { cart = JSON.parse(saved); updateCartCount(); renderProducts(); }
      } catch {}
    }
  });

  // Initial badge state with local config before Firestore load
  checkHorarios();

  await Promise.all([loadStoreConfig(), loadSchedule()]);

  // Re-check with Firestore schedule
  checkHorarios();
  setInterval(checkHorarios, 3600000);

  loadProducts();

  if (window.location.hash === '#cart') {
    window.history.replaceState(null, '', window.location.pathname);
    openCart();
  }
}

async function loadProducts() {
  const isReload = performance.getEntriesByType('navigation')[0]?.type === 'reload';

  if (!isReload) {
    const cached = getProductsCache();
    if (cached) {
      products = cached;
      render();
      return;
    }
  }

  document.getElementById("loadingState").style.display = "block";
  document.getElementById("storeContent").style.display  = "none";
  document.getElementById("errorBanner").style.display   = "none";

  try {
    const snapshot = await db.collection("productos").get();
    if (snapshot.empty) {
      showDemoProducts();
      return;
    }
    products = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id:               doc.id,
        nombre:           d.nombre           || "",
        descripcion:      d.descripcion      || "",
        precio:           parseFloat(d.precio) || 0,
        categoria:        d.categoria        || "General",
        imagen:           d.imagen           || "",
        texto_adicional:  d.texto_adicional  || "",
        disponible:       d.disponible !== false,
      };
    }).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    setProductsCache(products);
    render();
  } catch (err) {
    console.error("[loadProducts]", err);
    showError(
      "No se pudo cargar el catálogo",
      "Verificá tu conexión o contactá al administrador."
    );
    showDemoProducts();
  }
}

function showDemoProducts() {
  products = [
    { id:'demo1', nombre:"Producto de ejemplo",  descripcion:"Así se verían tus productos.", precio:1500, categoria:"Demo", imagen:"", texto_adicional:"",      disponible:true  },
    { id:'demo2', nombre:"Otro producto",         descripcion:"Creá productos desde el panel admin.", precio:2000, categoria:"Demo", imagen:"", texto_adicional:"Nuevo", disponible:true  },
    { id:'demo3', nombre:"Producto agotado",      descripcion:"Si disponible es false, se muestra así.", precio:900,  categoria:"Demo", imagen:"", texto_adicional:"",      disponible:false },
  ];
  render();
}

function render() {
  document.getElementById("lastUpdated").textContent = new Date().toLocaleTimeString("es-AR");
  renderView();
  const catParam = new URLSearchParams(window.location.search).get('cat');
  if (catParam) {
    window.history.replaceState(null, '', window.location.pathname);
    goToCategory(catParam);
  }
}

function renderView() {
  document.getElementById("loadingState").style.display = "none";
  document.getElementById("storeContent").style.display = "block";

  const catsView  = document.getElementById("categoriesView");
  const prodsView = document.getElementById("productsView");
  if (viewMode === "categories") {
    catsView.style.display  = "block";
    prodsView.style.display = "none";
    renderCategoryCards();
  } else {
    catsView.style.display  = "none";
    prodsView.style.display = "block";
    document.getElementById("productsCatLabel").textContent = activeCategory === "Todos" ? "Todos" : cap(plural(activeCategory));
    renderCategories();
    renderProducts();
  }
}

function renderCategoryCards() {
  const cats = [...new Set(products.map(p => p.categoria).filter(Boolean))];
  const catData = cats.map(cat => {
    const catProds = products.filter(p => p.categoria === cat);
    const withImg  = catProds.find(p => p.imagen);
    const avail    = catProds.filter(p => p.disponible).length;
    return { name: cat, image: withImg ? withImg.imagen : null, count: avail };
  });
  const grid = document.getElementById("categoryCardsGrid");
  grid.innerHTML = catData.map((c, idx) =>
    `<button class="cat-card" style="animation-delay:${idx * 0.06}s" data-cat="${esc(c.name)}">
      ${c.image
        ? `<img src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy">`
        : `<div class="cat-card-emoji-bg"><span class="cat-initial">${esc(c.name.charAt(0).toUpperCase())}</span></div>`}
      <div class="cat-card-overlay">
        <span class="cat-card-name">${esc(cap(plural(c.name)))}</span>
        <span class="cat-card-count">${c.count} producto${c.count !== 1 ? "s" : ""}</span>
      </div>
    </button>`
  ).join("");
  grid.querySelectorAll("[data-cat]").forEach(btn => {
    btn.addEventListener("click", () => goToCategory(btn.dataset.cat));
  });
}

function goToCategory(cat) {
  activeCategory = cat;
  viewMode = "products";
  renderView();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function backToCategories() {
  viewMode = "categories";
  activeCategory = "Todos";
  renderView();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderCategories() {
  const cats = ["Todos", ...new Set(products.map(p => p.categoria).filter(Boolean))];
  if (!cats.includes(activeCategory)) activeCategory = "Todos";
  const bar = document.getElementById("categoriesBar");
  bar.innerHTML = cats.map(cat =>
    `<button class="cat-btn ${cat === activeCategory ? 'active' : ''}" data-cat="${esc(cat)}">${cat === "Todos" ? "Todos" : esc(cap(plural(cat)))}</button>`
  ).join("");
  bar.querySelectorAll("[data-cat]").forEach(btn => {
    btn.addEventListener("click", () => filterCat(btn.dataset.cat));
  });
}

function filterCat(cat) {
  activeCategory = cat;
  if (viewMode === "products") {
    document.getElementById("productsCatLabel").textContent = cat === "Todos" ? "Todos" : cap(plural(cat));
  }
  renderCategories();
  renderProducts();
}

function renderProducts() {
  const grid = document.getElementById("productsGrid");
  const filtered = activeCategory === "Todos" ? products : products.filter(p => p.categoria === activeCategory);

  if (!filtered.length) {
    grid.innerHTML = '<p style="color:var(--text-3);grid-column:1/-1;padding:3rem 0;text-align:center;font-size:0.9rem">No hay productos en esta categoría.</p>';
    return;
  }

  grid.innerHTML = filtered.map((p, idx) => {
    const inCart = cart.find(i => i.id === p.id);
    const delay  = `animation-delay:${idx * 0.04}s`;

    const sinPrecio  = p.disponible && !p.precio;
    const showOverlay = storeIsOpen && p.disponible && !!p.precio && !inCart;
    const overlayBtn = showOverlay
      ? `<button class="add-btn-overlay" onclick="addToCart('${p.id}');event.stopPropagation()">+</button>`
      : "";

    const imgBlock = p.imagen
      ? `<div class="product-img-wrap">${overlayBtn}<img src="${esc(p.imagen)}" alt="${esc(p.nombre)}" loading="lazy"></div>`
      : `<div class="product-img-placeholder">${overlayBtn}<span class="product-initial">${esc(p.nombre.charAt(0).toUpperCase())}</span></div>`;

    const stockLabel = !p.disponible
      ? `<span class="stock-label">Agotado</span>`
      : "";

    const actionBlock = !p.disponible
      ? ``
      : !storeIsOpen
        ? ``
        : sinPrecio
          ? `<button class="consultar-btn" onclick="consultarPrecio('${p.id}')">Consultar</button>`
          : inCart
            ? `<div class="qty-control">
                 <button class="qty-btn" onclick="changeQty('${p.id}',-1)">−</button>
                 <span class="qty-num">${inCart.qty}</span>
                 <button class="qty-btn" onclick="changeQty('${p.id}',1)">+</button>
               </div>`
            : "";

    const priceDisplay = !p.disponible || sinPrecio
      ? ``
      : `<span class="product-price">${CONFIG.moneda} ${p.precio.toLocaleString("es-AR")}</span>`;

    return `
      <div class="product-card ${!p.disponible ? 'out-of-stock' : ''}" style="${delay}" onclick="goToProduct('${p.id}')">
        ${imgBlock}
        <div class="product-info">
          ${p.texto_adicional ? `<span class="product-badge">${esc(p.texto_adicional)}</span>` : ""}
          <div class="product-name">${esc(p.nombre)}</div>
          <div class="product-footer" onclick="event.stopPropagation()">
            <div>
              ${priceDisplay}
              ${stockLabel}
            </div>
            ${actionBlock}
          </div>
        </div>
      </div>`;
  }).join("");
}

function consultarPrecio(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const msg = `Hola, te quiero consultar que precio tiene ${p.nombre}`;
  window.open(`https://wa.me/${CONFIG.whatsappNumero}?text=${encodeURIComponent(msg)}`, "_blank");
}

function addToCart(id) {
  if (!storeIsOpen) { showToast("⏰ Estamos cerrados. Nuestro horario es:"); return; }
  const p = products.find(x => x.id === id);
  if (!p) return;
  const existing = cart.find(i => i.id === id);
  if (existing) existing.qty++;
  else cart.push({ ...p, qty: 1 });
  updateCartCount();
  renderProducts();
  showToast(`✓ ${p.nombre} agregado`);
}

function changeQty(id, delta) {
  const idx = cart.findIndex(i => i.id === id);
  if (idx < 0) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  updateCartCount();
  renderProducts();
  if (document.getElementById("cartModal").classList.contains("open")) renderCartModal();
}

function updateCartCount() {
  localStorage.setItem("tienda_cart", JSON.stringify(cart));
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const el = document.getElementById("cartCount");
  el.textContent = total;
  el.classList.remove("bump");
  void el.offsetWidth;
  el.classList.add("bump");
}

function goToProduct(id) {
  window.location.href = `producto.html?id=${id}`;
}

function openCart()  { renderCartModal(); document.getElementById("cartModal").classList.add("open"); }
function closeCart() { document.getElementById("cartModal").classList.remove("open"); }

function handleOverlayClick(e) {
  if (e.target === document.getElementById("cartModal")) closeCart();
}

const itemTotal = (i) => {
  const precio    = parseFloat(i.precio) || 0;
  const extrasSum = (i.extras || []).reduce((s, e) => s + (parseFloat(e.precio) || 0) * (e.qty || 0), 0);
  return (precio + extrasSum) * (i.qty || 1);
};

function renderCartModal() {
  const container = document.getElementById("cartItems");
  const form      = document.getElementById("checkoutForm");

  if (!cart.length) {
    container.innerHTML = `
      <div class="empty-cart">
        <span class="empty-cart-icon">🛒</span>
        Tu carrito está vacío.<br>
        <small style="color:var(--text-3)">Agregá productos para hacer tu pedido.</small>
      </div>`;
    form.style.display = "none";
    return;
  }

  if (!storeIsOpen) {
    container.innerHTML = `<div class="closed-cart-notice">⏰ Estamos cerrados. Podés ver tu carrito pero no enviar pedidos hasta que volvamos a abrir.</div>`;
    form.style.display = "none";
    return;
  }

  const total = cart.reduce((s, i) => s + itemTotal(i), 0);

  container.innerHTML = cart.map(i => {
    const extrasHtml = (i.extras && i.extras.length)
      ? `<div style="font-size:0.78rem;color:var(--text-2);margin-top:0.2rem;line-height:1.6">${
          i.extras.map(e => `+ ${esc(e.nombre)} × ${e.qty}`).join("<br>")
        }</div>`
      : "";
    return `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${esc(i.nombre)} × ${i.qty}</div>
        ${extrasHtml}
        <div class="cart-item-price">${CONFIG.moneda} ${itemTotal(i).toLocaleString("es-AR")}</div>
      </div>
      <div class="cart-item-actions">
        <div class="qty-control">
          <button class="qty-btn" onclick="changeQty('${i.id}',-1)">−</button>
          <span class="qty-num">${i.qty}</span>
          <button class="qty-btn" onclick="changeQty('${i.id}',1)">+</button>
        </div>
        <button class="remove-item" onclick="removeItem('${i.id}')">🗑</button>
      </div>
    </div>`;
  }).join("") +
    `<div class="cart-total">
       <span class="cart-total-label">Subtotal</span>
       <span class="cart-total-value">${CONFIG.moneda} ${total.toLocaleString("es-AR")}</span>
     </div>`;

  form.style.display = "block";
}

function removeItem(id) {
  cart = cart.filter(i => i.id !== id);
  updateCartCount();
  renderProducts();
  renderCartModal();
}

function sendToWhatsApp() {
  if (!storeIsOpen) { showToast("⏰ Estamos cerrados, no podemos recibir pedidos ahora"); return; }
  const name = document.getElementById("clientName").value.trim();
  if (!name) { showToast("⚠️ Ingresá tu nombre"); return; }

  const phone    = document.getElementById("clientPhone").value.trim();
  const delivery = document.getElementById("deliveryMethod").value;
  const address  = document.getElementById("clientAddress").value.trim();
  if (delivery === "envio" && !address) { showToast("⚠️ Ingresá la dirección de envío"); return; }
  const payment  = document.getElementById("paymentMethod").value;
  const notes    = document.getElementById("notes").value.trim();

  const total = cart.reduce((s, i) => s + itemTotal(i), 0);

  const dLabels = { retiro: "Retiro en local", envio: "Envío a domicilio" };
  const pLabels = { efectivo: "Efectivo", transferencia: "Transferencia bancaria" };

  const numeroPedido = Math.floor(10000 + Math.random() * 90000);
  let msg = `*NUEVO PEDIDO #${numeroPedido} - ${CONFIG.nombre}*\n\n`;
  msg += `*Cliente:* ${name}\n`;
  if (phone) msg += `*Telefono:* ${phone}\n`;
  msg += `\n*Productos:*\n`;
  cart.forEach(i => {
    msg += `- ${i.nombre} x ${i.qty} - ${CONFIG.moneda} ${itemTotal(i).toLocaleString("es-AR")}\n`;
    if (i.extras && i.extras.length) {
      i.extras.forEach(e => {
        const precioExtra = e.precio > 0 ? ` (${CONFIG.moneda} ${(e.precio * e.qty).toLocaleString("es-AR")})` : '';
        msg += `  * ${e.nombre} x ${e.qty}${precioExtra}\n`;
      });
    }
    if (i.aclaraciones) msg += `  Aclaraciones: ${i.aclaraciones}\n`;
  });
  msg += `\n*Total: ${CONFIG.moneda} ${total.toLocaleString("es-AR")}*\n`;
  msg += `\n*Entrega:* ${dLabels[delivery]}`;
  if (delivery === "envio" && address) msg += `\n*Direccion:* ${address}`;
  msg += `\n*Forma de Pago:* ${pLabels[payment]}`;
  if (notes) msg += `\n*Notas:* ${notes}`;

  window.open(`https://wa.me/${CONFIG.whatsappNumero}?text=${encodeURIComponent(msg)}`, "_blank");
}

function showError(title, detail) {
  const b = document.getElementById("errorBanner");
  b.style.display = "block";
  b.className = "error-state";
  b.innerHTML = `<strong>⚠️ ${title}</strong><p>${detail}</p>`;
  document.getElementById("loadingState").style.display = "none";
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

init();
