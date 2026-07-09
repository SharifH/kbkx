/* ==========================================================================
   KBKx — site behavior (vanilla JS, no build step)
   --------------------------------------------------------------------------
   Responsibilities:
     1. Load site-config.json  -> Partner Login URL, footer links, form routing
     2. Localization           -> swap text via data-i18n, remember choice
     3. Mobile nav toggle
     4. Scroll-in reveal animation
     5. Ecosystem directory     -> render + filter from partners.json
     6. Lead forms              -> mailto (default) or API, driven by config
   Everything degrades gracefully if a JSON file fails to load.
   ========================================================================== */

(function () {
  "use strict";

  var LANG_KEY = "kbkx-lang";
  var DEFAULT_LANG = "en";

  // Cached config, resolved once and shared across features.
  var siteConfig = null;

  /* ---------------------------------------------------------------------
     Small helpers
     --------------------------------------------------------------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function fetchJSON(path) {
    return fetch(path, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("Failed to load " + path + " (" + r.status + ")");
      return r.json();
    });
  }

  /* ---------------------------------------------------------------------
     1. Site config
     --------------------------------------------------------------------- */
  function loadConfig() {
    return fetchJSON("site-config.json")
      .then(function (cfg) { siteConfig = cfg; return cfg; })
      .catch(function (err) {
        console.warn("[KBKx] Using fallback config:", err.message);
        siteConfig = {
          adminConsoleUrl: "#",
          leadRouting: {},
          formMode: "mailto",
          footerLinks: [],
          companyLinks: []
        };
        return siteConfig;
      });
  }

  function applyConfig(cfg) {
    validateConfig(cfg);

    // Partner Login links (there may be more than one — desktop + mobile).
    $all("[data-role='partner-login']").forEach(function (a) {
      a.setAttribute("href", cfg.adminConsoleUrl || "#");
      a.setAttribute("rel", "noopener");
    });

    // Footer: KBKx site links
    renderFooterLinks("[data-footer='site']", cfg.footerLinks);
    // Footer: KabuK Style Inc. company links
    renderFooterLinks("[data-footer='company']", cfg.companyLinks);
  }

  // Surface obvious config mistakes in the console for whoever is editing
  // site-config.json — missing keys, empty link lists, unreplaced placeholders.
  function validateConfig(cfg) {
    var problems = [];
    if (!cfg.adminConsoleUrl || cfg.adminConsoleUrl === "#") {
      problems.push("adminConsoleUrl is missing");
    } else if (/example\.com/.test(cfg.adminConsoleUrl)) {
      problems.push("adminConsoleUrl still points at a PLACEHOLDER (example.com)");
    }
    var routing = cfg.leadRouting || {};
    ["partnerEmail", "hotelEmail", "generalEmail"].forEach(function (k) {
      if (!routing[k]) problems.push("leadRouting." + k + " is missing");
      else if (/example\.com/.test(routing[k])) problems.push("leadRouting." + k + " is a PLACEHOLDER (example.com)");
    });
    if (!Array.isArray(cfg.footerLinks) || !cfg.footerLinks.length) problems.push("footerLinks is empty");
    if (!Array.isArray(cfg.companyLinks) || !cfg.companyLinks.length) problems.push("companyLinks is empty");
    if (cfg.formMode === "api" && !cfg.apiEndpoint) problems.push('formMode is "api" but apiEndpoint is missing');

    if (problems.length) {
      console.warn("[KBKx] site-config.json review needed:\n - " + problems.join("\n - "));
    }
  }

  function renderFooterLinks(sel, links) {
    var ul = $(sel);
    if (!ul || !Array.isArray(links)) return;
    ul.innerHTML = "";
    links.forEach(function (link) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = link.href || "#";
      a.textContent = link.label || "";
      // External links open in a new tab.
      if (/^https?:/i.test(link.href || "")) {
        a.target = "_blank";
        a.rel = "noopener";
      }
      li.appendChild(a);
      ul.appendChild(li);
    });
  }

  /* ---------------------------------------------------------------------
     2. Localization
     --------------------------------------------------------------------- */
  var LANGUAGES = window.KBKX_LANGUAGES || [{ code: "en", label: "English", dir: "ltr" }];
  var TRANSLATIONS = window.KBKX_TRANSLATIONS || { en: {} };

  function getLang() {
    var stored = null;
    try { stored = localStorage.getItem(LANG_KEY); } catch (e) {}
    if (stored && TRANSLATIONS[stored]) return stored;
    // Try to match the browser language against what we support.
    var nav = (navigator.language || "").toLowerCase();
    var match = LANGUAGES.filter(function (l) {
      return nav === l.code.toLowerCase() || nav.split("-")[0] === l.code.split("-")[0].toLowerCase();
    })[0];
    return match ? match.code : DEFAULT_LANG;
  }

  function setLang(code) {
    if (!TRANSLATIONS[code]) code = DEFAULT_LANG;
    try { localStorage.setItem(LANG_KEY, code); } catch (e) {}

    var dict = TRANSLATIONS[code];
    var langMeta = LANGUAGES.filter(function (l) { return l.code === code; })[0] || {};

    // Direction + lang attributes for RTL support and accessibility.
    document.documentElement.setAttribute("lang", code);
    document.documentElement.setAttribute("dir", langMeta.dir || "ltr");

    // Text content
    $all("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] != null) el.textContent = dict[key];
    });
    // Placeholders
    $all("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      if (dict[key] != null) el.setAttribute("placeholder", dict[key]);
    });
    // aria-labels
    $all("[data-i18n-aria-label]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria-label");
      if (dict[key] != null) el.setAttribute("aria-label", dict[key]);
    });

    // Keep the selector in sync.
    var sel = $("#lang-select");
    if (sel) sel.value = code;
  }

  function buildLangSelector() {
    var sel = $("#lang-select");
    if (!sel) return;
    sel.innerHTML = "";
    LANGUAGES.forEach(function (l) {
      var opt = document.createElement("option");
      opt.value = l.code;
      opt.textContent = l.label;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", function () { setLang(sel.value); });
  }

  /* ---------------------------------------------------------------------
     3. Mobile nav toggle
     --------------------------------------------------------------------- */
  // Mark the nav link for the current page. Done in JS so the header markup
  // is identical on every page (see partials/header.html + build.py).
  function markActiveNav() {
    var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    if (!page) page = "index.html";
    $all(".main-nav a").forEach(function (a) {
      var href = (a.getAttribute("href") || "").toLowerCase();
      if (href === page) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function initNav() {
    markActiveNav();
    var header = $(".site-header");
    var toggle = $(".nav-toggle");
    if (!header || !toggle) return;
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // Close the menu after tapping a link (mobile).
    $all(".main-nav a").forEach(function (a) {
      a.addEventListener("click", function () {
        header.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------------------------------------------------------------------
     4. Scroll-in reveal
     --------------------------------------------------------------------- */
  function initReveal() {
    var els = $all(".reveal");
    if (!els.length) return;

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------------------
     5. Ecosystem directory (homepage only)
     --------------------------------------------------------------------- */
  function initEcosystem() {
    var grid = $("#eco-grid");
    var filterBar = $("#eco-filter");
    if (!grid) return;

    fetchJSON("partners.json").then(function (data) {
      var categories = data.categories || [];
      var entries = data.entries || [];

      // Build filter buttons
      if (filterBar) {
        filterBar.innerHTML = "";
        categories.forEach(function (cat, i) {
          var btn = document.createElement("button");
          btn.className = "filter-btn" + (i === 0 ? " active" : "");
          btn.type = "button";
          btn.textContent = cat.label;
          btn.setAttribute("data-cat", cat.id);
          btn.addEventListener("click", function () {
            $all(".filter-btn", filterBar).forEach(function (b) { b.classList.remove("active"); });
            btn.classList.add("active");
            render(cat.id);
          });
          filterBar.appendChild(btn);
        });
      }

      function render(catId) {
        grid.innerHTML = "";
        entries
          .filter(function (e) { return catId === "all" || e.category === catId; })
          .forEach(function (e) {
            var card = document.createElement("article");
            card.className = "card eco-card reveal in";
            var catLabel = (categories.filter(function (c) { return c.id === e.category; })[0] || {}).label || e.category;
            card.innerHTML =
              '<span class="eco-tag"></span>' +
              '<h3></h3>' +
              '<span class="eco-meta"></span>' +
              '<p></p>';
            card.querySelector(".eco-tag").textContent = e.tag || catLabel;
            card.querySelector("h3").textContent = e.name || "";
            card.querySelector(".eco-meta").textContent = [catLabel, e.region].filter(Boolean).join(" · ");
            card.querySelector("p").textContent = e.description || "";
            grid.appendChild(card);
          });

        if (!grid.children.length) {
          grid.innerHTML = '<p class="lead">No entries in this category yet.</p>';
        }
      }

      render("all");
    }).catch(function (err) {
      grid.innerHTML = '<p class="lead">Ecosystem data could not be loaded.</p>';
      console.warn("[KBKx]", err.message);
    });
  }

  /* ---------------------------------------------------------------------
     6. Lead forms
     --------------------------------------------------------------------- */
  function initForms() {
    var forms = $all("form[data-lead-form]");
    if (!forms.length) return;

    forms.forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var status = form.querySelector(".form-status");

        // Honeypot: real users never see or fill this field. If it has a
        // value, it's almost certainly a bot — silently drop the submission.
        var hp = form.querySelector('input[name="_hp"]');
        if (hp && hp.value) return;

        // Native validation first (covers required fields + consent checkbox).
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        var mode = (siteConfig && siteConfig.formMode) || "mailto";
        var routing = (siteConfig && siteConfig.leadRouting) || {};
        // Which mailbox? Driven by the form's data attribute -> config key.
        var routeKey = form.getAttribute("data-route") || "generalEmail";
        var target = routing[routeKey] || routing.generalEmail || "hello@example.com";

        var payload = serializeForm(form);

        if (mode === "api" && siteConfig && siteConfig.apiEndpoint) {
          submitToApi(form, status, payload);
        } else {
          submitViaMailto(form, target, payload);
          setStatus(status, "success",
            "Opening your email client… If nothing happens, email us at " + target + ".");
        }
      });
    });
  }

  // Collect readable label/value pairs; checkboxes grouped by name.
  function serializeForm(form) {
    var fields = [];
    var checkboxGroups = {};

    $all("input, select, textarea", form).forEach(function (el) {
      if (!el.name || el.type === "submit") return;
      // Skip internal fields (honeypot, etc.) — names prefixed with "_".
      if (el.name.charAt(0) === "_") return;
      var label = labelFor(el, form);

      if (el.type === "checkbox") {
        if (el.checked) {
          checkboxGroups[el.name] = checkboxGroups[el.name] || { label: label, values: [] };
          checkboxGroups[el.name].values.push(el.value);
        }
        return;
      }
      if (el.value) fields.push({ label: label, value: el.value });
    });

    Object.keys(checkboxGroups).forEach(function (name) {
      var g = checkboxGroups[name];
      fields.push({ label: g.label, value: g.values.join(", ") });
    });

    return fields;
  }

  function labelFor(el, form) {
    // Prefer an associated <label>, then a group heading, then the field name.
    if (el.id) {
      var lbl = form.querySelector('label[for="' + el.id + '"]');
      if (lbl) return lbl.textContent.replace(/\*|\(.*?\)/g, "").trim();
    }
    var group = el.closest("[data-group-label]");
    if (group) return group.getAttribute("data-group-label");
    return el.name;
  }

  function submitViaMailto(form, target, fields) {
    var subject = form.getAttribute("data-subject") || "KBKx enquiry";
    var body = fields.map(function (f) { return f.label + ": " + f.value; }).join("\n");
    var href = "mailto:" + encodeURIComponent(target) +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);
    window.location.href = href;
  }

  function submitToApi(form, status, fields) {
    setStatus(status, "", "Sending…");
    var obj = {};
    fields.forEach(function (f) { obj[f.label] = f.value; });
    fetch(siteConfig.apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ form: form.getAttribute("data-route"), fields: obj })
    }).then(function (r) {
      if (!r.ok) throw new Error("Request failed (" + r.status + ")");
      setStatus(status, "success", "Thank you — we have received your details and will be in touch.");
      form.reset();
    }).catch(function (err) {
      setStatus(status, "error", "Something went wrong. Please email us directly. (" + err.message + ")");
    });
  }

  function setStatus(el, kind, msg) {
    if (!el) return;
    el.className = "form-status" + (kind ? " " + kind : "");
    el.textContent = msg;
  }

  /* ---------------------------------------------------------------------
     7. Inline SVG icons
     --------------------------------------------------------------------- */
  // Stroke-based line icons (24x24, currentColor). Add an element with
  // data-icon="key" and its glyph is injected here. Purely decorative.
  var ICON_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ' +
    'width="24" height="24" aria-hidden="true" focusable="false"';

  var ICON_PATHS = {
    hotel: '<path d="M3 21h18"/><path d="M5 21V5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v16"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>',
    box: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5l8 4.5 8-4.5"/><path d="M12 12v9"/>',
    plug: '<path d="M9 2v6M15 2v6"/><path d="M7 8h10v3a5 5 0 0 1-10 0V8z"/><path d="M12 16v6"/>',
    handshake: '<path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1"/><circle cx="9.5" cy="8" r="3"/><path d="M21 19v-1a4 4 0 0 0-3-3.87"/><path d="M15.5 5.13A3 3 0 0 1 15.5 11"/>',
    japan: '<path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>',
    lifebuoy: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M5.6 5.6l3.3 3.3M15.1 15.1l3.3 3.3M18.4 5.6l-3.3 3.3M8.9 15.1l-3.3 3.3"/>',
    sliders: '<path d="M4 8h9M17 8h3M4 16h3M11 16h9"/><circle cx="15" cy="8" r="2"/><circle cx="9" cy="16" r="2"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
    calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
    rocket: '<path d="M12 3c3 1 5 4 5 8l-2 4H9l-2-4c0-4 2-7 5-8z"/><circle cx="12" cy="9" r="1.6"/><path d="M9 15l-2 4M15 15l2 4"/>',
    chart: '<path d="M3 21h18"/><path d="M6 18v-6M11 18V7M16 18v-3"/>',
    sparkle: '<path d="M12 3l1.7 4.6L18.3 9l-4.6 1.7L12 15l-1.7-4.3L5.7 9l4.6-1.4L12 3z"/><path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    link: '<path d="M9 15l6-6"/><path d="M10.5 6.5L12 5a4 4 0 0 1 5.7 5.7L15 13"/><path d="M13.5 17.5L12 19a4 4 0 0 1-5.7-5.7L9 11"/>',
    building: '<path d="M3 21h18"/><path d="M5 21V8l6-4v17"/><path d="M11 21V10l8 3v8"/><path d="M7.5 9h1M7.5 13h1M7.5 17h1M14.5 14h1M14.5 17h1"/>',
    growth: '<path d="M3 17l6-6 4 4 8-8"/><path d="M21 7h-5M21 7v5"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
    antenna: '<path d="M12 12v9M8 21h8"/><path d="M5 8a7 7 0 0 1 14 0M8 10a4 4 0 0 1 8 0"/><circle cx="12" cy="12" r="1.5"/>',
    puzzle: '<path d="M9 5a1.6 1.6 0 0 1 3.2 0c0 .9.6 1.1 1.1 1.1H15a1 1 0 0 1 1 1v1.7c0 .5.2 1.1 1.1 1.1a1.6 1.6 0 0 1 0 3.2c-.9 0-1.1.6-1.1 1.1V17a1 1 0 0 1-1 1h-1.7c-.5 0-1.1.2-1.1 1.1a1.6 1.6 0 0 1-3.2 0c0-.9-.6-1.1-1.1-1.1H5a1 1 0 0 1-1-1v-1.7c0-.5-.2-1.1-1.1-1.1a1.6 1.6 0 0 1 0-3.2c.9 0 1.1-.6 1.1-1.1V7a1 1 0 0 1 1-1h1.9c.5 0 1.1-.2 1.1-1z"/>',
    shield: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>'
  };

  function initIcons() {
    $all("[data-icon]").forEach(function (el) {
      var key = el.getAttribute("data-icon");
      var paths = ICON_PATHS[key];
      if (paths) el.innerHTML = "<svg " + ICON_ATTRS + ">" + paths + "</svg>";
    });
  }

  /* ---------------------------------------------------------------------
     8. Cookie / analytics consent
     --------------------------------------------------------------------- */
  var CONSENT_KEY = "kbkx-cookie-consent";

  // Placeholder analytics loader. It only runs AFTER the user opts in.
  // Drop your real analytics snippet inside this function.
  function loadAnalytics() {
    if (window.__kbkxAnalyticsLoaded) return;
    window.__kbkxAnalyticsLoaded = true;
    // e.g. inject a <script> tag for your analytics provider here.
    console.info("[KBKx] Analytics consent granted — load analytics here.");
  }

  function initCookieBanner() {
    var choice = null;
    try { choice = localStorage.getItem(CONSENT_KEY); } catch (e) {}
    if (choice === "accepted") { loadAnalytics(); return; }
    if (choice === "declined") { return; }

    // Build the banner. Text uses data-i18n so the later setLang() pass fills it.
    var bar = document.createElement("div");
    bar.className = "cookie-bar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Cookie consent");
    bar.innerHTML =
      '<p class="cookie-text" data-i18n="cookie.text">We use optional analytics cookies to understand how the site is used. You can accept or decline.</p>' +
      '<div class="cookie-actions">' +
      '<button type="button" class="btn btn-secondary" data-cookie="decline" data-i18n="cookie.decline">Decline</button>' +
      '<button type="button" class="btn btn-primary" data-cookie="accept" data-i18n="cookie.accept">Accept</button>' +
      "</div>";

    function close(value) {
      try { localStorage.setItem(CONSENT_KEY, value); } catch (e) {}
      if (value === "accepted") loadAnalytics();
      bar.parentNode && bar.parentNode.removeChild(bar);
    }
    bar.querySelector('[data-cookie="accept"]').addEventListener("click", function () { close("accepted"); });
    bar.querySelector('[data-cookie="decline"]').addEventListener("click", function () { close("declined"); });

    document.body.appendChild(bar);
  }

  /* ---------------------------------------------------------------------
     Boot
     --------------------------------------------------------------------- */
  function boot() {
    buildLangSelector();
    initCookieBanner();      // build banner first so setLang() can translate it
    setLang(getLang());
    initNav();
    initReveal();
    initIcons();
    initEcosystem();
    initForms();
    loadConfig().then(applyConfig);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
