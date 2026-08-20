/* ══════════════════════════════════════════════════════════════
   SUKHADIA FOODS — Admin console (demo)
   admin.js · dashboard, analytics, orders, inventory, exports
   ──────────────────────────────────────────────────────────────
   Reads and writes through SK.api (see script.js), which is a
   localStorage-backed stand-in for a real REST API.
   Charts are hand-rolled SVG so the console works fully offline.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (document.body.dataset.page !== 'admin') return;

  const { api, bus, fmt, fmtN, imgPath, todayISO, prettyDate, CATEGORIES, STATUSES } = SK;
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ══════════ TOASTS ══════════ */
  const toastBox = $('#toasts');
  function toast(title, msg, kind) {
    const el = document.createElement('div');
    el.className = 'toast toast--' + (kind || 'ok');
    el.innerHTML = '<div><b>' + esc(title) + '</b>' + (msg ? '<span>' + esc(msg) + '</span>' : '') + '</div>';
    toastBox.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-out');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, 3400);
    while (toastBox.children.length > 4) toastBox.firstElementChild.remove();
  }

  /* ══════════ DATE RANGE ══════════ */
  function shiftDays(n) {
    const d = new Date(); d.setDate(d.getDate() + n); return todayISO(d);
  }
  const PRESETS = {
    today:     () => ({ from: todayISO(), to: todayISO(), label: 'Today' }),
    yesterday: () => ({ from: shiftDays(-1), to: shiftDays(-1), label: 'Yesterday' }),
    d7:        () => ({ from: shiftDays(-6), to: todayISO(), label: 'Last 7 days' }),
    d30:       () => ({ from: shiftDays(-29), to: todayISO(), label: 'Last 30 days' }),
    d90:       () => ({ from: shiftDays(-89), to: todayISO(), label: 'Last 90 days' }),
    month:     () => { const d = new Date(); return { from: todayISO(new Date(d.getFullYear(), d.getMonth(), 1)), to: todayISO(), label: 'This month' }; },
    year:      () => { const d = new Date(); return { from: todayISO(new Date(d.getFullYear(), 0, 1)), to: todayISO(), label: 'This year' }; },
    all:       () => ({ from: '', to: '', label: 'All time' })
  };
  const state = {
    rangeKey: 'd30',
    custom: { from: '', to: '' },
    metric: 'revenue',
    view: 'dashboard'
  };
  function currentRange() {
    if (state.rangeKey === 'custom') {
      return { from: state.custom.from, to: state.custom.to, label: 'Custom range' };
    }
    return (PRESETS[state.rangeKey] || PRESETS.d30)();
  }

  const RANGE_BTNS = [
    ['today', 'Today'], ['yesterday', 'Yesterday'], ['d7', '7 days'], ['d30', '30 days'],
    ['d90', '90 days'], ['month', 'Month'], ['year', 'Year'], ['all', 'All time']
  ];
  function renderRangeBars() {
    const r = currentRange();
    $$('.rangebar').forEach(bar => {
      bar.innerHTML =
        '<span class="rangebar__lbl">Period</span>' +
        '<div class="seg">' + RANGE_BTNS.map(([k, l]) =>
          '<button class="seg__b' + (state.rangeKey === k ? ' is-on' : '') + '" data-range="' + k + '">' + l + '</button>'
        ).join('') + '</div>' +
        '<span class="rangebar__custom">' +
          '<input type="date" data-cust="from" value="' + esc(state.custom.from) + '" aria-label="From date">' +
          '<span>to</span>' +
          '<input type="date" data-cust="to" value="' + esc(state.custom.to) + '" aria-label="To date">' +
        '</span>' +
        '<span class="rangebar__sum">' + esc(r.label) +
          (r.from ? ' · ' + prettyDate(r.from) + ' – ' + prettyDate(r.to) : ' · every order') + '</span>';
    });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-range]');
    if (!b) return;
    state.rangeKey = b.dataset.range;
    state.custom = { from: '', to: '' };
    renderAll();
  });
  document.addEventListener('change', e => {
    const i = e.target.closest('[data-cust]');
    if (!i) return;
    state.custom[i.dataset.cust] = i.value;
    if (state.custom.from && state.custom.to) {
      if (state.custom.from > state.custom.to) {
        toast('Check the dates', 'The start date is after the end date.', 'warn');
        return;
      }
      state.rangeKey = 'custom';
      renderAll();
    }
  });

  /* ══════════ SVG CHARTS (no dependencies) ══════════ */
  const C = {
    maroon: '#6B1626', gold: '#A9823F', goldL: '#E5B769',
    saffron: '#DE8C2F', ok: '#2E7D4F', info: '#3D6E9E', clay: '#9C6B4A'
  };
  const CAT_COLOURS = { 'Sweets': C.maroon, 'Farsan': C.saffron, 'Khakhra': C.goldL, 'Dry Fruits': C.ok };

  /* Build a zero-filled day series between two dates. */
  function daySeries(byDay, from, to) {
    const keys = Object.keys(byDay).sort();
    if (!from) from = keys[0] || todayISO();
    if (!to) to = keys[keys.length - 1] || todayISO();
    const out = [];
    const d = new Date(from + 'T00:00:00'), end = new Date(to + 'T00:00:00');
    if (isNaN(d) || isNaN(end) || d > end) return out;
    let guard = 0;
    while (d <= end && guard++ < 800) {
      const k = todayISO(d);
      out.push({ date: k, revenue: (byDay[k] || {}).revenue || 0, orders: (byDay[k] || {}).orders || 0, units: (byDay[k] || {}).units || 0 });
      d.setDate(d.getDate() + 1);
    }
    return out;
  }
  const niceMax = v => {
    if (v <= 0) return 10;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    return Math.ceil(v / p * 2) / 2 * p;
  };
  const shortDate = iso => {
    const d = new Date(iso + 'T00:00:00');
    return isNaN(d) ? iso : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };
  const shortNum = n => n >= 1e7 ? (n / 1e7).toFixed(1) + 'Cr'
    : n >= 1e5 ? (n / 1e5).toFixed(1) + 'L'
    : n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : Math.round(n);

  function areaChart(el, rows, key, opts) {
    opts = opts || {};
    if (!rows.length) { el.innerHTML = emptyChart('No data in this period'); return; }
    const W = 720, H = 250, P = { t: 14, r: 12, b: 26, l: 44 };
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    const max = niceMax(Math.max.apply(null, rows.map(r => r[key])) || 0);
    const n = rows.length;
    const x = i => P.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
    const y = v => P.t + ih - (max ? (v / max) * ih : 0);
    const money = key === 'revenue';

    const pts = rows.map((r, i) => [x(i), y(r[key])]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = line + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (P.t + ih) + ' L' + pts[0][0].toFixed(1) + ' ' + (P.t + ih) + ' Z';

    let grid = '', ylab = '';
    for (let g = 0; g <= 4; g++) {
      const v = (max / 4) * g, yy = y(v);
      grid += '<line class="ct-grid" x1="' + P.l + '" y1="' + yy.toFixed(1) + '" x2="' + (W - P.r) + '" y2="' + yy.toFixed(1) + '"/>';
      ylab += '<text class="ct-axis" x="' + (P.l - 8) + '" y="' + (yy + 3.5).toFixed(1) + '" text-anchor="end">' + (money ? '₹' : '') + shortNum(v) + '</text>';
    }
    const every = Math.max(1, Math.ceil(n / 7));
    let xlab = '';
    rows.forEach((r, i) => {
      if (i % every && i !== n - 1) return;
      xlab += '<text class="ct-axis" x="' + x(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + shortDate(r.date) + '</text>';
    });

    /* hover targets + tooltips */
    let hits = '';
    const bw = n > 1 ? iw / (n - 1) : iw;
    rows.forEach((r, i) => {
      const cx = x(i), cy = y(r[key]);
      const val = money ? fmt(r[key]) : fmtN(r[key]) + (key === 'orders' ? ' orders' : ' units');
      const tw = Math.max(96, (val.length + shortDate(r.date).length) * 5.4);
      const tx = Math.min(Math.max(cx - tw / 2, P.l), W - P.r - tw);
      const ty = Math.max(cy - 46, 2);
      hits +=
        '<g>' +
          '<rect class="ct-hit" x="' + (cx - bw / 2).toFixed(1) + '" y="' + P.t + '" width="' + bw.toFixed(1) + '" height="' + ih + '" tabindex="0" role="img" aria-label="' + esc(shortDate(r.date) + ': ' + val) + '"/>' +
          '<g class="ct-hover">' +
            '<line x1="' + cx.toFixed(1) + '" y1="' + P.t + '" x2="' + cx.toFixed(1) + '" y2="' + (P.t + ih) + '" stroke="' + C.gold + '" stroke-width="1" stroke-dasharray="3 3"/>' +
            '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="4.5" fill="' + C.maroon + '" stroke="#fff" stroke-width="2"/>' +
            '<rect x="' + tx.toFixed(1) + '" y="' + ty + '" width="' + tw + '" height="34" rx="6"/>' +
            '<text x="' + (tx + 9) + '" y="' + (ty + 14) + '">' + esc(shortDate(r.date)) + '</text>' +
            '<text x="' + (tx + 9) + '" y="' + (ty + 27) + '" opacity=".8">' + esc(val) + '</text>' +
          '</g>' +
        '</g>';
    });

    el.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.label || 'Chart') + '">' +
        '<defs><linearGradient id="gRev' + (opts.id || '') + '" x1="0" x2="0" y1="0" y2="1">' +
          '<stop offset="0%" stop-color="' + (opts.colour || C.maroon) + '" stop-opacity=".22"/>' +
          '<stop offset="100%" stop-color="' + (opts.colour || C.maroon) + '" stop-opacity="0"/>' +
        '</linearGradient></defs>' +
        grid + ylab + xlab +
        '<path d="' + area + '" fill="url(#gRev' + (opts.id || '') + ')"/>' +
        '<path class="ct-line" d="' + line + '" stroke="' + (opts.colour || C.maroon) + '"/>' +
        (n <= 40 ? pts.map(p => '<circle class="ct-dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3" stroke="' + (opts.colour || C.maroon) + '"/>').join('') : '') +
        hits +
      '</svg>';
  }

  function barChart(el, items) {
    if (!items.length) { el.innerHTML = emptyChart('No sales in this period'); return; }
    const rowH = 30, W = 720, P = { l: 150, r: 56, t: 6 };
    const H = items.length * rowH + P.t + 6;
    const max = Math.max.apply(null, items.map(i => i.value)) || 1;
    const iw = W - P.l - P.r;
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Units sold by product">' +
      items.map((it, i) => {
        const y = P.t + i * rowH, w = Math.max(2, (it.value / max) * iw);
        return '<g>' +
          '<text class="ct-axis" x="' + (P.l - 10) + '" y="' + (y + 17) + '" text-anchor="end">' + esc(it.label.length > 20 ? it.label.slice(0, 19) + '…' : it.label) + '</text>' +
          '<rect x="' + P.l + '" y="' + (y + 6) + '" width="' + iw + '" height="15" rx="7.5" fill="rgba(36,28,21,.05)"/>' +
          '<rect class="ct-bar" x="' + P.l + '" y="' + (y + 6) + '" width="' + w.toFixed(1) + '" height="15" rx="7.5"><title>' + esc(it.label + ': ' + it.value) + '</title></rect>' +
          '<text class="ct-axis" x="' + (P.l + iw + 8) + '" y="' + (y + 17) + '">' + fmtN(it.value) + '</text>' +
        '</g>';
      }).join('') + '</svg>';
  }

  function donutChart(el, cats) {
    const total = cats.reduce((s, c) => s + c.revenue, 0);
    if (!total) { el.innerHTML = emptyChart('No revenue in this period'); return; }
    const S = 190, cx = S / 2, cy = S / 2, R = 78, r = 50;
    let a0 = -Math.PI / 2, paths = '';
    cats.forEach(c => {
      const frac = c.revenue / total;
      let a1 = a0 + frac * Math.PI * 2;
      if (frac >= 0.9999) a1 = a0 + Math.PI * 1.9999;   /* avoid a degenerate full-circle arc */
      const large = (a1 - a0) > Math.PI ? 1 : 0;
      const p = (ang, rad) => [(cx + Math.cos(ang) * rad).toFixed(2), (cy + Math.sin(ang) * rad).toFixed(2)];
      const [x1, y1] = p(a0, R), [x2, y2] = p(a1, R), [x3, y3] = p(a1, r), [x4, y4] = p(a0, r);
      paths += '<path d="M' + x1 + ' ' + y1 + ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + x2 + ' ' + y2 +
               ' L' + x3 + ' ' + y3 + ' A' + r + ' ' + r + ' 0 ' + large + ' 0 ' + x4 + ' ' + y4 + ' Z" fill="' +
               (CAT_COLOURS[c.category] || C.clay) + '" opacity=".92"><title>' +
               esc(c.category + ': ' + fmt(c.revenue) + ' (' + c.share.toFixed(1) + '%)') + '</title></path>';
      a0 = a1;
    });
    el.innerHTML =
      '<svg viewBox="0 0 ' + S + ' ' + S + '" style="width:190px;flex:none" role="img" aria-label="Revenue by category">' +
        paths +
        '<text x="' + cx + '" y="' + (cy - 3) + '" text-anchor="middle" style="font-family:Fraunces,serif;font-size:19px;font-weight:600;fill:#6B1626">' + fmt(total) + '</text>' +
        '<text x="' + cx + '" y="' + (cy + 13) + '" text-anchor="middle" class="ct-axis">TOTAL REVENUE</text>' +
      '</svg>' +
      '<div class="donut__legend">' + cats.map(c =>
        '<div class="dl"><span class="dl__sw" style="background:' + (CAT_COLOURS[c.category] || C.clay) + '"></span>' +
        '<span class="dl__n">' + esc(c.category) + '</span>' +
        '<span class="dl__v">' + c.share.toFixed(1) + '% · ' + fmt(c.revenue) + '</span></div>'
      ).join('') + '</div>';
  }
  const emptyChart = msg =>
    '<div style="display:grid;place-items:center;min-height:200px;color:var(--tx-3);font-size:12.5px;text-align:center">' + esc(msg) + '</div>';

  /* ══════════ SHARED BITS ══════════ */
  const STATUS_KIND = {
    Pending: 'neutral', Confirmed: 'info', Processing: 'warn',
    Shipped: 'info', Delivered: 'ok', Cancelled: 'bad'
  };
  const statusBadge = s => '<span class="badge badge--' + (STATUS_KIND[s] || 'neutral') + '">' + esc(s) + '</span>';
  function stockBadge(id) {
    const st = api.stockState(id), n = api.getStock(id);
    if (st === 'out') return '<span class="badge badge--bad">Out of stock</span>';
    if (st === 'low') return '<span class="badge badge--warn">Low · ' + n + '</span>';
    return '<span class="badge badge--ok">In stock</span>';
  }
  function noData(title, msg, withBtn) {
    return '<div class="empty2"><h3>' + esc(title) + '</h3><p>' + esc(msg) + '</p>' +
      (withBtn ? '<button class="btn btn--primary" data-gen>Create demo orders</button>' : '') + '</div>';
  }
  const prodImg = id => { const p = api.getProduct(id); return imgPath(p ? p.img : ''); };
  const prodName = id => { const p = api.getProduct(id); return p ? p.name : id; };

  /* ══════════ DASHBOARD ══════════ */
  function renderDashboard() {
    const r = currentRange();
    const a = api.getAnalytics({ from: r.from, to: r.to });
    const allTime = api.getAnalytics(null);

    /* ---- alerts ---- */
    const alertBox = $('#alertBox');
    const alerts = allTime.outStock.map(p =>
      '<button class="alert alert--out" data-alert="out" data-id="' + p.id + '">🔴 <b>' + esc(p.name) + '</b> — out of stock</button>'
    ).concat(allTime.lowStock.map(p =>
      '<button class="alert alert--low" data-alert="low" data-id="' + p.id + '">⚠ <b>' + esc(p.name) + '</b> — only ' + api.getStock(p.id) + ' left</button>'
    ));
    alertBox.innerHTML = alerts.length
      ? '<div class="alerts"><p class="alerts__h">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M12 8v5M12 17h.01M10.3 3.9L2.6 17.4A1.9 1.9 0 0 0 4.3 20h15.4a1.9 1.9 0 0 0 1.7-2.6L13.7 3.9a1.9 1.9 0 0 0-3.4 0z"/></svg>' +
          'Inventory alerts · ' + alerts.length + '</p><div class="alerts__l">' + alerts.join('') + '</div></div>'
      : '';
    $('#bellDot').hidden = alerts.length === 0;
    const navInv = $('#navInv');
    navInv.textContent = alerts.length; navInv.hidden = alerts.length === 0;
    $('#navOrders').textContent = allTime.totalOrders;

    /* ---- KPIs ---- */
    const span = r.from ? (Math.round((new Date(r.to) - new Date(r.from)) / 864e5) + 1) : 0;
    let prev = null;
    if (span) {
      const pTo = todayISO(new Date(new Date(r.from + 'T00:00:00').getTime() - 864e5));
      const pFrom = todayISO(new Date(new Date(r.from + 'T00:00:00').getTime() - span * 864e5));
      prev = api.getAnalytics({ from: pFrom, to: pTo });
    }
    const delta = (now, before) => {
      if (!prev || !before) return '';
      const pc = ((now - before) / before) * 100;
      if (!isFinite(pc) || Math.abs(pc) < 0.5) return '<b>±0%</b> vs previous';
      return '<b class="' + (pc < 0 ? 'dn' : '') + '">' + (pc > 0 ? '+' : '') + pc.toFixed(0) + '%</b> vs previous';
    };

    $('#kpis').innerHTML = [
      { l: 'Revenue', v: fmt(a.revenue), s: delta(a.revenue, prev && prev.revenue) || (r.label + ' total'), c: 'rev' },
      { l: 'Orders', v: fmtN(a.totalOrders), s: delta(a.totalOrders, prev && prev.totalOrders) || 'in this period' },
      { l: "Today's orders", v: fmtN(a.todayOrders), s: fmt(a.todayRevenue) + ' today' },
      { l: 'Average order', v: fmt(a.aov), s: a.totalOrders ? 'across ' + a.totalOrders + ' order' + (a.totalOrders === 1 ? '' : 's') : 'no orders yet' },
      { l: 'Units sold', v: fmtN(a.units), s: 'packs across all sizes' },
      { l: 'Products', v: fmtN(api.getProducts().length), s: a.products.length + ' sold in period' },
      { l: 'Low stock', v: fmtN(allTime.lowStock.length), s: 'at or below threshold', c: allTime.lowStock.length ? 'warn' : '' },
      { l: 'Out of stock', v: fmtN(allTime.outStock.length), s: 'cannot be ordered', c: allTime.outStock.length ? 'bad' : '' }
    ].map(k =>
      '<div class="kpi' + (k.c ? ' kpi--' + k.c : '') + '"><p class="kpi__l">' + esc(k.l) + '</p>' +
      '<p class="kpi__v">' + k.v + '</p><p class="kpi__s">' + k.s + '</p></div>'
    ).join('');

    /* ---- charts ---- */
    const series = daySeries(a.byDay, r.from, r.to);
    $('#revSub').textContent = r.label + (state.metric === 'revenue' ? ' · revenue' : state.metric === 'orders' ? ' · orders' : ' · units');
    areaChart($('#chartMain'), series, state.metric, {
      id: 'd', label: 'Revenue over time',
      colour: state.metric === 'revenue' ? C.maroon : state.metric === 'orders' ? C.info : C.saffron
    });
    donutChart($('#chartDonut'), a.categories);

    /* ---- best sellers ---- */
    $('#bestTable').innerHTML = a.products.length ? '<div class="tw"><table>' +
      '<thead><tr><th>#</th><th>Product</th><th>Category</th><th class="num">Units</th><th class="num">Revenue</th><th class="num">Stock</th><th>Status</th></tr></thead><tbody>' +
      a.products.slice(0, 8).map((p, i) =>
        '<tr><td><span class="rank">' + (i + 1) + '</span></td>' +
        '<td><div class="tprod"><img src="' + prodImg(p.id) + '" alt="" loading="lazy"><div><b>' + esc(p.name) + '</b></div></div></td>' +
        '<td>' + esc(p.category) + '</td>' +
        '<td class="num">' + fmtN(p.units) + '</td>' +
        '<td class="num">' + fmt(p.revenue) + '</td>' +
        '<td class="num">' + fmtN(api.getStock(p.id)) + '</td>' +
        '<td>' + stockBadge(p.id) + '</td></tr>'
      ).join('') + '</tbody></table></div>'
      : noData('No sales data yet', 'Place an order on the storefront, or generate demo orders to see the dashboard populated.', true);

    /* ---- insights ---- */
    $('#insights').innerHTML = buildInsights(a, prev, r);

    /* ---- popular ---- */
    $('#popList').innerHTML = a.products.length
      ? '<div class="plist">' + a.products.slice(0, 6).map(p =>
          '<div class="pl"><img src="' + prodImg(p.id) + '" alt="" loading="lazy">' +
          '<div class="pl__b"><p class="pl__n"><span>' + esc(p.name) + '</span>' +
          '<span>' + tierIcon(p.tier) + ' ' + esc(p.tier) + '</span></p>' +
          '<div class="pl__bar"><div class="pl__fill" style="width:' + Math.max(4, p.score) + '%"></div></div></div></div>'
        ).join('') + '</div>'
      : '<p class="hint">No sales yet, so there is nothing to rank.</p>';

    /* ---- stock recommendations ---- */
    $('#stockRec').innerHTML = buildRecommendations(a, r);

    /* ---- recent orders ---- */
    const recent = allTime.orders.slice().sort((x, y) => (y.createdAt || '').localeCompare(x.createdAt || '')).slice(0, 6);
    $('#recentOrders').innerHTML = recent.length ? '<div class="tw"><table>' +
      '<thead><tr><th>Order</th><th>Customer</th><th class="num">Items</th><th class="num">Total</th><th>Status</th><th></th></tr></thead><tbody>' +
      recent.map(o =>
        '<tr><td><span class="oid">' + esc(o.orderId) + '</span>' + (o.isDemo ? ' <span class="badge badge--demo">Demo</span>' : '') +
        '<br><span style="font-size:10.5px;color:var(--tx-3)">' + esc(prettyDate(o.orderDate)) + '</span></td>' +
        '<td>' + esc(o.customerName) + '</td>' +
        '<td class="num">' + o.items.reduce((s, i) => s + i.quantity, 0) + '</td>' +
        '<td class="num">' + fmt(o.total) + '</td>' +
        '<td>' + statusBadge(o.orderStatus) + '</td>' +
        '<td class="num"><button class="btn btn--ghost btn--sm" data-order="' + esc(o.orderId) + '">Open</button></td></tr>'
      ).join('') + '</tbody></table></div>'
      : noData('No orders yet', 'Orders placed on the storefront appear here immediately.', true);
  }

  const tierIcon = t => t === 'Very Popular' ? '🔥' : t === 'Popular' ? '🔥' : t === 'Trending' ? '⭐' : '•';

  function buildInsights(a, prev, r) {
    const out = [];
    if (!a.totalOrders) {
      return '<p class="hint">Insights appear once there are orders in the selected period. Use <b>Settings → Generate demo orders</b> to populate the dashboard for a presentation.</p>';
    }
    const top = a.products[0];
    if (top) out.push(['🔥', '<b>' + esc(top.name) + '</b> is the top seller for ' + esc(r.label.toLowerCase()) + ' — ' + fmtN(top.units) + ' units and ' + fmt(top.revenue) + '.']);
    const topCat = a.categories[0];
    if (topCat) out.push(['📈', '<b>' + esc(topCat.category) + '</b> generated ' + topCat.share.toFixed(0) + '% of revenue in this period.']);
    if (prev && prev.aov && a.aov) {
      const d = ((a.aov - prev.aov) / prev.aov) * 100;
      out.push([d >= 0 ? '🛒' : '📉', 'Average order value is <b>' + fmt(a.aov) + '</b>, ' +
        (Math.abs(d) < 0.5 ? 'level with' : (d > 0 ? 'up ' : 'down ') + Math.abs(d).toFixed(0) + '% on') + ' the previous period.']);
    }
    const cust = a.customers || [];
    const returning = cust.filter(c => c.orders >= 2);
    if (cust.length) {
      const rRev = returning.reduce((s, c) => s + c.spent, 0);
      const tRev = cust.reduce((s, c) => s + c.spent, 0);
      if (tRev) out.push(['⭐', 'Returning customers are <b>' + returning.length + ' of ' + cust.length + '</b> and account for ' + Math.round((rRev / tRev) * 100) + '% of revenue.']);
    }
    if (a.outStock.length) out.push(['🔴', '<b>' + a.outStock.length + ' product' + (a.outStock.length > 1 ? 's are' : ' is') + '</b> out of stock and cannot be ordered right now.']);
    else if (a.lowStock.length) out.push(['⚠', '<b>' + a.lowStock.length + ' product' + (a.lowStock.length > 1 ? 's need' : ' needs') + '</b> restocking soon.']);
    const cancelled = a.cancelled;
    if (cancelled) out.push(['↩', fmtN(cancelled) + ' order' + (cancelled > 1 ? 's were' : ' was') + ' cancelled in this period; their stock has been returned.']);
    return '<div class="ins">' + out.slice(0, 6).map(([i, t]) =>
      '<div class="in"><span class="in__i">' + i + '</span><span>' + t + '</span></div>').join('') + '</div>';
  }

  function buildRecommendations(a, r) {
    const days = r.from ? Math.max(1, Math.round((new Date(r.to) - new Date(r.from)) / 864e5) + 1) : 90;
    const sold = {};
    a.products.forEach(p => { sold[p.id] = p.units; });
    const rows = api.getProducts().map(p => {
      const stock = api.getStock(p.id);
      const weekly = ((sold[p.id] || 0) / days) * 7;
      const weeksLeft = weekly > 0 ? stock / weekly : Infinity;
      return { p, stock, weekly, weeksLeft, st: api.stockState(p.id) };
    }).filter(x => x.st === 'out' || x.st === 'low' || x.weeksLeft < 2)
      .sort((x, y) => x.weeksLeft - y.weeksLeft)
      .slice(0, 6);

    if (!rows.length) return '<p class="hint">Every product has enough stock for the current rate of sale. Nothing needs restocking.</p>';
    return '<div class="rec">' + rows.map(x => {
      const urgent = x.st === 'out';
      const soon = x.st === 'low' || x.weeksLeft < 1;
      const rate = x.weekly >= 0.1 ? x.weekly.toFixed(1) + ' units/week' : 'no recent sales';
      const advice = urgent ? 'Restock immediately — customers cannot order it.'
        : x.weeksLeft < 1 && isFinite(x.weeksLeft) ? 'Under a week of cover left. Restock now.'
        : soon ? 'Consider restocking soon.'
        : 'About ' + x.weeksLeft.toFixed(1) + ' weeks of cover left.';
      return '<div class="rc' + (urgent ? ' rc--urgent' : soon ? ' rc--soon' : '') + '">' +
        '<div class="rc__b"><p class="rc__n">' + esc(x.p.name) + '</p>' +
        '<p class="rc__x">Stock ' + x.stock + ' · ' + rate + ' · ' + advice + '</p></div>' +
        '<button class="btn btn--ghost btn--sm" data-stock="' + x.p.id + '">Add stock</button></div>';
    }).join('') + '</div>';
  }

  /* ══════════ ANALYTICS ══════════ */
  function renderAnalytics() {
    const r = currentRange();
    const a = api.getAnalytics({ from: r.from, to: r.to });
    const series = daySeries(a.byDay, r.from, r.to);

    $('#anKpis').innerHTML = [
      { l: 'Revenue', v: fmt(a.revenue), s: r.label, c: 'rev' },
      { l: 'Orders', v: fmtN(a.totalOrders), s: a.cancelled + ' cancelled' },
      { l: 'Units sold', v: fmtN(a.units), s: 'all pack sizes' },
      { l: 'Average order', v: fmt(a.aov), s: 'per order' }
    ].map(k => '<div class="kpi' + (k.c ? ' kpi--' + k.c : '') + '"><p class="kpi__l">' + k.l + '</p><p class="kpi__v">' + k.v + '</p><p class="kpi__s">' + esc(k.s) + '</p></div>').join('');

    $('#anRevSub').textContent = r.label;
    $('#anOrdSub').textContent = r.label;
    areaChart($('#anChartRev'), series, 'revenue', { id: 'ar', colour: C.maroon, label: 'Revenue over time' });
    areaChart($('#anChartOrd'), series, 'orders', { id: 'ao', colour: C.info, label: 'Orders over time' });

    $('#anCats').innerHTML = a.categories.length
      ? '<div class="plist">' + a.categories.map(c =>
          '<div class="pl"><div class="pl__b"><p class="pl__n"><span>' + esc(c.category) + '</span>' +
          '<span>' + fmt(c.revenue) + ' · ' + fmtN(c.units) + ' units · ' + c.share.toFixed(1) + '%</span></p>' +
          '<div class="pl__bar"><div class="pl__fill" style="width:' + Math.max(3, c.share) + '%;background:' + (CAT_COLOURS[c.category] || C.clay) + '"></div></div></div></div>'
        ).join('') + '</div>'
      : '<p class="hint">No category sales in this period.</p>';

    barChart($('#anBars'), a.products.slice(0, 10).map(p => ({ label: p.name, value: p.units })));

    $('#anTable').innerHTML = a.products.length ? '<div class="tw"><table>' +
      '<thead><tr><th>#</th><th>Product</th><th>Category</th><th class="num">Units</th><th class="num">Orders</th><th class="num">Revenue</th><th>Popularity</th><th class="num">Stock</th></tr></thead><tbody>' +
      a.products.map((p, i) =>
        '<tr><td><span class="rank">' + (i + 1) + '</span></td>' +
        '<td><div class="tprod"><img src="' + prodImg(p.id) + '" alt="" loading="lazy"><div><b>' + esc(p.name) + '</b></div></div></td>' +
        '<td>' + esc(p.category) + '</td>' +
        '<td class="num">' + fmtN(p.units) + '</td>' +
        '<td class="num">' + fmtN(p.orders) + '</td>' +
        '<td class="num">' + fmt(p.revenue) + '</td>' +
        '<td><span class="tier">' + tierIcon(p.tier) + ' ' + esc(p.tier) + '</span></td>' +
        '<td class="num">' + fmtN(api.getStock(p.id)) + '</td></tr>'
      ).join('') + '</tbody></table></div>'
      : noData('No sales in this period', 'Widen the date range, or generate demo orders.', true);
  }

  /* ══════════ ORDERS ══════════ */
  const ordState = { q: '', status: '', sort: 'new' };
  function renderOrders() {
    let list = api.getOrders();
    if (ordState.q) {
      const q = ordState.q.toLowerCase();
      list = list.filter(o =>
        o.orderId.toLowerCase().includes(q) || (o.customerName || '').toLowerCase().includes(q) ||
        (o.phone || '').includes(q) || (o.email || '').toLowerCase().includes(q) || (o.city || '').toLowerCase().includes(q));
    }
    if (ordState.status) list = list.filter(o => o.orderStatus === ordState.status);
    const s = ordState.sort;
    list.sort((a, b) => s === 'new' ? (b.createdAt || '').localeCompare(a.createdAt || '')
      : s === 'old' ? (a.createdAt || '').localeCompare(b.createdAt || '')
      : s === 'hi' ? b.total - a.total : a.total - b.total);

    $('#ordTable').innerHTML = list.length ? '<div class="tw"><table>' +
      '<thead><tr><th>Order ID</th><th>Date</th><th>Customer</th><th class="num">Items</th><th class="num">Total</th><th>Payment</th><th>Status</th><th></th></tr></thead><tbody>' +
      list.map(o =>
        '<tr><td><span class="oid">' + esc(o.orderId) + '</span>' + (o.isDemo ? '<br><span class="badge badge--demo">Demo data</span>' : '') + '</td>' +
        '<td style="white-space:nowrap">' + esc(prettyDate(o.orderDate)) + '</td>' +
        '<td><b>' + esc(o.customerName) + '</b><br><span style="font-size:10.5px;color:var(--tx-3)">' + esc(o.city || '—') + '</span></td>' +
        '<td class="num">' + o.items.reduce((t, i) => t + i.quantity, 0) + '</td>' +
        '<td class="num"><b>' + fmt(o.total) + '</b></td>' +
        '<td><span style="font-size:11.5px">' + esc(o.paymentMethod) + '</span><br><span class="badge badge--' + (o.paymentStatus === 'Paid' ? 'ok' : 'neutral') + '">' + esc(o.paymentStatus) + '</span></td>' +
        '<td>' + statusBadge(o.orderStatus) + '</td>' +
        '<td class="num"><button class="btn btn--ghost btn--sm" data-order="' + esc(o.orderId) + '">View</button></td></tr>'
      ).join('') + '</tbody></table></div>'
      : noData(api.getOrders().length ? 'No orders match those filters' : 'No orders yet',
               api.getOrders().length ? 'Try clearing the search or status filter.' : 'Place an order on the storefront, or generate demo orders.',
               api.getOrders().length === 0);
  }

  /* ══════════ ORDER DRAWER ══════════ */
  const drawer = $('#ordDrawer');
  let openOrderId = null;
  const FLOW = ['Confirmed', 'Processing', 'Shipped', 'Delivered'];

  function openOrder(id) {
    const o = api.getOrder(id);
    if (!o) { toast('Order not found', id, 'bad'); return; }
    openOrderId = id;
    $('#drTitle').textContent = o.orderId;
    $('#drSub').textContent = prettyDate(o.orderDate) + ' · ' + o.customerName + (o.isDemo ? ' · demo data' : '');

    const idx = FLOW.indexOf(o.orderStatus);
    const steps = o.orderStatus === 'Cancelled'
      ? '<span class="stp2 on"><i style="background:var(--bad)"></i>Cancelled</span>'
      : FLOW.map((s, i) => '<span class="stp2' + (i <= idx ? ' on' : '') + '"><i></i>' + s + '</span>' +
          (i < FLOW.length - 1 ? '<span class="stp2__l"></span>' : '')).join('');

    $('#drBody').innerHTML =
      '<div class="dsec"><p class="dsec__h">Progress</p><div class="steps">' + steps + '</div></div>' +
      '<div class="dsec"><p class="dsec__h">Customer</p><div class="dgrid">' +
        '<div><dt>Name</dt><dd>' + esc(o.customerName) + '</dd></div>' +
        '<div><dt>Phone</dt><dd><a href="tel:' + esc(o.phone) + '">' + esc(o.phone || '—') + '</a></dd></div>' +
        '<div><dt>Email</dt><dd>' + esc(o.email || '—') + '</dd></div>' +
        '<div><dt>Payment</dt><dd>' + esc(o.paymentMethod) + ' · ' + esc(o.paymentStatus) + '</dd></div>' +
        '<div style="grid-column:1/-1"><dt>Delivery address</dt><dd>' + esc([o.address, o.city, o.state, o.pincode].filter(Boolean).join(', ') || '—') + '</dd></div>' +
        (o.notes ? '<div style="grid-column:1/-1"><dt>Order notes</dt><dd>' + esc(o.notes) + '</dd></div>' : '') +
      '</div></div>' +
      '<div class="dsec"><p class="dsec__h">Items (' + o.items.length + ')</p>' +
        o.items.map(i =>
          '<div class="ditem"><img src="' + prodImg(i.productId) + '" alt="" loading="lazy">' +
          '<div><b>' + esc(i.productName) + '</b><em>' + esc(i.weight || '') + ' · ' + i.quantity + ' × ' + fmt(i.unitPrice) + '</em></div>' +
          '<span class="num"><b>' + fmt(i.totalPrice) + '</b></span></div>'
        ).join('') +
        '<div style="margin-top:.9rem">' +
          '<div class="dtot"><span>Subtotal</span><span>' + fmt(o.subtotal) + '</span></div>' +
          '<div class="dtot"><span>Discount</span><span>' + fmt(o.discount) + '</span></div>' +
          '<div class="dtot"><span>Delivery</span><span>' + (o.shipping ? fmt(o.shipping) : 'To be confirmed') + '</span></div>' +
          '<div class="dtot dtot--g"><span>Total</span><span>' + fmt(o.total) + '</span></div>' +
        '</div>' +
      '</div>';

    const wa = 'https://wa.me/' + (o.phone && o.phone.length === 10 ? '91' + o.phone : '917046164064') +
      '?text=' + encodeURIComponent('Hello ' + o.customerName + ', an update on your Sukhadia Foods order ' + o.orderId + ': it is now ' + o.orderStatus + '.');

    $('#drFoot').innerHTML =
      '<label class="fld2" style="margin-top:0"><span>Order status</span>' +
        '<select id="drStatus">' + STATUSES.map(s =>
          '<option value="' + s + '"' + (s === o.orderStatus ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></label>' +
      '<div class="btnrow">' +
        (idx >= 0 && idx < FLOW.length - 1 ? '<button class="btn btn--primary" id="drNext">Mark as ' + FLOW[idx + 1] + '</button>' : '') +
        '<a class="btn btn--ghost" href="' + wa + '" target="_blank" rel="noopener">WhatsApp customer</a>' +
        '<button class="btn btn--ghost" id="drPrint">Print / receipt</button>' +
      '</div>';

    $('#drStatus').addEventListener('change', e => setStatus(id, e.target.value));
    const nx = $('#drNext');
    if (nx) nx.addEventListener('click', () => setStatus(id, FLOW[idx + 1]));
    $('#drPrint').addEventListener('click', () => {
      toast('Opening print dialog', 'Choose “Save as PDF” for a receipt.', 'ok');
      setTimeout(() => window.print(), 300);
    });

    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('#drClose').focus(), 100);
  }
  function closeDrawer() {
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    openOrderId = null;
  }
  function setStatus(id, status) {
    const prevOrder = api.getOrder(id);
    const updated = api.updateOrder(id, { orderStatus: status });
    if (!updated) return;
    if (status === 'Cancelled' && prevOrder.orderStatus !== 'Cancelled') {
      toast('Order cancelled', 'Stock for ' + prevOrder.items.length + ' item(s) has been returned to inventory.', 'warn');
    } else {
      toast('Status updated', id + ' → ' + status, 'ok');
    }
    openOrder(id);
    renderAll();
  }
  $('#drClose').addEventListener('click', closeDrawer);
  $$('[data-close-drawer]').forEach(b => b.addEventListener('click', closeDrawer));

  /* ══════════ PRODUCTS ══════════ */
  const prState = { q: '', cat: '', stock: '', sort: 'units' };
  function renderProducts() {
    const a = api.getAnalytics(null);
    const sales = {};
    a.products.forEach(p => { sales[p.id] = p; });
    let list = api.getProducts().map(p => ({
      p, units: (sales[p.id] || {}).units || 0, revenue: (sales[p.id] || {}).revenue || 0,
      stock: api.getStock(p.id), st: api.stockState(p.id)
    }));
    if (prState.q) {
      const q = prState.q.toLowerCase();
      list = list.filter(x => x.p.name.toLowerCase().includes(q) || x.p.category.toLowerCase().includes(q));
    }
    if (prState.cat) list = list.filter(x => x.p.category === prState.cat);
    if (prState.stock) list = list.filter(x => x.st === prState.stock);
    const s = prState.sort;
    list.sort((x, y) => s === 'units' ? y.units - x.units : s === 'revenue' ? y.revenue - x.revenue
      : s === 'stock' ? y.stock - x.stock : s === 'price' ? y.p.price - x.p.price : x.p.name.localeCompare(y.p.name));

    $('#prTable').innerHTML = list.length ? '<div class="tw"><table>' +
      '<thead><tr><th>Product</th><th>Category</th><th class="num">Price (250 g)</th><th class="num">Stock</th><th class="num">Units sold</th><th class="num">Revenue</th><th>Status</th><th></th></tr></thead><tbody>' +
      list.map(x =>
        '<tr><td><div class="tprod"><img src="' + imgPath(x.p.img) + '" alt="" loading="lazy"><div><b>' + esc(x.p.name) + '</b><em>' + esc(x.p.id) + '</em></div></div></td>' +
        '<td>' + esc(x.p.category) + '</td>' +
        '<td class="num">' + fmt(x.p.price) + '</td>' +
        '<td class="num">' + fmtN(x.stock) + '</td>' +
        '<td class="num">' + fmtN(x.units) + '</td>' +
        '<td class="num">' + fmt(x.revenue) + '</td>' +
        '<td>' + stockBadge(x.p.id) + '</td>' +
        '<td class="num" style="white-space:nowrap">' +
          '<button class="btn btn--ghost btn--sm" data-prod="' + esc(x.p.id) + '">Edit</button> ' +
          '<button class="btn btn--ghost btn--sm" data-stock="' + esc(x.p.id) + '">Stock</button>' +
        '</td></tr>'
      ).join('') + '</tbody></table></div>'
      : noData('No products match', 'Try clearing the filters.');
  }

  /* ══════════ INVENTORY ══════════ */
  const invState = { q: '', filter: '' };
  function renderInventory() {
    const a = api.getAnalytics(null);
    const sales = {};
    a.products.forEach(p => { sales[p.id] = p.units; });
    const inv = api.getInventory();
    let list = api.getProducts().map(p => ({
      p, stock: api.getStock(p.id), thr: (inv[p.id] || {}).threshold || SK.LOW_STOCK,
      units: sales[p.id] || 0, st: api.stockState(p.id)
    }));
    if (invState.q) {
      const q = invState.q.toLowerCase();
      list = list.filter(x => x.p.name.toLowerCase().includes(q) || x.p.category.toLowerCase().includes(q));
    }
    if (invState.filter) list = list.filter(x => x.st === invState.filter);
    const order = { out: 0, low: 1, in: 2 };
    list.sort((x, y) => (order[x.st] - order[y.st]) || (x.stock - y.stock));

    $('#invTable').innerHTML = list.length ? '<div class="tw"><table>' +
      '<thead><tr><th>Product</th><th>Category</th><th class="num">Current stock</th><th class="num">Low-stock at</th><th class="num">Units sold</th><th>Status</th><th></th></tr></thead><tbody>' +
      list.map(x =>
        '<tr><td><div class="tprod"><img src="' + imgPath(x.p.img) + '" alt="" loading="lazy"><div><b>' + esc(x.p.name) + '</b></div></div></td>' +
        '<td>' + esc(x.p.category) + '</td>' +
        '<td class="num"><b style="font-size:15px">' + fmtN(x.stock) + '</b></td>' +
        '<td class="num">' + fmtN(x.thr) + '</td>' +
        '<td class="num">' + fmtN(x.units) + '</td>' +
        '<td>' + stockBadge(x.p.id) + '</td>' +
        '<td class="num" style="white-space:nowrap">' +
          '<button class="btn btn--primary btn--sm" data-stock="' + x.p.id + '">+ Add stock</button> ' +
          '<a class="btn btn--ghost btn--sm" href="index.html#shop" target="_blank" rel="noopener">View</a>' +
        '</td></tr>'
      ).join('') + '</tbody></table></div>'
      : noData('Nothing here', 'No products match that filter.');
  }

  /* ══════════ STOCK MODAL ══════════ */
  const smModal = $('#stockModal');
  let smId = null;
  function openStock(id) {
    const p = api.getProduct(id);
    if (!p) return;
    smId = id;
    const inv = api.getInventory()[id] || { stock: 0, threshold: SK.LOW_STOCK };
    $('#smProd').innerHTML = '<img src="' + imgPath(p.img) + '" alt=""><div><b>' + esc(p.name) + '</b>' +
      '<em>' + esc(p.category) + ' · ' + fmt(p.price) + ' per 250 g</em></div>';
    $('#smCur').value = inv.stock;
    $('#smAdd').value = 20;
    $('#smThr').value = inv.threshold;
    $('#smNew').value = Number(inv.stock) + 20;
    smModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('#smAdd').select(), 100);
  }
  function closeStock() {
    smModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    smId = null;
  }
  function recalcNew() {
    const cur = Number($('#smCur').value) || 0;
    const add = Number($('#smAdd').value) || 0;
    $('#smNew').value = Math.max(0, cur + add);
  }
  $('#smAdd').addEventListener('input', recalcNew);
  $('#smClose').addEventListener('click', closeStock);
  $('#smCancel').addEventListener('click', closeStock);
  $$('[data-close-modal]').forEach(b => b.addEventListener('click', closeStock));
  $('#smForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!smId) return;
    const p = api.getProduct(smId);
    const newStock = Number($('#smNew').value) || 0;
    const thr = Number($('#smThr').value) || SK.LOW_STOCK;
    api.updateInventory(smId, newStock, thr);
    toast('Stock updated successfully', p.name + ' is now at ' + newStock + ' units.', 'ok');
    closeStock();
    renderAll();
  });

  /* ══════════ PRODUCT MODAL (add / edit / delete) ══════════ */
  const pmModal = $('#prodModal');
  let pmId = null;                       // null = creating a new product

  /* Only offer photos that actually ship with the site, so a saved product can
     never point at a missing file. */
  const IMAGE_SLUGS = (function () {
    const set = {};
    SK.SEED_PRODUCTS.forEach(p => { if (p.img) set[p.img] = 1; if (p.img2) set[p.img2] = 1; });
    return Object.keys(set).sort();
  })();

  function fillImageSelects() {
    const opts = IMAGE_SLUGS.map(sl => '<option value="' + esc(sl) + '">' + esc(sl) + '</option>').join('');
    $('#pmImg').innerHTML = opts;
    $('#pmImg2').innerHTML = '<option value="">— none —</option>' + opts;
    $('#pmCat').innerHTML = CATEGORIES.map(c => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('');
  }
  fillImageSelects();

  function pmError(id, msg) {
    const fld = $('#' + id).closest('.fld2');
    fld.classList.toggle('is-bad', !!msg);
    const err = $('#' + id + 'Err');
    if (err) err.textContent = msg || '';
    return !msg;
  }
  function pmValidate() {
    const name = $('#pmName').value.trim();
    const price = Number($('#pmPrice').value);
    const dupe = api.getProducts().some(p => p.id !== pmId && p.name.toLowerCase() === name.toLowerCase());
    let ok = true;
    if (name.length < 2)      ok = pmError('pmName', 'Please enter a product name.') && ok;
    else if (dupe)            ok = pmError('pmName', 'Another product already uses that name.') && ok;
    else                      pmError('pmName', '');
    if (!(price > 0))         ok = pmError('pmPrice', 'Enter a price above zero.') && ok;
    else                      pmError('pmPrice', '');
    return ok;
  }
  function pmSyncPreview() {
    $('#pmPreview').src = imgPath($('#pmImg').value);
  }

  function openProduct(id) {
    pmId = id || null;
    const p = id ? api.getProduct(id) : null;
    const inv = id ? (api.getInventory()[id] || {}) : {};

    $('#pmTitle').textContent = p ? 'Edit product' : 'New product';
    $('#pmSave').textContent  = p ? 'Save changes' : 'Add product';
    $('#pmName').value  = p ? p.name : '';
    $('#pmCat').value   = p ? p.category : CATEGORIES[0];
    $('#pmPrice').value = p ? p.price : '';
    $('#pmDesc').value  = p ? (p.desc || '') : '';
    $('#pmImg').value   = p && IMAGE_SLUGS.indexOf(p.img) >= 0 ? p.img : IMAGE_SLUGS[0];
    $('#pmImg2').value  = p && IMAGE_SLUGS.indexOf(p.img2) >= 0 ? p.img2 : '';
    $('#pmStock').value = p ? (Number(inv.stock) || 0) : 20;
    $('#pmThr').value   = p ? (Number(inv.threshold) || SK.LOW_STOCK) : (api.getSettings().lowStockThreshold || SK.LOW_STOCK);
    $('#pmBest').checked = !!(p && p.best);

    const used = p ? api.ordersUsingProduct(p.id) : 0;
    $('#pmHint').textContent = p && used
      ? (used === 1 ? '1 order references' : used + ' orders reference') +
        ' this product. Deleting it keeps those orders intact — they store their own copy of the name and price.'
      : 'Prices for 500 g and 1 kg are calculated from the 250 g price.';

    $('#pmDelete').hidden = !p;
    pmError('pmName', ''); pmError('pmPrice', '');
    pmSyncPreview();

    pmModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('#pmName').focus(), 100);
  }
  function closeProduct() {
    pmModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    pmId = null;
  }

  $('#pmImg').addEventListener('change', pmSyncPreview);
  $('#pmName').addEventListener('input', () => { if ($('#pmName').closest('.fld2').classList.contains('is-bad')) pmValidate(); });
  $('#pmPrice').addEventListener('input', () => { if ($('#pmPrice').closest('.fld2').classList.contains('is-bad')) pmValidate(); });
  $('#prNew').addEventListener('click', () => openProduct(null));
  $('#pmClose').addEventListener('click', closeProduct);
  $('#pmCancel').addEventListener('click', closeProduct);
  $$('[data-close-prod]').forEach(b => b.addEventListener('click', closeProduct));

  $('#pmForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!pmValidate()) { $('.fld2.is-bad input') && $('.fld2.is-bad input').focus(); return; }
    const data = {
      name:  $('#pmName').value.trim(),
      category: $('#pmCat').value,
      price: Number($('#pmPrice').value),
      desc:  $('#pmDesc').value.trim(),
      img:   $('#pmImg').value,
      img2:  $('#pmImg2').value,
      best:  $('#pmBest').checked ? 1 : 0,
      stock: Number($('#pmStock').value),
      threshold: Number($('#pmThr').value)
    };
    if (pmId) {
      api.updateProduct(pmId, data);
      toast('Product updated', data.name + ' has been saved.', 'ok');
    } else {
      const made = api.createProduct(data);
      toast('Product added', made.name + ' is now live on the storefront.', 'ok');
    }
    closeProduct();
    renderAll();
  });

  $('#pmDelete').addEventListener('click', () => {
    if (!pmId) return;
    const p = api.getProduct(pmId);
    if (!p) return;
    const used = api.ordersUsingProduct(pmId);
    const msg = 'Delete "' + p.name + '" from the catalogue?\n\n' +
      (used ? used + ' existing order(s) mention it. Those orders are kept and still show the product name and price.\n\n' : '') +
      'It will disappear from the storefront immediately. This cannot be undone.';
    if (!confirm(msg)) return;
    api.deleteProduct(pmId);
    toast('Product deleted', p.name + ' has been removed from the catalogue.', 'warn');
    closeProduct();
    renderAll();
  });

  /* ══════════ CUSTOMERS ══════════ */
  const cuState = { q: '', type: '' };
  function renderCustomers() {
    let list = api.getCustomers();
    const total = list.length;
    const vip = list.filter(c => c.type === 'VIP').length;
    const ret = list.filter(c => c.type === 'Returning').length;
    const spend = list.reduce((s, c) => s + c.spent, 0);

    $('#cuKpis').innerHTML = [
      { l: 'Customers', v: fmtN(total), s: 'derived from orders' },
      { l: 'Returning', v: fmtN(ret), s: total ? Math.round((ret / total) * 100) + '% of customers' : '—' },
      { l: 'VIP', v: fmtN(vip), s: '2+ orders and ₹5,000+' },
      { l: 'Lifetime value', v: total ? fmt(spend / total) : fmt(0), s: 'average per customer', c: 'rev' }
    ].map(k => '<div class="kpi' + (k.c ? ' kpi--' + k.c : '') + '"><p class="kpi__l">' + k.l + '</p><p class="kpi__v">' + k.v + '</p><p class="kpi__s">' + esc(k.s) + '</p></div>').join('');

    if (cuState.q) {
      const q = cuState.q.toLowerCase();
      list = list.filter(c => (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q) ||
        (c.email || '').toLowerCase().includes(q) || (c.city || '').toLowerCase().includes(q));
    }
    if (cuState.type) list = list.filter(c => c.type === cuState.type);

    $('#cuTable').innerHTML = list.length ? '<div class="tw"><table>' +
      '<thead><tr><th>Customer</th><th>Phone</th><th>Email</th><th class="num">Orders</th><th class="num">Total spent</th><th class="num">Avg order</th><th>Last order</th><th>Type</th></tr></thead><tbody>' +
      list.map(c =>
        '<tr><td><b>' + esc(c.name || '—') + '</b><br><span style="font-size:10.5px;color:var(--tx-3)">' + esc(c.city || '') + '</span></td>' +
        '<td>' + esc(c.phone || '—') + '</td>' +
        '<td style="font-size:11.5px">' + esc(c.email || '—') + '</td>' +
        '<td class="num">' + fmtN(c.orders) + '</td>' +
        '<td class="num"><b>' + fmt(c.spent) + '</b></td>' +
        '<td class="num">' + fmt(c.aov) + '</td>' +
        '<td style="white-space:nowrap">' + esc(prettyDate(c.lastOrder)) + '</td>' +
        '<td><span class="badge badge--' + (c.type === 'VIP' ? 'vip' : c.type === 'Returning' ? 'info' : 'neutral') + '">' + c.type + '</span></td></tr>'
      ).join('') + '</tbody></table></div>'
      : noData(api.getCustomers().length ? 'No customers match' : 'No customers yet',
               api.getCustomers().length ? 'Try a different search.' : 'Customers are built automatically from orders.',
               api.getCustomers().length === 0);
  }

  /* ══════════ SETTINGS ══════════ */
  function renderSettings() {
    $('#setThreshold').value = api.getSettings().lowStockThreshold || SK.LOW_STOCK;
  }
  $('#saveThreshold').addEventListener('click', () => {
    const v = Math.max(1, Number($('#setThreshold').value) || SK.LOW_STOCK);
    const s = api.getSettings(); s.lowStockThreshold = v; api.saveSettings(s);
    const inv = api.getInventory();
    Object.keys(inv).forEach(id => { inv[id].threshold = v; });
    SK.saveData(SK.KEYS.inventory, inv);
    toast('Threshold saved', 'Products at or below ' + v + ' units are now flagged low stock.', 'ok');
    renderAll();
  });
  $('#genDemo').addEventListener('click', () => {
    const n = Math.max(5, Math.min(150, Number($("#demoCount").value) || 48));
    const made = api.generateDemoOrders(n);
    toast('Demo orders created', made.length + ' orders added and stock reduced accordingly.', 'ok');
    renderAll();
  });
  $('#clearDemo').addEventListener('click', () => {
    const before = api.getOrders().length;
    api.clearDemoData();
    const removed = before - api.getOrders().length;
    toast('Demo data cleared', removed + ' demo order(s) removed. Real orders kept.', 'ok');
    renderAll();
  });
  $('#resetAll').addEventListener('click', () => {
    if (!confirm('Reset everything?\n\nThis deletes ALL orders (including any you placed on the storefront), resets stock to its starting values and empties the cart.')) return;
    api.resetDemoData();
    toast('Everything reset', 'Catalogue and stock are back to their starting values.', 'warn');
    renderAll();
  });

  /* ══════════ EXCEL EXPORT ══════════ */
  function buildSheets(range) {
    const a = api.getAnalytics(range || null);
    const inv = api.getInventory();
    const salesById = {};
    a.products.forEach(p => { salesById[p.id] = p; });

    const orders = a.orders.map(o => ({
      'Order ID': o.orderId, 'Order Date': o.orderDate,
      'Customer Name': o.customerName, 'Phone': o.phone, 'Email': o.email,
      'Address': o.address, 'City': o.city, 'State': o.state, 'PIN Code': o.pincode,
      'Items': o.items.length, 'Units': o.items.reduce((s, i) => s + i.quantity, 0),
      'Subtotal': o.subtotal, 'Discount': o.discount, 'Shipping': o.shipping, 'Grand Total': o.total,
      'Payment Method': o.paymentMethod, 'Payment Status': o.paymentStatus,
      'Order Status': o.orderStatus, 'Data Source': o.isDemo ? 'DEMO DATA' : 'Storefront order',
      'Notes': o.notes || ''
    }));

    const items = [];
    a.orders.forEach(o => o.items.forEach(i => items.push({
      'Order ID': o.orderId, 'Order Date': o.orderDate, 'Customer Name': o.customerName,
      'Phone': o.phone, 'City': o.city, 'State': o.state,
      'Product': i.productName, 'Product ID': i.productId, 'Category': i.category,
      'Weight': i.weight || '', 'Quantity': i.quantity, 'Unit Price': i.unitPrice, 'Item Total': i.totalPrice,
      'Order Subtotal': o.subtotal, 'Discount': o.discount, 'Shipping': o.shipping, 'Grand Total': o.total,
      'Payment Method': o.paymentMethod, 'Payment Status': o.paymentStatus, 'Order Status': o.orderStatus,
      'Data Source': o.isDemo ? 'DEMO DATA' : 'Storefront order'
    })));

    const products = api.getProducts().map(p => {
      const s = salesById[p.id] || { units: 0, revenue: 0, orders: 0 };
      return {
        'Product ID': p.id, 'Product': p.name, 'Category': p.category,
        'Price (250 g)': p.price, 'Price (500 g)': SK.priceFor(p.price, '500 g'), 'Price (1 kg)': SK.priceFor(p.price, '1 kg'),
        'Current Stock': api.getStock(p.id), 'Units Sold': s.units, 'Orders Containing': s.orders,
        'Revenue': s.revenue, 'Status': api.stockState(p.id) === 'out' ? 'Out of Stock' : api.stockState(p.id) === 'low' ? 'Low Stock' : 'In Stock',
        'Bestseller': p.best ? 'Yes' : 'No'
      };
    });

    const inventory = api.getProducts().map(p => ({
      'Product ID': p.id, 'Product': p.name, 'Category': p.category,
      'Current Stock': api.getStock(p.id),
      'Low Stock Threshold': (inv[p.id] || {}).threshold || SK.LOW_STOCK,
      'Units Sold': (salesById[p.id] || {}).units || 0,
      'Status': api.stockState(p.id) === 'out' ? 'Out of Stock' : api.stockState(p.id) === 'low' ? 'Low Stock' : 'In Stock'
    }));

    const customers = a.customers.map(c => ({
      'Customer': c.name, 'Phone': c.phone, 'Email': c.email, 'City': c.city, 'State': c.state,
      'Total Orders': c.orders, 'Total Spent': Math.round(c.spent), 'Average Order': Math.round(c.aov),
      'First Order': c.firstOrder, 'Last Order': c.lastOrder, 'Customer Type': c.type
    }));

    const r = range || { from: '', to: '' };
    const analytics = [
      { Metric: 'Period', Value: (r.from ? r.from + ' to ' + r.to : 'All time') },
      { Metric: 'Total Revenue', Value: Math.round(a.revenue) },
      { Metric: 'Total Orders', Value: a.totalOrders },
      { Metric: 'Cancelled Orders', Value: a.cancelled },
      { Metric: 'Units Sold', Value: a.units },
      { Metric: 'Average Order Value', Value: Math.round(a.aov) },
      { Metric: 'Products Sold', Value: a.products.length },
      { Metric: 'Customers', Value: a.customers.length },
      { Metric: 'Low Stock Products', Value: a.lowStock.length },
      { Metric: 'Out of Stock Products', Value: a.outStock.length },
      { Metric: '', Value: '' },
      { Metric: 'BEST SELLING PRODUCTS', Value: '(by units)' }
    ].concat(a.products.slice(0, 15).map((p, i) => ({
      Metric: '#' + (i + 1) + ' ' + p.name, Value: p.units + ' units · ₹' + Math.round(p.revenue)
    }))).concat([
      { Metric: '', Value: '' }, { Metric: 'POPULAR PRODUCTS', Value: '(score out of 100)' }
    ]).concat(a.products.slice(0, 10).map(p => ({ Metric: p.name, Value: p.score + ' · ' + p.tier })));

    const catSales = a.categories.map(c => ({
      'Category': c.category, 'Units Sold': c.units, 'Revenue': Math.round(c.revenue),
      'Share of Revenue %': Number(c.share.toFixed(2))
    }));

    return { orders, items, products, inventory, customers, analytics, catSales, a };
  }

  function toCSV(rows) {
    if (!rows.length) return '';
    const heads = Object.keys(rows[0]);
    const cell = v => {
      const s = String(v == null ? '' : v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return heads.join(',') + '\n' + rows.map(r => heads.map(h => cell(r[h])).join(',')).join('\n');
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  const autoCols = rows => {
    if (!rows.length) return [];
    return Object.keys(rows[0]).map(h =>
      ({ wch: Math.min(38, Math.max(h.length + 2, ...rows.slice(0, 200).map(r => String(r[h] == null ? '' : r[h]).length + 2))) }));
  };

  /* Writes a real .xlsx via SheetJS; falls back to CSV if the library is absent. */
  function exportWorkbook(sheets, filename) {
    const nonEmpty = sheets.filter(s => s.rows && s.rows.length);
    if (!nonEmpty.length) { toast('Nothing to export', 'There is no data for this selection yet.', 'warn'); return; }

    if (typeof XLSX === 'undefined') {
      const s = nonEmpty[0];
      download(new Blob([toCSV(s.rows)], { type: 'text/csv;charset=utf-8;' }), filename.replace(/\.xlsx$/, '.csv'));
      toast('Exported as CSV', 'The Excel library did not load, so a CSV was produced instead.', 'warn');
      return;
    }
    try {
      const wb = XLSX.utils.book_new();
      nonEmpty.forEach(s => {
        const ws = XLSX.utils.json_to_sheet(s.rows);
        ws['!cols'] = autoCols(s.rows);
        ws['!freeze'] = { xSplit: 0, ySplit: 1 };
        XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
      });
      XLSX.writeFile(wb, filename);
      toast('Excel file downloaded', filename + ' · ' + nonEmpty.length + ' sheet' + (nonEmpty.length > 1 ? 's' : ''), 'ok');
    } catch (err) {
      console.error('[SK] export failed', err);
      download(new Blob([toCSV(nonEmpty[0].rows)], { type: 'text/csv;charset=utf-8;' }), filename.replace(/\.xlsx$/, '.csv'));
      toast('Exported as CSV instead', 'The workbook could not be built: ' + err.message, 'warn');
    }
  }

  function exportAll() {
    const s = buildSheets(null);
    exportWorkbook([
      { name: 'Orders', rows: s.orders }, { name: 'Order Items', rows: s.items },
      { name: 'Products', rows: s.products }, { name: 'Inventory', rows: s.inventory },
      { name: 'Customers', rows: s.customers }, { name: 'Analytics', rows: s.analytics },
      { name: 'Category Sales', rows: s.catSales }
    ], 'sukhadia-orders.xlsx');
  }
  function exportAnalytics() {
    const r = currentRange();
    const s = buildSheets({ from: r.from, to: r.to });
    const best = s.a.products.map((p, i) => ({
      Rank: i + 1, Product: p.name, Category: p.category, 'Units Sold': p.units,
      'Orders Containing': p.orders, Revenue: Math.round(p.revenue),
      'Popularity Score': p.score, Tier: p.tier, 'Current Stock': api.getStock(p.id)
    }));
    exportWorkbook([
      { name: 'Summary', rows: s.analytics }, { name: 'Best Sellers', rows: best },
      { name: 'Category Sales', rows: s.catSales }, { name: 'Inventory', rows: s.inventory }
    ], 'sukhadia-analytics.xlsx');
  }
  $('#expAll').addEventListener('click', exportAll);
  $('#expAn2').addEventListener('click', exportAnalytics);
  $('#expAnalytics').addEventListener('click', exportAnalytics);
  $('#expOrders').addEventListener('click', exportAll);
  $('#expFlat').addEventListener('click', () =>
    exportWorkbook([{ name: 'Orders', rows: buildSheets(null).orders }], 'sukhadia-orders-flat.xlsx'));
  $('#expInv').addEventListener('click', () =>
    exportWorkbook([{ name: 'Inventory', rows: buildSheets(null).inventory }], 'sukhadia-inventory.xlsx'));
  $('#expInv2').addEventListener('click', () =>
    exportWorkbook([{ name: 'Inventory', rows: buildSheets(null).inventory }], 'sukhadia-inventory.xlsx'));
  $('#expCust').addEventListener('click', () =>
    exportWorkbook([{ name: 'Customers', rows: buildSheets(null).customers }], 'sukhadia-customers.xlsx'));

  /* ══════════ GLOBAL SEARCH ══════════ */
  const gInput = $('#adGlobal'), gBox = $('#adSResults');
  gInput.addEventListener('input', () => {
    const q = gInput.value.trim().toLowerCase();
    if (!q) { gBox.hidden = true; return; }
    const orders = api.getOrders().filter(o =>
      o.orderId.toLowerCase().includes(q) || (o.customerName || '').toLowerCase().includes(q) || (o.phone || '').includes(q)).slice(0, 4);
    const prods = api.getProducts().filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)).slice(0, 4);
    const custs = api.getCustomers().filter(c => (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q)).slice(0, 3);
    let html = '';
    if (orders.length) html += '<p class="ad__srgroup">Orders</p>' + orders.map(o =>
      '<button class="ad__sres" data-order="' + esc(o.orderId) + '"><div><b>' + esc(o.orderId) + '</b><em>' + esc(o.customerName) + '</em></div><span>' + fmt(o.total) + '</span></button>').join('');
    if (prods.length) html += '<p class="ad__srgroup">Products</p>' + prods.map(p =>
      '<button class="ad__sres" data-stock="' + p.id + '"><div><b>' + esc(p.name) + '</b><em>' + esc(p.category) + ' · stock ' + api.getStock(p.id) + '</em></div><span>' + fmt(p.price) + '</span></button>').join('');
    if (custs.length) html += '<p class="ad__srgroup">Customers</p>' + custs.map(c =>
      '<button class="ad__sres" data-cust="' + esc(c.name) + '"><div><b>' + esc(c.name) + '</b><em>' + esc(c.phone || '') + ' · ' + c.orders + ' orders</em></div><span>' + fmt(c.spent) + '</span></button>').join('');
    gBox.innerHTML = html || '<p class="ad__srgroup">No matches</p>';
    gBox.hidden = false;
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.ad__search')) gBox.hidden = true;
    const c = e.target.closest('[data-cust]');
    if (c) { go('customers'); $('#cuSearch').value = c.dataset.cust; cuState.q = c.dataset.cust; renderCustomers(); }
  });

  /* ══════════ NAVIGATION ══════════ */
  const TITLES = {
    dashboard: ['Dashboard', 'Live figures from your order data'],
    analytics: ['Analytics', 'Sales performance over time'],
    orders: ['Orders', 'Every order placed through the storefront'],
    products: ['Products', 'Catalogue performance'],
    inventory: ['Inventory', 'Stock levels and restocking'],
    customers: ['Customers', 'Built automatically from order history'],
    exports: ['Exports', 'Download your data as Excel'],
    settings: ['Settings', 'Demo data and inventory rules']
  };
  function go(view) {
    state.view = view;
    $$('.view').forEach(v => { v.hidden = v.dataset.view !== view; });
    $$('.ad__link').forEach(l => l.classList.toggle('is-on', l.dataset.go === view));
    const t = TITLES[view] || TITLES.dashboard;
    $('#adH1').textContent = t[0];
    $('#adSub').textContent = t[1];
    document.body.classList.remove('side-open');
    if (location.hash !== '#' + view) history.replaceState(null, '', '#' + view);
    renderAll();
    $('.ad__body').scrollTop = 0;
    window.scrollTo(0, 0);
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-go]');
    if (b) { go(b.dataset.go); return; }
    const o = e.target.closest('[data-order]');
    if (o) { gBox.hidden = true; openOrder(o.dataset.order); return; }
    const s = e.target.closest('[data-stock]');
    if (s) { gBox.hidden = true; openStock(s.dataset.stock); return; }
    const pd = e.target.closest('[data-prod]');
    if (pd) { gBox.hidden = true; openProduct(pd.dataset.prod); return; }
    const g = e.target.closest('[data-gen]');
    if (g) { api.generateDemoOrders(36); toast('Demo orders created', '36 orders added.', 'ok'); renderAll(); return; }
    const al = e.target.closest('[data-alert]');
    if (al) {
      go('inventory');
      invState.filter = al.dataset.alert;
      $$('#invSeg .seg__b').forEach(x => x.classList.toggle('is-on', x.dataset.inv === al.dataset.alert));
      $('#invSearch').value = ''; invState.q = '';
      renderInventory();
    }
  });
  $('#bellBtn').addEventListener('click', () => {
    const a = api.getAnalytics(null);
    if (!a.lowStock.length && !a.outStock.length) { toast('No alerts', 'Every product has healthy stock.', 'ok'); return; }
    go('inventory');
  });
  $('#sideOpen').addEventListener('click', () => document.body.classList.add('side-open'));
  $('#sideClose').addEventListener('click', () => document.body.classList.remove('side-open'));
  $('#sideScrim').addEventListener('click', () => document.body.classList.remove('side-open'));

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (pmModal.getAttribute('aria-hidden') === 'false') closeProduct();
    else if (smModal.getAttribute('aria-hidden') === 'false') closeStock();
    else if (drawer.getAttribute('aria-hidden') === 'false') closeDrawer();
    else if (!gBox.hidden) gBox.hidden = true;
    else document.body.classList.remove('side-open');
  });

  /* ══════════ FILTER WIRING ══════════ */
  $('#ordSearch').addEventListener('input', e => { ordState.q = e.target.value; renderOrders(); });
  $('#ordStatus').addEventListener('change', e => { ordState.status = e.target.value; renderOrders(); });
  $('#ordSort').addEventListener('change', e => { ordState.sort = e.target.value; renderOrders(); });
  $('#prSearch').addEventListener('input', e => { prState.q = e.target.value; renderProducts(); });
  $('#prCat').addEventListener('change', e => { prState.cat = e.target.value; renderProducts(); });
  $('#prStock').addEventListener('change', e => { prState.stock = e.target.value; renderProducts(); });
  $('#prSort').addEventListener('change', e => { prState.sort = e.target.value; renderProducts(); });
  $('#invSearch').addEventListener('input', e => { invState.q = e.target.value; renderInventory(); });
  $('#cuSearch').addEventListener('input', e => { cuState.q = e.target.value; renderCustomers(); });
  $('#cuType').addEventListener('change', e => { cuState.type = e.target.value; renderCustomers(); });
  $$('#invSeg .seg__b').forEach(b => b.addEventListener('click', () => {
    $$('#invSeg .seg__b').forEach(x => x.classList.remove('is-on'));
    b.classList.add('is-on'); invState.filter = b.dataset.inv; renderInventory();
  }));
  $$('#chartSeg .seg__b').forEach(b => b.addEventListener('click', () => {
    $$('#chartSeg .seg__b').forEach(x => x.classList.remove('is-on'));
    b.classList.add('is-on'); state.metric = b.dataset.metric; renderDashboard();
  }));

  /* ══════════ RENDER ══════════ */
  function renderAll() {
    renderRangeBars();
    const v = state.view;
    if (v === 'dashboard') renderDashboard();
    else if (v === 'analytics') renderAnalytics();
    else if (v === 'orders') { renderOrders(); renderDashboardCounts(); }
    else if (v === 'products') renderProducts();
    else if (v === 'inventory') { renderInventory(); renderDashboardCounts(); }
    else if (v === 'customers') renderCustomers();
    else if (v === 'settings') renderSettings();
    else renderDashboardCounts();
    if (v !== 'dashboard') renderDashboardCounts();
    if ($('#expHint')) {
      $('#expHint').innerHTML = typeof XLSX === 'undefined'
        ? '⚠ The Excel library did not load, so exports will download as CSV instead.'
        : 'Excel export is ready — files are generated in your browser, nothing is uploaded.';
    }
  }
  function renderDashboardCounts() {
    const a = api.getAnalytics(null);
    $('#navOrders').textContent = a.totalOrders;
    const alerts = a.lowStock.length + a.outStock.length;
    const navInv = $('#navInv');
    navInv.textContent = alerts; navInv.hidden = alerts === 0;
    $('#bellDot').hidden = alerts === 0;
  }

  /* ══════════ INIT ══════════ */
  STATUSES.forEach(s => {
    const o = document.createElement('option'); o.value = s; o.textContent = s;
    $('#ordStatus').appendChild(o);
  });
  CATEGORIES.forEach(c => {
    const o = document.createElement('option'); o.value = c; o.textContent = c;
    $('#prCat').appendChild(o);
  });

  const startView = (location.hash || '').replace('#', '');
  state.view = TITLES[startView] ? startView : 'dashboard';
  go(state.view);

  /* live update when the storefront (another tab) writes data */
  bus.on('data', payload => { if (payload && payload.external) renderAll(); });
  window.addEventListener('hashchange', () => {
    const v = (location.hash || '').replace('#', '');
    if (TITLES[v] && v !== state.view) go(v);
  });

  console.log('%cSukhadia Foods — admin console (demo)', 'color:#A9823F;font:600 13px system-ui',
    '\nData layer: SK.api (localStorage). Excel:', typeof XLSX !== 'undefined' ? 'SheetJS ready' : 'CSV fallback');
})();
