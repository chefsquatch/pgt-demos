/*
 * PGT demo upgrade: drop-in for any demo page built on the DCLogic `Component` runtime.
 *
 *   <script src="/live-chat.js" data-vertical="salon" data-name="Rowan & Sage"
 *     data-greeting="Hi there..." data-accent="#a44f33" data-ink="#3b1f2b"
 *     data-paper="#fbf6ee" data-font="Jost, sans-serif"
 *     data-live-row='{"client":"{name}","svc":"{summary}","status":"New lead","bg":"#a44f33","fg":"#fff"}'
 *     data-live-urgent='{"status":"Call now","bg":"#fde8e6","fg":"#c8261b"}'
 *     data-live-on="#5f6e51"
 *     data-live-syncs='[["Email to the owner","Sent for real"],["Reply to {name}","Answered in the chat"]]'></script>
 *
 * What it adds (founder 2026-10-25: "shining stars, not confusing"):
 *  1. A Guided tour / Type your own (live AI) switch on the demo phone itself. Live mode runs the
 *     real assistant (vertical-demos backend, POST /chat) inside the same phone frame.
 *  2. When the assistant captures a lead, it lands on the owner's board next to the chat (a row
 *     built from data-live-row, the "sent automatically" cards from data-live-syncs). The backend
 *     also emails it to PGT. {name} {phone} {summary} fill in from the lead.
 *  3. When the chat and the board stack (phones, small tablets): board rows become compact cards
 *     that fit the screen, and the "on the left / on the right" copy is rewritten.
 *  4. A "your book just updated" banner whenever the board changes while it is off screen.
 *  5. Usage counter to POST /event: view, scripted_tap, chat_open, chat_message. No cookies.
 */
