(() => {
  "use strict";

  const C = window.BOLE_CONFIG;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const app = $("#app");

  // ---------- helpers ----------
  const money = (n) => C.currency + Number(n).toLocaleString("en-NG");
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(key, fallback) {
      try { return JSON.parse(localStorage.getItem("bf_" + key)) ?? fallback; } catch { return fallback; }
    },
    set(key, val) {
      try { localStorage.setItem("bf_" + key, JSON.stringify(val)); } catch { /* storage unavailable */ }
    },
  };
  async function hash(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2200);
  }
  const nextFriday = () => {
    const d = new Date();
    d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7));
    return d.toISOString().slice(0, 10);
  };

  // ---------- state ----------
  let cart = store.get("cart", []);
  const currentUser = () => {
    const email = store.get("session", null);
    return email ? store.get("users", {})[email] || null : null;
  };
  const saveCart = () => { store.set("cart", cart); renderCartCount(true); };
  const cartTotals = (zoneId) => {
    const subtotal = cart.reduce((s, l) => s + l.price * l.qty, 0);
    const zone = C.deliveryZones.find((z) => z.id === zoneId);
    const delivery = cart.length && zone ? zone.fee : 0;
    return { subtotal, delivery, total: subtotal + delivery };
  };
  function addToCart(item) {
    const existing = cart.find((l) => l.key === item.key);
    if (existing) existing.qty += 1;
    else cart.push({ ...item, qty: 1 });
    saveCart();
    toast(`${item.name} added to your bag`);
  }

  // ---------- art ----------
  const dishArt = (variant = 0) => `
    <div class="dish-art"><svg viewBox="0 0 120 120" aria-hidden="true">
      <ellipse cx="60" cy="72" rx="40" ry="14" fill="#c73a1e" opacity=".9"/>
      ${variant !== 2 ? `<g transform="rotate(-25 45 55)">
        <rect x="18" y="44" width="54" height="20" rx="10" fill="#f2a33a"/>
        <path d="M26 48l6 12M38 47l6 13M50 47l6 13M62 48l4 10" stroke="#5a2a14" stroke-width="3" stroke-linecap="round"/>
      </g>` : ""}
      ${variant !== 0 ? `<g transform="rotate(15 80 50)">
        <rect x="62" y="34" width="34" height="26" rx="6" fill="#f6e0a8"/>
        <path d="M66 40h26M66 48h26M66 55h20" stroke="#8a4b1c" stroke-width="2.5" stroke-linecap="round"/>
      </g>` : ""}
      <g>
        <path d="M58 78c10-14 34-14 44 0-10 12-34 12-44 0z" fill="#9b5a2c"/>
        <path d="M102 78l10-8v16z" fill="#9b5a2c"/>
        <circle cx="66" cy="76" r="2.4" fill="#2a1512"/>
        <path d="M74 72l4 8M82 71l4 9M90 72l3 8" stroke="#5a2a14" stroke-width="2" stroke-linecap="round"/>
      </g>
      <circle cx="34" cy="80" r="5" fill="#3f8a3a"/><circle cx="42" cy="84" r="4" fill="#4fa046"/>
    </svg></div>`;

  // ---------- nav ----------
  function renderCartCount(bump) {
    const n = cart.reduce((s, l) => s + l.qty, 0);
    const b = $("#cartCount");
    b.textContent = n;
    b.style.display = n ? "grid" : "none";
    if (bump) { b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
  }
  function renderAuthSlot() {
    const u = currentUser();
    const slot = $("#authSlot");
    if (!u) {
      slot.innerHTML = `<a class="btn btn-primary btn-sm" href="#/signup">Sign up</a>`;
      return;
    }
    slot.innerHTML = `
      <div class="user-menu">
        <button class="avatar" aria-label="Account">${esc(u.name.trim()[0] || "?").toUpperCase()}</button>
        <div class="dropdown">
          <div style="padding:10px 12px"><b>${esc(u.name)}</b><br><small class="muted">${esc(u.email)}</small></div>
          <a href="#/orders">My orders</a>
          <button data-logout>Log out</button>
        </div>
      </div>`;
    const menu = $(".user-menu", slot);
    $(".avatar", slot).onclick = (e) => { e.stopPropagation(); menu.classList.toggle("open"); };
    $("[data-logout]", slot).onclick = () => {
      store.set("session", null);
      renderAuthSlot();
      toast("Logged out");
      location.hash = "#/";
    };
  }
  document.addEventListener("click", () => $(".user-menu")?.classList.remove("open"));

  // ---------- views ----------
  function viewHome() {
    const best = C.mains[0];
    return `
    <section class="hero">
      <div class="wrap">
        <div>
          <span class="pill">🔥 Portharcourt bole in Abuja</span>
          <h1>BOLE FRIDAY <span>MENU</span></h1>
          <p class="lead">A taste of home. Authentic Portharcourt bole, now in Abuja. Roasted plantain, yam and potato with fish or kponmo, smothered in our signature pepper sauce and delivered hot.</p>
          <div class="hero-cta">
            <a href="#/menu" class="btn btn-yellow">Order now →</a>
            <a href="#/signup" class="btn btn-ghost" style="color:#fff;border-color:rgba(255,255,255,.35)">Create account</a>
          </div>
          <div class="hero-stats">
            <div><b>${money(C.mains[C.mains.length - 1].price)}</b><small>Meals from</small></div>
            <div><b>3</b><small>Signature combos</small></div>
            <div><b>100%</b><small>Homemade sauce</small></div>
          </div>
        </div>
        <div class="hero-art">
          <div class="tomato t1"></div>
          ${C.heroImage
            ? `<div class="hero-photo"><img src="${esc(C.heroImage)}" alt="Roasted bole with signature pepper sauce"></div>`
            : `<div class="plate">${dishArt(1).replace('class="dish-art"', 'class="dish-art" style="width:70%;box-shadow:none"')}</div>`}
          <div class="tomato t2"></div>
          <div class="float-card fc1"><div class="ico">★</div><div><b>${esc(best.name)}</b>Our bestseller</div></div>
          <div class="float-card fc2"><div class="ico">⏱</div><div><b>Hot &amp; fresh</b>Packed with love</div></div>
        </div>
      </div>
    </section>

    <section class="block">
      <div class="wrap center">
        <div class="eyebrow">• Why Bole Friday •</div>
        <h2 class="section-title">Your Favourite Bole Spot</h2>
        <div class="features">
          <div class="feature"><div class="ico">🔥</div><h3>Charcoal Roasted</h3><p>Plantain, yam and potato roasted the proper Portharcourt way, right here in Abuja.</p></div>
          <div class="feature"><div class="ico">🌶️</div><h3>Signature Sauce</h3><p>Rich pepper sauce made fresh for every batch.</p></div>
          <div class="feature"><div class="ico">🛵</div><h3>Delivered Hot</h3><p>Sealed, labelled with your name and on its way to you.</p></div>
        </div>
      </div>
    </section>

    <section class="block" style="padding-top:0">
      <div class="wrap">
        <div class="menu-head">
          <div><div class="eyebrow">Explore our menu</div><h2 class="section-title">Main Course</h2></div>
          <a href="#/menu" class="btn btn-ghost">See full menu →</a>
        </div>
        <div class="grid">${C.mains.map(mainCard).join("")}</div>
      </div>
    </section>

    <section class="block" style="padding-top:0">
      <div class="wrap center">
        <div class="eyebrow">How it works</div>
        <h2 class="section-title">Four Steps To Bole</h2>
        <div class="steps" style="text-align:left">
          <div class="step"><h4>Sign up</h4><p>Create your account in seconds.</p></div>
          <div class="step"><h4>Pick your combo</h4><p>Choose a main, your protein, and extras.</p></div>
          <div class="step"><h4>Pay securely</h4><p>Card, bank transfer or pay on delivery.</p></div>
          <div class="step"><h4>Enjoy</h4><p>We roast, pack and deliver to your door.</p></div>
        </div>
      </div>
    </section>`;
  }

  function mainCard(m, i) {
    return `
    <article class="card" data-main="${m.id}">
      <div class="card-media">
        ${m.image ? `<img src="${esc(m.image)}" alt="${esc(m.name)}" loading="lazy">` : dishArt(i % 3)}
        ${m.tag ? `<span class="tag">${esc(m.tag)}</span>` : ""}
      </div>
      <div class="card-body">
        <h3>${esc(m.name)}</h3>
        <p>${esc(m.desc)}</p>
        ${m.bases.length > 1 ? `<div class="opt-label">Base</div>
          <div class="chips" data-group="base">${m.bases.map((b, j) => `<button class="chip ${j ? "" : "on"}" data-val="${esc(b)}">${esc(b)}</button>`).join("")}</div>` : ""}
        <div class="opt-label">Protein</div>
        <div class="chips" data-group="protein">${m.proteins.map((p, j) => `<button class="chip ${j ? "" : "on"}" data-val="${esc(p)}">${esc(p)}</button>`).join("")}</div>
        <div class="card-foot">
          <span class="price">${money(m.price)}</span>
          <button class="btn btn-primary btn-sm" data-add-main="${m.id}">Add to bag</button>
        </div>
      </div>
    </article>`;
  }

  function viewMenu() {
    return `
    <section class="block">
      <div class="wrap">
        <div class="menu-head">
          <div><div class="eyebrow">A taste of home</div><h1 class="section-title" style="font-size:clamp(44px,6vw,72px)">Our Menu</h1></div>
          <div class="tabs" role="tablist">
            <button class="tab active" data-tab="all">All</button>
            <button class="tab" data-tab="mains">Main Course</button>
            <button class="tab" data-tab="extras">Extras</button>
          </div>
        </div>
        <div data-sec="mains">
          <div class="grid">${C.mains.map(mainCard).join("")}</div>
        </div>
        <div data-sec="extras" style="margin-top:48px">
          <h2 class="section-title" style="font-size:40px">Extras</h2>
          <p class="muted" style="margin-top:0">Make it bigger. Add more protein, sauce or sides.</p>
          <div class="extras-grid">
            ${C.extras.map((x) => `
              <div class="extra">
                ${x.image ? `<img class="extra-img" src="${esc(x.image)}" alt="${esc(x.name)}" loading="lazy">` : ""}
                <div class="extra-info"><b>${esc(x.name)}</b><span>${money(x.price)}</span></div>
                <button class="add-round" data-add-extra="${x.id}" aria-label="Add ${esc(x.name)}">+</button>
              </div>`).join("")}
          </div>
        </div>
        <div class="center" style="margin-top:40px"><a class="btn btn-dark" href="#/cart">View bag →</a></div>
      </div>
    </section>`;
  }

  function bindMenu() {
    $$("[data-group] .chip").forEach((chip) => {
      chip.onclick = () => {
        $$(".chip", chip.parentElement).forEach((c) => c.classList.remove("on"));
        chip.classList.add("on");
      };
    });
    $$("[data-add-main]").forEach((btn) => {
      btn.onclick = () => {
        const m = C.mains.find((x) => x.id === btn.dataset.addMain);
        const card = btn.closest(".card");
        const base = $('[data-group="base"] .on', card)?.dataset.val || m.bases[0];
        const protein = $('[data-group="protein"] .on', card).dataset.val;
        addToCart({
          key: `${m.id}|${base}|${protein}`,
          id: m.id, name: m.name, price: m.price, type: "main", image: m.image,
          options: `${base} · ${protein} · Sauce`,
        });
      };
    });
    $$("[data-add-extra]").forEach((btn) => {
      btn.onclick = () => {
        const x = C.extras.find((e) => e.id === btn.dataset.addExtra);
        addToCart({ key: `extra|${x.id}`, id: x.id, name: x.name, price: x.price, type: "extra", options: "Extra", image: x.image });
      };
    });
    $$("[data-tab]").forEach((tab) => {
      tab.onclick = () => {
        $$("[data-tab]").forEach((t) => t.classList.toggle("active", t === tab));
        $$("[data-sec]").forEach((s) => {
          s.style.display = tab.dataset.tab === "all" || tab.dataset.tab === s.dataset.sec ? "" : "none";
        });
      };
    });
  }

  function viewAuth(mode, next) {
    const signup = mode === "signup";
    return `
    <section class="auth">
      <div class="auth-side">
        <div class="tomato" style="top:-30px;right:-30px;width:140px;height:140px"></div>
        <div class="tomato" style="bottom:-40px;left:-20px;width:160px;height:160px"></div>
        <img src="assets/logo.svg" alt="Bole Friday" style="width:180px;background:#fff;border-radius:18px;padding:8px;margin-bottom:24px">
        <h1>${signup ? "JOIN THE <span>BOLE</span> FAMILY" : "WELCOME <span>BACK</span>"}</h1>
        <p style="max-width:380px;opacity:.9">${signup ? "Create an account to order faster, save your address and track every order." : "Log in to finish your order and see your order history."}</p>
      </div>
      <div class="auth-form">
        <form id="authForm" novalidate>
          <h2>${signup ? "Create account" : "Log in"}</h2>
          <p class="muted" style="margin-top:4px">${signup ? "It takes less than a minute." : "Good to see you again."}</p>
          ${signup ? `
          <div class="field"><label for="name">Full name</label><input id="name" name="name" autocomplete="name" required placeholder="Nicole Briggs"></div>
          <div class="field"><label for="phone">Phone number</label><input id="phone" name="phone" type="tel" autocomplete="tel" required placeholder="0806 727 0850"></div>` : ""}
          <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required placeholder="you@example.com"></div>
          <div class="field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="${signup ? "new-password" : "current-password"}" required minlength="6" placeholder="At least 6 characters"></div>
          <div class="field"><span class="err" id="authErr"></span></div>
          <button class="btn btn-primary btn-block" type="submit">${signup ? "Sign up" : "Log in"}</button>
          <p class="switch">${signup ? "Already have an account?" : "New to Bole Friday?"}
            <a href="#/${signup ? "login" : "signup"}${next ? "?next=" + encodeURIComponent(next) : ""}">${signup ? "Log in" : "Create one"}</a></p>
        </form>
      </div>
    </section>`;
  }

  function bindAuth(mode, next) {
    $("#authForm").onsubmit = async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      const err = $("#authErr");
      const email = (f.email || "").trim().toLowerCase();
      const users = store.get("users", {});
      if (!/^\S+@\S+\.\S+$/.test(email)) return (err.textContent = "Enter a valid email address.");
      if ((f.password || "").length < 6) return (err.textContent = "Password must be at least 6 characters.");
      const pw = await hash(email + ":" + f.password);
      if (mode === "signup") {
        if (!f.name?.trim()) return (err.textContent = "Please enter your name.");
        if (!/^\+?\d[\d\s-]{9,}$/.test(f.phone || "")) return (err.textContent = "Enter a valid phone number.");
        if (users[email]) return (err.textContent = "An account with this email already exists. Log in instead.");
        users[email] = { name: f.name.trim(), phone: f.phone.trim(), email, pw, address: "" };
        store.set("users", users);
        toast(`Welcome, ${f.name.trim().split(" ")[0]}!`);
      } else {
        if (!users[email] || users[email].pw !== pw) return (err.textContent = "Incorrect email or password.");
        toast("Logged in");
      }
      store.set("session", email);
      renderAuthSlot();
      location.hash = next || "#/menu";
    };
  }

  const progress = (step) => {
    const steps = ["Bag", "Details", "Payment", "Done"];
    return `<div class="progress">${steps.map((s, i) => `
      ${i ? '<span class="bar"></span>' : ""}
      <span class="p ${i < step ? "done" : i === step ? "cur" : ""}"><span class="dot">${i < step ? "✓" : i + 1}</span>${s}</span>`).join("")}</div>`;
  };

  function viewCart() {
    if (!cart.length) {
      return `<div class="wrap">${progress(0)}<div class="empty panel">
        <div class="big">YOUR BAG IS EMPTY</div><p class="muted">Let's fix that. Bole is waiting.</p>
        <a class="btn btn-primary" href="#/menu">Browse menu</a></div></div>`;
    }
    const t = cartTotals(null);
    return `
    <div class="wrap">
      ${progress(0)}
      <div class="two-col">
        <div class="panel">
          <h2 class="section-title" style="font-size:36px;margin-top:0">Your Bag</h2>
          ${cart.map((l, i) => `
            <div class="line">
              <div class="thumb">${l.image ? `<img src="${esc(l.image)}" alt="">` : esc(l.name[0])}</div>
              <div class="info"><b>${esc(l.name)}</b><small>${esc(l.options)}</small>
                <small>${money(l.price)} each</small>
                <button class="remove" data-rm="${i}">Remove</button></div>
              <div class="qty"><button data-dec="${i}" aria-label="Decrease">−</button><span>${l.qty}</span><button data-inc="${i}" aria-label="Increase">+</button></div>
              <b style="min-width:80px;text-align:right">${money(l.price * l.qty)}</b>
            </div>`).join("")}
          <a href="#/menu" class="btn btn-ghost btn-sm" style="margin-top:12px">+ Add more items</a>
        </div>
        <aside class="panel summary sticky">
          <h3>Summary</h3>
          <div class="sum-row"><span>Subtotal</span><b>${money(t.subtotal)}</b></div>
          <div class="sum-row"><span>Delivery</span><span class="muted">Calculated next</span></div>
          <div class="sum-row total"><span>Total</span><span>${money(t.subtotal)}</span></div>
          <a class="btn btn-primary btn-block" href="#/checkout" style="margin-top:14px">Checkout →</a>
        </aside>
      </div>
    </div>`;
  }

  function bindCart() {
    const update = (fn) => (e) => { fn(Number(e.currentTarget.dataset[Object.keys(e.currentTarget.dataset)[0]])); saveCart(); route(); };
    $$("[data-inc]").forEach((b) => (b.onclick = update((i) => cart[i].qty++)));
    $$("[data-dec]").forEach((b) => (b.onclick = update((i) => { if (--cart[i].qty < 1) cart.splice(i, 1); })));
    $$("[data-rm]").forEach((b) => (b.onclick = update((i) => cart.splice(i, 1))));
  }

  function viewCheckout() {
    const u = currentUser();
    const zone = store.get("zone", C.deliveryZones[1]?.id || C.deliveryZones[0].id);
    const t = cartTotals(zone);
    return `
    <div class="wrap">
      ${progress(1)}
      <form id="checkoutForm" class="two-col" novalidate>
        <div style="display:grid;gap:24px">
          <div class="panel">
            <h2 class="section-title" style="font-size:32px;margin-top:0">Delivery details</h2>
            <div class="row2">
              <div class="field"><label>Full name</label><input name="name" required value="${esc(u.name)}"></div>
              <div class="field"><label>Phone</label><input name="phone" type="tel" required value="${esc(u.phone)}"></div>
            </div>
            <div class="field"><label>Delivery zone</label>
              <select name="zone" id="zoneSel">${C.deliveryZones.map((z) => `<option value="${z.id}" ${z.id === zone ? "selected" : ""}>${esc(z.name)} — ${z.fee ? money(z.fee) : "Free"}</option>`).join("")}</select>
            </div>
            <div class="field" id="addrField"><label>Delivery address</label><textarea name="address" rows="2" placeholder="House number, street, area, landmark">${esc(u.address)}</textarea></div>
            <div class="row2">
              <div class="field"><label>Delivery date</label><input name="date" type="date" required min="${new Date().toISOString().slice(0, 10)}" value="${nextFriday()}"></div>
              <div class="field"><label>Name on package</label><input name="label" placeholder="e.g. Nicole" value="${esc(u.name.split(" ")[0])}"></div>
            </div>
            <div class="field"><label>Note for the kitchen (optional)</label><input name="note" placeholder="Extra pepper, no onions…"></div>
          </div>
          <div class="panel">
            <h2 class="section-title" style="font-size:32px;margin-top:0">Payment method</h2>
            <div class="pay-opts">
              <label class="pay-opt on"><input type="radio" name="pay" value="card" checked><div><b>Pay with card</b><small>Card, USSD or bank via Paystack</small></div></label>
              <label class="pay-opt"><input type="radio" name="pay" value="transfer"><div><b>Bank transfer</b><small>Transfer, then we confirm your order</small></div></label>
              <label class="pay-opt"><input type="radio" name="pay" value="cod"><div><b>Pay on delivery</b><small>Cash or transfer when your food arrives</small></div></label>
            </div>
            <div id="payExtra"></div>
          </div>
        </div>
        <aside class="panel summary sticky">
          <h3>Order summary</h3>
          ${cart.map((l) => `<div class="sum-row"><span>${l.qty}× ${esc(l.name)}<br><small class="muted">${esc(l.options)}</small></span><span>${money(l.price * l.qty)}</span></div>`).join("")}
          <div class="sum-row" style="border-top:1px solid var(--line);margin-top:6px;padding-top:12px"><span>Subtotal</span><b>${money(t.subtotal)}</b></div>
          <div class="sum-row"><span>Delivery</span><b id="delFee">${t.delivery ? money(t.delivery) : "Free"}</b></div>
          <div class="sum-row total"><span>Total</span><span id="grand">${money(t.total)}</span></div>
          <span class="err" id="coErr" style="color:var(--tomato);font-size:13px"></span>
          <button class="btn btn-primary btn-block" type="submit" id="payBtn" style="margin-top:12px">Pay ${money(t.total)}</button>
          <a href="#/cart" class="btn btn-ghost btn-block btn-sm" style="margin-top:8px">← Back to bag</a>
        </aside>
      </form>
    </div>`;
  }

  function bindCheckout() {
    const form = $("#checkoutForm");
    const refresh = () => {
      const zone = form.zone.value;
      store.set("zone", zone);
      const t = cartTotals(zone);
      $("#delFee").textContent = t.delivery ? money(t.delivery) : "Free";
      $("#grand").textContent = money(t.total);
      $("#addrField").style.display = zone === "pickup" ? "none" : "";
      const pay = form.pay.value;
      $$(".pay-opt").forEach((o) => o.classList.toggle("on", $("input", o).checked));
      $("#payBtn").textContent = pay === "card" ? `Pay ${money(t.total)}` : "Place order";
      $("#payExtra").innerHTML =
        pay === "transfer"
          ? `<div class="bank-box"><b>${esc(C.bankTransfer.bank)}</b><br>${esc(C.bankTransfer.accountName)}<br><b style="font-size:20px;letter-spacing:1px">${esc(C.bankTransfer.accountNumber)}</b><br><small class="muted">Use your order number as the reference. We confirm once payment lands.</small></div>`
          : pay === "card" && !C.paystackPublicKey
          ? `<div class="demo-note">Demo mode: no Paystack key set in <code>config.js</code>, so card payment is simulated.</div>`
          : "";
    };
    form.addEventListener("change", refresh);
    refresh();

    form.onsubmit = async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(form));
      const err = $("#coErr");
      err.textContent = "";
      if (!f.name.trim() || !/^\+?\d[\d\s-]{9,}$/.test(f.phone)) return (err.textContent = "Please enter your name and a valid phone number.");
      if (f.zone !== "pickup" && !f.address.trim()) return (err.textContent = "Please enter your delivery address.");
      if (!f.date) return (err.textContent = "Please choose a delivery date.");

      const u = currentUser();
      const users = store.get("users", {});
      users[u.email] = { ...users[u.email], address: f.address.trim() || users[u.email].address, phone: f.phone.trim() };
      store.set("users", users);

      const t = cartTotals(f.zone);
      const order = {
        id: "BF" + Date.now().toString(36).toUpperCase().slice(-6),
        email: u.email,
        createdAt: new Date().toISOString(),
        items: cart.map((l) => ({ ...l })),
        ...t,
        customer: { name: f.name.trim(), phone: f.phone.trim(), address: f.address.trim(), label: f.label.trim(), note: f.note.trim() },
        zone: C.deliveryZones.find((z) => z.id === f.zone).name,
        date: f.date,
        payment: f.pay,
        paid: false,
      };

      if (f.pay === "card") {
        const ref = await pay(order, u.email);
        if (!ref) return;
        order.paid = true;
        order.paymentRef = ref;
      }
      const orders = store.get("orders", []);
      orders.unshift(order);
      store.set("orders", orders);
      cart = [];
      saveCart();
      location.hash = "#/success/" + order.id;
    };
  }

  // Card payment: Paystack inline when a key is configured, otherwise a simulated card form.
  function pay(order, email) {
    if (C.paystackPublicKey) {
      return new Promise((resolve) => {
        const start = () => {
          const handler = window.PaystackPop.setup({
            key: C.paystackPublicKey,
            email,
            amount: order.total * 100,
            currency: "NGN",
            ref: order.id + "-" + Date.now(),
            metadata: { order_id: order.id, phone: order.customer.phone },
            callback: (res) => resolve(res.reference),
            onClose: () => { toast("Payment cancelled"); resolve(null); },
          });
          handler.openIframe();
        };
        if (window.PaystackPop) return start();
        const s = document.createElement("script");
        s.src = "https://js.paystack.co/v1/inline.js";
        s.onload = start;
        s.onerror = () => { toast("Could not load Paystack. Check your connection."); resolve(null); };
        document.head.appendChild(s);
      });
    }
    return new Promise((resolve) => {
      const bg = document.createElement("div");
      bg.className = "modal-bg";
      bg.innerHTML = `
        <form class="modal" novalidate>
          <h3>Card payment</h3>
          <p class="muted" style="margin-top:4px">Paying <b style="color:var(--tomato)">${money(order.total)}</b> to Bole Friday</p>
          <div class="field"><label>Card number</label><input name="num" inputmode="numeric" autocomplete="cc-number" placeholder="4084 0840 8408 4081" maxlength="19"></div>
          <div class="row2">
            <div class="field"><label>Expiry</label><input name="exp" placeholder="MM/YY" maxlength="5" autocomplete="cc-exp"></div>
            <div class="field"><label>CVV</label><input name="cvv" inputmode="numeric" placeholder="123" maxlength="4" autocomplete="cc-csc"></div>
          </div>
          <span class="err" style="color:var(--tomato);font-size:13px"></span>
          <button class="btn btn-primary btn-block" type="submit" style="margin-top:8px">Pay ${money(order.total)}</button>
          <button class="btn btn-ghost btn-block btn-sm" type="button" data-cancel style="margin-top:8px">Cancel</button>
          <div class="demo-note">Demo mode: no real charge is made.</div>
        </form>`;
      document.body.appendChild(bg);
      const form = $("form", bg);
      form.num.oninput = () => (form.num.value = form.num.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim());
      form.exp.oninput = () => (form.exp.value = form.exp.value.replace(/\D/g, "").replace(/^(\d{2})(\d)/, "$1/$2"));
      const close = (val) => { bg.remove(); resolve(val); };
      $("[data-cancel]", bg).onclick = () => { toast("Payment cancelled"); close(null); };
      form.onsubmit = (e) => {
        e.preventDefault();
        const num = form.num.value.replace(/\s/g, "");
        if (num.length < 12 || !/^\d{2}\/\d{2}$/.test(form.exp.value) || form.cvv.value.length < 3) {
          $(".err", bg).textContent = "Please check your card details.";
          return;
        }
        form.innerHTML = `<h3 class="center">Processing…</h3><div class="spinner"></div><p class="center muted">Confirming with your bank</p>`;
        setTimeout(() => close("DEMO-" + Date.now()), 1600);
      };
    });
  }

  function orderText(o) {
    return [
      `Hi Bole Friday! New order ${o.id}`,
      ...o.items.map((l) => `• ${l.qty}× ${l.name} (${l.options}) — ${money(l.price * l.qty)}`),
      `Delivery: ${o.zone} — ${o.delivery ? money(o.delivery) : "Free"}`,
      `Total: ${money(o.total)} (${o.paid ? "PAID" : o.payment === "transfer" ? "Bank transfer" : "Pay on delivery"})`,
      `Name: ${o.customer.name} · ${o.customer.phone}`,
      o.customer.address && `Address: ${o.customer.address}`,
      `Date: ${o.date}`,
      o.customer.note && `Note: ${o.customer.note}`,
    ].filter(Boolean).join("\n");
  }

  function viewSuccess(id) {
    const o = store.get("orders", []).find((x) => x.id === id);
    if (!o) return `<div class="wrap empty"><div class="big">ORDER NOT FOUND</div><a class="btn btn-primary" href="#/orders">My orders</a></div>`;
    const wa = `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(orderText(o))}`;
    return `
    <div class="wrap">
      ${progress(3)}
      <div class="success">
        <div class="check"><svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M5 12l5 5L20 7"/></svg></div>
        <h1>ORDER PLACED!</h1>
        <p class="muted">Thank you, ${esc(o.customer.name.split(" ")[0])}. Your bole is getting ready for ${new Date(o.date + "T00:00").toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}.</p>
        <div class="panel receipt">
          <div class="sum-row"><span>Order number</span><b>${esc(o.id)}</b></div>
          <div class="sum-row"><span>Payment</span><span class="status ${o.paid ? "" : "pending"}">${o.paid ? "Paid" : o.payment === "transfer" ? "Awaiting transfer" : "Pay on delivery"}</span></div>
          ${o.items.map((l) => `<div class="sum-row"><span>${l.qty}× ${esc(l.name)}</span><span>${money(l.price * l.qty)}</span></div>`).join("")}
          <div class="sum-row"><span>Delivery</span><span>${o.delivery ? money(o.delivery) : "Free"}</span></div>
          <div class="sum-row total"><span>Total</span><span>${money(o.total)}</span></div>
        </div>
        <p class="muted" style="font-size:14px;margin-top:20px">Send your order to Bole Friday on WhatsApp so the kitchen gets it right away.</p>
        <div class="hero-cta" style="justify-content:center;margin-top:10px">
          <a class="btn btn-primary" href="${wa}" target="_blank" rel="noopener">Send on WhatsApp</a>
          <a class="btn btn-ghost" href="#/menu">Order more</a>
        </div>
      </div>
    </div>`;
  }

  function viewOrders() {
    const u = currentUser();
    const orders = store.get("orders", []).filter((o) => o.email === u.email);
    return `
    <section class="block"><div class="wrap">
      <div class="eyebrow">Hello ${esc(u.name.split(" ")[0])}</div>
      <h1 class="section-title">My Orders</h1>
      ${orders.length ? orders.map((o) => `
        <a class="panel" href="#/success/${esc(o.id)}" style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap">
          <div><b style="color:var(--maroon)">${esc(o.id)}</b> <span class="status ${o.paid ? "" : "pending"}">${o.paid ? "Paid" : "Unpaid"}</span>
            <br><small class="muted">${o.items.map((l) => `${l.qty}× ${esc(l.name)}`).join(", ")}</small>
            <br><small class="muted">Delivery: ${esc(o.date)}</small></div>
          <span class="price">${money(o.total)}</span>
        </a>`).join("") : `<div class="panel empty"><div class="big">NO ORDERS YET</div><a class="btn btn-primary" href="#/menu">Order your first bole</a></div>`}
    </div></section>`;
  }

  // ---------- router ----------
  function route() {
    const [path, query] = (location.hash.slice(1) || "/").split("?");
    const params = new URLSearchParams(query);
    const parts = path.split("/").filter(Boolean);
    const page = parts[0] || "";
    const needsAuth = ["checkout", "orders", "success"].includes(page);

    if (needsAuth && !currentUser()) {
      location.hash = "#/signup?next=" + encodeURIComponent("#" + path);
      return;
    }
    if (page === "checkout" && !cart.length) { location.hash = "#/cart"; return; }

    const views = {
      "": [viewHome, bindMenu],
      menu: [viewMenu, bindMenu],
      signup: [() => viewAuth("signup", params.get("next")), () => bindAuth("signup", params.get("next"))],
      login: [() => viewAuth("login", params.get("next")), () => bindAuth("login", params.get("next"))],
      cart: [viewCart, bindCart],
      checkout: [viewCheckout, bindCheckout],
      success: [() => viewSuccess(parts[1]), null],
      orders: [viewOrders, null],
    };
    const [view, bind] = views[page] || views[""];
    app.innerHTML = view();
    bind?.();
    if (hasPngLogo) $$('img[src="assets/logo.svg"]').forEach((i) => (i.src = "assets/logo.png"));
    $$("#navLinks a").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#/" + page || (page === "" && a.getAttribute("href") === "#/")));
    window.scrollTo(0, 0);
  }

  // Use a real logo if one has been added at assets/logo.png
  let hasPngLogo = false;
  const probe = new Image();
  probe.onload = () => {
    hasPngLogo = true;
    $$('img[src="assets/logo.svg"]').forEach((i) => (i.src = "assets/logo.png"));
  };
  probe.src = "assets/logo.png";

  $("#year").textContent = new Date().getFullYear();
  window.addEventListener("hashchange", route);
  renderCartCount();
  renderAuthSlot();
  route();
})();
