(function () {
  var STORAGE_KEY = "gcpc-lang";
  var html = document.documentElement;

  function getLang() {
    var params = new URLSearchParams(window.location.search);
    if (params.get("lang") === "en" || params.get("lang") === "ko") {
      return params.get("lang");
    }
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "ko") return stored;
    } catch (e) {
      /* ignore */
    }
    return "ko";
  }

  function localHref(href, lang) {
    if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("#")) {
      return href;
    }
    var next = new URL(href, window.location.href);
    next.searchParams.set("lang", lang);
    var season = window.GCPCSeason && window.GCPCSeason.requested();
    if (season) next.searchParams.set("season", season);
    else next.searchParams.delete("season");
    var file = next.pathname.split("/").pop() || "index.html";
    return file + next.search + next.hash;
  }

  function applySeasonLabels(lang) {
    if (!window.GCPCSeason) return;
    var season = html.getAttribute("data-season") || window.GCPCSeason.current();
    var names = window.GCPCSeason.names[season];
    var alts = window.GCPCSeason.alts[season];
    var src = window.GCPCSeason.src(season);
    document.querySelectorAll(".hero-art, .season-band").forEach(function (el) {
      el.style.backgroundImage = "url(\"" + src + "\")";
    });
    document.querySelectorAll("[data-season-name]").forEach(function (el) {
      if (names) el.textContent = names[lang] || names.ko;
    });
    document.querySelectorAll("[data-season-alt]").forEach(function (el) {
      if (!alts) return;
      el.setAttribute("aria-label", lang === "en" ? alts.en : alts.ko);
    });
  }

  function setLang(lang) {
    html.lang = lang === "en" ? "en" : "ko";
    html.setAttribute("data-lang", html.lang);
    document.querySelectorAll("[data-lang]").forEach(function (el) {
      if (el === html) return;
      var match = el.getAttribute("data-lang") === html.lang;
      el.hidden = !match;
    });
    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      btn.setAttribute(
        "aria-pressed",
        btn.getAttribute("data-set-lang") === html.lang ? "true" : "false"
      );
    });
    try {
      localStorage.setItem(STORAGE_KEY, html.lang);
    } catch (e) {
      /* ignore */
    }
    var url = new URL(window.location.href);
    url.searchParams.set("lang", html.lang);
    window.history.replaceState({}, "", url);
    document.querySelectorAll("a[href]").forEach(function (link) {
      var href = link.getAttribute("href");
      if (!href) return;
      if (!/\.html($|\?|#)/.test(href) && href !== "./" && href !== "index.html") return;
      link.setAttribute("href", localHref(href, html.lang));
    });
    applySeasonLabels(html.lang);
  }

  function closeNav() {
    var toggle = document.querySelector(".nav-toggle");
    var panel = document.getElementById("site-nav");
    if (!toggle || !panel) return;
    toggle.setAttribute("aria-expanded", "false");
    panel.classList.remove("is-open");
    document.body.classList.remove("nav-open");
  }

  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var panel = document.getElementById("site-nav");
    if (!toggle || !panel) return;
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", open ? "false" : "true");
      panel.classList.toggle("is-open", !open);
      document.body.classList.toggle("nav-open", !open);
    });
    panel.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeNav);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeNav();
    });
  }

  function initLang() {
    document.querySelectorAll("[data-set-lang]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setLang(btn.getAttribute("data-set-lang"));
      });
    });
    setLang(getLang());
  }

  function formatDate(iso, lang) {
    var parts = iso.split("-");
    var y = parts[0];
    var m = parseInt(parts[1], 10);
    var d = parseInt(parts[2], 10);
    if (lang === "en") {
      var months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      return months[m - 1] + " " + d + ", " + y;
    }
    return y + "년 " + m + "월 " + d + "일";
  }

  function renderSermons() {
    var list = document.getElementById("sermon-list");
    if (!list || !window.GCPC) return;
    var lang = html.getAttribute("data-lang") || "ko";
    list.innerHTML = window.GCPC.sermons
      .map(function (sermon) {
        var kind = lang === "en" ? sermon.kindEn : sermon.kindKo;
        var date = formatDate(sermon.date, lang);
        var scripture = sermon.scripture
          ? '<p class="sermon-scripture">' + sermon.scripture + "</p>"
          : "";
        return (
          '<article class="sermon-card">' +
          '<a class="sermon-thumb" href="https://www.youtube.com/watch?v=' +
          sermon.id +
          '" rel="noopener noreferrer">' +
          '<img src="https://i.ytimg.com/vi/' +
          sermon.id +
          '/hqdefault.jpg" alt="" width="480" height="360" loading="lazy">' +
          "</a>" +
          '<div class="sermon-body">' +
          '<p class="sermon-meta">' +
          date +
          " · " +
          kind +
          "</p>" +
          "<h3>" +
          '<a href="https://www.youtube.com/watch?v=' +
          sermon.id +
          '" rel="noopener noreferrer">' +
          sermon.title +
          "</a></h3>" +
          scripture +
          "</div></article>"
        );
      })
      .join("");
  }

  function initContactForm() {
    var form = document.getElementById("contact-form");
    if (!form || !window.GCPC) return;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var name = (form.elements.namedItem("name") || {}).value || "";
      var from = (form.elements.namedItem("email") || {}).value || "";
      var message = (form.elements.namedItem("message") || {}).value || "";
      var lang = html.getAttribute("data-lang") || "ko";
      var subject =
        lang === "en"
          ? "Website inquiry — " + window.GCPC.koreanName
          : "홈페이지 문의 — " + window.GCPC.koreanName;
      var body =
        (lang === "en" ? "Name: " : "이름: ") +
        name +
        "\n" +
        (lang === "en" ? "Email: " : "이메일: ") +
        from +
        "\n\n" +
        message;
      window.location.href =
        "mailto:" +
        window.GCPC.email +
        "?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(body);
    });
  }

  function initYear() {
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initLang();
    renderSermons();
    initContactForm();
    initYear();
  });

  document.addEventListener("click", function (event) {
    if (event.target.closest("[data-set-lang]")) {
      window.setTimeout(renderSermons, 0);
    }
  });
})();
