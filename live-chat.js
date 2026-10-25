/*
 * PGT live demo chat: drop-in for any demo page (founder 2026-10-24: the demos must actually
 * talk it over with a lead and fork to emailing PGT, not just play a script).
 *
 *   <script src="/live-chat.js" data-vertical="salon" data-name="Rowan & Sage"
 *           data-greeting="Hi there..." data-accent="#a44f33" data-ink="#3b1f2b"
 *           data-paper="#fbf6ee" data-font="Jost, sans-serif"></script>
 *
 * Adds a "text us" launcher + chat panel wired to the real assistant (vertical-demos backend,
 * POST /chat). When the assistant captures a lead, the backend emails it to PGT and this shows
 * the lead card. Also reports usage to POST /event: view, scripted_tap, chat_open, chat_message.
 * No cookies, no personal data in the counter.
 */
(function () {
  var API = "https://vertical-demos.onrender.com";
  var MAIN_SITE = "https://precisionguessworktech.com/#contact";
  var me = document.currentScript;
  var cfg = {
    vertical: me.getAttribute("data-vertical"),
    name: me.getAttribute("data-name") || "us",
    greeting: me.getAttribute("data-greeting") || "Hi! How can I help?",
    accent: me.getAttribute("data-accent") || "#222",
    ink: me.getAttribute("data-ink") || "#111",
    paper: me.getAttribute("data-paper") || "#fff",
    font: me.getAttribute("data-font") || "system-ui, sans-serif",
  };

  function track(event) {
    var body = JSON.stringify({ vertical: cfg.vertical, event: event });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(API + "/event", body)) return;
    } catch (e) {}
    try { fetch(API + "/event", { method: "POST", body: body, keepalive: true }); } catch (e) {}
  }
  track("view");

  // Count taps on the scripted demo phone (the page's Component class), without changing it.
  if (typeof Component === "function" && Component.prototype && Component.prototype.choose) {
    var choose = Component.prototype.choose;
    Component.prototype.choose = function (c) { track("scripted_tap"); return choose.call(this, c); };
  }

  var css = [
    ".plc-launch{position:fixed;right:18px;bottom:18px;z-index:9998;display:flex;align-items:center;gap:10px;border:0;border-radius:999px;padding:14px 20px;font:600 16px/1 var(--plc-font);background:var(--plc-accent);color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.25);cursor:pointer}",
    ".plc-launch .plc-dot{width:9px;height:9px;border-radius:50%;background:#3ddc84;box-shadow:0 0 0 0 rgba(61,220,132,.7);animation:plc-pulse 1.8s infinite}",
    "@keyframes plc-pulse{70%{box-shadow:0 0 0 9px rgba(61,220,132,0)}100%{box-shadow:0 0 0 0 rgba(61,220,132,0)}}",
    ".plc-tip{position:fixed;right:18px;bottom:78px;z-index:9998;max-width:260px;background:var(--plc-ink);color:#fff;font:500 14px/1.4 var(--plc-font);padding:12px 14px;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.25)}",
    ".plc-panel{position:fixed;right:18px;bottom:18px;z-index:9999;width:380px;max-width:calc(100vw - 24px);height:560px;max-height:calc(100dvh - 36px);display:flex;flex-direction:column;background:var(--plc-paper);color:var(--plc-ink);border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35);font:15px/1.45 var(--plc-font)}",
    ".plc-head{display:flex;align-items:center;gap:10px;padding:14px 16px;background:var(--plc-ink);color:#fff}",
    ".plc-head b{font-size:16px}.plc-head small{display:block;opacity:.75;font-size:12px}",
    ".plc-x{margin-left:auto;background:none;border:0;color:#fff;font-size:24px;line-height:1;cursor:pointer;padding:4px 8px}",
    ".plc-log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px}",
    ".plc-m{max-width:85%;padding:9px 13px;border-radius:16px;white-space:pre-wrap;word-wrap:break-word}",
    ".plc-bot{align-self:flex-start;background:#fff;border:1px solid rgba(0,0,0,.08)}",
    ".plc-usr{align-self:flex-end;background:var(--plc-accent);color:#fff}",
    ".plc-note{align-self:center;font-size:12px;opacity:.7;text-align:center;padding:2px 8px}",
    ".plc-lead{align-self:stretch;background:#fff;border:2px solid var(--plc-accent);border-radius:14px;padding:12px 14px;font-size:14px}",
    ".plc-lead strong{display:block;margin-bottom:6px;color:var(--plc-accent)}",
    ".plc-lead a{display:inline-block;margin-top:10px;background:var(--plc-ink);color:#fff;text-decoration:none;padding:9px 14px;border-radius:10px;font-weight:600}",
    ".plc-form{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(0,0,0,.08);background:#fff}",
    ".plc-form input{flex:1;min-width:0;border:1px solid rgba(0,0,0,.15);border-radius:12px;padding:11px 12px;font:16px var(--plc-font);color:#111;background:#fff}",
    ".plc-form button{border:0;border-radius:12px;padding:0 16px;font:600 15px var(--plc-font);background:var(--plc-accent);color:#fff;cursor:pointer}",
    ".plc-form button:disabled{opacity:.5;cursor:default}",
    "@media (max-width:480px){.plc-panel{right:0;bottom:0;width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;border-radius:0}}",
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

    var launch = el("button", "plc-launch");
    launch.type = "button";
    launch.appendChild(el("span", "plc-dot"));
    launch.appendChild(el("span", null, "Text " + cfg.name + " (live)"));
    document.body.appendChild(launch);

    var tip = null;
    setTimeout(function () {
      if (opened) return;
      tip = el("div", "plc-tip", "This one's real. Ask it anything a customer would, like you're texting at midnight.");
      document.body.appendChild(tip);
    }, 7000);

    var panel = el("div", "plc-panel"); panel.style.display = "none";
    panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Chat with " + cfg.name);
    var head = el("div", "plc-head");
    var title = el("div"); title.appendChild(el("b", null, cfg.name));
    title.appendChild(el("small", null, "Live AI demo. Try it like a real customer."));
    var x = el("button", "plc-x", "×"); x.type = "button"; x.setAttribute("aria-label", "Close chat");
    head.appendChild(title); head.appendChild(x);
    var log = el("div", "plc-log");
    var form = el("form", "plc-form");
    var input = el("input"); input.placeholder = "Type a message"; input.setAttribute("aria-label", "Message");
    input.maxLength = 1000;
    var send = el("button", null, "Send"); send.type = "submit";
    form.appendChild(input); form.appendChild(send);
    panel.appendChild(head); panel.appendChild(log); panel.appendChild(form);
    document.body.appendChild(panel);

    var msgs = [{ role: "assistant", content: cfg.greeting }];
    var opened = false, busy = false, leadShown = false;

    function add(cls, text) {
      var m = el("div", "plc-m " + cls, text); log.appendChild(m); log.scrollTop = log.scrollHeight; return m;
    }
    function note(text) { var n = el("div", "plc-note", text); log.appendChild(n); log.scrollTop = log.scrollHeight; }
    function showLead(lead) {
      if (leadShown) return; leadShown = true;
      var card = el("div", "plc-lead");
      card.appendChild(el("strong", null, "Sent to the owner"));
      [["Name", lead.name], ["Phone", lead.phone], ["Wants", lead.summary]].forEach(function (r) {
        if (r[1]) card.appendChild(el("div", null, r[0] + ": " + r[1]));
      });
      card.appendChild(el("div", "plc-note", "In the real thing this lands on the owner's phone and inbox the moment it happens."));
      var a = el("a", null, "Get this for your business"); a.href = MAIN_SITE; a.target = "_blank"; a.rel = "noopener";
      card.appendChild(a);
      log.appendChild(card); log.scrollTop = log.scrollHeight;
    }

    function open() {
      panel.style.display = "flex"; launch.style.display = "none"; if (tip) tip.remove();
      if (!opened) { opened = true; track("chat_open"); add("plc-bot", cfg.greeting); }
      input.focus();
    }
    function close() { panel.style.display = "none"; launch.style.display = "flex"; }
    launch.addEventListener("click", open);
    x.addEventListener("click", close);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text || busy) return;
      input.value = ""; add("plc-usr", text);
      msgs.push({ role: "user", content: text });
      track("chat_message");
      busy = true; send.disabled = true;
      var typing = add("plc-bot", "…");
      fetch(API + "/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vertical: cfg.vertical, messages: msgs }),
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          typing.remove();
          if (!res.ok || !res.j.reply) { note(res.j.error || "Something went wrong. Try again."); msgs.pop(); return; }
          add("plc-bot", res.j.reply);
          msgs.push({ role: "assistant", content: res.j.reply });
          if (res.j.lead) showLead(res.j.lead);
        })
        .catch(function () { typing.remove(); msgs.pop(); note("Couldn't reach the assistant. Check your connection and try again."); })
        .then(function () { busy = false; send.disabled = false; input.focus(); });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
