/**
 * Seasonal watercolor hero. Meteorological seasons, northern hemisphere.
 * Preview: add ?season=spring|summer|autumn|winter
 */
(function () {
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

  function current() {
    return requested() || fromMonth(new Date().getMonth() + 1);
  }

  var season = current();
  document.documentElement.setAttribute("data-season", season);

  window.GCPCSeason = {
    current: current,
    requested: requested,
    names: NAMES,
    alts: ALTS,
    src: function (name) {
      return "img/seasons/" + (name || season) + ".jpg";
    },
  };
})();
