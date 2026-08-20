/* ══════════════════════════════════════════════════════════════
   SUKHADIA FOODS — Concept Redesign
   script.js  ·  Shared data layer + storefront behaviour
   ──────────────────────────────────────────────────────────────
   This file is loaded by BOTH index.html and admin.html.
   · Part 1 (SK.*) is the shared data/API layer.
   · Part 2 only runs when <body data-page="shop">.

   DEMO ONLY — every api.* call reads/writes localStorage.
   To productionise, swap the body of each api.* method for a
   fetch() against a real REST endpoint. Signatures stay the same.
   ══════════════════════════════════════════════════════════════ */

/* ══════════ PART 1 · SHARED DATA LAYER ══════════ */
window.SK = (function () {
  'use strict';

  const KEYS = {
    products:  'sukhadia_products',
    inventory: 'sukhadia_inventory',
    orders:    'sukhadia_orders',
    cart:      'sukhadia_cart',
    wishlist:  'sukhadia_wishlist',
    settings:  'sukhadia_settings',
    seq:       'sukhadia_seq'
  };

  /* Weight options. NOTE: sukhadiafoods.com lists one price per product and
     offers 250gm / 500gm / 1kg variants without publishing per-variant prices.
     The listed price is treated as the 250 g price and larger packs are scaled
     linearly FOR THIS DEMO ONLY — to be confirmed by Sukhadia Foods. */
  const WEIGHTS = [
    { label: '250 g', mult: 1 },
    { label: '500 g', mult: 2 },
    { label: '1 kg',  mult: 4 }
  ];

  /* Catalogue — names and prices taken from sukhadiafoods.com (Aug 2026).
     `price` is the site's listed price (treated as 250 g). */
  const SEED_PRODUCTS = [
    /* ── SWEETS ── */
    { id:'kaju-katli',           name:'Kaju Katli',              category:'Sweets',     price:300, stock:34, img:'p-kaju-katli',           img2:'p-kaju-katli-b',           best:1, pop:98, desc:'The classic cashew diamond — soft, delicate, and always the first box to be opened.' },
    { id:'motichoor-ladoo',      name:'Motichoor Ladoo',         category:'Sweets',     price:200, stock:28, img:'p-motichoor-ladoo',      img2:'p-motichoor-ladoo-b',      best:1, pop:94, desc:'Fine pearls of boondi bound into a ladoo — the sweet every celebration begins with.' },
    { id:'suterfeni',            name:'Suterfeni',               category:'Sweets',     price:310, stock:16, img:'p-suterfeni',            img2:'p-suterfeni-b',            best:1, pop:82, desc:'Spun into fine silken threads, light as anything and gone just as quickly.' },
    { id:'halvason',             name:'Halvason',                category:'Sweets',     price:310, stock:12, img:'p-halvason',             img2:'',                         best:1, pop:88, desc:'The Khambhat speciality — dense, chewy and unmistakably ours.' },
    { id:'milk-cake',            name:'Milk Cake',               category:'Sweets',     price:200, stock:22, img:'p-milk-cake',            img2:'',            best:0, pop:64, desc:'Slow-cooked milk, set and cut — grainy in the middle, caramel at the edges.' },
    { id:'badampuri',            name:'Badampuri',               category:'Sweets',     price:220, stock:19, img:'p-badampuri',            img2:'',                         best:0, pop:58, desc:'Layered, flaky and rich — a sweet that rewards taking your time over it.' },
    { id:'surti-nankhatai',      name:'Surti Nankhatai',         category:'Sweets',     price:140, stock:41, img:'p-surti-nankhatai',      img2:'p-surti-nankhatai-b',      best:0, pop:71, desc:'Crumbly Surti shortbread that goes with the afternoon cup of tea.' },
    { id:'anjeer-bite',          name:'Anjeer Bite',             category:'Sweets',     price:350, stock:15, img:'p-anjeer-bite',          img2:'p-anjeer-bite-b',          best:0, pop:66, desc:'Fig bites — a little less sweet, and a favourite for gifting.' },
    { id:'khajoor-bite',         name:'Khajoor Bite',            category:'Sweets',     price:350, stock:18, img:'p-khajoor-bite',         img2:'',                         best:0, pop:61, desc:'Date bites, naturally sweet, made for the box that goes to somebody else.' },
    { id:'assorted-kaju-bites',  name:'Assorted Kaju Bites',     category:'Sweets',     price:350, stock:9,  img:'p-assorted-kaju-bites',  img2:'p-assorted-kaju-bites-b',  best:1, pop:79, desc:'A mixed tray of cashew sweets — the easy answer when you cannot choose.' },
    { id:'ice-bombay-halwa',     name:'Ice / Bombay Halwa',      category:'Sweets',     price:320, stock:14, img:'p-ice-bombay-halwa',     img2:'',                         best:0, pop:52, desc:'Translucent, chewy squares studded with nuts — an old-school counter favourite.' },
    { id:'nylon-peanut-chikki',  name:'Nylon Peanut Chikki',     category:'Sweets',     price:150, stock:37, img:'p-nylon-peanut-chikki',  img2:'p-nylon-peanut-chikki-b',  best:0, pop:57, desc:'Jaggery and peanut, pulled thin enough to snap clean. Winter in a slab.' },
    { id:'nylon-till-chikki',    name:'Nylon Till Chikki',       category:'Sweets',     price:160, stock:31, img:'p-nylon-till-chikki',    img2:'p-nylon-till-chikki-b',    best:0, pop:49, desc:'Sesame and jaggery — the one that appears every Uttarayan.' },

    /* ── FARSAN ── */
    { id:'surti-chavanu',        name:'Surti Chavanu',           category:'Farsan',     price:100, stock:46, img:'p-surti-chavanu',        img2:'',                         best:1, pop:91, desc:'The Surti mix — savoury, a little sweet, impossible to stop at one handful.' },
    { id:'nylon-chana-chor',     name:'Nylon Chana Chor',        category:'Farsan',     price:170, stock:24, img:'p-nylon-chana-chor',     img2:'',                         best:1, pop:85, desc:'Flattened chana, crisp and light, with just enough heat behind it.' },
    { id:'papad-chavanu',        name:'Papad Chavanu',           category:'Farsan',     price:130, stock:33, img:'p-papad-chavanu',        img2:'',                         best:0, pop:68, desc:'Crushed papad through a savoury mix — texture in every direction.' },
    { id:'butter-bhakharwadi',   name:'Butter Bhakharwadi',      category:'Farsan',     price:120, stock:4,  img:'p-butter-bhakharwadi',   img2:'p-mini-bhakharwadi',       best:1, pop:96, desc:'Tight little spirals, buttery and spiced. The one that empties first.' },
    { id:'mini-bhakharwadi',     name:'Mini Bhakharwadi',        category:'Farsan',     price:120, stock:27, img:'p-mini-bhakharwadi',     img2:'p-butter-bhakharwadi',     best:0, pop:74, desc:'The same spiral, made small enough to keep reaching for.' },
    { id:'dryfruit-chevda',      name:'Dry Fruit Chevda',        category:'Farsan',     price:360, stock:11, img:'p-dryfruit-chevda',      img2:'',                         best:0, pop:63, desc:'A richer chevdo, loaded with nuts — the tin that gets hidden from the family.' },
    { id:'lasan-mix',            name:'Lasan (Garlic) Mix',      category:'Farsan',     price:110, stock:29, img:'p-lasan-mix',            img2:'',                         best:0, pop:59, desc:'Unapologetically garlicky. You will know it is in the house.' },
    { id:'butter-ratlami-sev',   name:'Butter Ratlami Sev',      category:'Farsan',     price:120, stock:36, img:'p-butter-ratlami-sev',   img2:'',                         best:0, pop:70, desc:'Ratlami sev with butter through it — sharp with clove and pepper.' },
    { id:'nylon-poha',           name:'Nylon Poha',              category:'Farsan',     price:100, stock:0,  img:'p-nylon-poha',           img2:'',                         best:0, pop:44, desc:'The lightest chevdo on the counter — barely there, then all gone.' },
    { id:'makai-chevdo',         name:'Makai Chevdo',            category:'Farsan',     price:100, stock:38, img:'p-makai-chevdo',         img2:'',                         best:0, pop:46, desc:'Corn-based and crunchy, the easy everyday snack tin.' },

    /* ── KHAKHRA ── */
    { id:'panipuri-khakhra',     name:'Panipuri Khakhra',        category:'Khakhra',    price:110, stock:52, img:'p-khakhra-1',            img2:'p-khakhra-2',              best:1, pop:80, desc:'All the tang of panipuri, pressed flat and roasted crisp.' },
    { id:'chat-masala-khakhra',  name:'Chat Masala Khakhra',     category:'Khakhra',    price:110, stock:44, img:'p-khakhra-2',            img2:'p-khakhra-3',              best:0, pop:69, desc:'Chat masala over a thin, hand-roasted khakhra.' },
    { id:'garlic-khakhra',       name:'Garlic Khakhra',          category:'Khakhra',    price:110, stock:39, img:'p-khakhra-3',            img2:'p-khakhra-4',              best:0, pop:65, desc:'Roasted garlic right through — good on its own, better with chai.' },
    { id:'manchurian-khakhra',   name:'Manchurian Khakhra',      category:'Khakhra',    price:110, stock:26, img:'p-khakhra-4',            img2:'p-khakhra-1',              best:0, pop:54, desc:'The Indo-Chinese one. Children ask for this by name.' },
    { id:'chana-chatpata-khakhra',name:'Chana Chatpata Khakhra', category:'Khakhra',    price:110, stock:31, img:'p-khakhra-1',            img2:'p-khakhra-3',              best:0, pop:48, desc:'Chana flour, chatpata masala, roasted until it snaps.' },
    { id:'chorafali-khakhra',    name:'Chorafali Khakhra',       category:'Khakhra',    price:110, stock:3,  img:'p-khakhra-2',            img2:'p-khakhra-4',              best:0, pop:56, desc:'Chorafali flavour in khakhra form — a Diwali habit all year round.' },
    { id:'maggie-masala-khakhra',name:'Maggie Masala Khakhra',   category:'Khakhra',    price:110, stock:47, img:'p-khakhra-3',            img2:'p-khakhra-1',              best:0, pop:51, desc:'The flavour every hostel-goer recognises immediately.' },

    /* ── DRY FRUITS ── */
    { id:'roasted-khari-kaju',   name:'Roasted Khari Kaju',      category:'Dry Fruits', price:350, stock:21, img:'p-roasted-khari-kaju',   img2:'p-mixed-nuts',             best:1, pop:77, desc:'Cashews roasted without oil, finished with salt. Nothing else needed.' },
    { id:'roasted-mari-kaju',    name:'Roasted Mari Kaju',       category:'Dry Fruits', price:350, stock:17, img:'p-roasted-mari-kaju',    img2:'p-mixed-nuts',             best:0, pop:62, desc:'Black pepper cashews, roasted without oil — sharp and warming.' },
    { id:'roasted-masala-kaju',  name:'Roasted Masala Kaju',     category:'Dry Fruits', price:350, stock:13, img:'p-roasted-masala-kaju',  img2:'p-mixed-nuts',             best:0, pop:67, desc:'Masala cashews, roasted without oil. The bowl that never lasts the evening.' },
    { id:'roasted-khari-badam',  name:'Roasted Khari Badam',     category:'Dry Fruits', price:350, stock:25, img:'p-roasted-khari-badam',  img2:'p-mixed-nuts',             best:0, pop:60, desc:'Almonds roasted without oil and lightly salted.' }
  ];

  const CATEGORIES = ['Sweets', 'Farsan', 'Khakhra', 'Dry Fruits'];
  const STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
  const LOW_STOCK = 5;

  /* ── storage helpers ── */
  function loadData(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('[SK] could not read', key, e);
      return fallback;
    }
  }
  function saveData(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('[SK] could not write', key, e);
      return false;
    }
  }

  /* ── tiny event bus (+ cross-tab sync) ── */
  const handlers = {};
  const bus = {
    on(evt, fn) { (handlers[evt] = handlers[evt] || []).push(fn); return () => bus.off(evt, fn); },
    off(evt, fn) { handlers[evt] = (handlers[evt] || []).filter(h => h !== fn); },
    emit(evt, payload) { (handlers[evt] || []).forEach(fn => { try { fn(payload); } catch (e) { console.error(e); } }); }
  };
  window.addEventListener('storage', e => {
    if (e.key && Object.values(KEYS).includes(e.key)) bus.emit('data', { key: e.key, external: true });
  });
  function changed(what) { bus.emit('data', { key: what }); }

  /* ── bootstrap ── */
  /* Bump SEED_VERSION whenever SEED_PRODUCTS changes so an existing browser
     picks up the new catalogue instead of serving a stale cached copy. */
  const SEED_VERSION = 3;
  function ensureSeed() {
    const stamped = Number(localStorage.getItem('sukhadia_seed_v') || 0);
    if (stamped !== SEED_VERSION) {
      localStorage.removeItem(KEYS.products);
      localStorage.setItem('sukhadia_seed_v', String(SEED_VERSION));
    }
    if (!localStorage.getItem(KEYS.products)) {
      saveData(KEYS.products, SEED_PRODUCTS.map(p => ({
        id: p.id, name: p.name, category: p.category, price: p.price,
        img: p.img, img2: p.img2, desc: p.desc, best: p.best, pop: p.pop
      })));
    }
    if (!localStorage.getItem(KEYS.inventory)) {
      const inv = {};
      SEED_PRODUCTS.forEach(p => { inv[p.id] = { stock: p.stock, threshold: LOW_STOCK }; });
      saveData(KEYS.inventory, inv);
    }
    if (!localStorage.getItem(KEYS.orders)) saveData(KEYS.orders, []);
    if (!localStorage.getItem(KEYS.settings)) {
      saveData(KEYS.settings, { lowStockThreshold: LOW_STOCK, currency: 'INR', demoMode: true });
    }
  }
  ensureSeed();

  /* ── formatting ── */
  const fmt = n => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
  const fmtN = n => (Number(n) || 0).toLocaleString('en-IN');
  function todayISO(d) {
    const x = d ? new Date(d) : new Date();
    return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  }
  function prettyDate(iso) {
    const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const imgPath = slug => 'assets/images/' + (slug || 'p-kaju-katli') + '.jpg';
  const priceFor = (base, weightLabel) => {
    const w = WEIGHTS.find(w => w.label === weightLabel) || WEIGHTS[0];
    return Math.round(base * w.mult);
  };

  /* ══════════ API (DEMO ONLY — replace with backend API) ══════════ */
  const api = {

    /* ---- products ---- */
    getProducts() {                                   // DEMO ONLY → GET /api/products
      return loadData(KEYS.products, []);
    },
    getProduct(id) {                                  // DEMO ONLY → GET /api/products/:id
      return api.getProducts().find(p => p.id === id) || null;
    },
    saveProducts(list) {                              // DEMO ONLY → PUT /api/products
      saveData(KEYS.products, list); changed(KEYS.products); return list;
    },
    /* Turns a product name into a URL-safe id, and keeps adding -2, -3 … until
       it is unique, so two products called the same thing cannot collide. */
    slugify(name, ignoreId) {
      const base = String(name || '').toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'product';
      const taken = api.getProducts().filter(p => p.id !== ignoreId).map(p => p.id);
      let id = base, n = 2;
      while (taken.indexOf(id) >= 0) id = base + '-' + n++;
      return id;
    },
    createProduct(data) {                             // DEMO ONLY → POST /api/products
      const list = api.getProducts();
      const product = {
        id:       data.id || api.slugify(data.name),
        name:     String(data.name || '').trim(),
        category: data.category || CATEGORIES[0],
        price:    Math.max(0, Math.round(Number(data.price) || 0)),
        img:      data.img || 'p-kaju-katli',
        img2:     data.img2 || '',
        desc:     String(data.desc || '').trim(),
        best:     data.best ? 1 : 0,
        pop:      Number(data.pop) || 50
      };
      list.push(product);
      saveData(KEYS.products, list);

      const inv = api.getInventory();
      inv[product.id] = {
        stock:     Math.max(0, Math.round(Number(data.stock) || 0)),
        threshold: Math.max(0, Math.round(Number(data.threshold) || LOW_STOCK))
      };
      saveData(KEYS.inventory, inv);

      changed(KEYS.products);
      changed(KEYS.inventory);
      return product;
    },
    updateProduct(id, patch) {                        // DEMO ONLY → PATCH /api/products/:id
      const list = api.getProducts();
      const i = list.findIndex(p => p.id === id);
      if (i < 0) return null;
      const next = Object.assign({}, list[i], {
        name:     patch.name != null ? String(patch.name).trim() : list[i].name,
        category: patch.category || list[i].category,
        price:    patch.price != null ? Math.max(0, Math.round(Number(patch.price) || 0)) : list[i].price,
        img:      patch.img || list[i].img,
        img2:     patch.img2 != null ? patch.img2 : list[i].img2,
        desc:     patch.desc != null ? String(patch.desc).trim() : list[i].desc,
        best:     patch.best != null ? (patch.best ? 1 : 0) : list[i].best
      });
      list[i] = next;
      saveData(KEYS.products, list);

      if (patch.stock != null || patch.threshold != null) {
        const inv = api.getInventory();
        if (!inv[id]) inv[id] = { stock: 0, threshold: LOW_STOCK };
        if (patch.stock != null)     inv[id].stock     = Math.max(0, Math.round(Number(patch.stock) || 0));
        if (patch.threshold != null) inv[id].threshold = Math.max(0, Math.round(Number(patch.threshold) || LOW_STOCK));
        saveData(KEYS.inventory, inv);
        changed(KEYS.inventory);
      }
      changed(KEYS.products);
      return next;
    },
    /* Orders keep their own copy of the product name and price, so past orders
       stay readable after a product is removed from the catalogue. */
    deleteProduct(id) {                               // DEMO ONLY → DELETE /api/products/:id
      const list = api.getProducts();
      const i = list.findIndex(p => p.id === id);
      if (i < 0) return null;
      const removed = list.splice(i, 1)[0];
      saveData(KEYS.products, list);

      const inv = api.getInventory();
      delete inv[id];
      saveData(KEYS.inventory, inv);

      /* drop it from any basket too, or the storefront shows a phantom line */
      const cart = api.getCart().filter(l => l.id !== id);
      saveData(KEYS.cart, cart);
      const wish = api.getWishlist().filter(w => w !== id);
      saveData(KEYS.wishlist, wish);

      changed(KEYS.products);
      changed(KEYS.inventory);
      changed(KEYS.cart);
      return removed;
    },
    /* How many orders reference a product — shown before deleting one. */
    ordersUsingProduct(id) {
      return api.getOrders().filter(o => (o.items || []).some(i => i.productId === id)).length;
    },

    /* ---- inventory ---- */
    getInventory() {                                  // DEMO ONLY → GET /api/inventory
      const inv = loadData(KEYS.inventory, {});
      api.getProducts().forEach(p => { if (!inv[p.id]) inv[p.id] = { stock: 0, threshold: LOW_STOCK }; });
      return inv;
    },
    getStock(id) {
      const rec = api.getInventory()[id];
      return rec ? Number(rec.stock) || 0 : 0;
    },
    stockState(id) {
      const inv = api.getInventory()[id] || { stock: 0, threshold: LOW_STOCK };
      const s = Number(inv.stock) || 0;
      if (s <= 0) return 'out';
      if (s <= (Number(inv.threshold) || LOW_STOCK)) return 'low';
      return 'in';
    },
    updateInventory(id, newStock, threshold) {        // DEMO ONLY → PATCH /api/inventory/:id
      const inv = api.getInventory();
      if (!inv[id]) inv[id] = { stock: 0, threshold: LOW_STOCK };
      inv[id].stock = Math.max(0, Math.round(Number(newStock) || 0));
      if (threshold != null) inv[id].threshold = Math.max(0, Math.round(Number(threshold) || 0));
      saveData(KEYS.inventory, inv); changed(KEYS.inventory);
      return inv[id];
    },
    adjustStock(id, delta) {                          // DEMO ONLY → POST /api/inventory/:id/adjust
      return api.updateInventory(id, api.getStock(id) + Number(delta || 0));
    },

    /* ---- orders ---- */
    getOrders() {                                     // DEMO ONLY → GET /api/orders
      return loadData(KEYS.orders, []);
    },
    getOrder(id) {                                    // DEMO ONLY → GET /api/orders/:id
      return api.getOrders().find(o => o.orderId === id) || null;
    },
    nextOrderId(dateISO) {
      const day = (dateISO || todayISO()).replace(/-/g, '');
      const orders = api.getOrders();
      const n = orders.filter(o => o.orderId.indexOf('SKF-' + day) === 0).length + 1;
      return 'SKF-' + day + '-' + String(n).padStart(4, '0');
    },
    /* Units a line is actually holding in inventory. Orders written before
       stockTaken existed fall back to the quantity ordered. */
    heldUnits(item) {
      return item.stockTaken != null ? (Number(item.stockTaken) || 0) : (Number(item.quantity) || 0);
    },
    /* Creates an order AND decrements stock atomically for this demo. */
    createOrder(payload) {                            // DEMO ONLY → POST /api/orders
      const orders = api.getOrders();
      const dateISO = payload.orderDate || todayISO();
      const order = {
        orderId:       payload.orderId || api.nextOrderId(dateISO),
        orderDate:     dateISO,
        createdAt:     payload.createdAt || new Date().toISOString(),
        customerName:  payload.customerName || 'Demo Customer',
        phone:         payload.phone || '',
        email:         payload.email || '',
        address:       payload.address || '',
        city:          payload.city || '',
        state:         payload.state || '',
        pincode:       payload.pincode || '',
        notes:         payload.notes || '',
        items:         payload.items || [],
        subtotal:      Number(payload.subtotal) || 0,
        discount:      Number(payload.discount) || 0,
        shipping:      Number(payload.shipping) || 0,
        total:         Number(payload.total) || 0,
        paymentMethod: payload.paymentMethod || 'Cash on Delivery',
        paymentStatus: payload.paymentStatus || 'Pending',
        orderStatus:   payload.orderStatus || 'Confirmed',
        isDemo:        !!payload.isDemo
      };
      /* Deduct stock BEFORE persisting, so the stockTaken stamped on each line
         is part of the saved record. An order created already-cancelled never
         holds stock — otherwise those units are lost for good, because
         updateOrder only refunds on the transition INTO 'Cancelled'. */
      if (order.orderStatus !== 'Cancelled') {
        const inv = api.getInventory();
        order.items.forEach(it => {
          if (!inv[it.productId]) inv[it.productId] = { stock: 0, threshold: LOW_STOCK };
          const have  = Number(inv[it.productId].stock) || 0;
          const want  = Number(it.quantity) || 0;
          const taken = Math.min(have, want);   // never drive stock negative
          it.stockTaken = taken;                // …so a refund can return exactly this
          inv[it.productId].stock = have - taken;
        });
        saveData(KEYS.inventory, inv);
      } else {
        order.items.forEach(it => { it.stockTaken = 0; });
      }

      orders.push(order);
      saveData(KEYS.orders, orders);

      changed(KEYS.orders);
      changed(KEYS.inventory);      // stock moved — tell the grids, not just the order lists
      return order;
    },
    updateOrder(orderId, patch) {                     // DEMO ONLY → PATCH /api/orders/:id
      const orders = api.getOrders();
      const i = orders.findIndex(o => o.orderId === orderId);
      if (i < 0) return null;
      const prev = orders[i];
      const next = Object.assign({}, prev, patch);

      /* cancelling an order returns its units to stock (once) */
      if (patch.orderStatus === 'Cancelled' && prev.orderStatus !== 'Cancelled') {
        const inv = api.getInventory();
        prev.items.forEach(it => {
          if (!inv[it.productId]) inv[it.productId] = { stock: 0, threshold: LOW_STOCK };
          inv[it.productId].stock = (Number(inv[it.productId].stock) || 0) + api.heldUnits(it);
          it.stockTaken = 0;
        });
        saveData(KEYS.inventory, inv);
        changed(KEYS.inventory);
      }
      /* un-cancelling takes them out again */
      if (prev.orderStatus === 'Cancelled' && patch.orderStatus && patch.orderStatus !== 'Cancelled') {
        const inv = api.getInventory();
        prev.items.forEach(it => {
          if (!inv[it.productId]) inv[it.productId] = { stock: 0, threshold: LOW_STOCK };
          const have  = Number(inv[it.productId].stock) || 0;
          const taken = Math.min(have, Number(it.quantity) || 0);
          it.stockTaken = taken;
          inv[it.productId].stock = have - taken;
        });
        saveData(KEYS.inventory, inv);
        changed(KEYS.inventory);
      }
      if (patch.orderStatus === 'Delivered') next.paymentStatus = 'Paid';

      orders[i] = next;
      saveData(KEYS.orders, orders);
      changed(KEYS.orders);
      return next;
    },
    updateOrderStatus(orderId, status) {
      return api.updateOrder(orderId, { orderStatus: status });
    },

    /* ---- customers (derived from orders) ---- */
    getCustomers() {                                  // DEMO ONLY → GET /api/customers
      const map = new Map();
      api.getOrders().forEach(o => {
        if (o.orderStatus === 'Cancelled') return;
        const key = (o.phone || o.email || o.customerName || '').trim().toLowerCase() || o.orderId;
        if (!map.has(key)) {
          map.set(key, {
            key, name: o.customerName, phone: o.phone, email: o.email,
            city: o.city, state: o.state,
            orders: 0, spent: 0, lastOrder: o.orderDate, firstOrder: o.orderDate, isDemo: o.isDemo
          });
        }
        const c = map.get(key);
        c.orders += 1;
        c.spent += Number(o.total) || 0;
        if (o.orderDate > c.lastOrder) { c.lastOrder = o.orderDate; c.name = o.customerName; c.city = o.city; }
        if (o.orderDate < c.firstOrder) c.firstOrder = o.orderDate;
      });
      const list = [...map.values()];
      list.forEach(c => {
        c.aov = c.orders ? c.spent / c.orders : 0;
        c.type = c.spent >= 5000 && c.orders >= 2 ? 'VIP' : (c.orders >= 2 ? 'Returning' : 'New');
      });
      return list.sort((a, b) => b.spent - a.spent);
    },

    /* ---- settings ---- */
    getSettings() { return loadData(KEYS.settings, { lowStockThreshold: LOW_STOCK, currency: 'INR', demoMode: true }); },
    saveSettings(s) { saveData(KEYS.settings, s); changed(KEYS.settings); return s; },

    /* ---- cart ---- */
    getCart() { return loadData(KEYS.cart, []); },
    saveCart(c) { saveData(KEYS.cart, c); changed(KEYS.cart); return c; },
    clearCart() { saveData(KEYS.cart, []); changed(KEYS.cart); },

    /* ---- wishlist ---- */
    getWishlist() { return loadData(KEYS.wishlist, []); },
    toggleWishlist(id) {
      const w = api.getWishlist();
      const i = w.indexOf(id);
      if (i < 0) w.push(id); else w.splice(i, 1);
      saveData(KEYS.wishlist, w); changed(KEYS.wishlist);
      return i < 0;
    },

    /* ---- demo data ---- */
    generateDemoOrders(count) {                       // DEMO ONLY — never ship to production
      const NAMES = ['Meera Patel','Rakesh Shah','Anjali Desai','Vikram Joshi','Priya Trivedi','Nilesh Mehta',
        'Kavita Bhatt','Sanjay Amin','Hetal Parikh','Dhruv Kapadia','Rina Solanki','Manish Vyas','Falguni Rana',
        'Tejas Pandya','Sneha Doshi','Amit Gandhi','Payal Modi','Chirag Thakkar','Nisha Raval','Jignesh Barot'];
      const CITIES = [['Vadodara','Gujarat','390007'],['Ahmedabad','Gujarat','380015'],['Surat','Gujarat','395007'],
        ['Anand','Gujarat','388001'],['Mumbai','Maharashtra','400058'],['Rajkot','Gujarat','360005'],
        ['Bharuch','Gujarat','392001'],['Pune','Maharashtra','411004']];
      const PAY = ['Cash on Delivery','Online Payment'];
      const STAT = ['Delivered','Delivered','Delivered','Shipped','Processing','Confirmed','Pending','Cancelled'];
      const products = api.getProducts();
      const n = Math.max(1, Math.min(200, count || 32));
      let seed = 20260819;
      const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
      const pick = arr => arr[Math.floor(rnd() * arr.length)];

      /* A customer is identified by phone, so the same name must always get the
         same number — otherwise every order looks like a brand-new customer and
         the Returning/VIP figures are meaningless. */
      const phoneFor = name => {
        let h = 0;
        for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff;
        return '9' + String(100000000 + (h % 899999999)).slice(0, 9);
      };

      const made = [];
      for (let k = 0; k < n; k++) {
        const daysAgo = Math.floor(Math.pow(rnd(), 1.35) * 84);         // recent-weighted
        const d = new Date(); d.setDate(d.getDate() - daysAgo);
        const dateISO = todayISO(d);
        const nItems = 1 + Math.floor(rnd() * 3);
        const items = [];
        const used = {};
        for (let j = 0; j < nItems; j++) {
          /* bias toward popular products so bestseller charts look real */
          const pool = products.filter(p => rnd() * 100 < p.pop + 25);
          const p = pick(pool.length ? pool : products);
          if (!p || used[p.id]) continue;
          used[p.id] = 1;
          const w = WEIGHTS[Math.floor(rnd() * WEIGHTS.length)];
          const qty = 1 + Math.floor(rnd() * 3);
          const unit = priceFor(p.price, w.label);
          items.push({
            productId: p.id, productName: p.name, category: p.category,
            weight: w.label, quantity: qty, unitPrice: unit, totalPrice: unit * qty
          });
        }
        if (!items.length) continue;
        const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
        const name = pick(NAMES);
        const [city, state, pin] = CITIES[name.length % CITIES.length];
        const status = pick(STAT);
        made.push(api.createOrder({
          orderDate: dateISO,
          createdAt: d.toISOString(),
          customerName: name,
          phone: phoneFor(name),
          email: name.toLowerCase().replace(/[^a-z]/g, '.') + '@example.com',
          address: (1 + Math.floor(rnd() * 90)) + ', Demo Residency',
          city, state, pincode: pin,
          items, subtotal, discount: 0, shipping: 0, total: subtotal,
          paymentMethod: pick(PAY),
          paymentStatus: status === 'Delivered' ? 'Paid' : 'Pending',
          orderStatus: status,
          isDemo: true
        }));
      }
      return made;
    },
    clearDemoData() {                                 // removes ONLY orders flagged isDemo
      const all = api.getOrders();
      const kept = all.filter(o => !o.isDemo);
      const dropped = all.filter(o => o.isDemo);

      /* Deleting an order has to release the stock it was holding, exactly as
         cancelling one does — otherwise inventory stays depleted with no order
         left in the history to account for the missing units. */
      const inv = api.getInventory();
      dropped.filter(o => o.orderStatus !== 'Cancelled').forEach(o => {
        (o.items || []).forEach(it => {
          if (!inv[it.productId]) inv[it.productId] = { stock: 0, threshold: LOW_STOCK };
          inv[it.productId].stock = (Number(inv[it.productId].stock) || 0) + api.heldUnits(it);
        });
      });
      saveData(KEYS.inventory, inv);

      saveData(KEYS.orders, kept);
      changed(KEYS.orders);
      changed(KEYS.inventory);
      return kept;
    },
    resetDemoData() {                                 // wipes everything back to seed
      Object.values(KEYS).forEach(k => localStorage.removeItem(k));
      ensureSeed(); changed('all');
    },

    /* ---- analytics ---- */
    /* range: {from:'YYYY-MM-DD', to:'YYYY-MM-DD'} — omit for all time */
    getAnalytics(range) {                             // DEMO ONLY → GET /api/analytics
      const all = api.getOrders();
      const inRange = o => {
        if (!range || (!range.from && !range.to)) return true;
        if (range.from && o.orderDate < range.from) return false;
        if (range.to && o.orderDate > range.to) return false;
        return true;
      };
      const orders = all.filter(inRange);
      const live = orders.filter(o => o.orderStatus !== 'Cancelled');
      const revenue = live.reduce((s, o) => s + (Number(o.total) || 0), 0);
      const units = live.reduce((s, o) => s + o.items.reduce((t, i) => t + (Number(i.quantity) || 0), 0), 0);

      const byProduct = {}, byCat = {}, byDay = {};
      live.forEach(o => {
        byDay[o.orderDate] = byDay[o.orderDate] || { revenue: 0, orders: 0, units: 0 };
        byDay[o.orderDate].revenue += Number(o.total) || 0;
        byDay[o.orderDate].orders += 1;
        o.items.forEach(i => {
          const q = Number(i.quantity) || 0, v = Number(i.totalPrice) || 0;
          byDay[o.orderDate].units += q;
          const p = byProduct[i.productId] = byProduct[i.productId] ||
            { id: i.productId, name: i.productName, category: i.category, units: 0, revenue: 0, orders: 0 };
          p.units += q; p.revenue += v; p.orders += 1;
          const c = byCat[i.category] = byCat[i.category] || { category: i.category, units: 0, revenue: 0 };
          c.units += q; c.revenue += v;
        });
      });

      const products = Object.values(byProduct).sort((a, b) => b.units - a.units);
      const maxU = products.length ? products[0].units : 0;
      const maxR = products.reduce((m, p) => Math.max(m, p.revenue), 0);
      const maxO = products.reduce((m, p) => Math.max(m, p.orders), 0);
      products.forEach(p => {
        p.score = Math.round(
          (maxU ? p.units / maxU : 0) * 55 +
          (maxO ? p.orders / maxO : 0) * 25 +
          (maxR ? p.revenue / maxR : 0) * 20
        );
        p.tier = p.score >= 75 ? 'Very Popular' : p.score >= 45 ? 'Popular' : p.score >= 20 ? 'Trending' : 'Steady';
      });

      const cats = Object.values(byCat).sort((a, b) => b.revenue - a.revenue);
      cats.forEach(c => c.share = revenue ? (c.revenue / revenue) * 100 : 0);

      const inv = api.getInventory();
      const catalogue = api.getProducts();
      const lowStock = catalogue.filter(p => api.stockState(p.id) === 'low');
      const outStock = catalogue.filter(p => api.stockState(p.id) === 'out');
      const today = todayISO();
      const todayOrders = all.filter(o => o.orderDate === today && o.orderStatus !== 'Cancelled');

      return {
        range: range || null,
        orders, liveOrders: live,
        totalOrders: live.length,
        cancelled: orders.length - live.length,
        revenue,
        units,
        aov: live.length ? revenue / live.length : 0,
        todayOrders: todayOrders.length,
        todayRevenue: todayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0),
        byDay,
        products,
        categories: cats,
        lowStock, outStock,
        inventory: inv,
        customers: api.getCustomers()
      };
    }
  };

  return {
    KEYS, WEIGHTS, CATEGORIES, STATUSES, LOW_STOCK, SEED_PRODUCTS,
    api, bus, loadData, saveData,
    fmt, fmtN, todayISO, prettyDate, imgPath, priceFor,
    resetDemoData: api.resetDemoData
  };
})();