(function () {
  var API = "https://vertical-demos.onrender.com";
  var MAIN_SITE = "https://precisionguessworktech.com/#contact";
  var me = document.currentScript;
  function attr(n, d) { return me.getAttribute(n) || d; }
  function json(n, d) { try { return JSON.parse(me.getAttribute(n)) || d; } catch (e) { return d; } }
  var cfg = {
    vertical: attr("data-vertical"),
    name: attr("data-name", "us"),
    greeting: attr("data-greeting", "Hi! How can I help?"),
    accent: attr("data-accent", "#222"),
    ink: attr("data-ink", "#111"),
    paper: attr("data-paper", "#fff"),
    font: attr("data-font", "system-ui, sans-serif"),
    row: json("data-live-row", null),
    urgent: json("data-live-urgent", null),
    on: attr("data-live-on", "#2e7d32"),
    syncs: json("data-live-syncs", null),
    // Sync cards for things the product does not do yet get a "Coming soon" tag (founder
    // 2026-10-25: the demos may only claim what a client actually gets today).
    soon: json("data-live-soon", ["Google Calendar", "Text to", "Call + text", "Confirmation to",
      "Waitlist", "Drop-off reminder", "On-my-way", "Kitchen printer", "Host stand", "Customer list"]),
  };

  var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  function track(event) {
    if (LOCAL) return;  // local testing never counts as demo usage
    var body = JSON.stringify({ vertical: cfg.vertical, event: event });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(API + "/event", body)) return;
    } catch (e) {}
    try { fetch(API + "/event", { method: "POST", body: body, keepalive: true }); } catch (e) {}
  }
  track("view");

  // ---- Hooks into the page's Component (wrapped, never edited) ------------------------------
  var inst = null, snapshot = null, liveLead = null;
  var quietUntil = 0;  // board resets (restart, mode switch) are not news; no banner for them
  function quiet() { quietUntil = Date.now() + 350; }
  function fill(s) {
    if (typeof s !== "string" || !liveLead) return s;
    return s.replace(/\{(name|phone|summary)\}/g, function (_, k) {
      var v = String(liveLead[k] || (k === "name" ? "New customer" : ""));
      return v.length > 60 ? v.slice(0, 57) + "..." : v;
    });
  }
  if (typeof Component === "function" && Component.prototype) {
    var P = Component.prototype;
    var mountFn = P.componentDidMount;
    P.componentDidMount = function () {
      inst = this;
      try { snapshot = JSON.parse(JSON.stringify(this.state)); } catch (e) { snapshot = null; }
      if (mountFn) return mountFn.apply(this, arguments);
    };
    if (P.choose) {
      var choose = P.choose;
      P.choose = function (c) {
        track("scripted_tap");
        if (c && c.a === "restart") quiet();
        return choose.apply(this, arguments);
      };
    }
    if (P.rows && cfg.row) {
      var rowsFn = P.rows;
      P.rows = function () {
        var out = rowsFn.apply(this, arguments);
        if (!liveLead || !out.length) return out;
        var spec = Object.assign({}, cfg.row, liveLead.urgent && cfg.urgent ? cfg.urgent : {});
        var row = Object.assign({}, out[0], { hot: true, strike: "none" });
        Object.keys(spec).forEach(function (k) { row[k] = fill(spec[k]); });
        return liveLead.urgent ? [row].concat(out) : out.concat([row]);
      };
    }
    if (P.syncs && cfg.syncs) {
      var syncsFn = P.syncs;
      P.syncs = function () {
        if (!liveLead) return syncsFn.apply(this, arguments);
        return cfg.syncs.map(function (s) { return { name: fill(s[0]), note: fill(s[1]), dot: cfg.on }; });
      };
    }
  }

  var css = [
    ".plc-launch{position:fixed;right:18px;bottom:18px;z-index:9998;display:flex;align-items:center;gap:10px;border:0;border-radius:999px;padding:14px 20px;font:600 16px/1 var(--plc-font);background:var(--plc-accent);color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.25);cursor:pointer;transition:opacity .25s,transform .25s}",
    ".plc-launch.plc-hide{opacity:0;transform:translateY(20px);pointer-events:none}",
    ".plc-dot{width:9px;height:9px;border-radius:50%;background:#3ddc84;box-shadow:0 0 0 0 rgba(61,220,132,.7);animation:plc-pulse 1.8s infinite;flex:0 0 auto}",
    "@keyframes plc-pulse{70%{box-shadow:0 0 0 9px rgba(61,220,132,0)}100%{box-shadow:0 0 0 0 rgba(61,220,132,0)}}",
    ".plc-tip{position:fixed;right:18px;bottom:78px;z-index:9998;max-width:260px;background:var(--plc-ink);color:#fff;font:500 14px/1.4 var(--plc-font);padding:12px 14px;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.25);cursor:pointer}",
    ".plc-modes{display:flex;gap:6px;padding:5px;border-radius:999px;background:rgba(0,0,0,.06);font-family:var(--plc-font);align-self:flex-start;max-width:100%}",
    ".plc-modes button{display:flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:10px 16px;font:600 14.5px/1.1 var(--plc-font);background:transparent;color:var(--plc-ink);cursor:pointer;white-space:nowrap}",
    ".plc-modes button[aria-pressed=true]{background:var(--plc-ink);color:#fff;box-shadow:0 4px 14px -6px rgba(0,0,0,.5)}",
    ".plc-form{display:flex;flex-wrap:wrap;gap:8px;flex:1 1 100%;min-width:0}",
    ".plc-form input{flex:1 1 160px;min-width:0;border:1px solid rgba(0,0,0,.18);border-radius:24px;padding:11px 16px;font:16px var(--plc-font);color:#111;background:#fff}",
    ".plc-form button{border:0;border-radius:24px;padding:0 20px;min-height:44px;font:600 15px var(--plc-font);background:var(--plc-accent);color:#fff;cursor:pointer}",
    ".plc-form button:disabled{opacity:.5;cursor:default}",
    ".plc-cta{flex:1 1 100%;display:block;text-align:center;text-decoration:none;font:600 15px/1 var(--plc-font);padding:13px 16px;border-radius:24px;background:var(--plc-ink);color:#fff}",
    ".plc-banner{position:fixed;left:50%;top:82px;z-index:9999;width:calc(100% - 24px);max-width:420px;display:flex;gap:12px;align-items:flex-start;padding:13px 15px;border-radius:18px;background:#fff;color:#111;font:14px/1.35 var(--plc-font);box-shadow:0 18px 50px -12px rgba(0,0,0,.45);border:1px solid rgba(0,0,0,.08);cursor:pointer;transform:translate(-50%,-140%);opacity:0;transition:transform .35s cubic-bezier(.2,.8,.2,1),opacity .35s}",
    ".plc-banner.plc-in{transform:translate(-50%,0);opacity:1}",
    ".plc-banner .plc-bdot{width:11px;height:11px;border-radius:50%;margin-top:4px;flex:0 0 auto}",
    ".plc-banner small{display:block;font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;opacity:.6;margin-bottom:2px}",
    ".plc-banner b{display:block;font-size:15px}",
    ".plc-banner em{display:block;font-style:normal;font-size:12.5px;margin-top:4px;color:var(--plc-accent);font-weight:600}",
    // Stacked layout: board rows as compact cards (name + status on top, details under).
    ".plc-cards{min-width:0!important}",
    ".plc-cards>div:first-child{display:none!important}",
    ".plc-cards>div{display:flex!important;flex-wrap:wrap;align-items:center;column-gap:10px;row-gap:3px}",
    ".plc-cards>div>*{order:3;font-size:13.5px}",
    ".plc-cards>div>:first-child,.plc-cards>div>b{order:0;font-size:15px}",
    ".plc-cards>div>:last-child{order:1;margin-left:auto;font-size:12.5px}",
    ".plc-cards>div::before{content:'';order:2;flex-basis:100%;height:0}",
 ".plc-soon{display:inline-block;margin-left:7px;padding:2px 7px;border-radius:999px;font:600 10.5px/1.3 var(--plc-font);letter-spacing:.04em;text-transform:uppercase;background:rgba(0,0,0,.07);color:inherit;opacity:.75;vertical-align:1px}",
    ".plc-honest{font:500 13px/1.45 var(--plc-font);opacity:.75;margin-top:-4px}",
    ".plc-flash{outline:3px solid var(--plc-accent);outline-offset:2px;border-radius:12px;transition:outline-color 1.2s}",
    "@media (prefers-reduced-motion:reduce){.plc-banner,.plc-launch{transition:none}.plc-dot{animation:none}}",
  ].join("\n");

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function mount() {
    var root = document.documentElement.style;
    root.setProperty("--plc-accent", cfg.accent);
    root.setProperty("--plc-ink", cfg.ink);
    root.setProperty("--plc-paper", cfg.paper);
    root.setProperty("--plc-font", cfg.font);
    var style = el("style"); style.textContent = css; document.head.appendChild(style);

    var log = inst && inst.logRef && inst.logRef.current;
    var chipBar = log && log.nextElementSibling;
    var tryEl = document.getElementById("try");
    var leftPane = log && log.closest("[data-reveal]");
    var rowsBox = tryEl && tryEl.querySelector('[style*="min-width:5"]');
    var boardPane = rowsBox && rowsBox.closest("[data-reveal]");
    if (!inst || !log || !chipBar || !leftPane || !rowsBox || !boardPane) return;
    var card = log.parentElement;

    // ---- Mode switch ---------------------------------------------------------------------
    var modes = el("div", "plc-modes");
    modes.setAttribute("role", "group"); modes.setAttribute("aria-label", "Demo mode");
    var bGuided = el("button", null, "Guided tour"); bGuided.type = "button";
    var bLive = el("button"); bLive.type = "button";
    bLive.appendChild(el("span", "plc-dot")); bLive.appendChild(el("span", null, "Type your own (live AI)"));
    modes.appendChild(bGuided); modes.appendChild(bLive);
    leftPane.insertBefore(modes, card);
    var honest = el("div", "plc-honest", "The guided tour shows the full system; anything marked coming soon is on the way. Live AI shows what works today.");
    leftPane.insertBefore(honest, card);

    var mode = "guided", opened = false, busy = false, convo = [];
    var form = el("form", "plc-form");
    var input = el("input"); input.placeholder = "Text " + cfg.name + " like a customer";
    input.setAttribute("aria-label", "Message"); input.maxLength = 1000; input.enterKeyHint = "send";
    var send = el("button", null, "Send"); send.type = "submit";
    form.appendChild(input); form.appendChild(send);

    function setPressed() {
      honest.textContent = mode === "guided"
        ? "The guided tour shows the full system; anything marked coming soon is on the way. Live AI shows what works today."
        : "This is the real assistant. Every lead it captures is emailed for real (in this demo, to us).";
      bGuided.setAttribute("aria-pressed", mode === "guided");
      bLive.setAttribute("aria-pressed", mode === "live");
    }
    function addMsg(m) { inst.setState(function (s) { return { msgs: s.msgs.concat([m]) }; }); }

    function goLive(focus) {
      if (mode !== "live") {
        mode = "live"; setPressed();
        if (!opened) { opened = true; track("chat_open"); }
        liveLead = null; convo = [{ role: "assistant", content: cfg.greeting }];
        quiet();
        inst.run++;  // cancels the scripted tour's pending steps
        var fresh = snapshot ? JSON.parse(JSON.stringify(snapshot)) : {};
        inst.setState(Object.assign(fresh, {
          chips: [], typing: false,
          msgs: [{ isDiv: true, text: "Live AI. Type anything a customer would" }, { isBot: true, text: cfg.greeting }],
        }));
        var old = form.querySelector(".plc-cta"); if (old) old.remove();
        chipBar.appendChild(form);
        launchState();
      }
      if (focus) input.focus();
    }
    function goGuided(alreadyRestarted) {
      if (mode === "guided") return;
      mode = "guided"; setPressed();
      liveLead = null;
      if (form.parentNode) form.parentNode.removeChild(form);
      quiet();
      if (!alreadyRestarted) inst.restart();
      launchState();
    }
    bLive.addEventListener("click", function () { goLive(true); });
    bGuided.addEventListener("click", function () { goGuided(false); });
    // The phone's own Restart button runs the guided tour again.
    Array.prototype.forEach.call(card.querySelectorAll("button"), function (b) {
      if (/restart/i.test(b.textContent)) b.addEventListener("click", function () { quiet(); goGuided(true); });
    });
    setPressed();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text || busy) return;
      input.value = "";
      addMsg({ isUsr: true, text: text });
      convo.push({ role: "user", content: text });
      track("chat_message");
      busy = true; send.disabled = true;
      inst.setState({ typing: true });
      fetch(API + "/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vertical: cfg.vertical, messages: convo }),
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (mode !== "live") return;
          inst.setState({ typing: false });
          if (!res.ok || !res.j.reply) { convo.pop(); addMsg({ isNote: true, text: res.j.error || "Something went wrong. Try again." }); return; }
          addMsg({ isBot: true, text: res.j.reply });
          convo.push({ role: "assistant", content: res.j.reply });
          if (res.j.lead && !liveLead) landLead(res.j.lead);
        })
        .catch(function () {
          if (mode !== "live") return;
          inst.setState({ typing: false }); convo.pop();
          addMsg({ isNote: true, text: "Couldn't reach the assistant. Check your connection and try again." });
        })
        .then(function () { busy = false; send.disabled = false; });
    });

    function landLead(lead) {
      liveLead = lead;
      var rows = [["Name", lead.name], ["Phone", lead.phone], ["Wants", lead.summary]]
        .filter(function (r) { return r[1]; }).map(function (r) { return { k: r[0], v: String(r[1]) }; });
      addMsg({ isLead: true, text: lead.urgent ? "Urgent, sent to the owner" : "Sent to the owner", rows: rows });
      addMsg({ isNote: true, text: stacked ? "It just landed in the owner's board below" : "It just landed in the owner's board" });
      var cta = el("a", "plc-cta", "Get this for my business");
      cta.href = MAIN_SITE; cta.target = "_blank"; cta.rel = "noopener";
      form.insertBefore(cta, form.firstChild);
      inst.setState({});  // re-render so the board picks up the lead
    }

    // ---- Stacked layout: compact board + honest copy ------------------------------------
    var stacked = false;
    var intro = tryEl.querySelector("p");
    var introText = intro ? intro.textContent : "";
    function layout() {
      stacked = boardPane.getBoundingClientRect().top - leftPane.getBoundingClientRect().top > 60;
      rowsBox.classList.toggle("plc-cards", stacked);
      if (intro) intro.textContent = stacked
        ? introText.replace(/ on the left/g, " below").replace(/ on the right/g, " under it")
        : introText;
    }
    layout();
    window.addEventListener("resize", layout);

    // ---- "Coming soon" tags on the sent-automatically cards --------------------------------
    var syncLabel = Array.prototype.filter.call(boardPane.querySelectorAll("div"), function (d) {
      return /^sent automatically$/i.test(d.textContent.trim());
    })[0];
    var syncGrid = syncLabel && syncLabel.nextElementSibling;
    function tagSoon() {
      Array.prototype.forEach.call(syncGrid.children, function (cardEl) {
        var nameEl = cardEl.querySelector("div > div");
        if (!nameEl || nameEl.querySelector(".plc-soon")) return;
        var n = nameEl.textContent.trim();
        if (cfg.soon.some(function (p) { return n.indexOf(p) === 0; })) nameEl.appendChild(el("span", "plc-soon", "Coming soon"));
      });
    }
    if (syncGrid) {
      tagSoon();
      new MutationObserver(tagSoon).observe(syncGrid, { childList: true });  // re-tag after each render
    }

    // ---- Owner's-phone banner when the board changes off screen ------------------------
    var label = (boardPane.firstElementChild && boardPane.firstElementChild.textContent || "Your board")
      .replace(/^[^A-Za-z]+/, "").split(",")[0].trim();
    var boardVisible = false;
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { boardVisible = e.intersectionRatio >= 0.4; });
      }, { threshold: [0, 0.2, 0.4, 0.6, 1] }).observe(rowsBox);
    }
    function rowEls() { return Array.prototype.slice.call(rowsBox.children, 1); }
    function rowText(r) { return Array.prototype.map.call(r.children, function (c) { return c.textContent.trim(); }).join("|"); }
    var last = rowEls().map(rowText);
    var banner = null, hideT = null;
    function lum(c) {
      var m = String(c).match(/[\d.]+/g) || [255, 255, 255, 0];
      if (m.length > 3 && +m[3] === 0) return 999;  // transparent
      return 0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2];
    }
    function hideBanner(b) {
      b.classList.remove("plc-in");
      setTimeout(function () { if (b.parentNode) b.remove(); }, 450);
    }
    function showBanner(r) {
      var cells = Array.prototype.map.call(r.children, function (c) { return c.textContent.trim(); }).filter(Boolean);
      var status = cells.pop() || "Updated";
      // Status pill: some are light text on a dark fill, some dark text on a light fill. Use the darker.
      var ps = getComputedStyle(r.lastElementChild);
      var dot = lum(ps.backgroundColor) < lum(ps.color) ? ps.backgroundColor : ps.color;
      if (banner) banner.remove();
      banner = el("div", "plc-banner"); banner.setAttribute("role", "status");
      var d = el("span", "plc-bdot"); d.style.background = dot;
      var t = el("div");
      t.appendChild(el("small", null, label + " · now"));
      t.appendChild(el("b", null, status));
      t.appendChild(el("div", null, cells.join(" · ")));
      t.appendChild(el("em", null, "Tap to see it"));
      banner.appendChild(d); banner.appendChild(t);
      document.body.appendChild(banner);
      var b = banner;
      requestAnimationFrame(function () { requestAnimationFrame(function () { b.classList.add("plc-in"); }); });
      banner.addEventListener("click", function () {
        hideBanner(b);
        var target = rowEls().filter(function (x) { return rowText(x) === rowText(r); })[0] || rowsBox;
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("plc-flash");
        setTimeout(function () { target.classList.remove("plc-flash"); }, 1600);
      });
      clearTimeout(hideT);
      hideT = setTimeout(function () { hideBanner(b); }, 5500);
    }
    new MutationObserver(function () {
      var rows = rowEls(), now = rows.map(rowText), changed = null;
      now.forEach(function (txt, i) { if (last.indexOf(txt) === -1) changed = rows[i]; });
      last = now;
      if (changed && !boardVisible && Date.now() > quietUntil) showBanner(changed);
    }).observe(rowsBox, { childList: true });

    // ---- Floating launcher: jumps to the phone in live mode ----------------------------
    var launch = el("button", "plc-launch");
    launch.type = "button";
    launch.appendChild(el("span", "plc-dot"));
    launch.appendChild(el("span", null, "Try it live with real AI"));
    document.body.appendChild(launch);
    var tryVisible = false, tip = null;
    function launchState() { launch.classList.toggle("plc-hide", tryVisible || mode === "live"); if (tip && (tryVisible || mode === "live")) { tip.remove(); tip = null; } }
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { tryVisible = e.isIntersecting; }); launchState();
      }, { threshold: 0 }).observe(tryEl);  // the section is taller than a phone screen
    }
    function jump() {
      goLive(false);
      var y = card.getBoundingClientRect().top + window.scrollY - 140;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      setTimeout(function () { input.focus({ preventScroll: true }); }, 450);
    }
    launch.addEventListener("click", jump);
    setTimeout(function () {
      if (opened || tryVisible) return;
      tip = el("div", "plc-tip", "This one's real. Ask it anything a customer would, like you're texting at midnight.");
      tip.addEventListener("click", jump);
      document.body.appendChild(tip);
    }, 7000);
    launchState();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
