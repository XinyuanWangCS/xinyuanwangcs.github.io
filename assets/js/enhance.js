/**
 * enhance.js — progressive scroll-reveal for news rows & publication cards.
 * Purely additive: if JS is off or IntersectionObserver is missing, the
 * _enhance.scss reduced-motion / fallback rules keep everything visible.
 */
(function () {
  "use strict";

  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var targets = document.querySelectorAll(
    ".news table tr, .publications ol.bibliography li"
  );

  // No JS-driven hiding if reduced motion or no IO support: just show them.
  if (reduce || !("IntersectionObserver" in window) || !targets.length) {
    targets.forEach(function (el) {
      el.classList.add("enh-in");
    });
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry, i) {
        if (entry.isIntersecting) {
          var el = entry.target;
          // small stagger based on position within its group
          var delay = Math.min(i * 60, 240);
          setTimeout(function () {
            el.classList.add("enh-in");
          }, delay);
          io.unobserve(el);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );

  targets.forEach(function (el) {
    io.observe(el);
  });
})();