/* ══════════ PART 2 · STOREFRONT ══════════ */
(function () {
  'use strict';
  if (document.body.dataset.page !== 'shop') return;

  const { api, bus, fmt, imgPath, priceFor, WEIGHTS, KEYS } = SK;
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ── toasts ── */
  const ICONS = {
    ok:   '<path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    warn: '<path d="M12 8v5M12 17h.01M10.3 3.9L2.6 17.4A1.9 1.9 0 0 0 4.3 20h15.4a1.9 1.9 0 0 0 1.7-2.6L13.7 3.9a1.9 1.9 0 0 0-3.4 0z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
    bad:  '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M12 7.5v5.5M12 16.5h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    info: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M12 11v5.5M12 7.5h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  };
  const toastBox = $('#toasts');
  function toast(title, msg, kind) {
    kind = kind || 'ok';
    const el = document.createElement('div');
    el.className = 'toast toast--' + kind;
    el.innerHTML =
      '<svg class="toast__i" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[kind] || ICONS.ok) + '</svg>' +
      '<span><span class="toast__t">' + esc(title) + '</span>' +
      (msg ? '<span class="toast__x">' + esc(msg) + '</span>' : '') + '</span>';
    toastBox.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-out');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, 3200);
    while (toastBox.children.length > 4) toastBox.firstElementChild.remove();
  }

  /* ── scroll lock (keeps position, avoids layout shift) ── */
  let lockY = 0, lockCount = 0;
  function lock() {
    if (lockCount++) return;
    lockY = window.scrollY;
    const sb = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = sb > 0 ? sb + 'px' : '';
    document.body.classList.add('is-locked');
    document.body.style.position = 'fixed';
    document.body.style.top = -lockY + 'px';
    document.body.style.width = '100%';
  }
  function unlock() {
    if (--lockCount > 0) return;
    lockCount = 0;
    document.body.classList.remove('is-locked');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.paddingRight = '';
    window.scrollTo(0, lockY);
  }

  /* ── overlay plumbing ── */
  const openStack = [];
  function openLayer(el, focusEl) {
    /* Re-opening a layer that is already open must not lock the scroll twice —
       the matching close would then leave <body> position:fixed forever. */
    const already = el.getAttribute('aria-hidden') === 'false';
    el.setAttribute('aria-hidden', 'false');
    if (!already) { lock(); openStack.push(el); }
    if (focusEl) setTimeout(() => focusEl.focus(), 120);
  }
  function closeLayer(el) {
    if (el.getAttribute('aria-hidden') === 'true') return;
    el.setAttribute('aria-hidden', 'true');
    unlock();
    const i = openStack.indexOf(el);
    if (i >= 0) openStack.splice(i, 1);
  }
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !openStack.length) return;
    closeLayer(openStack[openStack.length - 1]);
  });
  /* focus trap for whichever layer is on top */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || !openStack.length) return;
    const layer = openStack[openStack.length - 1];
    const f = $$('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])', layer)
      .filter(el => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ══ ANNOUNCEMENT ══ */
  const announce = $('#announce');
  if (sessionStorage.getItem('sk_announce') === 'off') announce.classList.add('is-gone');
  $('#announceClose').addEventListener('click', () => {
    announce.classList.add('is-gone');
    sessionStorage.setItem('sk_announce', 'off');
  });

  /* ══ HEADER ══ */
  const hdr = $('#hdr');
  const toTop = $('#toTop');
  let lastY = -1;
  function onScroll() {
    const y = window.scrollY;
    if (y === lastY) return;
    lastY = y;
    hdr.classList.toggle('is-stuck', y > 40 || !$('#view-shop').offsetParent);
    toTop.classList.toggle('is-on', y > 700);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ══ MOBILE NAV ══ */
  const mnav = $('#mobileNav'), burger = $('#burger');
  burger.addEventListener('click', () => {
    openLayer(mnav, $('#mnavClose'));
    burger.setAttribute('aria-expanded', 'true');
  });
  function shutNav() { closeLayer(mnav); burger.setAttribute('aria-expanded', 'false'); }
  $('#mnavClose').addEventListener('click', shutNav);
  $$('[data-close-mnav]').forEach(b => b.addEventListener('click', shutNav));
  $$('.mnav__links a').forEach(a => a.addEventListener('click', shutNav));

  /* ══ SEARCH OVERLAY ══ */
  const srch = $('#srch'), srchInput = $('#srchInput'), srchResults = $('#srchResults');
  $('#searchOpen').addEventListener('click', () => { openLayer(srch, srchInput); renderSearch(''); });
  $('#srchClose').addEventListener('click', () => closeLayer(srch));
  $$('[data-close-srch]').forEach(b => b.addEventListener('click', () => closeLayer(srch)));
  $$('#srchQuick .chip').forEach(c => c.addEventListener('click', () => {
    srchInput.value = c.dataset.q; renderSearch(c.dataset.q); srchInput.focus();
  }));
  srchInput.addEventListener('input', () => renderSearch(srchInput.value));
  function renderSearch(q) {
    q = (q || '').trim().toLowerCase();
    if (!q) { srchResults.innerHTML = ''; return; }
    const hits = api.getProducts().filter(p =>
      p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || (p.desc || '').toLowerCase().includes(q)
    ).slice(0, 7);
    if (!hits.length) {
      srchResults.innerHTML = '<p class="srch__none">No products matched “' + esc(q) + '”.</p>';
      return;
    }
    srchResults.innerHTML = hits.map(p =>
      '<button class="sres" data-qv="' + p.id + '">' +
        '<img src="' + imgPath(p.img) + '" alt="" loading="lazy">' +
        '<span><span class="sres__n">' + esc(p.name) + '</span>' +
        '<span class="sres__m">' + esc(p.category) + '</span></span>' +
        '<span class="sres__p">' + fmt(p.price) + '</span>' +
      '</button>'
    ).join('');
  }
  srchResults.addEventListener('click', e => {
    const b = e.target.closest('[data-qv]');
    if (!b) return;
    closeLayer(srch);
    setTimeout(() => openQuickView(b.dataset.qv), 220);
  });

  /* ══ PRODUCT CARDS ══ */
  function stockBits(id) {
    const st = api.stockState(id), n = api.getStock(id);
    if (st === 'out') return { st, n, txt: '<span class="card__stk card__stk--out">Out of stock</span>' };
    if (st === 'low') return { st, n, txt: '<span class="card__stk card__stk--low">Only ' + n + ' left</span>' };
    return { st, n, txt: '<span class="card__stk card__stk--in">In stock</span>' };
  }

  function cardHTML(p) {
    const s = stockBits(p.id);
    const wished = api.getWishlist().includes(p.id);
    const alt = p.img2 ? '<img class="card__alt" src="' + imgPath(p.img2) + '" alt="" loading="lazy" decoding="async">' : '';
    return '' +
    '<article class="card' + (s.st === 'out' ? ' is-out' : '') + '" data-id="' + p.id + '">' +
      '<div class="card__media">' +
        '<button class="card__img" data-qv="' + p.id + '" aria-label="Quick view: ' + esc(p.name) + '">' +
          '<img src="' + imgPath(p.img) + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async">' + alt +
        '</button>' +
        (s.st === 'out' ? '<span class="card__sold">Sold out</span>' : '') +
        '<span class="card__qv" aria-hidden="true">Quick view</span>' +
        (s.st === 'out'
          ? '<button class="card__add" disabled>Out of stock</button>'
          : '<button class="card__add" data-add="' + p.id + '">Add to basket</button>') +
      '</div>' +
      '<div class="card__body">' +
        '<div class="card__meta">' +
          '<span class="card__cat">' + esc(p.category) +
            (p.best ? '<em class="card__best">Bestseller</em>' : '') + '</span>' +
          '<button class="card__wish' + (wished ? ' is-on' : '') + '" data-wish="' + p.id + '" aria-pressed="' + wished + '" aria-label="' + (wished ? 'Remove ' : 'Add ') + esc(p.name) + ' to wishlist">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.2-4.6-7.2-9.4A4.1 4.1 0 0 1 12 8.2a4.1 4.1 0 0 1 7.2 2.4C19.2 15.4 12 20 12 20z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>' +
          '</button>' +
        '</div>' +
        '<h3 class="card__n">' + esc(p.name) + '</h3>' +
        '<p class="card__d">' + esc(p.desc || '') + '</p>' +
        '<div class="card__wts" role="group" aria-label="Choose weight for ' + esc(p.name) + '">' +
          WEIGHTS.map((w, i) =>
            '<button class="wt' + (i === 0 ? ' is-on' : '') + '" data-wt="' + w.label + '" data-for="' + p.id + '">' + w.label + '</button>'
          ).join('') +
        '</div>' +
        '<div class="card__foot">' +
          '<span class="card__price" data-price="' + p.id + '">' + fmt(p.price) + '</span>' +
          s.txt +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function renderGrid(el, list) {
    el.innerHTML = list.map(cardHTML).join('');
  }

  /* weight pill selection (delegated, works in every grid) */
  document.addEventListener('click', e => {
    const wt = e.target.closest('[data-wt]');
    if (!wt) return;
    const card = wt.closest('.card, .qv__info');
    if (!card) return;
    $$('[data-wt]', card).forEach(b => b.classList.remove('is-on'));
    wt.classList.add('is-on');
    const id = wt.dataset.for;
    const p = api.getProduct(id);
    if (!p) return;
    const priceEl = $('[data-price="' + id + '"]', card);
    if (priceEl) priceEl.textContent = fmt(priceFor(p.price, wt.dataset.wt));
  });

  /* wishlist */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-wish]');
    if (!b) return;
    const id = b.dataset.wish;
    const added = api.toggleWishlist(id);
    b.classList.toggle('is-on', added);
    b.setAttribute('aria-pressed', String(added));
    b.classList.add('is-beat');
    b.addEventListener('animationend', () => b.classList.remove('is-beat'), { once: true });
    const p = api.getProduct(id);
    toast(added ? 'Saved to wishlist' : 'Removed from wishlist', p ? p.name : '', added ? 'ok' : 'info');
    syncWishBadge();
  });

  /* add to basket */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-add]');
    if (!b) return;
    const id = b.dataset.add;
    const scope = b.closest('.card, .qv__info') || document;
    const wtBtn = $('[data-wt].is-on', scope);
    const weight = wtBtn ? wtBtn.dataset.wt : WEIGHTS[0].label;
    const qtyEl = $('[data-qty-val]', scope);
    const qty = qtyEl ? parseInt(qtyEl.textContent, 10) || 1 : 1;
    addToCart(id, weight, qty);
  });

  /* quick view */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-qv]');
    if (!b || b.closest('#srchResults')) return;
    openQuickView(b.dataset.qv);
  });

  /* ══ CART ══ */
  const cartEl = $('#cart');
  const cartBody = $('#cartBody'), cartFoot = $('#cartFoot');

  function cartLines() { return api.getCart(); }
  function lineTotal(l) {
    const p = api.getProduct(l.id);
    return p ? priceFor(p.price, l.weight) * l.qty : 0;
  }
  function cartCount() { return cartLines().reduce((s, l) => s + l.qty, 0); }
  function cartSubtotal() { return cartLines().reduce((s, l) => s + lineTotal(l), 0); }

  function addToCart(id, weight, qty) {
    const p = api.getProduct(id);
    if (!p) return;
    const stock = api.getStock(id);
    if (stock <= 0) { toast('Out of stock', p.name + ' is not available right now.', 'bad'); return; }

    const cart = cartLines();
    const line = cart.find(l => l.id === id && l.weight === weight);
    const already = cart.filter(l => l.id === id).reduce((s, l) => s + l.qty, 0);
    const room = stock - already;
    if (room <= 0) {
      toast('Only ' + stock + ' available', 'Your basket already holds every unit we have of ' + p.name + '.', 'warn');
      return;
    }
    const add = Math.min(qty, room);
    if (line) line.qty += add; else cart.push({ id, weight, qty: add });
    api.saveCart(cart);

    if (add < qty) toast('Only ' + stock + ' available', 'Added ' + add + ' of ' + p.name + ' to your basket.', 'warn');
    else toast('Added to basket', p.name + ' · ' + weight, 'ok');
    renderCart();
    bump();
    closeLayer(qv);            // QV sits above the drawer — close it before opening the cart
    openCart();
  }

  function setQty(idx, next) {
    const cart = cartLines();
    const l = cart[idx];
    if (!l) return;
    if (next <= 0) {
      const p = api.getProduct(l.id);
      cart.splice(idx, 1);
      api.saveCart(cart);
      toast('Removed', p ? p.name : '', 'info');
      renderCart();
      return;
    }
    const stock = api.getStock(l.id);
    const others = cart.filter((x, i) => i !== idx && x.id === l.id).reduce((s, x) => s + x.qty, 0);
    if (next + others > stock) {
      toast('Only ' + stock + ' available', 'We cannot add more of this right now.', 'warn');
      return;
    }
    l.qty = next;
    api.saveCart(cart);
    renderCart();
  }

  function renderCart() {
    const lines = cartLines();
    const count = cartCount();
    $('#cartQty').textContent = '(' + count + ')';
    [['#cartBadge', count], ['#mbarBadge', count]].forEach(([sel, n]) => {
      const el = $(sel); if (!el) return;
      el.textContent = n; el.hidden = n === 0;
    });

    if (!lines.length) {
      cartBody.innerHTML =
        '<div class="cartempty">' +
          '<svg class="cartempty__i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l-1.1 11.2a1.6 1.6 0 0 1-1.6 1.4H8.7a1.6 1.6 0 0 1-1.6-1.4z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M9.2 8V6.4a2.8 2.8 0 0 1 5.6 0V8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>' +
          '<p class="cartempty__t">Your basket is empty</p>' +
          '<p class="cartempty__x">The kaju katli is not going to add itself.</p>' +
          '<button class="btn btn--primary" id="emptyShop">Browse sweets</button>' +
        '</div>';
      cartFoot.hidden = true;
      const b = $('#emptyShop');
      if (b) b.addEventListener('click', () => { closeCart(); location.hash = '#shop'; });
      return;
    }

    cartBody.innerHTML = lines.map((l, i) => {
      const p = api.getProduct(l.id);
      if (!p) return '';
      const unit = priceFor(p.price, l.weight);
      const stock = api.getStock(l.id);
      /* Stock is shared across every weight of a product, so "+" must look at the
         product's whole basket total — not just this one line. */
      const held = lines.reduce((s, x) => s + (x.id === l.id ? x.qty : 0), 0);
      return '' +
      '<div class="ci">' +
        '<div class="ci__img"><img src="' + imgPath(p.img) + '" alt="" loading="lazy"></div>' +
        '<div>' +
          '<div class="ci__top">' +
            '<div><p class="ci__n">' + esc(p.name) + '</p><p class="ci__w">' + esc(l.weight) + ' · ' + fmt(unit) + '</p></div>' +
            '<button class="ci__rm" data-rm="' + i + '" aria-label="Remove ' + esc(p.name) + '">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
            '</button>' +
          '</div>' +
          '<div class="ci__bot">' +
            '<div class="qty">' +
              '<button data-dec="' + i + '" aria-label="Decrease quantity"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>' +
              '<span>' + l.qty + '</span>' +
              '<button data-inc="' + i + '" ' + (held >= stock ? 'disabled' : '') + ' aria-label="Increase quantity"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>' +
            '</div>' +
            '<span class="ci__p">' + fmt(unit * l.qty) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    const sub = cartSubtotal();
    $('#cartTotals').innerHTML =
      '<div><dt>Subtotal</dt><dd>' + fmt(sub) + '</dd></div>' +
      '<div><dt>Delivery</dt><dd>To be confirmed</dd></div>' +
      '<div class="totals__grand"><dt>Total</dt><dd>' + fmt(sub) + '</dd></div>';
    $('#cartShip').textContent = 'Delivery charges are confirmed by our team before dispatch.';
    cartFoot.hidden = false;
  }

  cartBody.addEventListener('click', e => {
    const inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]'), rm = e.target.closest('[data-rm]');
    if (inc) { const i = +inc.dataset.inc; setQty(i, cartLines()[i].qty + 1); }
    else if (dec) { const i = +dec.dataset.dec; setQty(i, cartLines()[i].qty - 1); }
    else if (rm) { setQty(+rm.dataset.rm, 0); }
  });

  function bump() {
    ['#cartBadge', '#mbarBadge'].forEach(sel => {
      const el = $(sel); if (!el || el.hidden) return;
      el.classList.add('is-pop');
      el.addEventListener('animationend', () => el.classList.remove('is-pop'), { once: true });
    });
  }
  function openCart() { openLayer(cartEl, $('#cartClose')); }
  function closeCart() { closeLayer(cartEl); }
  $('#cartBtn').addEventListener('click', openCart);
  $('#mbarCart').addEventListener('click', openCart);
  $('#cartClose').addEventListener('click', closeCart);
  $('#cartCont').addEventListener('click', closeCart);
  $$('[data-close-cart]').forEach(b => b.addEventListener('click', closeCart));
  $('#cartCheckout').addEventListener('click', () => closeCart());

  function syncWishBadge() {
    const n = api.getWishlist().length;
    const el = $('#wishBadge');
    el.textContent = n; el.hidden = n === 0;
  }
  $('#wishBtn').addEventListener('click', () => {
    const w = api.getWishlist();
    if (!w.length) { toast('Wishlist is empty', 'Tap the heart on any product to save it.', 'info'); return; }
    const names = w.map(id => (api.getProduct(id) || {}).name).filter(Boolean);
    toast(w.length + ' saved item' + (w.length > 1 ? 's' : ''), names.slice(0, 3).join(', ') + (names.length > 3 ? '…' : ''), 'info');
    location.hash = '#shop';
  });
  $('#acctBtn').addEventListener('click', () =>
    toast('Accounts are a next step', 'Order history and saved addresses would live here in the production build.', 'info'));

  /* ══ QUICK VIEW ══ */
  const qv = $('#qv'), qvInner = $('#qvInner');
  function openQuickView(id) {
    const p = api.getProduct(id);
    if (!p) return;
    const s = stockBits(id);
    const wished = api.getWishlist().includes(id);
    qvInner.innerHTML = '' +
      '<div class="qv__media"><img src="' + imgPath(p.img) + '" alt="' + esc(p.name) + '"></div>' +
      '<div class="qv__info">' +
        '<p class="qv__cat">' + esc(p.category) + '</p>' +
        '<h2 class="qv__n" id="qvName">' + esc(p.name) + '</h2>' +
        '<p class="qv__d">' + esc(p.desc || '') + '</p>' +
        '<p class="qv__price" data-price="' + p.id + '">' + fmt(p.price) + '</p>' +
        '<span class="qv__lbl">Weight</span>' +
        '<div class="qv__wts" role="group" aria-label="Choose weight">' +
          WEIGHTS.map((w, i) => '<button class="wt' + (i === 0 ? ' is-on' : '') + '" data-wt="' + w.label + '" data-for="' + p.id + '">' + w.label + '</button>').join('') +
        '</div>' +
        '<p class="qv__stk ' + (s.st === 'out' ? 'card__stk--out' : s.st === 'low' ? 'card__stk--low' : 'card__stk--in') + '">' +
          (s.st === 'out' ? 'Out of stock' : s.st === 'low' ? 'Only ' + s.n + ' left in stock' : 'In stock') + '</p>' +
        '<div class="qv__row">' +
          '<div class="qty">' +
            '<button data-qm aria-label="Decrease quantity"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>' +
            '<span data-qty-val>1</span>' +
            '<button data-qp aria-label="Increase quantity"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>' +
          '</div>' +
          (s.st === 'out'
            ? '<button class="btn btn--primary" disabled>Out of stock</button>'
            : '<button class="btn btn--primary" data-add="' + p.id + '">Add to basket</button>') +
        '</div>' +
        '<button class="btn btn--ghost btn--full" data-wish="' + p.id + '" aria-pressed="' + wished + '">' +
          (wished ? 'Saved to wishlist' : 'Save to wishlist') + '</button>' +
        '<p class="qv__meta">Weight options are a demo. The listed price is the 250 g price published on sukhadiafoods.com; larger packs are scaled for this concept and must be confirmed.</p>' +
      '</div>';
    openLayer(qv, $('#qvClose'));
  }
  qvInner.addEventListener('click', e => {
    const plus = e.target.closest('[data-qp]'), minus = e.target.closest('[data-qm]');
    if (!plus && !minus) return;
    const el = $('[data-qty-val]', qvInner);
    let v = parseInt(el.textContent, 10) || 1;
    const id = ($('[data-add]', qvInner) || {}).dataset ? $('[data-add]', qvInner).dataset.add : null;
    const stock = id ? api.getStock(id) : 99;
    v = plus ? Math.min(v + 1, Math.max(1, stock)) : Math.max(1, v - 1);
    el.textContent = v;
    if (plus && v >= stock) toast('Only ' + stock + ' available', 'That is everything we have in stock.', 'warn');
  });
  $('#qvClose').addEventListener('click', () => closeLayer(qv));
  $$('[data-close-qv]').forEach(b => b.addEventListener('click', () => closeLayer(qv)));

  /* ══ SHOP FILTERS ══ */
  const shopGrid = $('#shopGrid'), fCount = $('#fCount'), fEmpty = $('#fEmpty');
  const state = { q: '', cat: 'all', sort: 'featured' };

  function applyFilters() {
    let list = api.getProducts();
    if (state.cat !== 'all') list = list.filter(p => p.category === state.cat);
    if (state.q) {
      const q = state.q.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || (p.desc || '').toLowerCase().includes(q));
    }
    const s = state.sort;
    if (s === 'asc') list.sort((a, b) => a.price - b.price);
    else if (s === 'desc') list.sort((a, b) => b.price - a.price);
    else if (s === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (s === 'popular') list.sort((a, b) => b.pop - a.pop);
    else list.sort((a, b) => (b.best - a.best) || (b.pop - a.pop));

    renderGrid(shopGrid, list);
    fCount.textContent = 'Showing ' + list.length + ' product' + (list.length === 1 ? '' : 's') +
      (state.cat === 'all' ? '' : ' in ' + state.cat);
    fEmpty.hidden = list.length > 0;
    shopGrid.hidden = list.length === 0;
  }

  $('#fSearch').addEventListener('input', e => { state.q = e.target.value; applyFilters(); });
  $('#fSort').addEventListener('change', e => { state.sort = e.target.value; applyFilters(); });
  $$('.tab').forEach(t => t.addEventListener('click', () => {
    $$('.tab').forEach(x => { x.classList.remove('is-on'); x.setAttribute('aria-selected', 'false'); });
    t.classList.add('is-on'); t.setAttribute('aria-selected', 'true');
    state.cat = t.dataset.cat;
    applyFilters();
  }));
  $('#fReset').addEventListener('click', () => {
    state.q = ''; state.cat = 'all'; state.sort = 'featured';
    $('#fSearch').value = ''; $('#fSort').value = 'featured';
    $$('.tab').forEach((x, i) => {
      x.classList.toggle('is-on', i === 0);
      x.setAttribute('aria-selected', String(i === 0));
    });
    applyFilters();
  });

  /* category deep-links from nav / cards / footer */
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-cat]');
    if (!a || a.classList.contains('tab')) return;
    const cat = a.dataset.cat;
    const tab = $$('.tab').find(t => t.dataset.cat === cat);
    if (tab) tab.click();
  });

  /* ══ GIFTING / PLACEHOLDER BUTTONS ══ */
  $$('[data-gift]').forEach(b => b.addEventListener('click', () => {
    toast(b.dataset.gift + ' gifting', 'Demo concept — gift box contents and pricing to be confirmed by Sukhadia Foods.', 'info');
  }));
  $$('[data-page-soon]').forEach(b => b.addEventListener('click', () => {
    toast(b.dataset.pageSoon, 'This page is part of the proposed build — not included in the demo.', 'info');
  }));

  /* ══ ASSET REVIEW MODE ══
     Reveals every "replace with official photography" caption at once so the
     owner can see exactly which assets are placeholders. */
  const replBtn = $('#replToggle');
  replBtn.addEventListener('click', () => {
    const on = !document.body.classList.contains('show-repl');
    document.body.classList.toggle('show-repl', on);
    replBtn.setAttribute('aria-pressed', String(on));
    replBtn.textContent = on ? 'Hide asset notes' : 'Show asset notes';
    toast(on ? 'Asset notes shown' : 'Asset notes hidden',
      on ? 'Every image marked here needs replacing with official Sukhadia photography.' : '', 'info');
  });

  /* ══ NEWSLETTER ══ */
  $('#newsForm').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#newsEmail'), msg = $('#newsMsg');
    const v = input.value.trim();
    msg.className = 'news__msg';
    if (!v) { msg.textContent = 'Please enter your email address.'; msg.classList.add('is-bad'); input.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v)) { msg.textContent = 'That does not look like a valid email address.'; msg.classList.add('is-bad'); input.focus(); return; }
    msg.textContent = 'Thank you — you are on the list. (Demo only: nothing was sent.)';
    msg.classList.add('is-ok');
    input.value = '';
    toast('You are on the list', 'Demo only — no data left this browser.', 'ok');
  });

  /* ══ CHECKOUT ══ */
  const coForm = $('#coForm');

  function renderCheckout() {
    const lines = cartLines();
    const box = $('#coItems');
    if (!lines.length) {
      box.innerHTML = '<p class="note">Your basket is empty.</p>';
      $('#coTotals').innerHTML = '';
      $('#coPlace').disabled = true;
      return;
    }
    $('#coPlace').disabled = false;
    box.innerHTML = lines.map(l => {
      const p = api.getProduct(l.id);
      if (!p) return '';
      const unit = priceFor(p.price, l.weight);
      return '<div class="coi">' +
        '<img src="' + imgPath(p.img) + '" alt="" loading="lazy">' +
        '<div><p class="coi__n">' + esc(p.name) + '</p><p class="coi__m">' + esc(l.weight) + ' × ' + l.qty + '</p></div>' +
        '<span class="coi__p">' + fmt(unit * l.qty) + '</span>' +
      '</div>';
    }).join('');
    const sub = cartSubtotal();
    $('#coTotals').innerHTML =
      '<div><dt>Subtotal</dt><dd>' + fmt(sub) + '</dd></div>' +
      '<div><dt>Discount</dt><dd>' + fmt(0) + '</dd></div>' +
      '<div><dt>Delivery</dt><dd>To be confirmed</dd></div>' +
      '<div class="totals__grand"><dt>Total</dt><dd>' + fmt(sub) + '</dd></div>';
  }

  const RULES = {
    coName:  v => v.trim().length >= 2 || 'Please enter your name.',
    coPhone: v => /^[6-9]\d{9}$/.test(v.replace(/\D/g, '')) || 'Enter a valid 10-digit mobile number.',
    coEmail: v => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()) || 'Enter a valid email address.',
    coAddr:  v => v.trim().length >= 6 || 'Please enter your address.',
    coCity:  v => v.trim().length >= 2 || 'Please enter your city.',
    coState: v => v.trim().length >= 2 || 'Please enter your state.',
    coPin:   v => /^\d{6}$/.test(v.replace(/\D/g, '')) || 'Enter a valid 6-digit PIN code.'
  };
  function validateField(id) {
    const el = $('#' + id);
    if (!el) return true;
    const res = RULES[id](el.value);
    const fld = el.closest('.fld');
    const err = $('.fld__err', fld);
    if (res === true) { fld.classList.remove('is-bad'); err.textContent = ''; return true; }
    fld.classList.add('is-bad'); err.textContent = res; return false;
  }
  Object.keys(RULES).forEach(id => {
    const el = $('#' + id);
    if (!el) return;
    el.addEventListener('blur', () => validateField(id));
    el.addEventListener('input', () => {
      const fld = el.closest('.fld');
      if (fld.classList.contains('is-bad')) validateField(id);
    });
  });

  coForm.addEventListener('submit', e => {
    e.preventDefault();
    const lines = cartLines();
    if (!lines.length) { toast('Basket is empty', 'Add something before checking out.', 'warn'); return; }

    let ok = true;
    Object.keys(RULES).forEach(id => { if (!validateField(id)) ok = false; });
    if (!ok) {
      const first = $('.fld.is-bad input');
      if (first) { first.focus(); first.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      toast('Please check the form', 'Some details still need fixing.', 'warn');
      return;
    }

    /* final stock re-check before writing the order */
    const need = {};
    lines.forEach(l => { need[l.id] = (need[l.id] || 0) + l.qty; });
    const short = Object.keys(need).filter(id => need[id] > api.getStock(id));
    if (short.length) {
      const p = api.getProduct(short[0]);
      toast('Only ' + api.getStock(short[0]) + ' available', (p ? p.name : 'An item') + ' sold out while you were checking out.', 'bad');
      renderCheckout();
      return;
    }

    const items = lines.map(l => {
      const p = api.getProduct(l.id);
      const unit = priceFor(p.price, l.weight);
      return {
        productId: p.id, productName: p.name, category: p.category,
        weight: l.weight, quantity: l.qty, unitPrice: unit, totalPrice: unit * l.qty
      };
    });
    const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
    const method = (coForm.querySelector('input[name="payment"]:checked') || {}).value || 'Cash on Delivery';

    const order = api.createOrder({
      customerName: $('#coName').value.trim(),
      phone: $('#coPhone').value.replace(/\D/g, ''),
      email: $('#coEmail').value.trim(),
      address: $('#coAddr').value.trim(),
      city: $('#coCity').value.trim(),
      state: $('#coState').value.trim(),
      pincode: $('#coPin').value.replace(/\D/g, ''),
      notes: $('#coNotes').value.trim(),
      items, subtotal, discount: 0, shipping: 0, total: subtotal,
      paymentMethod: method,
      paymentStatus: 'Pending',
      orderStatus: 'Confirmed',
      isDemo: false
    });

    api.clearCart();
    renderCart();
    coForm.reset();
    toast('Inventory updated', 'Stock reduced for ' + items.length + ' product' + (items.length > 1 ? 's' : '') + '.', 'ok');
    location.hash = '#/order/' + order.orderId;
  });

  /* ══ ORDER SUCCESS ══ */
  const STEPS = ['Confirmed', 'Processing', 'Shipped', 'Delivered'];
  function renderSuccess(orderId) {
    const o = api.getOrder(orderId);
    const box = $('#succBody');
    if (!o) {
      box.innerHTML = '<div class="succ__hero"><h1 class="succ__h">Order not found</h1>' +
        '<p class="succ__x">We could not find <strong>' + esc(orderId) + '</strong> in this browser.</p>' +
        '<div class="succ__acts" style="justify-content:center"><a class="btn btn--primary" href="#/shop">Back to shop</a></div></div>';
      return;
    }
    const idx = STEPS.indexOf(o.orderStatus);
    const waText = encodeURIComponent(
      'Hello Sukhadia Foods, I have placed order ' + o.orderId + ' for ' + SK.fmt(o.total) +
      '. Name: ' + o.customerName + '. (Sent from the concept demo site.)'
    );
    box.innerHTML = '' +
      '<div class="succ__hero">' +
        '<div class="succ__tick"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
        '<h1 class="succ__h">Order confirmed</h1>' +
        '<p class="succ__x">Thank you for choosing Sukhadia Foods, ' + esc(o.customerName.split(' ')[0]) + '. Our team will call you to confirm delivery.</p>' +
        '<p class="succ__id"><span>Order</span><strong>' + esc(o.orderId) + '</strong></p>' +
      '</div>' +

      '<div class="succ__card">' +
        '<h2 class="succ__ch">Progress <span class="pill pill--demo">Demo</span></h2>' +
        '<div class="statusbar">' +
          (o.orderStatus === 'Cancelled'
            ? '<span class="stp is-on"><span class="stp__d" style="background:var(--bad)"></span><span class="stp__t">Cancelled</span></span>'
            : STEPS.map((s, i) =>
                '<span class="stp' + (i <= idx ? ' is-on' : '') + '"><span class="stp__d"></span><span class="stp__t">' + s + '</span></span>' +
                (i < STEPS.length - 1 ? '<span class="stp__line"></span>' : '')
              ).join('')) +
        '</div>' +
      '</div>' +

      '<div class="succ__card">' +
        '<h2 class="succ__ch">Order details</h2>' +
        '<div class="succ__meta">' +
          '<dl class="succ__mi"><dt>Order date</dt><dd>' + esc(SK.prettyDate(o.orderDate)) + '</dd></dl>' +
          '<dl class="succ__mi"><dt>Payment</dt><dd>' + esc(o.paymentMethod) + ' · ' + esc(o.paymentStatus) + '</dd></dl>' +
          '<dl class="succ__mi"><dt>Status</dt><dd>' + esc(o.orderStatus) + '</dd></dl>' +
          '<dl class="succ__mi"><dt>Contact</dt><dd>' + esc(o.phone) + '<br>' + esc(o.email) + '</dd></dl>' +
          '<dl class="succ__mi" style="grid-column:1/-1"><dt>Delivery address</dt><dd>' + esc(o.customerName) + ', ' + esc(o.address) + ', ' + esc(o.city) + ', ' + esc(o.state) + ' ' + esc(o.pincode) + '</dd></dl>' +
          (o.notes ? '<dl class="succ__mi" style="grid-column:1/-1"><dt>Notes</dt><dd>' + esc(o.notes) + '</dd></dl>' : '') +
        '</div>' +
      '</div>' +

      '<div class="succ__card">' +
        '<h2 class="succ__ch">Items</h2>' +
        '<div class="succ__items">' +
          o.items.map(i => {
            const p = api.getProduct(i.productId);
            return '<div class="si">' +
              '<img src="' + imgPath(p ? p.img : '') + '" alt="" loading="lazy">' +
              '<div><p class="si__n">' + esc(i.productName) + '</p><p class="si__m">' + esc(i.weight || '') + ' · ' + i.quantity + ' × ' + fmt(i.unitPrice) + '</p></div>' +
              '<span class="si__p">' + fmt(i.totalPrice) + '</span>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<dl class="totals" style="margin-top:1.2rem">' +
          '<div><dt>Subtotal</dt><dd>' + fmt(o.subtotal) + '</dd></div>' +
          '<div><dt>Discount</dt><dd>' + fmt(o.discount) + '</dd></div>' +
          '<div><dt>Delivery</dt><dd>To be confirmed</dd></div>' +
          '<div class="totals__grand"><dt>Total</dt><dd>' + fmt(o.total) + '</dd></div>' +
        '</dl>' +
      '</div>' +

      '<div class="succ__acts">' +
        '<a class="btn btn--primary" href="#/shop">Continue shopping</a>' +
        '<button class="btn btn--ghost" id="succPrint">Download receipt</button>' +
        '<a class="btn btn--wa" href="https://wa.me/917046164064?text=' + waText + '" target="_blank" rel="noopener">WhatsApp this order</a>' +
        '<a class="btn btn--ghost" href="admin.html">View in admin →</a>' +
      '</div>' +
      '<p class="note" style="margin-top:1.5rem">This is a concept demo. No payment was processed and no data left this browser — the order is stored in localStorage so it can be shown in the admin dashboard.</p>';

    const pr = $('#succPrint');
    if (pr) pr.addEventListener('click', () => {
      toast('Opening print dialog', 'Choose “Save as PDF” for a receipt.', 'info');
      setTimeout(() => window.print(), 350);
    });
  }

  /* ══ ROUTER ══ */
  const views = { shop: $('#view-shop'), checkout: $('#view-checkout'), success: $('#view-success') };
  /* Any route change dismisses open overlays — otherwise the cart drawer stays
     open over the checkout/confirmation view and keeps the scroll lock on. */
  function closeAllLayers() {
    [cartEl, qv, srch, mnav].forEach(el => { if (el) closeLayer(el); });
    burger.setAttribute('aria-expanded', 'false');
    lockCount = 0;
    document.body.classList.remove('is-locked');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.paddingRight = '';
  }
  function show(name) {
    Object.keys(views).forEach(k => { views[k].hidden = k !== name; });
    hdr.classList.toggle('is-stuck', name !== 'shop' || window.scrollY > 40);
  }
  function route() {
    const h = location.hash || '';
    closeAllLayers();
    if (h.indexOf('#/') !== 0) {
      show('shop');
      if (h.length > 1) {
        const el = document.getElementById(h.slice(1));
        if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
      }
      return;
    }
    if (h === '#/checkout') {
      show('checkout'); renderCheckout(); window.scrollTo(0, 0);
      return;
    }
    if (h.indexOf('#/order/') === 0) {
      show('success'); renderSuccess(decodeURIComponent(h.slice(8))); window.scrollTo(0, 0);
      return;
    }
    show('shop');
    if (h === '#/shop') history.replaceState(null, '', location.pathname);
  }
  window.addEventListener('hashchange', route);

  /* ══ REVEAL + PARALLAX ══ */
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const io = 'IntersectionObserver' in window && !reduce
    ? new IntersectionObserver((entries, obs) => {
        entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); obs.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: .06 })
    : null;
  function watchReveals() {
    $$('.reveal:not(.is-in)').forEach(el => io ? io.observe(el) : el.classList.add('is-in'));
  }

  if (!reduce) {
    const px = $$('[data-parallax]');
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking || !px.length) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        px.forEach(el => {
          if (y > window.innerHeight * 1.4) return;
          el.style.transform = 'translate3d(0,' + (y * parseFloat(el.dataset.parallax)).toFixed(1) + 'px,0)';
        });
        ticking = false;
      });
    }, { passive: true });
  }

  /* ══ INIT ══ */
  /* The home rail is headed "Most ordered", so show the flagged products in
     popularity order rather than the order they happen to sit in the array. */
  function bestSellers() {
    return api.getProducts().filter(p => p.best).sort((a, b) => (b.pop || 0) - (a.pop || 0)).slice(0, 8);
  }

  /* Category counts in the mobile nav are filled from the catalogue, not typed
     into the markup, so they cannot drift when products are added or removed. */
  function syncCatCounts() {
    const all = api.getProducts();
    $$('[data-count]').forEach(el => {
      const cat = el.dataset.count;
      el.textContent = cat === 'all' ? all.length : all.filter(p => p.category === cat).length;
    });
  }

  $('#yr').textContent = new Date().getFullYear();
  syncCatCounts();
  renderGrid($('#bestGrid'), bestSellers());
  applyFilters();
  renderCart();
  syncWishBadge();
  watchReveals();
  route();
  onScroll();

  /* Keep the UI honest whenever data moves — in this tab (the order we just
     placed consumed stock) or in another one (the admin restocked something).
     Cart writes are skipped: whoever changed the cart re-renders it already,
     and re-drawing the grid would throw away the weight pill the shopper picked. */
  bus.on('data', payload => {
    const key = (payload && payload.key) || '';
    const external = !!(payload && payload.external);
    const stockish = key === KEYS.inventory || key === KEYS.products || key === 'all';
    if (!stockish && !external) return;
    if (stockish) {
      applyFilters();
      renderGrid($('#bestGrid'), bestSellers());
      syncCatCounts();
      watchReveals();
    }
    renderCart();
  });

  console.log('%cSukhadia Foods — concept demo', 'color:#A9823F;font:600 13px system-ui', '\nStorefront ready. Admin dashboard: admin.html');
})();
