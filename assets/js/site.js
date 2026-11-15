/**
 * site.js — the site's behaviour (seaside.js draws the theme switch). No
 * dependencies.
 *   1. theme toggle (crossfade via the View Transitions API)
 *   2. liquid glass: each glass surface shows an aligned copy of the page
 *      wallpaper, frosted, and (in Chromium) refracted across a curved bezel;
 *      the dock refracts its live backdrop
 *   3. light: every glass rim turns its highlight toward the pointer, and
 *      lights evenly while the pointer is over its middle
 *   4. dock: a glass lens glides to the hovered item; header state on scroll
 *   5. publication panels (abstract / BibTeX), author lists, copy BibTeX
 *   6. scroll reveal
 */
(function () {
  "use strict";

  window.__siteReady = true;

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  var ua = navigator.userAgent;
  var chromium = /Chrome\/\d+/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua) &&
    window.CSS && CSS.supports("backdrop-filter", "url(#x)");

  /* 1. Theme ------------------------------------------------------------- */

  var themeColor = document.querySelector('meta[name="theme-color"]');

  function syncThemeColor() {
    if (!themeColor) return;
    themeColor.setAttribute("content", getComputedStyle(root).getPropertyValue("--bg").trim());
  }

  function setTheme(theme) {
    root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {}
    syncThemeColor();
  }

  syncThemeColor();

  var toggle = document.querySelector("[data-theme-toggle]");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      if (reduceMotion.matches) {
        setTheme(next);
      } else if (document.startViewTransition) {
        // The switch (seaside.js) animates itself through the crossfade.
        root.classList.add("is-theming");
        document.startViewTransition(function () {
          setTheme(next);
        }).finished.finally(function () {
          root.classList.remove("is-theming");
        });
      } else {
        root.classList.add("theme-fade");
        setTheme(next);
        window.setTimeout(function () {
          root.classList.remove("theme-fade");
        }, 500);
      }
    });
  }

  /* 2. Liquid glass ------------------------------------------------------ */

  var SVG_NS = "http://www.w3.org/2000/svg";
  var defs = null;

  function glassDefs() {
    if (!defs) {
      var svg = document.createElementNS(SVG_NS, "svg");
      svg.setAttribute("width", "0");
      svg.setAttribute("height", "0");
      svg.setAttribute("aria-hidden", "true");
      svg.style.cssText = "position:absolute;width:0;height:0;pointer-events:none";
      defs = document.createElementNS(SVG_NS, "defs");
      svg.appendChild(defs);
      document.body.appendChild(svg);
    }
    return defs;
  }

  // How far light is bent across the bezel, sampled for t = 0 (rim) … 1 (flat).
  // The surface is a convex squircle z = (1 - (1 - t)^4)^(1/4); the lateral shift
  // follows Snell's law for glass (n = 1.5) and is normalised to a peak of 1.
  var BEND = (function () {
    var n = 1.5, samples = [], peak = 0, i, t, z, slope, theta;
    for (i = 0; i <= 128; i++) {
      t = Math.max(i / 128, 0.01);
      z = Math.pow(1 - Math.pow(1 - t, 4), 0.25);
      slope = Math.pow(1 - t, 3) * Math.pow(1 - Math.pow(1 - t, 4), -0.75);
      theta = Math.atan(slope);
      samples[i] = z * Math.tan(theta - Math.asin(Math.sin(theta) / n));
      peak = Math.max(peak, samples[i]);
    }
    return samples.map(function (v) {
      return v / peak;
    });
  })();

  // Displacement map for a rounded rectangle. R/G: the sampling offset, pointing
  // inward across the bezel and zero where the glass is flat. B: how flat the
  // glass is (0 at the rim … 1 in the middle), used to frost only the centre.
  function displacementMap(w, h, radius, bezel) {
    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");
    var image = ctx.createImageData(w, h);
    var data = image.data;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var px = x + 0.5 - w / 2, py = y + 0.5 - h / 2;
        var qx = Math.abs(px) - (w / 2 - radius), qy = Math.abs(py) - (h / 2 - radius);
        var inside = -(Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius);
        var ox = 0, oy = 0, flat = 1;
        if (inside >= 0 && inside < bezel) {
          var t = inside / bezel;
          var m = BEND[Math.round(t * 128)];
          var nx, ny;
          if (qx > 0 && qy > 0) {
            var len = Math.hypot(qx, qy);
            nx = qx / len;
            ny = qy / len;
          } else if (qx > qy) {
            nx = 1;
            ny = 0;
          } else {
            nx = 0;
            ny = 1;
          }
          ox = -(px < 0 ? -nx : nx) * m;
          oy = -(py < 0 ? -ny : ny) * m;
          var e = Math.min(Math.max((t - 0.45) / 0.55, 0), 1);
          flat = e * e * (3 - 2 * e);
        } else if (inside < 0) {
          flat = 0;
        }
        var i = (y * w + x) * 4;
        data[i] = 128 + ox * 127;
        data[i + 1] = 128 + oy * 127;
        data[i + 2] = flat * 255;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    return canvas.toDataURL();
  }

  // The rim refracts with a little dispersion (one displacement per colour
  // channel); the flat centre shows the backdrop clear but softly frosted.
  function glassFilter(id, w, h, radius, bezel, scale, frost) {
    var filter = document.createElementNS(SVG_NS, "filter");
    filter.setAttribute("id", id);
    filter.setAttribute("x", "0");
    filter.setAttribute("y", "0");
    filter.setAttribute("width", w);
    filter.setAttribute("height", h);
    filter.setAttribute("filterUnits", "userSpaceOnUse");
    filter.setAttribute("primitiveUnits", "userSpaceOnUse");
    filter.setAttribute("color-interpolation-filters", "sRGB");
    var channel = function (key, k) {
      return '<feDisplacementMap in="SourceGraphic" in2="map" scale="' + (scale * k).toFixed(2) +
        '" xChannelSelector="R" yChannelSelector="G" result="d' + key + '"/>';
    };
    var only = function (key, row) {
      return '<feColorMatrix in="d' + key + '" type="matrix" values="' + row + '" result="' + key + '"/>';
    };
    filter.innerHTML =
      '<feImage href="' + displacementMap(w, h, radius, bezel) + '" x="0" y="0" width="' + w + '" height="' + h +
      '" preserveAspectRatio="none" result="map"/>' +
      channel("r", 1) + channel("g", 0.955) + channel("b", 0.91) +
      only("r", "1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0") +
      only("g", "0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0") +
      only("b", "0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0") +
      '<feBlend in="r" in2="g" mode="screen" result="rg"/>' +
      '<feBlend in="rg" in2="b" mode="screen" result="refracted"/>' +
      (frost > 0
        ? '<feGaussianBlur in="SourceGraphic" stdDeviation="' + frost + '" edgeMode="duplicate" result="frost"/>' +
          '<feColorMatrix in="map" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0" result="flat"/>' +
          '<feComposite in="frost" in2="flat" operator="in" result="centre"/>' +
          '<feComposite in="centre" in2="refracted" operator="over"/>'
        : "");
    glassDefs().appendChild(filter);
  }

  // Bezel width, refraction strength (px) and centre frost for each surface.
  var GLASS = {
    dock: function (w, h) { return [h * 0.46, h, 5]; },
    chip: function (w, h) { return [h * 0.42, h * 0.8, 4]; },
    card: function () { return [26, 52, 6]; },
    sheet: function () { return [26, 52, 6]; },
    image: function () { return [24, 38, 0]; }
  };
  var filters = {};
  var filterCount = 0;

  // Surfaces of the same kind and size share one filter.
  function filterFor(kind, w, h, radius) {
    var p = GLASS[kind](w, h);
    var bezel = Math.round(Math.min(p[0], w / 2, h / 2)), scale = Math.round(p[1]), frost = p[2];
    var key = [kind, w, h, radius, bezel, scale, frost].join("/");
    if (!filters[key]) {
      filters[key] = "liquid-glass-" + ++filterCount;
      glassFilter(filters[key], w, h, radius, bezel, scale, frost);
    }
    return filters[key];
  }

  // Glass surfaces show an aligned copy of the page wallpaper (.glass__surface).
  // The dock refracts its live backdrop instead: content scrolls beneath it.
  var surfaces = [];

  function documentOffset(el) {
    // Layout position, ignoring transforms (reveal and entrance animations).
    var x = 0, y = 0;
    for (var node = el; node; node = node.offsetParent) {
      x += node.offsetLeft;
      y += node.offsetTop;
    }
    return [x, y];
  }

  function syncSurfaces() {
    var width = root.clientWidth;
    var wallWidth = Math.max(width, 1200);
    root.style.setProperty("--wall-w", wallWidth + "px");
    root.style.setProperty("--wall-x", Math.round((width - wallWidth) / 2) + "px");
    surfaces.forEach(function (surface) {
      var at = documentOffset(surface.parentElement);
      surface.style.setProperty("--sx", at[0] + "px");
      surface.style.setProperty("--sy", at[1] + "px");
    });
  }

  var syncQueued = 0;
  function queueSync() {
    if (!syncQueued) {
      syncQueued = requestAnimationFrame(function () {
        syncQueued = 0;
        syncSurfaces();
      });
    }
  }

  document.querySelectorAll(".glass[data-refract]").forEach(function (el) {
    if (el.getAttribute("data-refract") === "dock") return;
    var surface = document.createElement("span");
    surface.className = "glass__surface";
    surface.setAttribute("aria-hidden", "true");
    el.insertBefore(surface, el.firstChild);
    surfaces.push(surface);
  });
  syncSurfaces();
  window.addEventListener("resize", queueSync);
  if ("ResizeObserver" in window) new ResizeObserver(queueSync).observe(document.body);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueSync);

  // Refraction. target: what gets filtered; shape: the rounded box whose
  // outline the glass follows; backdrop: filter the live backdrop instead.
  function refract(target, shape, kind, backdrop) {
    var applied = null;
    var apply = function (value) {
      if (value === applied) return;
      applied = value;
      if (backdrop) {
        target.style.webkitBackdropFilter = value;
        target.style.backdropFilter = value;
      } else {
        target.style.filter = value;
      }
    };
    var build = function () {
      var r = shape.getBoundingClientRect();
      var w = Math.round(r.width), h = Math.round(r.height);
      if (!w || !h) return;
      var radius = Math.min(parseFloat(getComputedStyle(shape).borderTopLeftRadius) || 0, w / 2, h / 2);
      var id = filterFor(kind, w, h, radius);
      apply(kind === "image" ? "url(#" + id + ")" : "url(#" + id + ") saturate(150%) brightness(1.06)");
    };
    build();
    if ("ResizeObserver" in window) {
      var timer = 0, size = "";
      new ResizeObserver(function (entries) {
        var box = entries[0].contentRect, next = Math.round(box.width) + "x" + Math.round(box.height);
        if (!size || next === size) {
          size = next;
          return;
        }
        size = next;
        // While the size changes, show the plain frosted glass; refract again once it settles.
        apply("");
        window.clearTimeout(timer);
        timer = window.setTimeout(build, 160);
      }).observe(shape);
    }
  }

  if (chromium) {
    // On small or touch screens only the dock and the portrait refract.
    var everywhere = window.matchMedia("(min-width: 900px) and (hover: hover) and (pointer: fine)").matches;
    var start = function (el) {
      var kind = GLASS[el.getAttribute("data-refract")] ? el.getAttribute("data-refract") : "card";
      if (kind === "dock") {
        refract(el, el, kind, true);
      } else if (kind === "image") {
        if (el.complete) refract(el, el.parentElement, kind, false);
        else el.addEventListener("load", function () {
          refract(el, el.parentElement, kind, false);
        }, { once: true });
      } else {
        refract(el.querySelector(".glass__surface"), el, kind, false);
      }
    };
    var wanted = [].filter.call(document.querySelectorAll("[data-refract]"), function (el) {
      var kind = el.getAttribute("data-refract");
      return everywhere || kind === "dock" || kind === "image";
    });
    if ("IntersectionObserver" in window) {
      // Build filters lazily, a little before a surface scrolls into view.
      var near = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          near.unobserve(entry.target);
          start(entry.target);
        });
      }, { rootMargin: "600px 0px" });
      wanted.forEach(function (el) {
        near.observe(el);
      });
    } else {
      wanted.forEach(start);
    }
    root.classList.add("has-liquid-glass");
  }

  /* 3. Light ------------------------------------------------------------- */

  if (finePointer.matches && !reduceMotion.matches && "IntersectionObserver" in window) {
    var lit = new Set();
    var watch = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) lit.add(entry.target);
        else lit.delete(entry.target);
      });
    });
    document.querySelectorAll("[data-light]").forEach(function (el) {
      watch.observe(el);
    });

    var pointerX = -1, pointerY = -1, frame = 0;
    var angles = new WeakMap();
    var shine = function () {
      frame = 0;
      lit.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var dx = pointerX - (r.left + r.width / 2);
        var dy = pointerY - (r.top + r.height / 2);
        // atan2 wraps from 180deg to -180deg; step the shortest way from the
        // last angle (at first the CSS initial value) so the transition never
        // spins the highlight the long way round.
        var last = angles.has(el) ? angles.get(el) : -40;
        var angle = Math.atan2(dx, -dy) * 57.2958;
        angle = last + ((angle - last) % 360 + 540) % 360 - 180;
        angles.set(el, angle);
        // Over the middle the light is overhead and has no direction: 0 there,
        // easing to 1 at the edges and beyond.
        var d = Math.min(1, Math.hypot(dx / (r.width / 2), dy / (r.height / 2)));
        el.style.setProperty("--glass-angle", angle.toFixed(1) + "deg");
        el.style.setProperty("--glass-focus", (d * d * (3 - 2 * d)).toFixed(2));
        el.style.setProperty("--glass-x", Math.round(pointerX - r.left) + "px");
        el.style.setProperty("--glass-y", Math.round(pointerY - r.top) + "px");
      });
    };
    var request = function () {
      if (!frame && pointerX >= 0) frame = requestAnimationFrame(shine);
    };
    window.addEventListener("pointermove", function (event) {
      pointerX = event.clientX;
      pointerY = event.clientY;
      request();
    }, { passive: true });
    window.addEventListener("scroll", request, { passive: true });
  }

  /* 4. Dock & header ----------------------------------------------------- */

  var header = document.querySelector("[data-header]");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  var dock = document.querySelector("[data-dock]");
  var lens = dock && dock.querySelector("[data-dock-lens]");
  if (dock && lens) {
    var current = dock.querySelector('[aria-current="page"]');
    var placeLens = function (target) {
      if (!target) {
        lens.style.opacity = "0";
        return;
      }
      var d = dock.getBoundingClientRect(), r = target.getBoundingClientRect();
      lens.style.setProperty("--lens-x", (r.left - d.left - 0.5) + "px");
      lens.style.setProperty("--lens-w", (r.width + 1) + "px");
      lens.style.opacity = "";
    };
    placeLens(current);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        lens.classList.add("is-ready");
      });
    });
    dock.querySelectorAll(".dock__item").forEach(function (item) {
      item.addEventListener("pointerenter", function () {
        placeLens(item);
      });
      item.addEventListener("focus", function () {
        placeLens(item);
      });
    });
    dock.addEventListener("pointerleave", function () {
      placeLens(current);
    });
    if (toggle) {
      // The theme switch has no lens; hovering it returns the lens home.
      toggle.addEventListener("pointerenter", function () {
        placeLens(current);
      });
      toggle.addEventListener("focus", function () {
        placeLens(current);
      });
    }
    dock.addEventListener("focusout", function (event) {
      if (!dock.contains(event.relatedTarget)) placeLens(current);
    });
    window.addEventListener("resize", function () {
      placeLens(current);
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        placeLens(current);
      });
    }
  }

  /* 5. Publications ------------------------------------------------------ */

  function setPanel(button, open) {
    var panel = document.getElementById(button.getAttribute("aria-controls"));
    if (!panel) return;
    button.setAttribute("aria-expanded", String(open));

    if (open) {
      panel.hidden = false;
      // Two frames so the closed state is painted before the transition starts.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          panel.classList.add("is-open");
        });
      });
      return;
    }

    panel.classList.remove("is-open");
    if (reduceMotion.matches) {
      panel.hidden = true;
      return;
    }
    var onEnd = function (event) {
      if (event.target !== panel) return;
      panel.removeEventListener("transitionend", onEnd);
      if (!panel.classList.contains("is-open")) panel.hidden = true;
    };
    panel.addEventListener("transitionend", onEnd);
  }

  function legacyCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {}
    document.body.removeChild(area);
    return ok;
  }

  // Clipboard API first; fall back when it is missing (plain-http previews)
  // or refuses (no permission / unfocused document).
  function copyText(text) {
    var fallback = function () {
      if (!legacyCopy(text)) throw new Error("copy failed");
    };
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(fallback);
    }
    return new Promise(function (resolve) {
      fallback();
      resolve();
    });
  }

  document.addEventListener("click", function (event) {
    var panelButton = event.target.closest("[data-panel]");
    if (panelButton) {
      var willOpen = panelButton.getAttribute("aria-expanded") !== "true";
      var pub = panelButton.closest(".pub");
      if (willOpen && pub) {
        pub.querySelectorAll('[data-panel][aria-expanded="true"]').forEach(function (other) {
          if (other !== panelButton) setPanel(other, false);
        });
      }
      setPanel(panelButton, willOpen);
      return;
    }

    var authorsButton = event.target.closest("[data-authors-toggle]");
    if (authorsButton) {
      var list = authorsButton.closest(".pub__authors");
      var expanded = authorsButton.getAttribute("aria-expanded") === "true";
      list.querySelector("[data-authors-short]").hidden = !expanded;
      list.querySelector("[data-authors-full]").hidden = expanded;
      authorsButton.setAttribute("aria-expanded", String(!expanded));
      authorsButton.textContent = expanded ? authorsButton.getAttribute("data-label") : "Show less";
      return;
    }

    var copyButton = event.target.closest("[data-copy]");
    if (copyButton) {
      var source = document.getElementById(copyButton.getAttribute("data-copy"));
      if (!source) return;
      var label = copyButton.querySelector("span");
      copyText(source.textContent).then(
        function () {
          copyButton.classList.add("is-copied");
          if (label) label.textContent = "Copied";
          window.setTimeout(function () {
            copyButton.classList.remove("is-copied");
            if (label) label.textContent = "Copy";
          }, 1600);
        },
        function () {
          // Could not copy: select the BibTeX so it can be copied by hand.
          var selection = window.getSelection();
          if (selection) selection.selectAllChildren(source);
        }
      );
    }
  });

  /* 6. Scroll reveal ----------------------------------------------------- */

  var revealables = document.querySelectorAll("[data-reveal]");
  if (!("IntersectionObserver" in window) || reduceMotion.matches) {
    revealables.forEach(function (el) {
      el.classList.add("is-visible");
    });
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        var shown = 0;
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          // Stagger items that enter together.
          entry.target.style.setProperty("--reveal-delay", Math.min(shown * 70, 280) + "ms");
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
          shown += 1;
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.05 }
    );
    revealables.forEach(function (el) {
      observer.observe(el);
    });
  }
})();
