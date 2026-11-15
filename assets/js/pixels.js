/**
 * pixels.js — the site's pixel art, in two small scenes:
 *   1. at the top, a little robot (a computer-use agent) at its desk: on the
 *      screen its cursor searches the web, files documents and charts a sheet,
 *      one task after another, and the robot is pleased with each;
 *   2. on the footer rule, a quiet corner: books, a lamp that comes on at
 *      night over a cat asleep on a stack of books, a mug and a plant.
 * Both follow the theme, run on the wall clock (so they carry on from page to
 * page) and only animate while in view. No dependencies.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  var LOOP = 21; // seconds for the agent's three tasks
  var STILL = 6.5; // the moment shown when motion is reduced: the first task done

  /* Colours, by day and by night ----------------------------------------- */

  var PALETTE = {
    line: ["4a5a72", "26344b"],
    rule: ["dde2e9", "16191f"],
    shadow: ["c9d1dc", "0c1018"],
    deskTop: ["cfa274", "5c4c46"],
    deskEdge: ["a87a4f", "473b38"],
    deskLeg: ["8f6643", "3b312f"],
    bezel: ["334057", "1d2636"],
    screen: ["dce9fa", "b4cff3"],
    menu: ["ffffff", "e2edfb"],
    winBar: ["5b8def", "6694f0"],
    winBody: ["ffffff", "f1f6fd"],
    winEdge: ["b9c9dd", "93aacb"],
    grey: ["aab6c6", "8c9db4"],
    ink: ["4a5a72", "44546c"],
    link: ["2a5fd6", "3a6fe0"],
    blue: ["3d7fe0", "4d8bec"],
    green: ["34a56a", "3fb377"],
    yellow: ["f0b84a", "f2c160"],
    red: ["ff6b6b", "ff7b7b"],
    amber: ["ffcc4d", "ffd466"],
    lime: ["4cd07d", "59da88"],
    check: ["2fb36d", "36c07a"],
    white: ["ffffff", "ffffff"],
    robot: ["f3f6fa", "b7c2d3"],
    robotShade: ["c9d3e0", "8592a8"],
    visor: ["1f2a3b", "121a28"],
    eye: ["54e6d2", "86faea"],
    led: ["e0bb6a", "f0cf80"],
    antenna: ["8a96a8", "5b6880"],
    keys: ["d9e0ea", "66728a"],
    mug: ["ffffff", "a8b4c6"],
    leaf: ["56b36d", "2a5a40"],
    leafDark: ["3c9456", "1f4733"],
    pot: ["d9895f", "7a4d3a"],
    potDark: ["b56d48", "5e3b2d"],
    book1: ["5b8def", "3f5f9e"],
    book2: ["e0b65c", "8a7442"],
    book3: ["7aa58a", "3f5a4a"],
    book4: ["c98f7e", "6e4b45"],
    book5: ["8e9db4", "4d5668"],
    book6: ["4a5a72", "2e3a4e"],
    band: ["ffffff", "c9d3e0"],
    lamp: ["4a5a72", "56647c"],
    bulb: ["fff3c4", "ffe2a0"],
    cat: ["a3aebe", "5e6a7d"],
    catLight: ["e8edf3", "8f9aad"],
    catDark: ["737f92", "434c5d"],
    catPink: ["f2a9a9", "9a6a70"],
    zed: ["8e9db4", "c9d6ea"]
  };
  var RGB = {}, tones = {};
  Object.keys(PALETTE).forEach(function (name) {
    RGB[name] = PALETTE[name].map(function (hex) {
      var n = parseInt(hex, 16);
      return [n >> 16, (n >> 8) & 255, n & 255];
    });
  });
  var night = root.getAttribute("data-theme") === "dark" ? 1 : 0;

  // Every colour for the current mix of day and night.
  function mixTones() {
    Object.keys(RGB).forEach(function (name) {
      var d = RGB[name][0], n = RGB[name][1];
      tones[name] = [d[0] + (n[0] - d[0]) * night, d[1] + (n[1] - d[1]) * night, d[2] + (n[2] - d[2]) * night];
    });
  }

  /* Sprites -------------------------------------------------------------- */

  // One character per pixel ("." is clear); each sprite has its own legend.
  // Sprites with an `outline` colour get a soft edge, like ink round a cartoon.
  var SPRITES = {
    robot: {
      outline: "line",
      legend: { w: "robot", s: "robotShade", v: "visor", e: "eye", a: "antenna" },
      rows: [
        "....a....",
        "..wwwwww.",
        ".wwwwwwww",
        ".wwvvvvvv",
        ".wwvvevev",
        ".wwvvvvvv",
        ".swwwwwww",
        "..ssssss.",
        "...www...",
        "..wwwwww.",
        "..wwwwwww",
        "..swwwws.",
        "..ssssss.",
        "...s..s.."
      ]
    },
    plant: {
      outline: "line",
      legend: { l: "leaf", d: "leafDark", p: "pot", q: "potDark" },
      rows: [
        "...l..l...",
        "..lld.ll..",
        ".ll.dll.l.",
        "lld..d.lld",
        ".l.d.d.dl.",
        "...dddd...",
        ".pppppppp.",
        "..pppppp..",
        "..qqqqqq..",
        "...qqqq..."
      ]
    },
    mug: { outline: "line", legend: { m: "mug" }, rows: ["mmm.", "mmmm", "mmm."] },
    cursor: { legend: { k: "ink", w: "white" }, rows: ["k...", "kk..", "kwk.", "kwwk", "kkk."] },
    badge: { legend: { g: "check", w: "white" }, rows: [".ggg.", "ggggw", "wgwwg", "gwwgg", ".ggg."] },
    browser: { legend: { b: "blue", w: "white" }, rows: ["bbb", "bwb", "bbb"] },
    sheet: { legend: { g: "green", w: "white" }, rows: ["ggg", "gwg", "ggg"] },
    folder: { legend: { y: "yellow" }, rows: ["yy.", "yyy", "yyy"] },
    doc: { legend: { w: "white", g: "grey" }, rows: ["ww", "wg", "ww"] },
    // the cat, asleep in a loaf (drawn facing left, shown facing right); and
    // with its head up
    cat: {
      mirror: true,
      outline: "line",
      legend: { c: "cat", l: "catLight", d: "catDark", p: "catPink" },
      rows: [
        ".d.d.........",
        "cpccc........",
        "ccccccccccc..",
        "lcdcccdcccccc",
        "llccccccccccc",
        ".lllccccccc.."
      ]
    },
    catAwake: {
      mirror: true,
      outline: "line",
      legend: { c: "cat", l: "catLight", d: "catDark", p: "catPink", k: "ink" },
      rows: [
        "d.d..........",
        "cpcc.........",
        "ckck.........",
        "cccc.........",
        ".lccccccccc..",
        "llcdcccdccccc",
        "llccccccccccc",
        ".lllccccccc.."
      ]
    },
    zed: { legend: { z: "zed" }, rows: ["zzzz", "..z.", ".z..", "zzzz"] }
  };

  // Each sprite's pixels and, where wanted, its outline.
  Object.keys(SPRITES).forEach(function (name) {
    var sprite = SPRITES[name], taken = {}, pixels = [], edge = [];
    if (sprite.mirror) {
      sprite.rows = sprite.rows.map(function (row) {
        return row.split("").reverse().join("");
      });
    }
    sprite.rows.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) {
        if (row[x] === ".") continue;
        pixels.push([x, y, sprite.legend[row[x]]]);
        taken[x + "," + y] = true;
      }
    });
    if (sprite.outline) {
      pixels.forEach(function (p) {
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          var key = (p[0] + d[0]) + "," + (p[1] + d[1]);
          if (!taken[key]) {
            taken[key] = true;
            edge.push([p[0] + d[0], p[1] + d[1]]);
          }
        });
      });
    }
    sprite.pixels = pixels;
    sprite.edge = edge;
  });

  /* Drawing, into whichever scene is being painted ------------------------ */

  var cur = null; // { buffer, W, H }

  function put(x, y, rgb, alpha) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= cur.W || y < 0 || y >= cur.H) return;
    var b = cur.buffer, o = (y * cur.W + x) * 4, a = alpha === undefined ? 1 : alpha;
    if (a <= 0.004) return;
    if (a >= 1 || !b[o + 3]) {
      b[o] = rgb[0];
      b[o + 1] = rgb[1];
      b[o + 2] = rgb[2];
      b[o + 3] = Math.max(b[o + 3], Math.min(1, a) * 255);
    } else {
      b[o] += (rgb[0] - b[o]) * a;
      b[o + 1] += (rgb[1] - b[o + 1]) * a;
      b[o + 2] += (rgb[2] - b[o + 2]) * a;
    }
  }

  function ink(x, y, name, alpha) {
    put(x, y, tones[name], alpha);
  }

  function rect(x, y, w, h, name, alpha) {
    for (var j = 0; j < h; j++) {
      for (var i = 0; i < w; i++) ink(x + i, y + j, name, alpha);
    }
  }

  function stamp(name, x, y, alpha) {
    var sprite = SPRITES[name];
    x = Math.round(x);
    y = Math.round(y);
    if (sprite.outline) {
      sprite.edge.forEach(function (p) {
        ink(x + p[0], y + p[1], sprite.outline, alpha);
      });
    }
    sprite.pixels.forEach(function (p) {
      ink(x + p[0], y + p[1], p[2], alpha);
    });
  }

  // Light made of pixels: an ordered dither of a soft glow, optionally only
  // below a line (a lamp's pool of light).
  function glow(cx, cy, rx, ry, name, strength, below) {
    if (strength <= 0.01) return;
    for (var y = Math.floor(cy - ry); y <= cy + ry; y++) {
      if (below !== undefined && y < below) continue;
      for (var x = Math.floor(cx - rx); x <= cx + rx; x++) {
        var d = Math.hypot((x - cx) / rx, (y - cy) / ry);
        if (d >= 1) continue;
        var k = strength * (1 - d) * (1 - d);
        if (k > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16) put(x, y, tones[name], 0.45);
      }
    }
  }

  // A soft shadow on the ground, fading toward its ends.
  function shade(cx, cy, rx, alpha) {
    for (var x = Math.floor(cx - rx); x <= cx + rx; x++) {
      ink(x, cy, "shadow", alpha * Math.min(1, 1.6 * (1 - Math.abs(x - cx) / (rx + 1))));
    }
  }

  function ease(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function between(t, a, b) {
    return t >= a && t < b;
  }

  function wrap(v, span) {
    return ((v % span) + span) % span;
  }

  /* 1. The agent --------------------------------------------------------- */

  // Where the cursor is on the 24 × 14 screen ([t, x, y]); it eases between.
  var PATH = [
    [0, 12, 8], [0.9, 2, 3], [1.6, 2, 3], [2.3, 10, 4], [3.75, 10, 4], [4.15, 20, 4], [4.6, 20, 4],
    [5.2, 9, 6], [7.5, 9, 6], [8.3, 12, 8], [9.1, 15, 6], [9.4, 15, 6], [10.6, 2, 11], [11, 2, 11],
    [11.7, 19, 10], [12, 19, 10], [13.2, 2, 11], [14.5, 2, 11], [15.2, 2, 7], [15.7, 2, 7],
    [16.4, 20, 3], [19.4, 20, 3], [20.2, 12, 8], [21, 12, 8]
  ];
  var CLICKS = [1, 1.15, 2.4, 4.25, 5.3, 9.35, 10.65, 11.95, 13.25, 15.75, 15.9, 16.5];
  var DONE = [[6, 7.1], [13.5, 14.5], [18.4, 19.4]]; // a ✓, and the robot is pleased

  function cursorAt(t) {
    for (var i = 1; i < PATH.length; i++) {
      var a = PATH[i - 1], b = PATH[i];
      if (t < b[0]) {
        var f = ease((t - a[0]) / (b[0] - a[0]));
        return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, b[1] - a[1]];
      }
    }
    return [12, 8, 0];
  }

  // A window growing out of (or shrinking back into) its icon.
  function windowBox(t, open, close, from) {
    var full = [6, 1, 17, 12];
    var f = ease(Math.min(1, Math.max(0, (t - open) / 0.25))) * (1 - ease(Math.min(1, Math.max(0, (t - close) / 0.25))));
    if (f <= 0) return null;
    return [from[0] + (full[0] - from[0]) * f, from[1] + (full[1] - from[1]) * f, Math.max(2, full[2] * f), Math.max(2, full[3] * f), f];
  }

  function drawWindow(sx, sy, box, bar) {
    var x = Math.round(sx + box[0]), y = Math.round(sy + box[1]), w = Math.round(box[2]), h = Math.round(box[3]);
    rect(x, y, w, h, "winBody");
    rect(x, y, w, 1, bar);
    rect(x, y + h - 1, w, 1, "winEdge");
    rect(x, y + 1, 1, h - 1, "winEdge");
    rect(x + w - 1, y + 1, 1, h - 1, "winEdge");
    if (box[4] < 1) return false;
    ink(x + 1, y, "red");
    ink(x + 2, y, "amber");
    ink(x + 3, y, "lime");
    return true;
  }

  function drawScreen(sx, sy, t) {
    var i, done = null, pointer = cursorAt(t);
    rect(sx, sy, 24, 14, "screen");
    rect(sx, sy, 24, 1, "menu");
    ink(sx + 2, sy, "grey");
    ink(sx + 4, sy, "grey");
    ink(sx + 6, sy, "grey");
    rect(sx + 20, sy, 3, 1, "grey");
    stamp("browser", sx + 1, sy + 2);
    stamp("sheet", sx + 1, sy + 6);
    stamp("folder", sx + 1, sy + 10 - (between(t, 10.65, 10.9) || between(t, 13.25, 13.5) ? 1 : 0));

    // 2. two documents on the desktop, dragged into the folder
    if (t < 9.4) stamp("doc", sx + 14, sy + 5);
    else if (t < 10.6) stamp("doc", sx + pointer[0] - 1, sy + pointer[1] - 1);
    if (t < 12) stamp("doc", sx + 18, sy + 9);
    else if (t < 13.2) stamp("doc", sx + pointer[0] - 1, sy + pointer[1] - 1);

    // 1. search the web, then read a result
    var box = windowBox(t, 1.3, 7.2, [1, 2]);
    if (box && drawWindow(sx, sy, box, "winBar") && t < 7.2) {
      var wx = sx + 6, wy = sy + 1;
      rect(wx + 2, wy + 3, 11, 1, "winEdge");
      rect(wx + 14, wy + 3, 2, 1, "blue");
      var typed = Math.max(0, Math.min(8, Math.floor((t - 2.5) / 0.13) + 1));
      for (i = 0; i < typed; i++) ink(wx + 3 + i + (i > 3 ? 1 : 0), wy + 3, "ink");
      if (between(t, 4.45, 5.6)) {
        rect(wx + 2, wy + 5, 8, 1, between(t, 5.3, 5.6) ? "ink" : "link");
        rect(wx + 2, wy + 6, 11, 1, "grey");
        rect(wx + 2, wy + 8, 6, 1, "link");
        rect(wx + 2, wy + 9, 10, 1, "grey");
      } else if (t >= 5.6) {
        rect(wx + 2, wy + 2, 6, 4, "screen");
        ink(wx + 6, wy + 3, "amber");
        rect(wx + 2, wy + 5, 6, 1, "green");
        for (i = 0; i < 3; i++) rect(wx + 9, wy + 2 + i * 2, i === 2 ? 3 : 5, 1, "grey");
        rect(wx + 2, wy + 7, 13, 1, "grey");
        rect(wx + 2, wy + 9, 10, 1, "grey");
      }
    }

    // 3. fill a sheet, then chart it
    box = windowBox(t, 15.95, 19.6, [1, 6]);
    if (box && drawWindow(sx, sy, box, "green") && t < 19.6) {
      var gx = sx + 6, gy = sy + 1, heights = [3, 5, 4, 7, 6];
      rect(gx + 13, gy + 2, 2, 1, between(t, 16.5, 16.7) ? "ink" : "green");
      for (i = 0; i < 3; i++) rect(gx + 2, gy + 4 + i * 3, 9, 1, "winEdge");
      for (i = 0; i < heights.length; i++) {
        var grown = Math.round(heights[i] * Math.min(1, Math.max(0, (t - 16.7 - i * 0.25) / 0.5)));
        rect(gx + 3 + i * 2, gy + 10 - grown, 1, grown, i % 2 ? "green" : "blue");
      }
    }

    // the pointer, with a ring where it clicks
    CLICKS.forEach(function (at) {
      var age = t - at;
      if (age < 0 || age > 0.3) return;
      var r = age < 0.15 ? 1 : 2;
      for (var dy = -r; dy <= r; dy++) {
        var dx = r - Math.abs(dy);
        ink(sx + pointer[0] + dx, sy + pointer[1] + dy, "link", 0.8);
        ink(sx + pointer[0] - dx, sy + pointer[1] + dy, "link", 0.8);
      }
    });
    stamp("cursor", sx + pointer[0], sy + pointer[1]);
    DONE.forEach(function (d, n) {
      if (between(t, d[0], d[1])) done = n;
    });
    if (done !== null) stamp("badge", sx + (done === 1 ? 5 : 17), sy + (done === 1 ? 8 : 7));
    return { cursor: pointer, done: done !== null };
  }

  // 58 × 32: the robot on its stool, the desk with the computer, a plant.
  function drawAgent(view, t) {
    var agent = wrap(t, LOOP), ground = view.H - 2, dx = 9, mx = dx + 7, my = ground - 26, rx = dx - 8;
    shade(rx + 5, ground + 1, 5, 0.8);
    shade(dx + 18, ground + 1, 19, 0.8);
    shade(dx + 43, ground + 1, 5, 0.8);
    // the desk, the computer, keys and a mug
    rect(dx, ground - 7, 36, 1, "deskTop");
    rect(dx, ground - 6, 36, 1, "deskEdge");
    rect(dx + 1, ground - 5, 1, 6, "deskLeg");
    rect(dx + 34, ground - 5, 1, 6, "deskLeg");
    rect(mx + 10, ground - 10, 6, 1, "bezel");
    rect(mx + 12, ground - 12, 2, 2, "bezel");
    rect(mx, my, 26, 16, "bezel");
    var screen = drawScreen(mx + 1, my + 1, agent);
    rect(dx + 1, ground - 8, 6, 1, "keys");
    stamp("mug", dx + 30, ground - 10);
    var steam = (t * 1.5) % 3;
    if (steam < 2) ink(dx + 31, ground - 12 - Math.floor(steam * 2), "white", 0.6 * (1 - steam / 2));
    stamp("plant", dx + 38, ground - 9);
    // the robot, on a stool, hands at the keys
    var typing = between(agent, 2.5, 3.55), moving = Math.abs(screen.cursor[2]) > 0 && !typing;
    var clicked = CLICKS.some(function (c) {
      return between(agent, c, c + 0.12);
    });
    var hop = screen.done && (agent * 4) % 1 < 0.5 ? 1 : 0, ry = ground - 18 - hop;
    rect(rx + 2, ground - 4, 6, 1, "deskEdge");
    rect(rx + 3, ground - 3, 1, 4, "deskLeg");
    rect(rx + 6, ground - 3, 1, 4, "deskLeg");
    stamp("robot", rx, ry);
    if (screen.done) {
      // pleased: eyes curved up, a little spark overhead
      rect(rx + 4, ry + 4, 5, 1, "visor");
      ink(rx + 5, ry + 3, "eye");
      ink(rx + 7, ry + 3, "eye");
      var spark = (agent * 2) % 1;
      ink(rx + 4, ry - 3 - Math.floor(spark * 2), "led", 1 - spark);
    } else if (t % 3.7 < 0.12) {
      rect(rx + 4, ry + 4, 5, 1, "visor");
    }
    ink(rx + 4, ry - 1, "led", t % 1.6 < 0.8 ? 1 : 0.25);
    var reach = typing ? ((agent * 8) % 1 < 0.5 ? 0 : 1) : clicked ? 1 : 0;
    var shift = moving && screen.cursor[2] > 0 && (agent * 3) % 1 < 0.5 ? 1 : 0;
    rect(rx + 8, ry + 10, 2 + shift, 1, "robot");
    ink(rx + 10 + shift, ry + 10 + reach, "robotShade");
  }

  /* 2. The shelf ------------------------------------------------------- */

  // 70 × 24, standing on the footer rule: a row of books with one leaning, a
  // lamp over a stack of books where the cat sleeps, a mug and a plant.
  var BOOKS = [[3, 12, "book1"], [2, 10, "book5"], [3, 13, "book2"], [2, 11, "book6"], [3, 12, "book3"]];

  function drawShelf(view, t) {
    var g = view.H, x = 1, i;
    BOOKS.forEach(function (b) {
      rect(x, g - b[1], b[0], b[1], b[2]);
      rect(x, g - b[1] + 2, b[0], 1, "band", 0.55);
      rect(x, g - 3, b[0], 1, "band", 0.3);
      x += b[0];
    });
    for (i = 0; i < 12; i++) rect(x + Math.floor(i * 0.5), g - 1 - i, 3, 1, "book4");
    rect(x + 5, g - 11, 3, 1, "band", 0.55);

    // the lamp, its shade tipped over the cat; lit at night
    var lx = 21;
    rect(lx, g - 1, 6, 1, "lamp");
    rect(lx + 2, g - 2, 2, 1, "lamp");
    for (i = 0; i < 10; i++) ink(lx + 3 + Math.floor(i * 0.4), g - 3 - i, "lamp");
    for (i = 0; i < 5; i++) ink(lx + 7 + i, g - 13 - Math.floor(i * 0.6), "lamp");
    rect(lx + 11, g - 19, 5, 1, "lamp");
    rect(lx + 10, g - 18, 7, 2, "lamp");
    rect(lx + 11, g - 16, 5, 1, night > 0.3 ? "bulb" : "lamp");
    if (night > 0.02) glow(lx + 13, g - 4, 14, 12, "bulb", night * 0.8, g - 15);

    // a stack of books, and the cat asleep on it
    var sx = 33, top = g - 8, breath = (t % 3.2) < 1.6 ? 0 : 1;
    rect(sx, g - 3, 18, 3, "book2");
    rect(sx, g - 2, 18, 1, "band", 0.35);
    rect(sx + 1, g - 6, 16, 3, "book1");
    rect(sx + 1, g - 5, 16, 1, "band", 0.35);
    rect(sx + 2, top, 14, 2, "book3");
    // now and then, by day, it lifts its head and looks round
    var awake = night < 0.5 && (t % 23) > 20.5;
    if (awake) stamp("catAwake", sx + 3, top - 8);
    else stamp("cat", sx + 3, top - 6 + breath);
    // its tail hangs over the edge and swishes
    var swish = Math.sin(t * 1.4) > 0.2 ? 1 : 0;
    ink(sx + 2, top - 1 + breath, "cat");
    ink(sx + 1, top, "cat");
    ink(sx + 1, top + 1, "catDark");
    ink(sx + 1 - swish, top + 2, "catDark");
    if (night > 0.3 && !awake) {
      // asleep: z z z
      for (i = 0; i < 3; i++) {
        var p = (t * 0.35 + i / 3) % 1;
        stamp("zed", sx + 14 + Math.round(p * 3), top - 10 - Math.round(p * 8), night * Math.sin(p * Math.PI));
      }
    }

    // a mug, still warm, and a plant
    stamp("mug", 54, g - 3);
    var steam = (t * 1.5) % 3;
    if (steam < 2) ink(55, g - 5 - Math.floor(steam * 2), "white", 0.6 * (1 - steam / 2));
    stamp("plant", 59, g - 10);
  }

  /* Scenes --------------------------------------------------------------- */

  var views = [];

  // A canvas showing a small pixel buffer, scaled up without smoothing.
  function scene(canvas, cols, rows, scaleFor, place, draw) {
    var view = { canvas: canvas, ctx: canvas.getContext("2d"), art: document.createElement("canvas"), visible: true };
    view.artCtx = view.art.getContext("2d");
    view.fit = function () {
      var spot = place();
      if (!spot) {
        canvas.style.display = "none";
        view.visible = false;
        return;
      }
      canvas.style.display = "";
      view.scale = scaleFor();
      view.dpr = Math.min(window.devicePixelRatio || 1, 2);
      view.W = cols;
      view.H = rows;
      var cssW = view.W * view.scale, cssH = view.H * view.scale;
      if (spot.left !== undefined) {
        canvas.style.left = Math.round(spot.left + (spot.anchor === "center" ? -cssW / 2 : spot.anchor === "right" ? -cssW : 0)) + "px";
        canvas.style.top = Math.round(spot.bottom - cssH) + "px";
      }
      canvas.style.width = cssW + "px";
      canvas.style.height = cssH + "px";
      canvas.width = Math.round(cssW * view.dpr);
      canvas.height = Math.round(cssH * view.dpr);
      view.art.width = view.W;
      view.art.height = view.H;
      view.image = view.artCtx.createImageData(view.W, view.H);
      view.buffer = view.image.data;
    };
    view.render = function (now) {
      if (!view.buffer || canvas.style.display === "none") return;
      cur = view;
      view.buffer.fill(0);
      draw(view, now / 1000);
      view.artCtx.putImageData(view.image, 0, 0);
      view.ctx.clearRect(0, 0, canvas.width, canvas.height);
      view.ctx.imageSmoothingEnabled = false;
      view.ctx.drawImage(view.art, 0, 0, canvas.width, canvas.height);
    };
    views.push(view);
    return view;
  }

  // Page position of an element, ignoring transforms (the entrance animations).
  function box(el) {
    var x = 0, y = 0, node = el;
    while (node) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent;
    }
    return { left: x, top: y, right: x + el.offsetWidth, bottom: y + el.offsetHeight, width: el.offsetWidth };
  }

  // Where the agent sits: above the portrait (beside it on phones), or at the
  // end of an inner page's title — never under the dock.
  function agentSpot() {
    var portrait = document.querySelector(".hero__portrait"), title = document.querySelector(".page__title");
    var scale = agentScale(), w = 58 * scale, h = 32 * scale, spot;
    if (portrait) {
      var p = box(portrait), text = box(document.querySelector(".hero__text") || portrait);
      if (p.left > text.left + 40) {
        spot = { left: (p.left + p.right) / 2, bottom: p.top - 6, anchor: "center" };
      } else {
        var right = box(portrait.parentNode).right;
        if (right - p.right < w + 8) return null;
        spot = { left: (p.right + right) / 2, bottom: p.bottom, anchor: "center" };
      }
    } else if (title) {
      // the title's text, not its box (which runs the full width)
      var range = document.createRange();
      range.selectNodeContents(title);
      var textRight = range.getBoundingClientRect().right + window.scrollX, head = box(title.parentNode);
      if (head.right - textRight < w + 24) return null;
      spot = { left: head.right - 4, bottom: box(title).bottom, anchor: "right" };
    } else {
      return null;
    }
    var dock = document.querySelector(".dock");
    if (dock) {
      var d = dock.getBoundingClientRect(), left = spot.anchor === "center" ? spot.left - w / 2 : spot.left - w;
      if (spot.bottom - h < d.bottom + 4 && left < d.right + 6 && left + w > d.left - 6) {
        spot.left += d.right + 6 - left;
      }
    }
    return spot;
  }

  function agentScale() {
    return window.innerWidth >= 900 ? 3 : 2;
  }

  var agentCanvas = document.querySelector("[data-agent]");
  if (agentCanvas && agentCanvas.getContext) scene(agentCanvas, 58, 32, agentScale, agentSpot, drawAgent);
  var shelf = document.querySelector("[data-shelf]");
  var shelfCanvas = shelf && shelf.querySelector("canvas");
  if (shelfCanvas && shelfCanvas.getContext) {
    shelf.classList.add("is-live");
    scene(shelfCanvas, 70, 24, function () {
      return window.innerWidth >= 600 ? 3 : 2;
    }, function () {
      return {};
    }, drawShelf);
  }
  if (!views.length) return;

  /* Running -------------------------------------------------------------- */

  var timer = 0, fade = null;

  function now() {
    return reduceMotion.matches ? (Math.floor(Date.now() / 1000 / LOOP) * LOOP + STILL) * 1000 : Date.now();
  }

  function frame() {
    timer = 0;
    if (fade) {
      var f = Math.min(1, (performance.now() - fade.start) / 900);
      night = fade.from + (fade.to - fade.from) * f;
      if (f >= 1) fade = null;
      mixTones();
    }
    var any = false;
    views.forEach(function (view) {
      if (!view.visible) return;
      view.render(now());
      any = true;
    });
    if (any && !document.hidden && (!reduceMotion.matches || fade)) {
      // pixel art moves in steps: about 15 frames a second is plenty
      timer = setTimeout(function () {
        timer = requestAnimationFrame(frame);
      }, fade ? 0 : 66);
    }
  }

  function wake() {
    if (!timer) timer = requestAnimationFrame(frame);
  }

  function refit() {
    views.forEach(function (view) {
      view.fit();
      view.render(now());
    });
  }

  mixTones();
  refit();
  var resizeId = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeId);
    resizeId = setTimeout(refit, 120);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
  window.addEventListener("load", refit);
  new MutationObserver(function () {
    fade = { from: night, to: root.getAttribute("data-theme") === "dark" ? 1 : 0, start: performance.now() };
    wake();
  }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  if ("IntersectionObserver" in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        views.forEach(function (view) {
          if (view.canvas === entry.target) view.visible = entry.isIntersecting && view.canvas.style.display !== "none";
        });
      });
      wake();
    });
    views.forEach(function (view) {
      seen.observe(view.canvas);
    });
  }
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) wake();
  });
  wake();
})();
