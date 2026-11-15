/**
 * seaside.js — the day/night switch in the dock: a small cartoon seaside seen
 * through a glass drop. By day the drop rests on the sun; at night on the
 * moon. Switching rolls the drop across while the sun sets into the sea, the
 * sky passes through dusk, the moon rises and the lighthouse lights up.
 * site.js changes the theme when the switch is clicked; this script follows
 * data-theme on <html>.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var TURN = Math.PI * 2;

  var button = document.querySelector("[data-theme-toggle]");
  var canvas = button && button.querySelector("canvas");
  if (!canvas || !canvas.getContext) return;

  /* Colours -------------------------------------------------------------- */

  // Every colour by day, at dusk and at night; tone() mixes them for tau
  // (0 day, 1 dusk, 2 night).
  var TONES = {
    skyTop: ["5fb2f0", "5e64c4", "081633"],
    skyLow: ["cdeafd", "ffae86", "1c3564"],
    seaTop: ["58b0e6", "c48aa8", "1a3866"],
    seaLow: ["2b80c8", "4e4a94", "0a1838"],
    cloud: ["ffffff", "ffd6c8", "2c406a"],
    cloudShade: ["d6ebfa", "f2a2a6", "22345a"],
    rock: ["6f8296", "6c5c7c", "26324a"],
    rockTop: ["8fa3b6", "8c7896", "33415c"],
    tower: ["ffffff", "ffe6dc", "aeb9cf"],
    band: ["e5484d", "d0485a", "6b3346"],
    hull: ["e2574c", "c9506a", "5d3046"],
    sail: ["ffffff", "ffe2d6", "b7c3da"],
    sailShade: ["dce8f5", "efc0b8", "8e9cb8"],
    sun: ["ffd23f", "ff9a4a", "ff9a4a"],
    glint: ["fff2b0", "ffb27a", "e6eeff"]
  };
  Object.keys(TONES).forEach(function (name) {
    TONES[name] = TONES[name].map(function (hex) {
      var n = parseInt(hex, 16);
      return [n >> 16, (n >> 8) & 255, n & 255];
    });
  });

  function tone(name, tau, alpha) {
    var set = TONES[name], i = tau < 1 ? 0 : 1, f = tau - i, a = set[i], b = set[i + 1];
    return "rgba(" + Math.round(a[0] + (b[0] - a[0]) * f) + "," + Math.round(a[1] + (b[1] - a[1]) * f) + "," +
      Math.round(a[2] + (b[2] - a[2]) * f) + "," + (alpha === undefined ? 1 : alpha) + ")";
  }

  function smooth(a, b, v) {
    var t = Math.min(Math.max((v - a) / (b - a), 0), 1);
    return t * t * (3 - 2 * t);
  }

  // Clockwise distance between two angles, for picking an arc's direction.
  function sweep(from, to) {
    var d = (to - from) % TURN;
    return d < 0 ? d + TURN : d;
  }

  /* The scene, in CSS pixels --------------------------------------------- */

  function cloud(c, x, y, s, fill, shade) {
    var puff = function (dy) {
      c.beginPath();
      c.arc(x + 3.4 * s, y + dy, 2.6 * s, 0, TURN);
      c.arc(x + 6.4 * s, y - 1.5 * s + dy, 3.3 * s, 0, TURN);
      c.arc(x + 9.4 * s, y + 0.2 * s + dy, 2.4 * s, 0, TURN);
      c.ellipse(x + 6.4 * s, y + 1.3 * s + dy, 5.6 * s, 1.5 * s, 0, 0, TURN);
      c.fill();
    };
    c.fillStyle = shade;
    puff(0.7);
    c.fillStyle = fill;
    puff(0);
  }

  function sun(c, x, y, r, t, tau) {
    var warm = smooth(0, 1, tau);
    var halo = c.createRadialGradient(x, y, r * 0.5, x, y, r * 2.8);
    halo.addColorStop(0, "rgba(255," + Math.round(226 - 60 * warm) + ",140,0.5)");
    halo.addColorStop(1, "rgba(255,200,140,0)");
    c.fillStyle = halo;
    c.beginPath();
    c.arc(x, y, r * 2.8, 0, TURN);
    c.fill();
    // short rounded rays, turning slowly, gone by dusk
    c.save();
    c.translate(x, y);
    c.rotate(t * 0.2);
    c.strokeStyle = tone("sun", tau, 0.85 * (1 - warm));
    c.lineWidth = 1.3;
    c.lineCap = "round";
    for (var i = 0; i < 8; i++) {
      c.rotate(TURN / 8);
      c.beginPath();
      c.moveTo(r + 1.7, 0);
      c.lineTo(r + 3.3, 0);
      c.stroke();
    }
    c.restore();
    var disc = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    disc.addColorStop(0, "#fff8d8");
    disc.addColorStop(1, tone("sun", tau));
    c.fillStyle = disc;
    c.beginPath();
    c.arc(x, y, r, 0, TURN);
    c.fill();
  }

  // A crescent: the disc less a disc shifted up and to the right.
  function moon(c, x, y, r, glow) {
    var halo = c.createRadialGradient(x, y, r * 0.6, x, y, r * 3);
    halo.addColorStop(0, "rgba(214,226,255," + 0.32 * glow + ")");
    halo.addColorStop(1, "rgba(214,226,255,0)");
    c.fillStyle = halo;
    c.beginPath();
    c.arc(x, y, r * 3, 0, TURN);
    c.fill();
    var bx = x + r * 0.55, by = y - r * 0.38, br = r * 0.84;
    var dx = bx - x, dy = by - y, d = Math.hypot(dx, dy);
    var a = (r * r - br * br + d * d) / (2 * d), h = Math.sqrt(r * r - a * a);
    var px = x + a * dx / d, py = y + a * dy / d;
    var p1 = [px + h * dy / d, py - h * dx / d], p2 = [px - h * dy / d, py + h * dx / d];
    var away = Math.atan2(-dy, -dx); // the lit side, facing away from the bite
    var a1 = Math.atan2(p1[1] - y, p1[0] - x), a2 = Math.atan2(p2[1] - y, p2[0] - x);
    var b1 = Math.atan2(p1[1] - by, p1[0] - bx), b2 = Math.atan2(p2[1] - by, p2[0] - bx);
    c.beginPath();
    c.arc(x, y, r, a1, a2, sweep(a1, away) > sweep(a1, a2));
    c.arc(bx, by, br, b2, b1, sweep(b2, away) > sweep(b2, b1));
    c.closePath();
    var lit = c.createLinearGradient(x - r, y - r, x + r, y + r);
    lit.addColorStop(0, "#fffdf0");
    lit.addColorStop(1, "#f1e6b8");
    c.fillStyle = lit;
    c.fill();
  }

  function star(c, x, y, size, alpha) {
    c.fillStyle = "rgba(255,250,235," + alpha + ")";
    c.beginPath();
    if (size < 1) {
      c.arc(x, y, size, 0, TURN);
    } else {
      // a four-pointed twinkle
      var k = size * 0.28;
      c.moveTo(x, y - size);
      c.quadraticCurveTo(x + k, y - k, x + size, y);
      c.quadraticCurveTo(x + k, y + k, x, y + size);
      c.quadraticCurveTo(x - k, y + k, x - size, y);
      c.quadraticCurveTo(x - k, y - k, x, y - size);
    }
    c.fill();
  }

  // Light on the water under the sun or moon: short strokes, shimmering.
  function glints(c, x, top, t, color) {
    c.lineCap = "round";
    c.lineWidth = 0.9;
    for (var k = 0; k < 5; k++) {
      var y = top + 1.8 + k * 2.2, half = (3.2 - k * 0.42) * (0.7 + 0.3 * Math.sin(t * 2.3 + k * 1.7));
      var shift = Math.sin(t * 1.3 + k * 2.1) * 0.7;
      c.strokeStyle = color(1 - k * 0.16);
      c.beginPath();
      c.moveTo(x - half + shift, y);
      c.lineTo(x + half + shift, y);
      c.stroke();
    }
  }

  function wave(c, x, y, width) {
    var step = width / 2;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + step / 2, y - 1.1, x + step, y);
    c.quadraticCurveTo(x + step * 1.5, y - 1.1, x + width, y);
    c.stroke();
  }

  function lighthouse(c, x, base, t, tau, night) {
    // the rock
    c.fillStyle = tone("rock", tau);
    c.beginPath();
    c.moveTo(x - 6.5, base + 2.6);
    c.bezierCurveTo(x - 5.5, base - 1.8, x + 5, base - 2, x + 6.5, base + 2.6);
    c.closePath();
    c.fill();
    c.fillStyle = tone("rockTop", tau);
    c.beginPath();
    c.ellipse(x - 1.2, base - 0.6, 3.6, 0.9, 0, 0, TURN);
    c.fill();
    // the tower, striped
    var foot = base - 0.6, top = base - 11.5;
    c.save();
    c.beginPath();
    c.moveTo(x - 2.5, foot);
    c.lineTo(x - 1.7, top);
    c.lineTo(x + 1.7, top);
    c.lineTo(x + 2.5, foot);
    c.closePath();
    c.fillStyle = tone("tower", tau);
    c.fill();
    c.clip();
    c.fillStyle = tone("band", tau);
    c.fillRect(x - 3, top + 2.4, 6, 2);
    c.fillRect(x - 3, top + 6.4, 6, 2);
    c.restore();
    // gallery, lantern and roof
    var lamp = top - 1.6;
    c.fillStyle = tone("rock", tau);
    c.fillRect(x - 2.4, top - 0.5, 4.8, 0.8);
    c.fillStyle = night > 0.5 ? "#ffe8a0" : "rgba(255,246,214,1)";
    c.fillRect(x - 1.3, lamp - 1.1, 2.6, 2.3);
    c.fillStyle = tone("band", tau);
    c.beginPath();
    c.moveTo(x - 1.9, lamp - 1);
    c.quadraticCurveTo(x, lamp - 3.6, x + 1.9, lamp - 1);
    c.closePath();
    c.fill();
    if (night <= 0.01) return;
    // at night: a lamp, and a beam that turns
    var turn = t * 1.25, reach = Math.cos(turn), facing = Math.max(0, Math.sin(turn));
    if (Math.abs(reach) > 0.04) {
      var end = x + reach * 34, spread = 3.6;
      var beam = c.createLinearGradient(x, 0, end, 0);
      beam.addColorStop(0, "rgba(255,236,170," + 0.5 * night * Math.sqrt(Math.abs(reach)) + ")");
      beam.addColorStop(1, "rgba(255,236,170,0)");
      c.fillStyle = beam;
      c.beginPath();
      c.moveTo(x, lamp - 0.3);
      c.lineTo(end, lamp - spread);
      c.lineTo(end, lamp + spread);
      c.closePath();
      c.fill();
    }
    var flare = 3 + 4 * Math.pow(facing, 6);
    var light = c.createRadialGradient(x, lamp, 0, x, lamp, flare);
    light.addColorStop(0, "rgba(255,240,180," + (0.75 * night) + ")");
    light.addColorStop(1, "rgba(255,240,180,0)");
    c.fillStyle = light;
    c.beginPath();
    c.arc(x, lamp, flare, 0, TURN);
    c.fill();
  }

  function boat(c, x, y, t, tau, night) {
    c.save();
    c.translate(x, y + Math.sin(t * 1.6) * 0.45);
    c.rotate(Math.sin(t * 1.15) * 0.07);
    // wake
    c.strokeStyle = "rgba(255,255,255," + (0.55 - 0.35 * night) + ")";
    c.lineWidth = 0.7;
    c.lineCap = "round";
    wave(c, -10, 2.3, 4);
    // mast, sails, flag
    c.strokeStyle = "#6b5444";
    c.lineWidth = 0.6;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -8.4);
    c.stroke();
    c.fillStyle = tone("sail", tau);
    c.beginPath();
    c.moveTo(0.5, -7.8);
    c.quadraticCurveTo(4.2, -4.5, 4.6, -0.9);
    c.lineTo(0.5, -0.9);
    c.closePath();
    c.fill();
    c.fillStyle = tone("sailShade", tau);
    c.beginPath();
    c.moveTo(-0.5, -6.6);
    c.lineTo(-0.5, -0.9);
    c.lineTo(-3.8, -0.9);
    c.closePath();
    c.fill();
    c.fillStyle = "#2a5fd6";
    c.beginPath();
    c.moveTo(0, -8.4);
    c.lineTo(2, -7.8);
    c.lineTo(0, -7.2);
    c.fill();
    // hull
    c.fillStyle = tone("hull", tau);
    c.beginPath();
    c.moveTo(-5, -0.6);
    c.lineTo(5, -0.6);
    c.quadraticCurveTo(4.2, 2.2, 2.8, 2.2);
    c.lineTo(-2.8, 2.2);
    c.quadraticCurveTo(-4.2, 2.2, -5, -0.6);
    c.fill();
    if (night > 0.01) {
      var lamp = c.createRadialGradient(-3.4, -1.6, 0, -3.4, -1.6, 3);
      lamp.addColorStop(0, "rgba(255,226,140," + 0.9 * night + ")");
      lamp.addColorStop(1, "rgba(255,226,140,0)");
      c.fillStyle = lamp;
      c.beginPath();
      c.arc(-3.4, -1.6, 3, 0, TURN);
      c.fill();
    }
    c.restore();
  }

  function gull(c, x, y, flap, alpha) {
    c.strokeStyle = "rgba(52,66,86," + alpha + ")";
    c.lineWidth = 0.7;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(x - 2.2, y - 0.6 - flap);
    c.quadraticCurveTo(x - 1, y - 1.2, x, y);
    c.quadraticCurveTo(x + 1, y - 1.2, x + 2.2, y - 0.6 - flap);
    c.stroke();
  }

  // The whole picture at time t (seconds) and tau.
  function scene(c, w, h, t, tau) {
    var horizon = h * 0.64, day = 1 - smooth(0, 1, tau), night = smooth(1, 2, tau);
    var dayX = h / 2, nightX = w - h / 2, i;
    var sky = c.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, tone("skyTop", tau));
    sky.addColorStop(1, tone("skyLow", tau));
    c.fillStyle = sky;
    c.fillRect(0, 0, w, horizon + 1);
    // stars come out one by one; now and then one falls
    STARS.forEach(function (s, n) {
      var a = smooth(1.15 + n * 0.04, 1.6 + n * 0.04, tau) * (0.6 + 0.4 * Math.sin(t * (1 + n * 0.37) + n));
      if (a > 0.02) star(c, s[0] * w, s[1] * horizon, s[2], a);
    });
    var fall = (t % 9) / 0.9;
    if (night > 0.9 && fall < 1) {
      var fx = w * 0.42 - fall * 12, fy = 3 + fall * 5;
      var trail = c.createLinearGradient(fx, fy, fx + 7, fy - 3);
      trail.addColorStop(0, "rgba(255,255,255," + 0.9 * (1 - fall) + ")");
      trail.addColorStop(1, "rgba(255,255,255,0)");
      c.strokeStyle = trail;
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(fx, fy);
      c.lineTo(fx + 7, fy - 3);
      c.stroke();
    }
    // the sun sets into the sea as the moon rises out of it
    var sunY = h * 0.33 + (horizon + 7 - h * 0.33) * smooth(0, 1.15, tau);
    var moonY = h * 0.31 + (horizon + 7 - h * 0.31) * (1 - smooth(0.8, 2, tau));
    if (sunY < horizon + 6) sun(c, dayX - 1.5, sunY, 5.2, t, tau);
    if (moonY < horizon + 6) moon(c, nightX + 1.5, moonY, 4.8, night);
    // clouds drift
    var span = w + 30;
    cloud(c, (w * 0.62 + t * 0.9) % span - 16, h * 0.16, 1, tone("cloud", tau, 1 - 0.25 * night), tone("cloudShade", tau, 1 - 0.25 * night));
    cloud(c, (w * 0.05 + t * 0.6) % span - 16, h * 0.36, 0.66, tone("cloud", tau, 1 - 0.3 * night), tone("cloudShade", tau, 1 - 0.3 * night));
    if (day > 0.02) {
      gull(c, w * 0.72 + Math.sin(t * 0.3) * 3, h * 0.24 + Math.sin(t * 0.7) * 0.8, 0.5 * Math.sin(t * 5), day);
      gull(c, w * 0.8 + Math.sin(t * 0.25 + 2) * 3, h * 0.33 + Math.sin(t * 0.6 + 1) * 0.8, 0.5 * Math.sin(t * 5 + 1.3), day * 0.8);
    }
    // the sea, with light on it and small waves
    var sea = c.createLinearGradient(0, horizon, 0, h);
    sea.addColorStop(0, tone("seaTop", tau));
    sea.addColorStop(1, tone("seaLow", tau));
    c.fillStyle = sea;
    c.fillRect(0, horizon, w, h - horizon);
    c.fillStyle = "rgba(255,255,255," + (0.4 - 0.25 * night) + ")";
    c.fillRect(0, horizon - 0.3, w, 0.6);
    var sunUp = 1 - smooth(horizon - 5, horizon + 2, sunY), moonUp = 1 - smooth(horizon - 5, horizon + 2, moonY);
    if (sunUp > 0) {
      glints(c, dayX - 1.5, horizon, t, function (a) { return tone("glint", Math.min(tau, 1), a * 0.85 * sunUp); });
    }
    if (moonUp > 0 && night > 0) {
      glints(c, nightX + 1.5, horizon, t, function (a) { return tone("glint", 2, a * 0.7 * moonUp * night); });
    }
    c.strokeStyle = "rgba(255,255,255," + (0.45 - 0.3 * night) + ")";
    c.lineWidth = 0.7;
    c.lineCap = "round";
    for (i = 0; i < 7; i++) {
      var row = i % 3, drift = (row % 2 ? -1 : 1) * t * 1.6;
      wave(c, ((i * 23 + drift) % (w + 8) + w + 8) % (w + 8) - 4, horizon + 4.2 + row * 3.6, 4.6);
    }
    lighthouse(c, w / 2, horizon + 0.5, t, tau, night);
    boat(c, (w * 0.62 + t * 1.2) % (w + 24) - 12, horizon + 6.2, t, tau, night);
  }

  // Stars as [x, y] (fractions of the width and of the sky) and size.
  var STARS = [
    [0.08, 0.3, 1.6], [0.16, 0.66, 0.5], [0.24, 0.16, 0.6], [0.3, 0.5, 2.1], [0.4, 0.26, 0.5],
    [0.47, 0.7, 0.6], [0.55, 0.14, 1.5], [0.62, 0.55, 0.5], [0.86, 0.68, 0.6], [0.92, 0.3, 1.4]
  ];

  /* The drop ------------------------------------------------------------- */

  function bilinear(buf, Wd, Hd, x, y, channel) {
    x = Math.min(Math.max(x - 0.5, 0), Wd - 1.001);
    y = Math.min(Math.max(y - 0.5, 0), Hd - 1.001);
    var x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = (y0 * Wd + x0) * 4 + channel, down = Wd * 4;
    var top = buf[i] + (buf[i + 4] - buf[i]) * fx, low = buf[i + down] + (buf[i + down + 4] - buf[i + down]) * fx;
    return top + (low - top) * fy;
  }

  // A soft contact shadow around the drop, a little heavier below it.
  function shadow(out, Wd, Hd, kx, ky, R, dpr) {
    var cy = ky + 1.5 * dpr, reach = 5 * dpr;
    var x0 = Math.max(0, Math.floor(kx - R - reach)), x1 = Math.min(Wd - 1, Math.ceil(kx + R + reach));
    var y0 = Math.max(0, Math.floor(cy - R - reach)), y1 = Math.min(Hd - 1, Math.ceil(cy + R + reach));
    for (var Y = y0; Y <= y1; Y++) {
      for (var X = x0; X <= x1; X++) {
        var dx = X + 0.5 - kx, dy = Y + 0.5 - cy;
        var t = (Math.sqrt(dx * dx + dy * dy) - R + dpr) / (reach + dpr);
        if (t < 0 || t > 1) continue;
        var keep = 1 - 0.3 * (1 - t) * (1 - t), o = (Y * Wd + X) * 4;
        out[o] *= keep;
        out[o + 1] *= keep;
        out[o + 2] *= keep;
      }
    }
  }

  // The drop is a plano-convex lens: it magnifies the middle and, toward the
  // rim, bends the surroundings in, splitting the colours slightly there.
  function lens(src, out, Wd, Hd, kx, ky, R) {
    var x0 = Math.max(0, Math.floor(kx - R - 1)), x1 = Math.min(Wd - 1, Math.ceil(kx + R + 1));
    var y0 = Math.max(0, Math.floor(ky - R - 1)), y1 = Math.min(Hd - 1, Math.ceil(ky + R + 1));
    for (var Y = y0; Y <= y1; Y++) {
      for (var X = x0; X <= x1; X++) {
        var dx = X + 0.5 - kx, dy = Y + 0.5 - ky, dist = Math.sqrt(dx * dx + dy * dy);
        var cover = Math.min(Math.max(R - dist + 0.5, 0), 1);
        if (!cover) continue;
        // sampling scale: 1/1.4 in the middle, 1.08 at the rim
        var d = Math.min(dist / R, 1), d4 = d * d * d * d, k = 0.71 + 0.37 * d4, split = 0.04 * d4;
        var lift = 1.03 - 0.2 * smooth(0.82, 1, d), o = (Y * Wd + X) * 4;
        var r = bilinear(src, Wd, Hd, kx + dx * k * (1 + split), ky + dy * k * (1 + split), 0);
        var g = bilinear(src, Wd, Hd, kx + dx * k, ky + dy * k, 1);
        var b = bilinear(src, Wd, Hd, kx + dx * k * (1 - split), ky + dy * k * (1 - split), 2);
        out[o] = out[o] * (1 - cover) + (r * lift + 5) * cover;
        out[o + 1] = out[o + 1] * (1 - cover) + (g * lift + 5) * cover;
        out[o + 2] = out[o + 2] * (1 - cover) + (b * lift + 6) * cover;
      }
    }
  }

  // Highlights on the drop: its rim, light gathered at the lower edge and a
  // reflected window at the upper left.
  function shine(c, kx, ky, R, dpr, bright) {
    c.save();
    var rim = c.createLinearGradient(kx - R, ky - R, kx + R, ky + R);
    rim.addColorStop(0, "rgba(255,255,255,0.95)");
    rim.addColorStop(0.55, "rgba(255,255,255,0.4)");
    rim.addColorStop(1, "rgba(255,255,255,0.75)");
    c.lineWidth = 1.1 * dpr;
    c.strokeStyle = rim;
    c.beginPath();
    c.arc(kx, ky, R - 0.55 * dpr, 0, TURN);
    c.stroke();
    var low = c.createRadialGradient(kx + R * 0.1, ky + R * 0.62, 0, kx + R * 0.1, ky + R * 0.62, R * 0.55);
    low.addColorStop(0, "rgba(255,255,255,0.22)");
    low.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = low;
    c.beginPath();
    c.arc(kx, ky, R, 0, TURN);
    c.fill();
    c.lineWidth = 1.2 * dpr;
    c.strokeStyle = "rgba(255,255,255,0.3)";
    c.beginPath();
    c.arc(kx, ky, R * 0.8, 0.1 * Math.PI, 0.42 * Math.PI);
    c.stroke();
    c.translate(kx - R * 0.36, ky - R * 0.44);
    c.rotate(-0.55);
    c.scale(1, 0.55);
    var spec = c.createRadialGradient(0, 0, 0, 0, 0, R * 0.42);
    spec.addColorStop(0, "rgba(255,255,255," + (bright ? 0.9 : 0.75) + ")");
    spec.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = spec;
    c.beginPath();
    c.arc(0, 0, R * 0.42, 0, TURN);
    c.fill();
    c.restore();
  }

  /* Running -------------------------------------------------------------- */

  var ctx = canvas.getContext("2d");
  var paper = document.createElement("canvas");
  var pctx = paper.getContext("2d", { willReadFrequently: true });
  var tau = root.getAttribute("data-theme") === "dark" ? 2 : 0;
  var turn = { from: tau, to: tau, start: 0, length: 0 };
  var pos = tau ? 1 : 0, vel = 0, hover = false, press = false;
  var cssW, cssH, dpr, Wd, Hd, img;
  var frameId = 0, napId = 0, last = 0;

  function fit() {
    cssW = canvas.clientWidth;
    cssH = canvas.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    Wd = canvas.width = paper.width = Math.max(1, Math.round(cssW * dpr));
    Hd = canvas.height = paper.height = Math.max(1, Math.round(cssH * dpr));
    img = ctx.createImageData(Wd, Hd);
  }

  // Draws a frame; returns true while the drop or the sky is still moving.
  function draw(now, dt) {
    var moving = false;
    if (turn.length) {
      var f = Math.min((now - turn.start) / turn.length, 1);
      tau = turn.from + (turn.to - turn.from) * (f < 0.5 ? 4 * f * f * f : 1 - Math.pow(2 - 2 * f, 3) / 2);
      if (f < 1) moving = true;
      else turn.length = 0;
    }
    var dark = turn.to > 1, target = (dark ? 1 : 0) + (hover ? (dark ? -0.07 : 0.07) : 0);
    if (reduceMotion.matches) {
      pos = target;
      vel = 0;
    } else if (dt) {
      // the drop rolls on a soft spring
      vel += (-70 * (pos - target) - 13 * vel) * dt;
      pos += vel * dt;
    }
    moving = moving || Math.abs(pos - target) > 0.001 || Math.abs(vel) > 0.001;
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scene(pctx, cssW, cssH, reduceMotion.matches ? 20 : now / 1000, tau);
    var src = pctx.getImageData(0, 0, Wd, Hd).data, out = img.data;
    out.set(src);
    var r = cssH / 2, R = (r - 3) * dpr * (press ? 0.94 : 1);
    var kx = (r + pos * (cssW - 2 * r)) * dpr, ky = Hd / 2;
    shadow(out, Wd, Hd, kx, ky, R, dpr);
    lens(src, out, Wd, Hd, kx, ky, R);
    ctx.putImageData(img, 0, 0);
    shine(ctx, kx, ky, R, dpr, hover);
    return moving;
  }

  function wake() {
    clearTimeout(napId);
    if (!frameId) frameId = requestAnimationFrame(frame);
  }

  // Every display frame while something moves; otherwise about 20 fps for
  // the waves, boat and stars (and none at all for reduced motion).
  function frame(now) {
    frameId = 0;
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    if (draw(now, dt)) {
      wake();
    } else {
      last = 0;
      if (!reduceMotion.matches) napId = setTimeout(wake, 50);
    }
  }

  function follow() {
    var dark = root.getAttribute("data-theme") === "dark", to = dark ? 2 : 0;
    button.setAttribute("aria-checked", String(dark));
    if (to === turn.to) return;
    turn = { from: tau, to: to, start: performance.now(), length: reduceMotion.matches ? 0 : 1150 * Math.abs(to - tau) / 2 };
    if (!turn.length) tau = to;
    wake();
  }

  var set = function (h, p) {
    hover = h;
    press = p;
    wake();
  };
  button.addEventListener("pointerenter", function () { set(true, false); });
  button.addEventListener("pointerleave", function () { set(false, false); });
  button.addEventListener("pointerdown", function () { set(hover, true); });
  button.addEventListener("pointerup", function () { set(hover, false); });
  button.addEventListener("pointercancel", function () { set(false, false); });

  button.setAttribute("aria-checked", String(tau > 1));
  fit();
  draw(performance.now(), 0);
  window.addEventListener("resize", function () {
    fit();
    draw(performance.now(), 0);
  });
  new MutationObserver(follow).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  wake();
})();
