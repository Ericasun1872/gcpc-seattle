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
    if (file === "notices.html") {
      var category = window.GCPCNoticeFilter;
      if (category && category !== "all") next.searchParams.set("category", category);
      else next.searchParams.delete("category");
    }
    return file + next.search + next.hash;
  }

  function applySeasonLabels() {
    if (window.GCPCSeason && typeof window.GCPCSeason.refresh === "function") {
      window.GCPCSeason.refresh();
    }
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
    applySeasonLabels();
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

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatBody(text) {
    return escapeHtml(text).replace(/\r\n|\r|\n/g, "<br>");
  }

  function safeHttpUrl(url) {
    if (!url) return "";
    try {
      var parsed = new URL(String(url), window.location.href);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.href;
      }
    } catch (e) {
      /* ignore */
    }
    return "";
  }

  var NOTICE_CATEGORIES = {
    notice: { ko: "공지", en: "Notice" },
    bulletin: { ko: "주보", en: "Bulletin" },
    event: { ko: "행사", en: "Event" },
  };

  function normalizeCategory(value) {
    var key = String(value || "")
      .trim()
      .toLowerCase();
    if (key === "공지") return "notice";
    if (key === "주보") return "bulletin";
    if (key === "행사" || key === "events") return "event";
    if (key === "notices" || key === "announcement") return "notice";
    if (key === "bulletins" || key === "주보pdf") return "bulletin";
    return NOTICE_CATEGORIES[key] ? key : "notice";
  }

  function requestedNoticeFilter() {
    var params = new URLSearchParams(window.location.search);
    var raw = params.get("category");
    if (!raw || raw === "all") return "all";
    return normalizeCategory(raw);
  }

  function emptyNoticesHtml(lang, filter) {
    var labels = NOTICE_CATEGORIES[filter];
    if (lang === "en") {
      return (
        '<div class="notice-empty card">' +
        "<h2>" +
        (labels ? "No " + labels.en.toLowerCase() + "s yet" : "No posts yet") +
        "</h2>" +
        "<p>This board is for pastor and admin " +
        (labels ? labels.en.toLowerCase() + "s" : "notices, bulletins, and events") +
        " only. When there is a real post, a volunteer adds it to <code>data/notices.json</code> (category: notice, bulletin, or event) and deletes the sample card.</p>" +
        "</div>"
      );
    }
    return (
      '<div class="notice-empty card">' +
      "<h2>" +
      (labels ? "아직 올라온 " + labels.ko + "가 없습니다" : "아직 올라온 글이 없습니다") +
      "</h2>" +
      "<p>이곳은 목사님·담당자 " +
      (labels ? labels.ko : "공지·주보·행사") +
      "란입니다. 실제 글이 있으면 <code>data/notices.json</code>에 category를 notice / bulletin / event로 넣고 샘플을 지우면 됩니다.</p>" +
      "</div>"
    );
  }

  function noticeCardHtml(notice, lang) {
    var title = lang === "en" ? notice.titleEn || notice.titleKo : notice.titleKo || notice.titleEn;
    var body = lang === "en" ? notice.bodyEn || notice.bodyKo : notice.bodyKo || notice.bodyEn;
    var date = notice.date ? formatDate(notice.date, lang) : "";
    var sample = !!notice.sample;
    var category = normalizeCategory(notice.category);
    var categoryLabel = NOTICE_CATEGORIES[category][lang] || NOTICE_CATEGORIES[category].ko;
    var badge = sample
      ? lang === "en"
        ? '<p class="notice-badge">Sample — not church news</p>'
        : '<p class="notice-badge">샘플 — 교회 소식이 아닙니다</p>'
      : "";
    var meta = '<p class="notice-meta"><span class="notice-kind">' +
      escapeHtml(categoryLabel) +
      "</span>" +
      (date ? " · " + escapeHtml(date) : "") +
      (sample ? (lang === "en" ? " · How-to" : " · 안내") : "") +
      "</p>";
    var link = safeHttpUrl(notice.link);
    var linkLabel =
      lang === "en"
        ? notice.linkLabelEn || notice.linkLabelKo || "Open link"
        : notice.linkLabelKo || notice.linkLabelEn || "링크 열기";
    var linkHtml = link
      ? '<p class="notice-link"><a class="btn btn-ghost" href="' +
        escapeHtml(link) +
        '" rel="noopener noreferrer">' +
        escapeHtml(linkLabel) +
        "</a></p>"
      : "";
    return (
      '<article class="notice-card' +
      (sample ? " notice-card-sample" : "") +
      '">' +
      badge +
      meta +
      "<h2>" +
      escapeHtml(title) +
      "</h2>" +
      '<div class="notice-body">' +
      formatBody(body) +
      "</div>" +
      linkHtml +
      "</article>"
    );
  }

  function sortNotices(notices) {
    return notices.slice().sort(function (a, b) {
      if (!!a.sample !== !!b.sample) return a.sample ? 1 : -1;
      return String(b.date || "").localeCompare(String(a.date || ""));
    });
  }

  function syncNoticeFilterButtons() {
    var filter = window.GCPCNoticeFilter || "all";
    document.querySelectorAll("[data-notice-filter]").forEach(function (btn) {
      btn.setAttribute(
        "aria-pressed",
        btn.getAttribute("data-notice-filter") === filter ? "true" : "false"
      );
    });
  }

  function setNoticeFilter(filter, pushUrl) {
    window.GCPCNoticeFilter = filter === "all" ? "all" : normalizeCategory(filter);
    syncNoticeFilterButtons();
    if (pushUrl !== false && document.getElementById("notice-list")) {
      var url = new URL(window.location.href);
      if (window.GCPCNoticeFilter === "all") url.searchParams.delete("category");
      else url.searchParams.set("category", window.GCPCNoticeFilter);
      window.history.replaceState({}, "", url);
    }
    paintNotices();
  }

  function paintNotices() {
    var list = document.getElementById("notice-list");
    if (!list) return;
    var lang = html.getAttribute("data-lang") || "ko";
    var filter = window.GCPCNoticeFilter || "all";
    var notices = window.GCPCNotices;
    syncNoticeFilterButtons();
    if (!Array.isArray(notices)) {
      list.innerHTML =
        lang === "en"
          ? '<p class="note">Loading notices…</p>'
          : '<p class="note">소식을 불러오는 중입니다…</p>';
      return;
    }
    var visible =
      filter === "all"
        ? notices
        : notices.filter(function (notice) {
            return normalizeCategory(notice.category) === filter;
          });
    if (!visible.length) {
      list.innerHTML = emptyNoticesHtml(lang, filter);
      return;
    }
    list.innerHTML = sortNotices(visible)
      .map(function (notice) {
        return noticeCardHtml(notice, lang);
      })
      .join("");
  }

  function initNoticeFilters() {
    var bar = document.getElementById("notice-filters");
    if (!bar) return;
    window.GCPCNoticeFilter = requestedNoticeFilter();
    bar.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-notice-filter]");
      if (!btn) return;
      setNoticeFilter(btn.getAttribute("data-notice-filter"));
    });
    syncNoticeFilterButtons();
  }

  function loadNotices() {
    var list = document.getElementById("notice-list");
    if (!list) return;
    if (Array.isArray(window.GCPCNotices)) {
      paintNotices();
      return;
    }
    paintNotices();
    fetch("data/notices.json", { cache: "no-cache" })
      .then(function (response) {
        if (!response.ok) throw new Error("notices");
        return response.json();
      })
      .then(function (data) {
        window.GCPCNotices = Array.isArray(data && data.notices) ? data.notices : [];
        paintNotices();
      })
      .catch(function () {
        window.GCPCNotices = [];
        paintNotices();
      });
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
    initNoticeFilters();
    renderSermons();
    loadNotices();
    initContactForm();
    initYear();
  });

  document.addEventListener("click", function (event) {
    if (event.target.closest("[data-set-lang]")) {
      window.setTimeout(function () {
        renderSermons();
        paintNotices();
      }, 0);
    }
  });
})();
