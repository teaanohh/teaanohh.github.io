/* Level Select: the stepped selection cursor, the case-study stage
   tracker, and the pixel wipe that is the change between any two pages of
   the site, in every browser. No library. */
(function () {
  "use strict";

  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduce = motionQuery.matches;
  var WIPE_KEY = "level-select-wipe";
  var WIPE_CLOSE_MS = 350;
  var WIPE_OPEN_MS = 340;
  var WIPE_STALE_MS = 5000;
  var wiping = false;
  var staleTimer = 0;

  function each(selector, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(selector), fn);
  }

  function storage(action, value) {
    try {
      if (action === "set") {
        sessionStorage.setItem(WIPE_KEY, value);
      } else {
        var v = sessionStorage.getItem(WIPE_KEY);
        sessionStorage.removeItem(WIPE_KEY);
        return v;
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  /* ---------- Selection cursor ---------- */
  function initSelect(grid) {
    var tiles = Array.prototype.slice.call(grid.querySelectorAll(".tile"));
    if (!tiles.length) return;
    var cursor = document.createElement("div");
    cursor.className = "cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML =
      '<span class="c tl"></span><span class="c tr"></span>' +
      '<span class="c bl"></span><span class="c br"></span><span class="arrow"></span>';
    grid.appendChild(cursor);

    var parts = {};
    ["tl", "tr", "bl", "br", "arrow"].forEach(function (k) {
      parts[k] = cursor.querySelector("." + k);
    });
    var active = null;

    function move(el, x, y) {
      el.style.transform =
        "translate(" + Math.round(x) + "px," + Math.round(y) + "px)";
    }

    function place(tile, instant) {
      var first = !cursor.classList.contains("on");
      if (instant || first) cursor.classList.add("no-anim");
      var x = tile.offsetLeft,
        y = tile.offsetTop,
        w = tile.offsetWidth,
        h = tile.offsetHeight;
      var o = 12,
        s = 20;
      move(parts.tl, x - o, y - o);
      move(parts.tr, x + w + o - s, y - o);
      move(parts.bl, x - o, y + h + o - s);
      move(parts.br, x + w + o - s, y + h + o - s);
      move(parts.arrow, x + 18, y - o - 24);
      active = tile;
      tiles.forEach(function (t) {
        t.classList.toggle("is-selected", t === tile);
      });
      cursor.classList.add("on");
      if (instant || first) {
        void cursor.offsetWidth;
        cursor.classList.remove("no-anim");
      }
    }

    function hide() {
      if (grid.contains(document.activeElement)) return;
      cursor.classList.remove("on");
      tiles.forEach(function (t) {
        t.classList.remove("is-selected");
      });
      active = null;
    }

    tiles.forEach(function (tile) {
      tile.addEventListener("pointerenter", function (e) {
        if (e.pointerType === "mouse" || e.pointerType === "pen") place(tile);
      });
      tile.addEventListener("focus", function () {
        place(tile);
      });
    });
    grid.addEventListener("pointerleave", function () {
      var focused = document.activeElement;
      if (tiles.indexOf(focused) > -1) place(focused);
      else hide();
    });
    grid.addEventListener("focusout", function (e) {
      if (!grid.contains(e.relatedTarget)) hide();
    });

    /* Arrow keys move between tiles by position, on top of Tab. */
    grid.addEventListener("keydown", function (e) {
      var dirs = {
        ArrowRight: [1, 0],
        ArrowLeft: [-1, 0],
        ArrowDown: [0, 1],
        ArrowUp: [0, -1],
      };
      var d = dirs[e.key];
      var from = document.activeElement;
      if (!d || tiles.indexOf(from) < 0) return;
      var a = from.getBoundingClientRect();
      var ax = a.left + a.width / 2,
        ay = a.top + a.height / 2;
      var best = null,
        bestScore = Infinity;
      tiles.forEach(function (t) {
        if (t === from) return;
        var b = t.getBoundingClientRect();
        var dx = b.left + b.width / 2 - ax,
          dy = b.top + b.height / 2 - ay;
        var along = dx * d[0] + dy * d[1];
        if (along <= 1) return;
        var across = Math.abs(dx * d[1]) + Math.abs(dy * d[0]);
        var score = along + across * 2;
        if (score < bestScore) {
          bestScore = score;
          best = t;
        }
      });
      if (best) {
        e.preventDefault();
        best.focus();
      }
    });

    window.addEventListener("resize", function () {
      if (active) place(active, true);
    });
  }

  /* ---------- Case study: the current stage ---------- */
  function initStages() {
    var links = Array.prototype.slice.call(
      document.querySelectorAll(".stages a"),
    );
    if (!links.length || !("IntersectionObserver" in window)) return;
    var byId = {};
    links.forEach(function (l) {
      byId[l.getAttribute("href").slice(1)] = l;
    });
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (l) {
            var on = l === byId[entry.target.id];
            l.classList.toggle("is-current", on);
            if (on) l.setAttribute("aria-current", "step");
            else l.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-35% 0px -60% 0px" },
    );
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  /* ---------- The pixel wipe between pages ---------- */
  function buildWipe(label, state) {
    var cols = window.innerWidth < 640 ? 6 : 12;
    var rows = Math.max(
      4,
      Math.ceil((cols * window.innerHeight) / window.innerWidth),
    );
    var wipe = document.createElement("div");
    wipe.className = "wipe " + state;
    wipe.setAttribute("aria-hidden", "true");
    wipe.style.setProperty("--cols", cols);
    wipe.style.setProperty("--rows", rows);
    var span = rows + cols - 2;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var b = document.createElement("span");
        b.className = (r + c) % 2 ? "b alt" : "b";
        b.style.setProperty("--d", ((r + c) / span).toFixed(3));
        wipe.appendChild(b);
      }
    }
    var text = document.createElement("p");
    text.className = "wipe-label";
    text.textContent = "Loading: " + label;
    wipe.appendChild(text);
    (document.body || document.documentElement).appendChild(wipe);
    return wipe;
  }

  function removeWipes() {
    each(".wipe", function (w) {
      w.remove();
    });
  }

  /* The label of the wipe that closed the page just left, if this load is
     the page that wipe was going to (not a reload, a history move or a later
     visit). */
  function arrivedLabel() {
    var saved;
    try {
      saved = JSON.parse(storage("take") || "null");
    } catch (e) {
      return null;
    }
    if (!saved || typeof saved.label !== "string") return null;
    var fresh = Date.now() - saved.at < WIPE_STALE_MS;
    var here = saved.path === location.pathname;
    return fresh && here ? saved.label : null;
  }

  function skipsWipe(link, e) {
    return (
      reduce ||
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      link.hasAttribute("download") ||
      (link.target && link.target !== "_self") ||
      link.origin !== location.origin ||
      (link.pathname === location.pathname && link.search === location.search)
    );
  }

  /* This script runs from the head, before the body is parsed, so a page
     arrived at through a wipe is covered before any of it can paint. */
  function coverArrival() {
    var label = arrivedLabel();
    return !reduce && label ? buildWipe(label, "covered") : null;
  }

  /* Once the page is parsed, the cover opens on it. */
  function openArrival(cover) {
    if (!cover) return;
    cover.classList.remove("covered");
    cover.classList.add("opening");
    requestAnimationFrame(function () {
      setTimeout(function () {
        cover.remove();
      }, WIPE_OPEN_MS);
    });
  }

  function initWipe() {
    each("a[data-wipe]", function (link) {
      link.addEventListener("click", function (e) {
        if (wiping) {
          e.preventDefault();
          return;
        }
        if (skipsWipe(link, e)) return;
        e.preventDefault();
        wiping = true;
        var href = link.href;
        var label = link.getAttribute("data-wipe");
        buildWipe(label, "closing");
        storage(
          "set",
          JSON.stringify({ label: label, path: link.pathname, at: Date.now() }),
        );
        setTimeout(function () {
          window.location.href = href;
        }, WIPE_CLOSE_MS);
        /* A navigation the visitor stops must not leave the page covered. */
        staleTimer = setTimeout(function () {
          removeWipes();
          wiping = false;
        }, WIPE_STALE_MS);
      });
    });
  }

  /* Pages restored from the back-forward cache must not keep a wipe. */
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    clearTimeout(staleTimer);
    removeWipes();
    wiping = false;
  });

  motionQuery.addEventListener("change", function (e) {
    reduce = e.matches;
  });

  var arrival = coverArrival();

  function boot() {
    var year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());

    each("[data-select]", initSelect);
    initStages();
    initWipe();
    openArrival(arrival);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
