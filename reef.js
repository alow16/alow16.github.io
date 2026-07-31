/* ------------------------------------------------------------------ *
 * reef.js — a canvas coral reef that grows itself in on page load,
 *           then populates with wildlife.
 *
 * Styled after Vivian Lopez Rowe's cover illustration for "Remarkably
 * Bright Creatures": flat gouache shapes with rounded ends, no outlines,
 * navy silhouettes layered behind saturated orange / green / purple
 * corals, cream dot detailing, and a watercolour-grained blue wash.
 *
 * Order of events:
 *   1. the water wash and light shafts settle
 *   2. navy kelp and coral silhouettes rise in the deep layers
 *   3. bright finger corals, kelp blades and mounds grow in up front,
 *      cream dots beading along them as they finish
 *   4. wildlife arrives: fish schools fade in and start swimming, bubbles
 *      trickle off the reef, a whale shark, hammerheads, an ocean sunfish
 *      and stingrays glide through the mid-water and the sea bed, and
 *      starfish, urchins, anemones and clams dot the floor
 *
 * No dependencies. Respects prefers-reduced-motion and prefers-color-scheme.
 * ------------------------------------------------------------------ */

(function () {
  'use strict';

  var canvas = document.getElementById('scene');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var TAU = Math.PI * 2;
  var UP = -Math.PI / 2;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------- palettes */

  var PALETTES = {
    light: {
      /* the water column, top to bottom */
      water: ['#0a3a58', '#12689a', '#0f5c86', '#0a4265'],
      veil: '#0d4f76',
      /* deep layers read as flat silhouettes rather than hazed colour */
      deep: ['#1b3f86', '#22509f', '#193a78', '#2a5cb8'],
      /* foreground reef */
      orange: ['#ef7622', '#f2932a', '#e6551f', '#f7a53c'],
      green: ['#5fbe45', '#7fd05a', '#43a838', '#9ad769'],
      purple: ['#7b4bc4', '#9b5fd0', '#5c3aa8', '#b06fd8'],
      magenta: ['#d94fa0', '#e56bb0'],
      cream: '#f5f0e6',
      fish: ['#8b5fd0', '#d94fa0', '#f2cb3f', '#3fa9d8'],
      /* darker than the water and greener than the cobalt kelp behind it,
         so the shark reads as its own body rather than merging into either */
      shark: '#143a4f',
      sharkBelly: '#dfe9e6',
      hammerhead: '#33586a',
      hammerheadBelly: '#cddad7',
      ray: '#9c7a52',
      rayBelly: '#e6d9bd',
      sunfish: '#a9b7b5',
      sunfishBelly: '#dbe4e2',
      urchin: '#3a2a52'
    },
    dark: {
      water: ['#04202f', '#0a4160', '#083b55', '#052835'],
      veil: '#062c40',
      deep: ['#132c5e', '#173a75', '#112548', '#1d4287'],
      orange: ['#cf5f18', '#d67a21', '#c04517', '#dc8c2e'],
      green: ['#3f9a30', '#57ad3f', '#2c8226', '#6fb84a'],
      purple: ['#5f379b', '#7a48ab', '#452880', '#8b52b4'],
      magenta: ['#ad3b7f', '#bc4f8f'],
      cream: '#ece5d6',
      fish: ['#7048ad', '#ad3b7f', '#c9a833', '#2f86ad'],
      shark: '#0d2a3a',
      sharkBelly: '#b7c3c2',
      hammerhead: '#1f3944',
      hammerheadBelly: '#8fa19e',
      ray: '#5e4930',
      rayBelly: '#a99878',
      sunfish: '#69746f',
      sunfishBelly: '#9aa5a1',
      urchin: '#251a38'
    }
  };

  var pal;

  function readTheme() {
    pal = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? PALETTES.dark
      : PALETTES.light;
  }

  /* ------------------------------------------------------------ colour */

  function hex2rgb(h) {
    var n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgba(rgb, a) {
    return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')';
  }

  function mix(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }

  /* ------------------------------------------------------------ random */

  /* Seeded so the reef survives a resize unchanged. */
  function mulberry32(s) {
    return function () {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var seed = (Math.random() * 1e9) | 0;
  var rnd;
  function rr(lo, hi) { return lo + rnd() * (hi - lo); }
  function ri(n) { return (rnd() * n) | 0; }
  function pick(a) { return a[(rnd() * a.length) | 0]; }

  /* ------------------------------------------------------------ easing */

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeOutBack(t) {
    var c = 1.6;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  }
  function smooth(t) { t = clamp01(t); return t * t * (3 - 2 * t); }

  /* ------------------------------------------------------------- scene */

  /* Far to near. `floor` is the bed as a fraction of canvas height, so
     values over 1 root the biggest shapes just below the fold. Layers 0-1
     are drawn as deep silhouettes, 2-3 in full colour. */
  var LAYERS = [
    { scale: 0.46, veil: 0.20, floor: 0.885, silhouette: true,  count: 15 },
    { scale: 0.68, veil: 0.11, floor: 0.935, silhouette: true,  count: 11 },
    { scale: 0.95, veil: 0.04, floor: 0.995, silhouette: false, count: 9 },
    { scale: 1.30, veil: 0.00, floor: 1.045, silhouette: false, count: 6 }
  ];

  var W = 0, H = 0, dpr = 1;
  var waves = [];
  var colonies = [], mounds = [], fish = [], bubbles = [], critters = [];
  var shark = null, hammerheads = [], sunfishes = [], rays = [];
  var grain = null;
  var GROWN_AT = 0;

  /* The bed is a rolling contour, so the layers don't stack up as bands. */
  function floorAt(li, x) {
    var w = waves[li];
    return w.base + w.amp * (Math.sin(x * w.f1 + w.p1) * 0.62 + Math.sin(x * w.f2 + w.p2) * 0.38);
  }

  /* ------------------------------------------------- growth vocabulary */

  /* Every shape is a chain or fan of round-capped segments. Keeping the
     width nearly constant along a chain is what gives the flat, blunt
     cut-paper look instead of a tapering twig. */
  var KINDS = {
    /* tall kelp blade */
    kelp: {
      levels: function (l) { return 6 + ri(6); },
      kids: function () { return 1; },
      spread: 0,
      lenRatio: function () { return rr(0.94, 1.02); },
      widthRatio: 0.985,
      upBias: 0.07,
      curvy: true,
      stemLen: 0.048,
      stemWidth: 0.55,
      tall: true,
      sway: 0.013
    },
    /* the cover's signature: a stubby palm with chunky fingers */
    hand: {
      levels: function () { return 4 + ri(3); },
      kids: function (d) { return d === 1 ? 4 + ri(3) : 1; },
      spread: function (d) { return d === 1 ? 0.95 : 0.05; },
      lenRatio: function (d) { return d === 1 ? rr(0.80, 1.05) : rr(0.90, 1.0); },
      widthRatio: 0.99,
      fingerWidth: 0.44,
      upBias: 0.24,
      stemLen: 0.045,
      stemWidth: 0.72,
      sway: 0.005
    },
    /* chunky branching coral */
    branch: {
      levels: function () { return 3 + ri(2); },
      kids: function (d) { return d === 1 ? 3 : rnd() < 0.4 ? 3 : 2; },
      spread: function (d) { return (0.85 - d * 0.06) * rr(0.85, 1.25); },
      lenRatio: function (d) { return d === 1 ? rr(0.78, 0.95) : rr(0.66, 0.82); },
      widthRatio: 0.88,
      upBias: 0.36,
      stemLen: 0.055,
      stemWidth: 0.34,
      sway: 0.005
    },
    /* thin sea whip, beaded with cream dots */
    whip: {
      levels: function () { return 7 + ri(5); },
      kids: function (d) { return d === 1 && rnd() < 0.5 ? 2 : 1; },
      spread: 0.5,
      lenRatio: function () { return rr(0.95, 1.0); },
      widthRatio: 0.99,
      upBias: 0.08,
      curvy: true,
      stemLen: 0.036,
      stemWidth: 0.16,
      tall: true,
      sway: 0.017
    },
    /* sea fan: a short stem exploding into a wide lattice of ribs */
    fan: {
      levels: function () { return 1 + ri(2); },
      kids: function (d) { return d === 1 ? 7 + ri(4) : 1; },
      spread: function (d) { return d === 1 ? 1.3 : 0.06; },
      lenRatio: function (d) { return d === 1 ? rr(3.2, 4.6) : rr(0.7, 0.85); },
      widthRatio: 0.55,
      upBias: 0.14,
      stemLen: 0.02,
      stemWidth: 0.6,
      sway: 0.02
    }
  };

  function buildColony(kindName, cx, floorY, layer, li, startT) {
    var K = KINDS[kindName];
    var nodes = [];
    var dots = [];
    var levels = K.levels(layer);
    /* tall shapes compress less between layers, so the deep kelp still
       reaches up the way it does on the cover */
    var hScale = K.tall ? Math.pow(layer.scale, 0.6) : layer.scale;
    var stem = H * K.stemLen * hScale * rr(0.8, 1.35);
    var curve = K.curvy ? rr(-0.14, 0.14) : 0;

    nodes.push({
      p: -1,
      a: UP + rr(-0.14, 0.14),
      abs: UP,
      len: stem,
      w: Math.max(1.2, stem * K.stemWidth),
      d: 0,
      t0: startT,
      t1: startT + 300,
      phase: rr(0, TAU)
    });
    nodes[0].abs = nodes[0].a;

    var frontier = [0];
    for (var d = 1; d <= levels; d++) {
      var next = [];
      for (var f = 0; f < frontier.length; f++) {
        var pi = frontier[f];
        var parent = nodes[pi];
        var kids = K.kids(d);
        var spread = typeof K.spread === 'function' ? K.spread(d) : K.spread;

        for (var k = 0; k < kids; k++) {
          var frac = kids === 1 ? 0 : k / (kids - 1) - 0.5;
          var ang = frac * spread * 2 + curve + rr(-0.1, 0.1);

          /* coral grows toward the light: bend every segment back to vertical */
          var abs = parent.abs + ang;
          abs = abs + (UP - abs) * K.upBias;

          var wr = kindName === 'hand' && d === 1 ? K.fingerWidth : K.widthRatio;
          var dur = 300 * Math.pow(0.9, d);
          var t0 = parent.t1 - 45 + rr(0, 70);
          var node = {
            p: pi,
            a: abs - parent.abs,
            abs: abs,
            len: parent.len * K.lenRatio(d),
            w: Math.max(1, parent.w * wr),
            d: d,
            t0: t0,
            t1: t0 + dur,
            phase: rr(0, TAU)
          };
          var idx = nodes.push(node) - 1;
          if (d < levels) next.push(idx);
        }
      }
      frontier = next;
    }

    /* cream dot detailing, the cover's sucker-and-bead motif */
    var beaded = !layer.silhouette && (kindName === 'whip' || rnd() < 0.5);
    if (beaded) {
      var from = kindName === 'whip' ? 1 : Math.max(1, levels - 2);
      for (var n = 1; n < nodes.length; n++) {
        if (nodes[n].d < from) continue;
        var per = kindName === 'whip' ? 2 : 3;
        for (var q = 0; q < per; q++) {
          dots.push({
            n: n,
            u: (q + 0.5) / per,
            r: Math.max(0.8, nodes[n].w * rr(0.16, 0.26)),
            t0: nodes[n].t1 + rr(60, 320)
          });
        }
      }
    }

    var done = 0;
    for (var i = 0; i < nodes.length; i++) done = Math.max(done, nodes[i].t1);
    for (var j = 0; j < dots.length; j++) done = Math.max(done, dots[j].t0 + 320);
    GROWN_AT = Math.max(GROWN_AT, done);

    /* colour: deep layers are flat silhouettes, near layers saturated */
    var tone;
    if (layer.silhouette) {
      tone = pick(pal.deep);
    } else if (kindName === 'kelp') {
      tone = rnd() < 0.75 ? pick(pal.green) : pick(pal.purple);
    } else if (kindName === 'whip') {
      tone = rnd() < 0.5 ? pick(pal.magenta) : pick(pal.purple);
    } else if (kindName === 'hand') {
      tone = pick(rnd() < 0.45 ? pal.green : rnd() < 0.6 ? pal.purple : pal.orange);
    } else if (kindName === 'fan') {
      tone = pick(rnd() < 0.5 ? pal.magenta : pal.purple);
    } else {
      tone = pick(rnd() < 0.6 ? pal.orange : pal.purple);
    }

    return {
      kind: kindName,
      x: cx,
      y: floorY,
      li: li,
      layer: layer,
      nodes: nodes,
      dots: dots,
      tone: hex2rgb(tone),
      sway: K.sway,
      bx: new Float32Array(nodes.length),
      by: new Float32Array(nodes.length),
      aa: new Float32Array(nodes.length),
      tipX: new Float32Array(nodes.length),
      tipY: new Float32Array(nodes.length)
    };
  }

  /* small bed life: starfish, urchins, anemones, clams. Cheap, mostly
     static shapes scattered along the floor between the coral. */
  function buildCritter(cx, floorY, li, layer, startT) {
    var kind = rnd() < 0.30 ? 'star' : rnd() < 0.58 ? 'urchin' : rnd() < 0.80 ? 'anemone' : 'clam';
    var r = H * 0.013 * layer.scale * rr(0.65, 1.3);
    var tone = kind === 'urchin' ? pal.urchin
      : kind === 'anemone' ? pick(rnd() < 0.5 ? pal.magenta : pal.purple)
      : kind === 'clam' ? pick(rnd() < 0.5 ? pal.orange : pal.purple)
      : pick(rnd() < 0.5 ? pal.orange : pal.magenta);

    GROWN_AT = Math.max(GROWN_AT, startT + 600);

    return {
      kind: kind,
      x: cx,
      y: floorY,
      li: li,
      r: r,
      t0: startT,
      tone: hex2rgb(tone),
      rot: rr(0, TAU),
      phase: rr(0, TAU),
      arms: 5,
      spikes: 10 + ri(6),
      tentacles: 7 + ri(4)
    };
  }

  /* ----------------------------------------------------------- builder */

  function buildScene() {
    rnd = mulberry32(seed);
    colonies = []; mounds = []; fish = []; bubbles = []; waves = [];
    critters = []; hammerheads = []; sunfishes = []; rays = [];
    GROWN_AT = 0;

    for (var wi = 0; wi < LAYERS.length; wi++) {
      waves.push({
        base: H * LAYERS[wi].floor,
        amp: H * 0.014 * LAYERS[wi].scale * rr(0.7, 1.4),
        f1: (TAU / W) * rr(0.8, 1.6),
        f2: (TAU / W) * rr(2.2, 4.0),
        p1: rr(0, TAU),
        p2: rr(0, TAU)
      });
    }

    for (var li = 0; li < LAYERS.length; li++) {
      var layer = LAYERS[li];
      var slots = Math.max(3, Math.round(layer.count * (0.6 + W / 2000)));

      for (var i = 0; i < slots; i++) {
        /* spread across the width, jittered, with a bias to the edges on
           the nearest layer so the middle stays open for the text */
        var u = (i + rr(0.15, 0.85)) / slots;
        if (li === 3) u = u < 0.5 ? u * 0.44 : 1 - (1 - u) * 0.44;
        var cx = W * u;
        var floorY = floorAt(li, cx);
        var startT = 200 + li * 190 + i * 60 + rr(0, 110);
        var roll = rnd();

        /* bed life scattered independently of whatever grows in this slot */
        if (li >= 1 && rnd() < 0.5) {
          var crx = cx + rr(-1, 1) * H * 0.028 * layer.scale;
          critters.push(buildCritter(crx, floorAt(li, crx), li, layer, startT + rr(80, 260)));
        }

        if (roll < 0.06 + (layer.silhouette ? 0 : 0.08)) {
          /* flat mound, textured as smooth, beaded or brain-coral grooves */
          var rx = H * 0.04 * layer.scale * rr(0.7, 1.6);
          var textureRoll = layer.silhouette ? 1 : rnd();
          mounds.push({
            li: li,
            x: cx,
            y: floorY,
            rx: rx,
            ry: rx * rr(0.45, 0.7),
            t0: startT,
            tone: hex2rgb(layer.silhouette ? pick(pal.deep) : pick(rnd() < 0.5 ? pal.purple : pal.orange)),
            beaded: textureRoll >= 0.35 && textureRoll < 0.65,
            groove: textureRoll < 0.35,
            dots: 3 + ri(4),
            seed: rnd()
          });
          GROWN_AT = Math.max(GROWN_AT, startT + 700);
          continue;
        }

        var kind = roll < 0.30 ? 'kelp'
          : roll < 0.58 ? 'hand'
          : roll < 0.74 ? 'branch'
          : roll < 0.88 ? 'whip'
          : 'fan';
        /* whips earn their keep from the cream beading, which the deep
           silhouette layers don't get — they'd just read as stray wires */
        if (layer.silhouette && kind === 'whip') kind = 'branch';

        /* kelp comes up in clumps of blades from nearly the same spot */
        var clump = kind === 'kelp' ? 2 + ri(3) : 1;
        for (var c = 0; c < clump; c++) {
          var bx = cx + rr(-1, 1) * H * 0.022 * layer.scale;
          colonies.push(buildColony(kind, bx, floorAt(li, bx), layer, li, startT + c * 90 + rr(0, 80)));
        }
      }
    }

    /* ---- wildlife ---- */

    var schools = Math.max(3, Math.round(W / 340));
    var arrive = 1600;
    for (var sc = 0; sc < schools; sc++) {
      var sli = 1 + ri(3);
      var slayer = LAYERS[sli];
      var dir = rnd() < 0.5 ? -1 : 1;
      var size = H * 0.0095 * slayer.scale * rr(0.7, 1.5);
      var speed = rr(16, 44) * slayer.scale * dir;
      var tone = hex2rgb(pick(pal.fish));
      var ox = rnd() * W;
      var oy = H * rr(0.56, 0.96);
      var members = 3 + ri(7);

      for (var m = 0; m < members; m++) {
        fish.push({
          li: sli,
          x: ox + rr(-1, 1) * size * 9,
          y: oy + rr(-1, 1) * size * 5,
          size: size * rr(0.8, 1.2),
          speed: speed * rr(0.92, 1.08),
          dir: dir,
          tone: tone,
          phase: rr(0, TAU),
          bob: rr(2, 7) * slayer.scale,
          t0: arrive + m * 90 + rr(0, 220)
        });
      }
      arrive += rr(420, 900);
    }

    var bc = Math.round(12 + W / 110);
    for (var bb = 0; bb < bc; bb++) {
      bubbles.push({ alive: false, wait: 1900 + rnd() * 5200 });
    }

    /* the whale shark: hero of the mid-water, always on its way through.
       Sized and placed so the whole animal — nose to tail tip — clears both
       the text above and the reef below. */
    var len = Math.min(W * 0.44, H * 0.52);
    shark = {
      len: len,
      y: Math.max(H * 0.5, H * rr(0.54, 0.62)),
      dir: rnd() < 0.5 ? -1 : 1,
      travel: W + len * 2.9,
      speed: (W + len * 2.9) / 34000,   /* px per ms — one slow crossing */
      t0: 2100,
      phase: rr(0, TAU)
    };

    /* hammerheads: quicker, smaller patrollers than the whale shark,
       crossing higher in the water column */
    var hCount = W > 700 ? 1 + ri(2) : 1;
    for (var hh = 0; hh < hCount; hh++) {
      var hlen = Math.min(W * 0.16, H * 0.22) * rr(0.85, 1.15);
      hammerheads.push({
        len: hlen,
        y: H * rr(0.30, 0.5),
        dir: rnd() < 0.5 ? -1 : 1,
        travel: W + hlen * 2.6,
        speed: (W + hlen * 2.6) / rr(15000, 21000),
        travelled: rr(0, W),
        t0: 2600 + hh * 3400 + rr(0, 900),
        phase: rr(0, TAU)
      });
    }

    /* the ocean sunfish: a slow drifter with tall dorsal and anal fins
       and no true tail, so it never gets a tail-beat sweep */
    var sCount = rnd() < 0.15 ? 2 : 1;
    for (var sfI = 0; sfI < sCount; sfI++) {
      var slen = Math.min(W * 0.20, H * 0.30) * rr(0.85, 1.1);
      sunfishes.push({
        len: slen,
        y: H * rr(0.22, 0.4),
        dir: rnd() < 0.5 ? -1 : 1,
        travel: W + slen * 2.4,
        speed: (W + slen * 2.4) / rr(30000, 40000),
        travelled: rr(0, W),
        t0: 3400 + sfI * 5200 + rr(0, 1200),
        phase: rr(0, TAU)
      });
    }

    /* stingrays: hug the bed and glide across low, rather than cruising
       the open water like the bigger animals above */
    var rCount = 1 + ri(2);
    for (var ryI = 0; ryI < rCount; ryI++) {
      var raylen = Math.min(W * 0.15, H * 0.2) * rr(0.8, 1.2);
      rays.push({
        len: raylen,
        y: H * rr(0.72, 0.9),
        dir: rnd() < 0.5 ? -1 : 1,
        travel: W + raylen * 2.4,
        speed: (W + raylen * 2.4) / rr(20000, 28000),
        travelled: rr(0, W),
        t0: 2000 + ryI * 2600 + rr(0, 800),
        phase: rr(0, TAU)
      });
    }

    /* watercolour grain, built once per resize */
    grain = document.createElement('canvas');
    grain.width = grain.height = 96;
    var gx = grain.getContext('2d');
    var img = gx.createImageData(96, 96);
    for (var p = 0; p < img.data.length; p += 4) {
      var v = rnd() < 0.5 ? 0 : 255;
      img.data[p] = img.data[p + 1] = img.data[p + 2] = v;
      img.data[p + 3] = rnd() * 26;
    }
    gx.putImageData(img, 0, 0);
  }

  /* -------------------------------------------------------------- draw */

  function surge(t, phase, amp) {
    var swell = 1 + 0.36 * Math.sin(t * 0.00018 + 1.1);
    return amp * swell * Math.sin(t * 0.00052 + phase);
  }

  function drawColony(c, t) {
    var nodes = c.nodes;
    var swayScale = reduced ? 0 : 1;
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(c.tone, 1);

    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var bx, by, baseA;

      if (n.p < 0) {
        bx = c.x;
        by = c.y;
        baseA = n.a;
      } else {
        bx = c.tipX[n.p];
        by = c.tipY[n.p];
        baseA = c.aa[n.p] + n.a;
      }

      var settled = smooth((t - n.t1) / 900);
      var a = baseA + surge(t, n.phase + n.d * 0.5, c.sway * (0.4 + n.d * 0.5) * swayScale * settled);

      c.bx[i] = bx;
      c.by[i] = by;
      c.aa[i] = a;
      c.tipX[i] = bx + Math.cos(a) * n.len;
      c.tipY[i] = by + Math.sin(a) * n.len;

      var p = clamp01((t - n.t0) / (n.t1 - n.t0));
      if (p <= 0) continue;
      var grown = easeOut(p);

      ctx.lineWidth = n.w;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a) * n.len * grown, by + Math.sin(a) * n.len * grown);
      ctx.stroke();
    }

    if (!c.dots.length) return;
    ctx.fillStyle = rgba(hex2rgb(pal.cream), 0.9);
    for (var k = 0; k < c.dots.length; k++) {
      var dt = c.dots[k];
      var s = easeOutBack(clamp01((t - dt.t0) / 320));
      if (s <= 0) continue;
      var nn = dt.n;
      ctx.beginPath();
      ctx.arc(
        c.bx[nn] + (c.tipX[nn] - c.bx[nn]) * dt.u,
        c.by[nn] + (c.tipY[nn] - c.by[nn]) * dt.u,
        dt.r * s, 0, TAU
      );
      ctx.fill();
    }
  }

  function drawMound(m, t) {
    var s = easeOutBack(clamp01((t - m.t0) / 700));
    if (s <= 0) return;
    var rx = m.rx * s, ry = m.ry * s;

    ctx.fillStyle = rgba(m.tone, 1);
    ctx.beginPath();
    ctx.ellipse(m.x, m.y, rx, ry, 0, Math.PI, TAU);
    ctx.fill();

    if (m.groove && s > 0.6) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(m.x, m.y, rx, ry, 0, Math.PI, TAU);
      ctx.clip();
      ctx.strokeStyle = rgba(mix(m.tone, [0, 0, 0], 0.28), 0.85);
      ctx.lineWidth = Math.max(1, rx * 0.05);
      ctx.lineCap = 'round';
      var lines = 3 + (m.dots % 2);
      for (var gi = 0; gi < lines; gi++) {
        var gy = m.y - ry * (0.15 + gi * (0.55 / lines));
        ctx.beginPath();
        ctx.moveTo(m.x - rx * 0.85, gy);
        ctx.quadraticCurveTo(m.x - rx * 0.25, gy - ry * 0.22, m.x, gy);
        ctx.quadraticCurveTo(m.x + rx * 0.25, gy + ry * 0.22, m.x + rx * 0.85, gy);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (!m.beaded || s < 0.85) return;
    ctx.fillStyle = rgba(hex2rgb(pal.cream), 0.85);
    for (var i = 0; i < m.dots; i++) {
      var a = Math.PI + ((i + 0.5) / m.dots) * Math.PI;
      ctx.beginPath();
      ctx.arc(m.x + Math.cos(a) * rx * 0.6, m.y + Math.sin(a) * ry * 0.6, Math.max(0.9, rx * 0.05), 0, TAU);
      ctx.fill();
    }
  }

  function drawFishLayer(li, t, dt) {
    for (var i = 0; i < fish.length; i++) {
      var f = fish[i];
      if (f.li !== li) continue;
      var fade = smooth((t - f.t0) / 900);
      if (fade <= 0) continue;

      if (!reduced) {
        f.x += f.speed * dt;
        var margin = f.size * 4;
        if (f.x > W + margin) f.x = -margin;
        if (f.x < -margin) f.x = W + margin;
      }

      var wig = Math.sin(t * 0.011 + f.phase);
      var y = f.y + (reduced ? 0 : Math.sin(t * 0.0013 + f.phase) * f.bob);
      var s = f.size;

      ctx.save();
      ctx.translate(f.x, y);
      ctx.scale(f.dir, 1);
      ctx.fillStyle = rgba(f.tone, fade);

      ctx.beginPath();
      ctx.ellipse(0, 0, s, s * 0.5, 0, 0, TAU);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-s * 0.75, 0);
      ctx.lineTo(-s * 1.8, -s * 0.62 + wig * s * 0.24);
      ctx.lineTo(-s * 1.8, s * 0.62 + wig * s * 0.24);
      ctx.closePath();
      ctx.fill();

      if (s > 5) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.1, -s * 0.42);
        ctx.lineTo(s * 0.18, -s * 0.9 - wig * s * 0.1);
        ctx.lineTo(s * 0.46, -s * 0.36);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /* ------------------------------------------------------ whale shark */

  function drawShark(t, dt) {
    var fade = smooth((t - shark.t0) / 1600);
    if (fade <= 0) return;

    if (shark.travelled === undefined) shark.travelled = 0;
    if (!reduced) {
      shark.travelled += shark.speed * dt * 1000;
      if (shark.travelled > shark.travel) {
        shark.travelled = 0;
        shark.y = Math.max(H * 0.5, H * rr(0.54, 0.62));
        shark.dir = rnd() < 0.5 ? -1 : 1;
      }
    } else {
      shark.travelled = shark.travel * 0.42;
    }

    var L = shark.len;
    var x = shark.dir > 0 ? -L * 1.45 + shark.travelled : W + L * 1.45 - shark.travelled;
    var bob = reduced ? 0 : Math.sin(t * 0.00042 + shark.phase) * L * 0.035;
    var beat = reduced ? 0 : Math.sin(t * 0.0011 + shark.phase);
    var y = shark.y + bob;

    var body = hex2rgb(pal.shark);
    var belly = hex2rgb(pal.sharkBelly);
    var cream = hex2rgb(pal.cream);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(shark.dir, 1);
    ctx.rotate(bob * 0.0009);

    /* far-side pectoral fin, a shade deeper so it sits behind the body
       without reading as a detached shape */
    ctx.fillStyle = rgba(mix(body, [0, 0, 0], 0.16), fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.20, L * 0.055);
    ctx.quadraticCurveTo(L * 0.10, L * 0.195, -L * 0.06, L * 0.23 + beat * L * 0.012);
    ctx.quadraticCurveTo(L * 0.03, L * 0.115, L * 0.15, L * 0.075);
    ctx.closePath();
    ctx.fill();

    /* body: broad flat head tapering to a narrow peduncle */
    ctx.fillStyle = rgba(body, fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.5, -L * 0.012);
    ctx.quadraticCurveTo(L * 0.45, -L * 0.085, L * 0.34, -L * 0.1);
    ctx.bezierCurveTo(L * 0.1, -L * 0.125, -L * 0.12, -L * 0.105, -L * 0.3, -L * 0.048);
    ctx.quadraticCurveTo(-L * 0.37, -L * 0.032, -L * 0.4, -L * 0.022);
    /* tail: a broad crescent — long upper lobe, notch, shorter lower lobe.
       The control points sit well apart so each lobe has real area rather
       than closing up into a sliver. */
    var sweep = beat * L * 0.07;
    ctx.quadraticCurveTo(-L * 0.44, -L * 0.12 + sweep * 0.6, -L * 0.56, -L * 0.23 + sweep);
    ctx.quadraticCurveTo(-L * 0.53, -L * 0.07 + sweep * 0.5, -L * 0.43, L * 0.002);
    ctx.quadraticCurveTo(-L * 0.47, L * 0.07 + sweep * 0.7, -L * 0.54, L * 0.17 + sweep);
    ctx.quadraticCurveTo(-L * 0.47, L * 0.09 + sweep * 0.5, -L * 0.39, L * 0.028);
    /* underside back to the snout */
    ctx.bezierCurveTo(-L * 0.14, L * 0.115, L * 0.12, L * 0.135, L * 0.33, L * 0.105);
    ctx.quadraticCurveTo(L * 0.45, L * 0.088, L * 0.5, -L * 0.012);
    ctx.closePath();
    ctx.fill();

    /* pale belly */
    ctx.save();
    ctx.clip();
    ctx.fillStyle = rgba(belly, 0.5 * fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.46, L * 0.03);
    ctx.bezierCurveTo(L * 0.1, L * 0.16, -L * 0.16, L * 0.13, -L * 0.4, L * 0.03);
    ctx.lineTo(-L * 0.4, L * 0.2);
    ctx.lineTo(L * 0.5, L * 0.2);
    ctx.closePath();
    ctx.fill();

    /* gill slits */
    ctx.strokeStyle = rgba(mix(body, [0, 0, 0], 0.3), 0.5 * fade);
    ctx.lineWidth = Math.max(0.8, L * 0.006);
    for (var g = 0; g < 5; g++) {
      var gxp = L * (0.3 - g * 0.032);
      ctx.beginPath();
      ctx.moveTo(gxp, -L * 0.055);
      ctx.quadraticCurveTo(gxp - L * 0.012, 0, gxp, L * 0.062);
      ctx.stroke();
    }

    /* the spot-and-stripe grid whale sharks are named for */
    ctx.fillStyle = rgba(cream, 0.82 * fade);
    for (var row = 0; row < 5; row++) {
      for (var col = 0; col < 13; col++) {
        var u = -0.36 + col * 0.055 + (row % 2) * 0.026;
        var v = -0.082 + row * 0.043;
        var r = L * (0.0075 - Math.abs(v) * 0.02);
        if (r <= 0.4) continue;
        ctx.beginPath();
        ctx.arc(L * u, L * v, r, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();

    /* dorsal fin, laid over the body in the same tone so the silhouette
       merges instead of showing a seam. The back has already tapered to
       about -0.08L by here, so the base has to sit inside that contour —
       drawn any higher the fin floats clear of the body. */
    ctx.fillStyle = rgba(body, fade);
    ctx.beginPath();
    ctx.moveTo(-L * 0.02, -L * 0.092);
    ctx.quadraticCurveTo(-L * 0.1, -L * 0.28, -L * 0.2, -L * 0.062);
    ctx.quadraticCurveTo(-L * 0.11, -L * 0.058, -L * 0.02, -L * 0.092);
    ctx.closePath();
    ctx.fill();

    /* eye */
    ctx.fillStyle = rgba(mix(body, [0, 0, 0], 0.55), 0.9 * fade);
    ctx.beginPath();
    ctx.arc(L * 0.4, -L * 0.038, Math.max(1, L * 0.011), 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  /* ------------------------------------------------------- hammerhead */

  function drawHammerhead(h, t, dt) {
    var fade = smooth((t - h.t0) / 1400);
    if (fade <= 0) return;

    if (!reduced) {
      h.travelled += h.speed * dt * 1000;
      if (h.travelled > h.travel) {
        h.travelled = 0;
        h.y = H * rr(0.30, 0.5);
        h.dir = rnd() < 0.5 ? -1 : 1;
      }
    } else {
      h.travelled = h.travel * 0.3;
    }

    var L = h.len;
    var x = h.dir > 0 ? -L * 1.3 + h.travelled : W + L * 1.3 - h.travelled;
    var bob = reduced ? 0 : Math.sin(t * 0.0006 + h.phase) * L * 0.03;
    var beat = reduced ? 0 : Math.sin(t * 0.0032 + h.phase);
    var y = h.y + bob;

    var body = hex2rgb(pal.hammerhead);
    var belly = hex2rgb(pal.hammerheadBelly);
    var sweep = beat * L * 0.05;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(h.dir, 1);
    ctx.rotate(beat * 0.05);

    /* far pectoral, swept back and shaded a shade darker so it sits behind */
    ctx.fillStyle = rgba(mix(body, [0, 0, 0], 0.18), fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.06, L * 0.02);
    ctx.quadraticCurveTo(-L * 0.05, L * 0.16, -L * 0.22, L * 0.2);
    ctx.quadraticCurveTo(-L * 0.06, L * 0.09, L * 0.02, L * 0.05);
    ctx.closePath();
    ctx.fill();

    /* body: torpedo shark shape tapering into a heterocercal tail */
    ctx.fillStyle = rgba(body, fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.40, -L * 0.008);
    ctx.quadraticCurveTo(L * 0.30, -L * 0.075, L * 0.05, -L * 0.085);
    ctx.quadraticCurveTo(-L * 0.15, -L * 0.07, -L * 0.30, -L * 0.045);
    ctx.quadraticCurveTo(-L * 0.42, -L * 0.09 + sweep * 0.6, -L * 0.52, -L * 0.2 + sweep);
    ctx.quadraticCurveTo(-L * 0.46, -L * 0.05 + sweep * 0.5, -L * 0.40, -L * 0.008);
    ctx.quadraticCurveTo(-L * 0.44, L * 0.05 + sweep * 0.5, -L * 0.50, L * 0.10 + sweep);
    ctx.quadraticCurveTo(-L * 0.42, L * 0.04 + sweep * 0.4, -L * 0.32, L * 0.02);
    ctx.quadraticCurveTo(-L * 0.12, L * 0.09, L * 0.10, L * 0.08);
    ctx.quadraticCurveTo(L * 0.28, L * 0.06, L * 0.34, L * 0.02);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.clip();
    ctx.fillStyle = rgba(belly, 0.4 * fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.32, L * 0.06);
    ctx.quadraticCurveTo(-L * 0.05, L * 0.10, -L * 0.32, L * 0.02);
    ctx.lineTo(-L * 0.32, L * 0.16);
    ctx.lineTo(L * 0.36, L * 0.14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    /* the cephalofoil: a flattened bar spanning above and below the body,
       which from the side is exactly the hammerhead's tell */
    ctx.fillStyle = rgba(body, fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.40, -L * 0.02);
    ctx.quadraticCurveTo(L * 0.37, -L * 0.20, L * 0.30, -L * 0.21);
    ctx.quadraticCurveTo(L * 0.24, -L * 0.20, L * 0.27, -L * 0.02);
    ctx.quadraticCurveTo(L * 0.24, L * 0.17, L * 0.30, L * 0.19);
    ctx.quadraticCurveTo(L * 0.37, L * 0.18, L * 0.40, L * 0.01);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = rgba(mix(body, [0, 0, 0], 0.5), 0.9 * fade);
    ctx.beginPath();
    ctx.arc(L * 0.295, -L * 0.195, Math.max(1, L * 0.014), 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(L * 0.295, L * 0.175, Math.max(1, L * 0.014), 0, TAU);
    ctx.fill();

    /* dorsal fin, based well inside the back's contour */
    ctx.fillStyle = rgba(body, fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.02, -L * 0.06);
    ctx.quadraticCurveTo(-L * 0.01, -L * 0.28, -L * 0.14, -L * 0.24);
    ctx.quadraticCurveTo(-L * 0.10, -L * 0.10, -L * 0.02, -L * 0.06);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /* ------------------------------------------------------ ocean sunfish */

  function drawSunfish(s, t, dt) {
    var fade = smooth((t - s.t0) / 1800);
    if (fade <= 0) return;

    if (!reduced) {
      s.travelled += s.speed * dt * 1000;
      if (s.travelled > s.travel) {
        s.travelled = 0;
        s.y = H * rr(0.22, 0.4);
        s.dir = rnd() < 0.5 ? -1 : 1;
      }
    } else {
      s.travelled = s.travel * 0.55;
    }

    var L = s.len;
    var x = s.dir > 0 ? -L * 0.7 + s.travelled : W + L * 0.7 - s.travelled;
    var bob = reduced ? 0 : Math.sin(t * 0.00035 + s.phase) * L * 0.04;
    var flap = reduced ? 0 : Math.sin(t * 0.0028 + s.phase);
    var y = s.y + bob;

    var body = hex2rgb(pal.sunfish);
    var belly = hex2rgb(pal.sunfishBelly);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s.dir, 1);

    /* body: a tall lens, longer top-to-bottom than nose-to-tail */
    ctx.fillStyle = rgba(body, fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.48, 0);
    ctx.bezierCurveTo(L * 0.40, -L * 0.34, L * 0.05, -L * 0.40, -L * 0.16, -L * 0.30);
    ctx.bezierCurveTo(-L * 0.34, -L * 0.19, -L * 0.36, L * 0.19, -L * 0.16, L * 0.30);
    ctx.bezierCurveTo(L * 0.05, L * 0.40, L * 0.40, L * 0.34, L * 0.48, 0);
    ctx.closePath();
    ctx.fill();

    /* faint mottling, mola mola's rough hide */
    ctx.save();
    ctx.clip();
    ctx.fillStyle = rgba(mix(body, [0, 0, 0], 0.12), 0.5 * fade);
    var blotch = [[0.1, -0.1, 0.09], [-0.05, 0.14, 0.07], [0.22, 0.08, 0.06], [-0.15, -0.14, 0.07]];
    for (var bl = 0; bl < blotch.length; bl++) {
      ctx.beginPath();
      ctx.ellipse(L * blotch[bl][0], L * blotch[bl][1], L * blotch[bl][2], L * blotch[bl][2] * 0.7, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    /* dorsal fin, tall and paddle-shaped, based well inside the back */
    ctx.fillStyle = rgba(body, fade);
    ctx.beginPath();
    ctx.moveTo(-L * 0.02, -L * 0.22);
    ctx.quadraticCurveTo(-L * 0.05, -L * 0.72, -L * 0.22, -L * 0.76);
    ctx.quadraticCurveTo(-L * 0.16, -L * 0.32, -L * 0.09, -L * 0.20);
    ctx.closePath();
    ctx.fill();

    /* anal fin, its mirror below and set slightly further back */
    ctx.beginPath();
    ctx.moveTo(-L * 0.06, L * 0.22);
    ctx.quadraticCurveTo(-L * 0.09, L * 0.68, -L * 0.26, L * 0.72);
    ctx.quadraticCurveTo(-L * 0.19, L * 0.31, -L * 0.13, L * 0.20);
    ctx.closePath();
    ctx.fill();

    /* small pale paddle-like pectoral, flapping in place of a tail */
    ctx.save();
    ctx.translate(L * 0.08, L * 0.05);
    ctx.rotate(flap * 0.35);
    ctx.fillStyle = rgba(belly, 0.85 * fade);
    ctx.beginPath();
    ctx.ellipse(0, 0, L * 0.09, L * 0.035, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    /* eye and small mouth at the snout */
    ctx.fillStyle = rgba(mix(body, [0, 0, 0], 0.55), 0.9 * fade);
    ctx.beginPath();
    ctx.arc(L * 0.34, -L * 0.06, Math.max(1, L * 0.012), 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(mix(body, [0, 0, 0], 0.4), 0.8 * fade);
    ctx.lineWidth = Math.max(0.8, L * 0.008);
    ctx.beginPath();
    ctx.moveTo(L * 0.44, L * 0.01);
    ctx.lineTo(L * 0.47, L * 0.02);
    ctx.stroke();

    ctx.restore();
  }

  /* ---------------------------------------------------------- stingray */

  function drawStingray(r, t, dt) {
    var fade = smooth((t - r.t0) / 1400);
    if (fade <= 0) return;

    if (!reduced) {
      r.travelled += r.speed * dt * 1000;
      if (r.travelled > r.travel) {
        r.travelled = 0;
        r.y = H * rr(0.72, 0.9);
        r.dir = rnd() < 0.5 ? -1 : 1;
      }
    } else {
      r.travelled = r.travel * 0.6;
    }

    var L = r.len;
    var x = r.dir > 0 ? -L * 0.9 + r.travelled : W + L * 0.9 - r.travelled;
    var glide = reduced ? 0 : Math.sin(t * 0.0016 + r.phase);
    var bob = reduced ? 0 : Math.sin(t * 0.0009 + r.phase) * L * 0.05;
    var y = r.y + bob;

    var body = hex2rgb(pal.ray);
    var belly = hex2rgb(pal.rayBelly);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(r.dir, 1);
    ctx.rotate(glide * 0.06);

    /* whip tail, drawn first so the body's rear point covers its root */
    ctx.strokeStyle = rgba(mix(body, [0, 0, 0], 0.1), 0.9 * fade);
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, L * 0.02);
    ctx.beginPath();
    ctx.moveTo(-L * 0.28, 0);
    ctx.quadraticCurveTo(-L * 0.55, glide * L * 0.06, -L * 0.85, glide * L * 0.14 - L * 0.02);
    ctx.stroke();

    /* the kite-shaped disc, wingtips rippling gently with `glide` */
    ctx.fillStyle = rgba(body, fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.5, 0);
    ctx.quadraticCurveTo(L * 0.25, -L * 0.18 - glide * L * 0.03, -L * 0.05, -L * 0.60 - glide * L * 0.05);
    ctx.quadraticCurveTo(-L * 0.26, -L * 0.34, -L * 0.32, -L * 0.08);
    ctx.quadraticCurveTo(-L * 0.36, 0, -L * 0.32, L * 0.08);
    ctx.quadraticCurveTo(-L * 0.26, L * 0.34, -L * 0.05, L * 0.60 + glide * L * 0.05);
    ctx.quadraticCurveTo(L * 0.25, L * 0.18 + glide * L * 0.03, L * 0.5, 0);
    ctx.closePath();
    ctx.fill();

    /* pale trailing edge along the wings */
    ctx.save();
    ctx.clip();
    ctx.fillStyle = rgba(belly, 0.28 * fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.3, -L * 0.42);
    ctx.quadraticCurveTo(-L * 0.1, -L * 0.5, -L * 0.3, -L * 0.2);
    ctx.lineTo(-L * 0.34, 0);
    ctx.lineTo(-L * 0.3, L * 0.2);
    ctx.quadraticCurveTo(-L * 0.1, L * 0.5, L * 0.3, L * 0.42);
    ctx.lineTo(L * 0.2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    /* eyes on top of the head */
    ctx.fillStyle = rgba(mix(body, [0, 0, 0], 0.5), 0.85 * fade);
    ctx.beginPath();
    ctx.arc(L * 0.32, -L * 0.05, Math.max(1, L * 0.014), 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(L * 0.32, L * 0.05, Math.max(1, L * 0.014), 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  /* -------------------------------------------------------- bed critters */

  function drawCritter(c, t) {
    var grow = easeOutBack(clamp01((t - c.t0) / 600));
    if (grow <= 0) return;
    var r = c.r * grow;
    var tone = c.tone;
    var cream = hex2rgb(pal.cream);

    if (c.kind === 'star') {
      ctx.fillStyle = rgba(tone, 1);
      ctx.beginPath();
      var arms = c.arms, outer = r, inner = r * 0.42;
      for (var i = 0; i < arms * 2; i++) {
        var a = c.rot + (i / (arms * 2)) * TAU;
        var rad = i % 2 === 0 ? outer : inner;
        var px = c.x + Math.cos(a) * rad;
        var py = c.y + Math.sin(a) * rad * 0.55 - r * 0.3;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba(cream, 0.85);
      ctx.beginPath();
      ctx.arc(c.x, c.y - r * 0.3, r * 0.16, 0, TAU);
      ctx.fill();

    } else if (c.kind === 'urchin') {
      ctx.strokeStyle = rgba(tone, 0.9);
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(0.8, r * 0.09);
      var spikes = c.spikes;
      for (var sp = 0; sp < spikes; sp++) {
        var sa = (sp / spikes) * Math.PI - Math.PI;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - r * 0.35);
        ctx.lineTo(c.x + Math.cos(sa) * r * 1.15, c.y - r * 0.35 + Math.sin(sa) * r * 1.15 * 0.7);
        ctx.stroke();
      }
      ctx.fillStyle = rgba(tone, 1);
      ctx.beginPath();
      ctx.ellipse(c.x, c.y - r * 0.35, r * 0.55, r * 0.42, 0, 0, TAU);
      ctx.fill();

    } else if (c.kind === 'anemone') {
      var sway = reduced ? 0 : Math.sin(t * 0.0015 + c.phase) * 0.16;
      ctx.fillStyle = rgba(mix(tone, [0, 0, 0], 0.12), 1);
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, r * 0.75, r * 0.32, 0, Math.PI, TAU);
      ctx.fill();
      ctx.fillStyle = rgba(tone, 1);
      var tent = c.tentacles;
      for (var k = 0; k < tent; k++) {
        var u = (k + 0.5) / tent - 0.5;
        var lean = sway + u * 0.3;
        var bx = c.x + u * r * 1.3;
        var by = c.y - r * 0.12;
        ctx.beginPath();
        ctx.ellipse(
          bx + Math.sin(lean) * r * 0.35,
          by - r * 0.55 + Math.cos(lean) * r * 0.06,
          r * 0.13, r * 0.42, lean * 0.5, 0, TAU
        );
        ctx.fill();
      }
      ctx.fillStyle = rgba(cream, 0.8);
      ctx.beginPath();
      ctx.arc(c.x, c.y - r * 0.15, r * 0.12, 0, TAU);
      ctx.fill();

    } else {
      /* clam: a small ridged shell, cracked open a sliver */
      ctx.fillStyle = rgba(tone, 1);
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, r * 0.85, r * 0.5, 0, Math.PI, TAU);
      ctx.fill();
      ctx.strokeStyle = rgba(mix(tone, [0, 0, 0], 0.25), 0.7);
      ctx.lineWidth = Math.max(0.6, r * 0.05);
      for (var g = 1; g < 4; g++) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, r * 0.85 * (g / 4), Math.PI, TAU);
        ctx.stroke();
      }
      ctx.fillStyle = rgba(cream, 0.9);
      ctx.beginPath();
      ctx.arc(c.x - r * 0.1, c.y - r * 0.08, r * 0.14, 0, TAU);
      ctx.fill();
    }
  }

  /* ------------------------------------------------------------ extras */

  function drawBubbles(t, dt) {
    if (reduced) return;
    var cream = hex2rgb(pal.cream);

    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];

      if (!b.alive) {
        if (t < b.wait) continue;
        b.alive = true;
        b.x = rnd() * W;
        b.y = H * rr(0.86, 1.0);
        b.r = rr(1.1, 3.4);
        b.vy = rr(18, 52);
        b.phase = rr(0, TAU);
        b.alpha = rr(0.2, 0.5);
        b.top = H * rr(0.3, 0.7);
      }

      b.y -= b.vy * dt;
      b.x += Math.sin(t * 0.0024 + b.phase) * 9 * dt;

      if (b.y < b.top) {
        b.alive = false;
        b.wait = t + rnd() * 2400;
        continue;
      }

      ctx.strokeStyle = rgba(cream, b.alpha * (1 - smooth((b.top + 40 - b.y) / 40)));
      ctx.lineWidth = Math.max(0.6, b.r * 0.34);
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.stroke();
    }
  }

  /* light filtering down from the surface */
  function drawShafts(t) {
    var cream = hex2rgb(pal.cream);
    var top = 0;
    var bottom = H * 0.99;

    for (var i = 0; i < 4; i++) {
      var drift = reduced ? 0 : Math.sin(t * 0.00013 + i * 1.9) * W * 0.05;
      var x = W * (0.12 + i * 0.25) + drift;
      var w = W * (0.06 + i * 0.014);

      for (var pass = 0; pass < 2; pass++) {
        var spread = pass === 0 ? 2.1 : 1;
        var a = pass === 0 ? 0.03 : 0.05;
        var g = ctx.createLinearGradient(0, top, 0, bottom);
        g.addColorStop(0, rgba(cream, a));
        g.addColorStop(1, rgba(cream, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - w * (spread - 1) * 0.5, top);
        ctx.lineTo(x + w * spread, top);
        ctx.lineTo(x + w * (2.4 + spread), bottom);
        ctx.lineTo(x + w * 1.4, bottom);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  /* --------------------------------------------------------------- frame */

  var lastT = 0;

  function frame(t) {
    var dt = Math.min(0.064, Math.max(0, (t - lastT) / 1000));
    lastT = t;

    /* the water column */
    var wg = ctx.createLinearGradient(0, 0, 0, H);
    wg.addColorStop(0, pal.water[0]);
    wg.addColorStop(0.42, pal.water[1]);
    wg.addColorStop(0.78, pal.water[2]);
    wg.addColorStop(1, pal.water[3]);
    ctx.fillStyle = wg;
    ctx.fillRect(0, 0, W, H);

    drawShafts(t);

    var veilRGB = hex2rgb(pal.veil);

    for (var li = 0; li < LAYERS.length; li++) {
      for (var m = 0; m < mounds.length; m++) {
        if (mounds[m].li === li) drawMound(mounds[m], t);
      }
      for (var cr = 0; cr < critters.length; cr++) {
        if (critters[cr].li === li) drawCritter(critters[cr], t);
      }
      for (var c = 0; c < colonies.length; c++) {
        if (colonies[c].li === li) drawColony(colonies[c], t);
      }
      drawFishLayer(li, t, dt);

      if (LAYERS[li].veil > 0) {
        ctx.fillStyle = rgba(veilRGB, LAYERS[li].veil);
        ctx.fillRect(0, 0, W, H);
      }

      /* mid-water roamers cruise between the deep layers and the reef */
      if (li === 1) {
        drawShark(t, dt);
        for (var sf = 0; sf < sunfishes.length; sf++) drawSunfish(sunfishes[sf], t, dt);
      }
      if (li === 2) {
        for (var hd = 0; hd < hammerheads.length; hd++) drawHammerhead(hammerheads[hd], t, dt);
        for (var ry = 0; ry < rays.length; ry++) drawStingray(rays[ry], t, dt);
      }
    }

    drawBubbles(t, dt);

    /* watercolour grain */
    if (grain) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      var pat = ctx.createPattern(grain, 'repeat');
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    /* settle the top of the frame so the text sits on quiet water */
    var grad = ctx.createLinearGradient(0, 0, 0, H * 0.62);
    grad.addColorStop(0, rgba(hex2rgb(pal.water[0]), 0.72));
    grad.addColorStop(0.55, rgba(hex2rgb(pal.water[0]), 0.22));
    grad.addColorStop(1, rgba(hex2rgb(pal.water[0]), 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H * 0.62);
  }

  /* --------------------------------------------------------- lifecycle */

  var start = null;
  var raf = null;

  function loop(now) {
    raf = null;
    if (start === null) start = now;
    frame(now - start);
    if (!document.hidden) raf = requestAnimationFrame(loop);
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    readTheme();
    buildScene();
    lastT = 0;

    if (reduced) {
      frame(GROWN_AT + 8000);
    } else if (raf === null && !document.hidden) {
      raf = requestAnimationFrame(loop);
    }
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 180);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    } else if (!reduced && raf === null) {
      raf = requestAnimationFrame(loop);
    }
  });

  var themeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  var onTheme = function () { resize(); };
  if (themeQuery.addEventListener) themeQuery.addEventListener('change', onTheme);
  else if (themeQuery.addListener) themeQuery.addListener(onTheme);

  readTheme();
  resize();
})();
