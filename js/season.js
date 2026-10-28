/**
 * Seasonal watercolor hero.
 * Home: slow elegant cycle spring → summer → autumn → winter.
 * Pin a season with ?season=spring|summer|autumn|winter (no cycle).
 * Inner pages follow the pin, or the calendar season.
 * Image URLs resolve from this script so both the custom domain root
 * (gcpcseattle.org) and the project path /gcpc-seattle/ work.
 */
(function () {
  var ORDER = ["spring", "summer", "autumn", "winter"];
  var DWELL_MS = 8000;
  var FADE_MS = 2400;
  var NAMES = {
    spring: { ko: "봄", en: "Spring" },
    summer: { ko: "여름", en: "Summer" },
    autumn: { ko: "가을", en: "Autumn" },
    winter: { ko: "겨울", en: "Winter" },
  };
  var ALTS = {
    spring: {
      ko: "수채화: 시애틀 봄, 화사한 벚꽃",
      en: "Watercolor of a sunny Seattle spring with cherry blossoms",
    },
    summer: {
      ko: "수채화: 시애틀 여름, 수국과 장미",
      en: "Watercolor of a sunny Seattle summer garden with hydrangeas and roses",
    },
    autumn: {
      ko: "수채화: 시애틀 가을, 국화와 복숭아빛 장미",
      en: "Watercolor of a warm Seattle autumn garden with chrysanthemums and peaches",
    },
    winter: {
      ko: "수채화: 시애틀 겨울, 동백과 겨울 꽃",
      en: "Watercolor of a light Seattle winter garden with camellias and winter blossom",
    },
  };

  function fromMonth(month) {
    if (month >= 3 && month <= 5) return "spring";
    if (month >= 6 && month <= 8) return "summer";
    if (month >= 9 && month <= 11) return "autumn";
    return "winter";
  }

  function requested() {
    try {
      var q = new URLSearchParams(window.location.search).get("season");
      if (q && NAMES[q]) return q;
    } catch (e) {
      /* ignore */
    }
    return "";
  }

  function calendarSeason() {
    return fromMonth(new Date().getMonth() + 1);
  }

  function current() {
    return (
      requested() ||
      document.documentElement.getAttribute("data-season") ||
      calendarSeason()
    );
  }

  function assetRoot() {
    var scripts = document.getElementsByTagName("script");
    var i;
    var src;
    for (i = 0; i < scripts.length; i++) {
      src = scripts[i].src || "";
      if (src.indexOf("season.js") !== -1) {
        return src.replace(/[#?].*$/, "").replace(/js\/season\.js$/, "");
      }
    }
    var path = window.location.pathname || "/";
    if (/\.html?$/.test(path)) {
      return path.replace(/[^/]+$/, "");
    }
    return path.slice(-1) === "/" ? path : path + "/";
  }

  function src(name) {
    return assetRoot() + "img/seasons/" + (name || current()) + ".jpg";
  }

  function lang() {
    return document.documentElement.getAttribute("data-lang") || "ko";
  }

  function applyLabels(name) {
    var L = lang();
    var names = NAMES[name];
    var alts = ALTS[name];
    document.querySelectorAll("[data-season-name]").forEach(function (el) {
      if (names) el.textContent = names[L] || names.ko;
    });
    document.querySelectorAll("[data-season-alt]").forEach(function (el) {
      if (!alts) return;
      el.setAttribute("aria-label", L === "en" ? alts.en : alts.ko);
      if (el.tagName === "P" || el.tagName === "SPAN") {
        el.textContent = L === "en" ? alts.en : alts.ko;
      }
    });
  }

  function applyBand(name) {
    var url = 'url("' + src(name) + '")';
    document.querySelectorAll(".season-band").forEach(function (el) {
      el.style.backgroundImage = url;
    });
  }

  function setSeason(name) {
    if (!NAMES[name]) return;
    document.documentElement.setAttribute("data-season", name);
    applyBand(name);
    applyLabels(name);
  }

  function preload() {
    ORDER.forEach(function (name) {
      var img = new Image();
      img.src = src(name);
    });
  }

  function reducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  var start = requested() || calendarSeason();
  document.documentElement.setAttribute("data-season", start);

  function initHeroCycle() {
    if (initHeroCycle.started) return;
    initHeroCycle.started = true;
    var pinned = requested();
    var layers = document.querySelectorAll("[data-season-layer]");
    var home = document.body && document.body.getAttribute("data-page") === "home";

    setSeason(start);

    if (!home || layers.length < 2) {
      document.querySelectorAll(".hero-art").forEach(function (el) {
        el.style.backgroundImage = 'url("' + src(start) + '")';
        el.classList.add("is-active");
      });
      return;
    }

    preload();
    layers[0].style.backgroundImage = 'url("' + src(start) + '")';
    layers[0].classList.add("is-active");
    layers[1].classList.remove("is-active");

    if (pinned) {
      layers[1].style.backgroundImage = 'url("' + src(start) + '")';
      return;
    }

    var index = ORDER.indexOf(start);
    if (index < 0) index = 0;
    var showing = 0;

    function next() {
      index = (index + 1) % ORDER.length;
      var name = ORDER[index];
      var incoming = layers[1 - showing];
      var outgoing = layers[showing];
      incoming.style.backgroundImage = 'url("' + src(name) + '")';
      incoming.classList.add("is-active");
      outgoing.classList.remove("is-active");
      showing = 1 - showing;
      setSeason(name);
    }

    var gap = DWELL_MS + (reducedMotion() ? 0 : FADE_MS);
    function loop() {
      window.setTimeout(function () {
        next();
        loop();
      }, gap);
    }
    loop();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHeroCycle);
  } else {
    initHeroCycle();
  }

  window.GCPCSeason = {
    current: current,
    requested: requested,
    names: NAMES,
    alts: ALTS,
    order: ORDER,
    src: src,
    refresh: function () {
      applyLabels(current());
      applyBand(current());
    },
  };
})();
