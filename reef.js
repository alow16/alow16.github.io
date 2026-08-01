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
 *      trickle off the reef, a whale shark and blacktip reef sharks cross
 *      the mid-water, a humphead wrasse patrols the reef crest, lionfish
 *      hang over the near coral, a shoal of regal blue tangs and a leafy
 *      sea dragon drift through the near foreground, and starfish, urchins,
 *      anemones and clams dot the floor
 *
 * Every animal is sized from a real body length in metres against a depth
 * plane (see METRES / planes below), so the whale shark really is thirty
 * times the tang — the small ones are legible because they swim close to
 * the glass, not because they were drawn big.
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
      /* blacktip reef shark: sandy grey-brown above, and the two tones
         that make the animal — soot-black fin tips over a chalk band */
      blacktip: '#8c8168',
      blacktipBelly: '#efe6d2',
      finTip: '#1b2430',
      finBand: '#f7f2e6',
      /* humphead wrasse: teal-green with a paler vermiculate scribble */
      wrasse: '#1f8f86',
      wrasseFin: '#2aa79b',
      wrasseLine: '#9fe3d3',
      /* regal blue tang: cobalt, ink-black palette marking, yellow tail */
      tang: '#2a63d6',
      tangDark: '#101a2e',
      tangYellow: '#f5c518',
      /* lionfish: banded maroon over cream */
      lion: '#a8402f',
      lionPale: '#f6ead6',
      /* leafy sea dragon: olive-gold body, weedy green appendages */
      dragon: '#c98f3a',
      dragonLeaf: '#8ea84a',
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
      blacktip: '#5f5849',
      blacktipBelly: '#c3b9a3',
      finTip: '#0c121a',
      finBand: '#d8d1c1',
      wrasse: '#146059',
      wrasseFin: '#18776d',
      wrasseLine: '#63b3a2',
      tang: '#1b47a0',
      tangDark: '#080d18',
      tangYellow: '#d0a412',
      lion: '#78291f',
      lionPale: '#d6c8b0',
      dragon: '#96682a',
      dragonLeaf: '#657a34',
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
     are drawn as deep silhouettes, 2-3 in full colour. Layer 4 grows
     nothing — it is the pane of water between the reef and the viewer,
     where the small, ornate animals drift close enough to be read. */
  var LAYERS = [
    { scale: 0.46, veil: 0.20, floor: 0.885, silhouette: true,  count: 15 },
    { scale: 0.68, veil: 0.11, floor: 0.935, silhouette: true,  count: 11 },
    { scale: 0.95, veil: 0.04, floor: 0.995, silhouette: false, count: 9 },
    { scale: 1.30, veil: 0.00, floor: 1.045, silhouette: false, count: 6 },
    { scale: 3.40, veil: 0.00, floor: 1.220, silhouette: false, count: 0 }
  ];

  /* The two big crest animals — the blacktip and the humphead wrasse — hold
     one plane between LAYERS[2] and LAYERS[3], so a viewer comparing them
     is comparing the animals and not their distances: 1.9 m of wrasse comes
     out exactly 1.9/1.7 of the shark, the way it would in the water. */
  var CREST_PLANE = 1.22;

  /* --------------------------------------------------------- scale model */

  /* Real body lengths, so the animals are in honest proportion to each
     other. Only the whale shark's on-screen size is a composition choice;
     everything else follows from it and from how near it swims. */
  var METRES = {
    whaleShark: 9.00,
    blacktip:   1.70,
    wrasse:     1.90,
    lionfish:   0.35,
    tang:       0.28,
    dragon:     0.24,
    reefFish:   0.11
  };

  /* Cruising speeds in m/s. TEMPO lifts the whole set together so the scene
     reads awake, without disturbing the ratios: the sea dragon still barely
     moves and the reef sharks still overtake everything they pass. */
  var MPS = {
    whaleShark: 1.20,
    /* a patrolling blacktip cruises at about a third of a body length a
       second — slow for a shark, and slower still now that the body it has
       to move is the full 1.7 m */
    blacktip:   0.55,
    wrasse:     0.42,
    lionfish:   0.07,
    tang:       0.30,
    dragon:     0.06,
    reefFish:   0.34
  };
  var TEMPO = 1.35;

  var W = 0, H = 0, dpr = 1;
  /* pixels per metre at depth plane 1.0, calibrated off the whale shark */
  var pxPerM = 1;
  /* a phone shows the reef through a narrower window, so the near plane has
     to come closer still or nothing in it survives the shrink */
  var nearBoost = 1;

  function sizeOf(m, plane) { return m * pxPerM * plane; }
  /* px per millisecond, matching how the roamers integrate travel */
  function speedOf(mps, plane) { return mps * TEMPO * pxPerM * plane / 1000; }

  var waves = [];
  var colonies = [], mounds = [], fish = [], bubbles = [], critters = [];
  var shark = null, blacktips = [], wrasses = [];
  var lionfishes = [], tangs = [], dragons = [];
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

  /* ------------------------------------------------- wildlife ornament */

  /* The labyrinth scribble on a humphead's flank. Laid out once per animal
     in body-local units so the maze doesn't crawl over the fish frame to
     frame — it is a marking, not a texture. */
  function wrasseMarks() {
    var m = [];
    for (var i = 0; i < 62; i++) {
      m.push({
        x: rr(-0.28, 0.42),
        y: rr(-0.19, 0.15),
        len: rr(0.05, 0.11),
        amp: rr(0.010, 0.026),
        /* the vermiculation runs broadly with the scale rows: down and
           slightly forward, never in tidy parallel */
        ang: Math.PI * 0.5 + rr(-0.55, 0.55),
        w: rr(0.0035, 0.0075),
        flip: rnd() < 0.5 ? 1 : -1
      });
    }
    return m;
  }

  /* A leafy sea dragon's appendages: where each sits along the spine, which
     side it hangs off, how long, and its own drift phase so the whole plant
     never sways as one piece. */
  function dragonLeaves() {
    var out = [];
    var spots = [0.27, 0.32, 0.37, 0.42, 0.46, 0.50, 0.55, 0.59,
                 0.64, 0.69, 0.74, 0.79, 0.85, 0.90];
    for (var i = 0; i < spots.length; i++) {
      var side = i % 2 === 0 ? -1 : 1;
      /* the biggest fronds cluster over the trunk and thin out down the
         tail, which is what gives the animal its top-heavy weed shape */
      var taper = 1 - Math.abs(spots[i] - 0.44) * 1.25;
      out.push({
        u: spots[i] + rr(-0.014, 0.014),
        side: side,
        len: (0.10 + 0.19 * Math.max(0.18, taper)) * rr(0.82, 1.2),
        /* leaning fore and aft rather than all straight out is what keeps
           the animal from reading as a sea urchin */
        lean: rr(-0.62, 0.62),
        phase: rr(0, TAU),
        /* blade slenderness varies a lot: fat paddles next to thin straps
           is what stops the animal reading as a row of identical leaves */
        wide: rr(0.17, 0.34),
        lobes: rnd() < 0.7 ? 2 : 1
      });
    }
    /* the crown: the cluster over the nape and snout that a diver sees
       first, and mistakes for a piece of drifting weed */
    out.push({ u: 0.09, side: -1, len: 0.15 * rr(0.9, 1.1), lean: -0.75, phase: rr(0, TAU), wide: 0.20, lobes: 2 });
    out.push({ u: 0.15, side: 1, len: 0.11 * rr(0.9, 1.1), lean: 0.85, phase: rr(0, TAU), wide: 0.30, lobes: 1 });
    out.push({ u: 0.21, side: -1, len: 0.22 * rr(0.9, 1.1), lean: -0.28, phase: rr(0, TAU), wide: 0.19, lobes: 2 });
    out.push({ u: 0.23, side: 1, len: 0.16 * rr(0.9, 1.1), lean: 0.42, phase: rr(0, TAU), wide: 0.26, lobes: 2 });
    return out;
  }

  /* ----------------------------------------------------------- builder */

  function buildScene() {
    rnd = mulberry32(seed);
    colonies = []; mounds = []; fish = []; bubbles = []; waves = [];
    critters = []; blacktips = []; wrasses = [];
    lionfishes = []; tangs = []; dragons = [];
    GROWN_AT = 0;

    nearBoost = W < 760 ? 1.75 : W < 1100 ? 1.25 : 1;
    pxPerM = Math.min(W * 0.44, H * 0.52) / (METRES.whaleShark * LAYERS[1].scale);

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
      if (layer.count === 0) continue;   /* the open foreground pane */
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

    /* Schools of small reef fish. An 11 cm anthias is a speck at the whale
       shark's depth and a readable fish just off the glass, so the schools
       are spread across planes: the far ones give the water its dust, the
       near ones do the acting. */
    var schools = Math.max(3, Math.round(W / 340));
    var arrive = 1600;
    for (var sc = 0; sc < schools; sc++) {
      var plane = rnd() < 0.35 ? rr(0.7, 1.2) : rr(1.6, 2.9) * nearBoost;
      var sli = plane < 1.15 ? 1 : plane < 1.5 ? 2 : plane < 2.1 ? 3 : 4;
      var dir = rnd() < 0.5 ? -1 : 1;
      /* the drawn fish runs from +1s at the nose to -1.8s at the tail fork */
      var size = sizeOf(METRES.reefFish, plane) / 2.8 * rr(0.8, 1.3);
      var speed = speedOf(MPS.reefFish, plane) * 1000 * dir;
      var tone = hex2rgb(pick(pal.fish));
      var ox = rnd() * W;
      var oy = H * rr(0.56, 0.96);
      var members = 3 + ri(7);

      for (var m = 0; m < members; m++) {
        fish.push({
          li: sli,
          x: ox + rr(-1, 1) * size * 9,
          y: oy + rr(-1, 1) * size * 5,
          size: size * rr(0.85, 1.15),
          speed: speed * rr(0.92, 1.08),
          dir: dir,
          tone: tone,
          phase: rr(0, TAU),
          bob: size * rr(0.3, 0.95),
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
    var wsPlane = LAYERS[1].scale;
    var len = sizeOf(METRES.whaleShark, wsPlane);
    shark = {
      len: len,
      y: Math.max(H * 0.5, H * rr(0.54, 0.62)),
      dir: rnd() < 0.5 ? -1 : 1,
      travel: W + len * 2.9,
      speed: speedOf(MPS.whaleShark, wsPlane),
      t0: 2100,
      phase: rr(0, TAU)
    };

    /* blacktip reef sharks: at 1.7 m they come out a fifth of the whale
       shark, which is the whole point — they patrol the crest in ones and
       twos and are quick where the big animal is not.

       They work the near edge of the mid-water rather than the layer-2
       plane, on CREST_PLANE with the wrasse — and short of LAYERS[3], so
       they correctly pass behind the near coral. */
    var btPlane = CREST_PLANE;
    var btCount = W > 700 ? 1 + ri(2) : 1;
    for (var bt = 0; bt < btCount; bt++) {
      var btLen = sizeOf(METRES.blacktip, btPlane) * rr(0.88, 1.12);
      blacktips.push({
        len: btLen,
        y: H * rr(0.42, 0.58),
        dir: rnd() < 0.5 ? -1 : 1,
        travel: W + btLen * 2.6,
        speed: speedOf(MPS.blacktip, btPlane) * rr(0.9, 1.15),
        travelled: rr(0, W),
        rest: rr(0.20, 0.62),
        t0: 2600 + bt * 3400 + rr(0, 900),
        phase: rr(0, TAU)
      });
    }

    /* humphead wrasse: heavy and unhurried, close in over the near reef —
       where a two-metre fish shaped like that actually spends its day. It
       shares CREST_PLANE with the blacktip: it still swims lower and in
       front of the layer-3 coral, but it is no longer sized a plane nearer
       than the shark, which was quietly adding 7% to a fish that already
       out-measures a blacktip. */
    var wrPlane = CREST_PLANE;
    var wrCount = W > 900 && rnd() < 0.3 ? 2 : 1;
    for (var wr = 0; wr < wrCount; wr++) {
      var wrLen = sizeOf(METRES.wrasse, wrPlane) * rr(0.85, 1.1);
      wrasses.push({
        len: wrLen,
        y: H * rr(0.60, 0.78),
        dir: rnd() < 0.5 ? -1 : 1,
        travel: W + wrLen * 2.2,
        speed: speedOf(MPS.wrasse, wrPlane) * rr(0.9, 1.1),
        travelled: rr(0, W),
        rest: rr(0.24, 0.66),
        t0: 3000 + wr * 4200 + rr(0, 1000),
        phase: rr(0, TAU),
        marks: wrasseMarks()
      });
    }

    /* ---- the foreground pane: small animals, close to the glass ---- */

    var fg = LAYERS[4].scale * nearBoost;

    /* lionfish: all fin and no hurry, so it stays in frame long enough to
       be looked at properly. It hangs low over the coral rather than out in
       open water — which is where you actually find one, and it comes with
       company, because that is the whole problem with lionfish: no local
       predator, so they pile up over one head of coral. Four on screen is
       the ceiling — past that the near plane is all quills. */
    var lfCount = W > 1100 ? 3 + ri(2) : 2 + ri(2);
    for (var lf = 0; lf < lfCount; lf++) {
      var lfLen = sizeOf(METRES.lionfish, fg) * rr(0.82, 1.18);
      lionfishes.push({
        len: lfLen,
        y: H * rr(0.78, 0.94),
        dir: rnd() < 0.5 ? -1 : 1,
        travel: W + lfLen * 2.6,
        speed: speedOf(MPS.lionfish, fg) * rr(0.85, 1.15),
        travelled: rr(0, W),
        rest: rr(0.12, 0.88),
        /* tight stagger, so the last of them is in frame within seconds
           rather than a third of a minute */
        t0: 3200 + lf * 1100 + rr(0, 900),
        phase: rr(0, TAU)
      });
    }

    /* regal blue tangs travel as a loose shoal, strung out along one
       heading — so they share a direction and a band and never re-pick a
       depth on wrap, or the group would scatter after a lap */
    var tangLen = sizeOf(METRES.tang, fg);
    var tCount = 3 + ri(3);
    var tDir = rnd() < 0.5 ? -1 : 1;
    var tTravel = W + tangLen * 9;
    var tSpeed = speedOf(MPS.tang, fg);
    var tBand = H * rr(0.52, 0.74);
    var tLead = rr(0, W);   /* one head of the shoal, not one per fish */
    for (var tg = 0; tg < tCount; tg++) {
      tangs.push({
        len: tangLen * rr(0.82, 1.16),
        y: tBand + rr(-1, 1) * tangLen * 0.6,
        dir: tDir,
        travel: tTravel,
        speed: tSpeed * rr(0.97, 1.03),
        travelled: tLead - tg * tangLen * rr(1.2, 2.4),
        rest: 0.56 - tg * 0.045,
        t0: 3600 + tg * 220 + rr(0, 400),
        phase: rr(0, TAU),
        bob: tangLen * rr(0.05, 0.14)
      });
    }

    /* leafy sea dragon: at 6 cm/s it is the slowest thing in the scene, a
       shade under even the lionfish, which is exactly right — it drifts
       rather than swims, and the near plane is the only place its foliage
       reads */
    var dgPlane = fg * 1.3;
    var dgLen = sizeOf(METRES.dragon, dgPlane) * rr(0.9, 1.1);
    dragons.push({
      len: dgLen,
      y: H * rr(0.64, 0.86),
      dir: rnd() < 0.5 ? -1 : 1,
      travel: W + dgLen * 2.6,
      speed: speedOf(MPS.dragon, dgPlane),
      travelled: rr(0, W),
      rest: rr(0.3, 0.6),
      t0: 4200 + rr(0, 1400),
      phase: rr(0, TAU),
      leaves: dragonLeaves()
    });

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

  /* ------------------------------------------------ shared fin plumbing */

  /* Every crosser keeps the same books: integrate travel, and when it runs
     off the far side, re-enter from a fresh heading at a fresh depth. Pass
     y1 <= y0 to hold the animal's band and heading — the tang shoal needs
     that or it scatters after one lap. */
  function advance(a, dt, y0, y1, rest) {
    if (reduced) {
      /* A still pose — but each animal freezes at its own point in the
         crossing. Freeze them all at the same fraction and the second
         blacktip lands exactly on top of the first. */
      a.travelled = a.travel * (a.rest === undefined ? rest : a.rest);
      return;
    }
    a.travelled += a.speed * dt * 1000;
    if (a.travelled > a.travel) {
      a.travelled = 0;
      if (y1 > y0) {
        a.y = H * rr(y0, y1);
        a.dir = rnd() < 0.5 ? -1 : 1;
      }
    }
  }

  /* Colour bands laid perpendicular to a fin's axis, measured from the apex
     as a fraction of apex-to-base distance. Assumes a clip is already in
     force; `fintip` is the version that clips to the current path first. */
  function finBands(ax, ay, bx, by, blackTo, bandTo, tip, band, alpha) {
    var dx = bx - ax, dy = by - ay;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.fillStyle = rgba(tip, alpha);
    ctx.fillRect(-d, -d, d * (1 + blackTo), d * 2);
    if (band) {
      ctx.fillStyle = rgba(band, alpha * 0.92);
      ctx.fillRect(d * blackTo, -d, d * (bandTo - blackTo), d * 2);
    }
    ctx.restore();
  }

  function fintip(ax, ay, bx, by, blackTo, bandTo, tip, band, alpha) {
    ctx.save();
    ctx.clip();
    finBands(ax, ay, bx, by, blackTo, bandTo, tip, band, alpha);
    ctx.restore();
  }

  /* Translucent webbing stretched between neighbouring fin rays, stopping
     short of the tips — free ray ends are what make a lionfish read as a
     lionfish rather than as a fan. */
  function spineWeb(bases, tips, frac, col, alpha) {
    var n = tips.length;
    if (n < 2) return;
    ctx.fillStyle = rgba(col, alpha);
    ctx.beginPath();
    ctx.moveTo(bases[0][0], bases[0][1]);
    for (var i = 0; i < n; i++) {
      ctx.lineTo(
        bases[i][0] + (tips[i][0] - bases[i][0]) * frac,
        bases[i][1] + (tips[i][1] - bases[i][1]) * frac
      );
    }
    for (var j = n - 1; j >= 0; j--) ctx.lineTo(bases[j][0], bases[j][1]);
    ctx.closePath();
    ctx.fill();
  }

  /* The rays themselves, banded down their length and tapering to a point */
  function spineRays(bases, tips, unit, rayCol, bandCol, alpha, segs) {
    ctx.lineCap = 'round';
    for (var i = 0; i < tips.length; i++) {
      var bx = bases[i][0], by = bases[i][1];
      var dx = tips[i][0] - bx, dy = tips[i][1] - by;
      for (var s = 0; s < segs; s++) {
        var u0 = s / segs, u1 = (s + 1) / segs;
        ctx.strokeStyle = rgba(s % 2 ? bandCol : rayCol, alpha * (0.95 - u0 * 0.2));
        ctx.lineWidth = Math.max(0.6, unit * (1 - u0 * 0.5));
        ctx.beginPath();
        ctx.moveTo(bx + dx * u0, by + dy * u0);
        ctx.lineTo(bx + dx * u1, by + dy * u1);
        ctx.stroke();
      }
    }
  }

  /* A fan of rays off one root — pectoral, pelvic, caudal. `bulge` pushes
     the middle rays out so the fan comes to a rounded edge instead of a
     straight one. */
  function finFan(bx, by, n, a0, a1, r0, r1, wob, unit, mem, rayCol, bandCol, alpha, memFrac) {
    var bases = [], tips = [];
    for (var i = 0; i < n; i++) {
      var f = n === 1 ? 0 : i / (n - 1);
      var ang = a0 + (a1 - a0) * f + wob * Math.sin(f * 3.1 + 1.2);
      var rad = (r0 + (r1 - r0) * f) * (0.80 + 0.30 * Math.sin(Math.PI * f));
      bases.push([bx, by]);
      tips.push([bx + Math.cos(ang) * rad, by + Math.sin(ang) * rad]);
    }
    spineWeb(bases, tips, memFrac, mem, alpha * 0.4);
    spineRays(bases, tips, unit, rayCol, bandCol, alpha, 5);
  }

  /* Spines rooted along a line rather than at a point — the lionfish
     dorsal, where thirteen separate quills stand off the back. */
  function finComb(x0, y0, x1, y1, n, a0, a1, r0, r1, wob, unit, mem, rayCol, bandCol, alpha, memFrac) {
    var bases = [], tips = [];
    for (var i = 0; i < n; i++) {
      var f = i / (n - 1);
      var bx = x0 + (x1 - x0) * f, by = y0 + (y1 - y0) * f;
      var ang = a0 + (a1 - a0) * f + wob * Math.sin(f * 4.4);
      var rad = (r0 + (r1 - r0) * f) * (0.70 + 0.44 * Math.sin(Math.PI * f));
      bases.push([bx, by]);
      tips.push([bx + Math.cos(ang) * rad, by + Math.sin(ang) * rad]);
    }
    spineWeb(bases, tips, memFrac, mem, alpha * 0.55);
    spineRays(bases, tips, unit, rayCol, bandCol, alpha, 5);
  }

  /* ---------------------------------------------- blacktip reef shark */

  function blacktipBody(L, sweep) {
    ctx.beginPath();
    ctx.moveTo(L * 0.500, 0);
    ctx.quadraticCurveTo(L * 0.474, -L * 0.046, L * 0.386, -L * 0.068);
    ctx.bezierCurveTo(L * 0.210, -L * 0.108, 0, -L * 0.104, -L * 0.160, -L * 0.064);
    ctx.quadraticCurveTo(-L * 0.270, -L * 0.044, -L * 0.330, -L * 0.028);
    /* heterocercal tail: long upper lobe, deep notch, stubbier lower lobe */
    ctx.quadraticCurveTo(-L * 0.400, -L * 0.100 + sweep * 0.55, -L * 0.520, -L * 0.215 + sweep);
    ctx.quadraticCurveTo(-L * 0.485, -L * 0.075 + sweep * 0.60, -L * 0.395, sweep * 0.35);
    ctx.quadraticCurveTo(-L * 0.425, L * 0.055 + sweep * 0.50, -L * 0.475, L * 0.115 + sweep * 0.85);
    ctx.quadraticCurveTo(-L * 0.415, L * 0.058 + sweep * 0.45, -L * 0.325, L * 0.028);
    ctx.bezierCurveTo(-L * 0.140, L * 0.088, L * 0.100, L * 0.098, L * 0.300, L * 0.072);
    ctx.quadraticCurveTo(L * 0.444, L * 0.050, L * 0.500, 0);
    ctx.closePath();
  }

  function drawBlacktip(b, t, dt) {
    var fade = smooth((t - b.t0) / 1400);
    if (fade <= 0) return;
    advance(b, dt, 0.42, 0.58, 0.34);

    var L = b.len;
    var x = b.dir > 0 ? -L * 1.3 + b.travelled : W + L * 1.3 - b.travelled;
    var bob = reduced ? 0 : Math.sin(t * 0.0007 + b.phase) * L * 0.03;
    var beat = reduced ? 0 : Math.sin(t * 0.0030 + b.phase);
    var sweep = beat * L * 0.055;

    var body = hex2rgb(pal.blacktip);
    var belly = hex2rgb(pal.blacktipBelly);
    var tip = hex2rgb(pal.finTip);
    var band = hex2rgb(pal.finBand);
    var deep = mix(body, [0, 0, 0], 0.3);

    ctx.save();
    ctx.translate(x, b.y + bob);
    ctx.scale(b.dir, 1);
    ctx.rotate(beat * 0.03);

    /* far pectoral, a shade back so it sits behind the flank */
    ctx.fillStyle = rgba(mix(body, [0, 0, 0], 0.22), fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.20, L * 0.03);
    ctx.quadraticCurveTo(L * 0.09, L * 0.14, -L * 0.05, L * 0.20);
    ctx.quadraticCurveTo(L * 0.03, L * 0.10, L * 0.10, L * 0.06);
    ctx.closePath();
    ctx.fill();
    fintip(-L * 0.05, L * 0.20, L * 0.14, L * 0.045, 0.24, 0.24, tip, null, fade * 0.85);

    blacktipBody(L, sweep);
    ctx.fillStyle = rgba(body, fade);
    ctx.fill();

    ctx.save();
    ctx.clip();

    /* the caudal tips, applied through the body clip so the lobes keep
       their outline: black on the lower lobe, a dusky trailing edge above */
    finBands(-L * 0.475, L * 0.115 + sweep * 0.85, -L * 0.360, L * 0.030,
      0.34, 0.34, tip, null, fade * 0.95);
    finBands(-L * 0.520, -L * 0.215 + sweep, -L * 0.400, -L * 0.045,
      0.18, 0.18, deep, null, fade * 0.6);

    /* pale underside */
    ctx.fillStyle = rgba(belly, 0.55 * fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.42, L * 0.038);
    ctx.bezierCurveTo(L * 0.12, L * 0.066, -L * 0.14, L * 0.062, -L * 0.34, L * 0.008);
    ctx.lineTo(-L * 0.34, L * 0.25);
    ctx.lineTo(L * 0.48, L * 0.25);
    ctx.closePath();
    ctx.fill();

    /* the chalk flank band, with the dark line that borders it above —
       the field mark you actually pick a blacktip out by at distance */
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(band, 0.75 * fade);
    ctx.lineWidth = L * 0.026;
    ctx.beginPath();
    ctx.moveTo(L * 0.33, L * 0.054);
    ctx.bezierCurveTo(L * 0.10, L * 0.080, -L * 0.10, L * 0.078, -L * 0.30, L * 0.032);
    ctx.stroke();
    ctx.strokeStyle = rgba(deep, 0.35 * fade);
    ctx.lineWidth = L * 0.010;
    ctx.beginPath();
    ctx.moveTo(L * 0.34, L * 0.038);
    ctx.bezierCurveTo(L * 0.10, L * 0.064, -L * 0.10, L * 0.062, -L * 0.30, L * 0.018);
    ctx.stroke();

    /* five gill slits behind the head */
    ctx.strokeStyle = rgba(deep, 0.45 * fade);
    ctx.lineWidth = Math.max(0.7, L * 0.007);
    for (var g = 0; g < 5; g++) {
      var gxp = L * (0.285 - g * 0.030);
      ctx.beginPath();
      ctx.moveTo(gxp, -L * 0.062);
      ctx.quadraticCurveTo(gxp - L * 0.014, 0, gxp - L * 0.004, L * 0.046);
      ctx.stroke();
    }
    ctx.restore();

    /* pelvic and anal fins, both kept small — on a real shark the pectoral
       dwarfs them, and evening them up turns the underside into a row of
       identical black spikes */
    ctx.fillStyle = rgba(body, fade);
    ctx.beginPath();
    ctx.moveTo(-L * 0.048, L * 0.080);
    ctx.quadraticCurveTo(-L * 0.082, L * 0.140, -L * 0.136, L * 0.148);
    ctx.quadraticCurveTo(-L * 0.120, L * 0.098, -L * 0.128, L * 0.064);
    ctx.closePath();
    ctx.fill();
    fintip(-L * 0.136, L * 0.148, -L * 0.082, L * 0.078, 0.30, 0.30, tip, null, fade * 0.9);

    ctx.fillStyle = rgba(body, fade);
    ctx.beginPath();
    ctx.moveTo(-L * 0.192, L * 0.056);
    ctx.quadraticCurveTo(-L * 0.214, L * 0.122, -L * 0.276, L * 0.126);
    ctx.quadraticCurveTo(-L * 0.258, L * 0.078, -L * 0.262, L * 0.042);
    ctx.closePath();
    ctx.fill();
    fintip(-L * 0.276, L * 0.126, -L * 0.226, L * 0.054, 0.32, 0.32, tip, null, fade * 0.9);

    /* second dorsal */
    ctx.fillStyle = rgba(body, fade);
    ctx.beginPath();
    ctx.moveTo(-L * 0.180, -L * 0.062);
    ctx.quadraticCurveTo(-L * 0.215, -L * 0.155, -L * 0.288, -L * 0.150);
    ctx.quadraticCurveTo(-L * 0.262, -L * 0.090, -L * 0.268, -L * 0.048);
    ctx.closePath();
    ctx.fill();
    fintip(-L * 0.288, -L * 0.150, -L * 0.225, -L * 0.060, 0.32, 0.32, tip, null, fade * 0.9);

    /* first dorsal: tall, and the one fin that carries the white band
       under its black tip. Based inside the back's contour so the
       silhouette merges rather than showing a seam. */
    ctx.fillStyle = rgba(body, fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.070, -L * 0.108);
    ctx.quadraticCurveTo(L * 0.020, -L * 0.250, -L * 0.055, -L * 0.312);
    ctx.quadraticCurveTo(-L * 0.045, -L * 0.185, -L * 0.120, -L * 0.078);
    ctx.quadraticCurveTo(-L * 0.020, -L * 0.090, L * 0.070, -L * 0.108);
    ctx.closePath();
    ctx.fill();
    fintip(-L * 0.055, -L * 0.312, L * 0.000, -L * 0.130, 0.26, 0.44, tip, band, fade);

    /* near pectoral, broad and swept back — set well forward of the pelvic
       so the underside doesn't read as one row of black spikes */
    ctx.fillStyle = rgba(body, fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.296, L * 0.052);
    ctx.quadraticCurveTo(L * 0.200, L * 0.188, L * 0.058, L * 0.262);
    ctx.quadraticCurveTo(L * 0.108, L * 0.150, L * 0.132, L * 0.092);
    ctx.closePath();
    ctx.fill();
    fintip(L * 0.058, L * 0.262, L * 0.222, L * 0.072, 0.24, 0.24, tip, null, fade);

    /* eye, nostril and the short blunt mouth */
    ctx.fillStyle = rgba(mix(body, [0, 0, 0], 0.6), 0.92 * fade);
    ctx.beginPath();
    ctx.arc(L * 0.392, -L * 0.030, Math.max(1, L * 0.014), 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(deep, 0.55 * fade);
    ctx.lineWidth = Math.max(0.6, L * 0.008);
    ctx.beginPath();
    ctx.moveTo(L * 0.455, L * 0.040);
    ctx.quadraticCurveTo(L * 0.400, L * 0.062, L * 0.345, L * 0.052);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(L * 0.462, L * 0.012);
    ctx.lineTo(L * 0.446, L * 0.018);
    ctx.stroke();

    ctx.restore();
  }

  /* ------------------------------------------------------ humphead wrasse */

  /* The fish is roughly twice as long as it is deep — get that wrong and it
     goes circular, and once it is circular no amount of forehead reads as a
     hump. The dome has to clear the back line by a third of the body depth. */
  function wrasseBody(L) {
    ctx.beginPath();
    ctx.moveTo(L * 0.492, L * 0.062);
    ctx.quadraticCurveTo(L * 0.502, L * 0.010, L * 0.474, -L * 0.024);
    /* a steep, near-vertical face rising off the snout... */
    ctx.quadraticCurveTo(L * 0.458, -L * 0.070, L * 0.450, -L * 0.118);
    /* ...into the hump, which overhangs forward before rolling back */
    ctx.quadraticCurveTo(L * 0.446, -L * 0.210, L * 0.386, -L * 0.258);
    ctx.quadraticCurveTo(L * 0.318, -L * 0.290, L * 0.240, -L * 0.246);
    /* then drops hard into the nape notch — that dip is the whole tell */
    ctx.quadraticCurveTo(L * 0.196, -L * 0.214, L * 0.166, -L * 0.174);
    ctx.bezierCurveTo(L * 0.060, -L * 0.188, -L * 0.090, -L * 0.166, -L * 0.208, -L * 0.106);
    ctx.quadraticCurveTo(-L * 0.262, -L * 0.082, -L * 0.302, -L * 0.062);
    ctx.lineTo(-L * 0.302, L * 0.062);
    ctx.quadraticCurveTo(-L * 0.250, L * 0.116, -L * 0.150, L * 0.156);
    ctx.bezierCurveTo(L * 0.020, L * 0.212, L * 0.300, L * 0.198, L * 0.410, L * 0.140);
    ctx.quadraticCurveTo(L * 0.470, L * 0.110, L * 0.492, L * 0.062);
    ctx.closePath();
  }

  function drawWrasse(w, t, dt) {
    var fade = smooth((t - w.t0) / 1600);
    if (fade <= 0) return;
    advance(w, dt, 0.60, 0.78, 0.4);

    var L = w.len;
    var x = w.dir > 0 ? -L * 1.1 + w.travelled : W + L * 1.1 - w.travelled;
    var bob = reduced ? 0 : Math.sin(t * 0.00055 + w.phase) * L * 0.035;
    /* wrasses row with their pectorals and only bring the tail in to
       accelerate, so the caudal beat is slow and the fin flap is not */
    var beat = reduced ? 0 : Math.sin(t * 0.0016 + w.phase);
    var flap = reduced ? 0 : Math.sin(t * 0.0042 + w.phase);
    var sw = beat * L * 0.05;

    var body = hex2rgb(pal.wrasse);
    var fin = hex2rgb(pal.wrasseFin);
    var line = hex2rgb(pal.wrasseLine);
    var dark = mix(body, [0, 0, 0], 0.45);

    ctx.save();
    ctx.translate(x, w.y + bob);
    ctx.scale(w.dir, 1);
    ctx.rotate(beat * 0.02);

    /* caudal: broad and rounded, drawn behind so the peduncle covers it */
    ctx.fillStyle = rgba(fin, 0.95 * fade);
    ctx.beginPath();
    ctx.moveTo(-L * 0.262, -L * 0.072);
    ctx.quadraticCurveTo(-L * 0.400, -L * 0.180 + sw * 0.6, -L * 0.498, -L * 0.170 + sw);
    ctx.quadraticCurveTo(-L * 0.544, sw * 0.9, -L * 0.498, L * 0.170 + sw);
    ctx.quadraticCurveTo(-L * 0.400, L * 0.180 + sw * 0.6, -L * 0.262, L * 0.072);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = rgba(dark, 0.32 * fade);
    ctx.lineWidth = Math.max(0.6, L * 0.006);
    for (var cr = 0; cr < 8; cr++) {
      var ca = -0.56 + cr * 0.16;
      ctx.beginPath();
      ctx.moveTo(-L * 0.272, 0);
      ctx.lineTo(-L * 0.272 - Math.cos(ca) * L * 0.28, Math.sin(ca) * L * 0.28 + sw);
      ctx.stroke();
    }
    ctx.restore();

    /* dorsal and anal fins: long-based, low, and running most of the fish.
       The dorsal starts behind the nape notch, not over the hump. */
    ctx.fillStyle = rgba(mix(fin, [0, 0, 0], 0.1), 0.95 * fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.150, -L * 0.196);
    ctx.bezierCurveTo(L * 0.020, -L * 0.256, -L * 0.110, -L * 0.234, -L * 0.300, -L * 0.132);
    ctx.lineTo(-L * 0.302, -L * 0.062);
    ctx.bezierCurveTo(-L * 0.110, -L * 0.168, L * 0.010, -L * 0.196, L * 0.150, -L * 0.180);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(L * 0.030, L * 0.208);
    ctx.bezierCurveTo(-L * 0.080, L * 0.264, -L * 0.200, L * 0.222, -L * 0.298, L * 0.132);
    ctx.lineTo(-L * 0.300, L * 0.062);
    ctx.bezierCurveTo(-L * 0.180, L * 0.162, -L * 0.080, L * 0.200, L * 0.030, L * 0.200);
    ctx.closePath();
    ctx.fill();

    /* soft-ray combing on both */
    ctx.strokeStyle = rgba(dark, 0.28 * fade);
    ctx.lineWidth = Math.max(0.5, L * 0.005);
    for (var fr = 0; fr < 12; fr++) {
      var u = fr / 11;
      var bxp = L * (0.14 - u * 0.42);
      ctx.beginPath();
      ctx.moveTo(bxp, -L * (0.180 - u * 0.108));
      ctx.lineTo(bxp - L * 0.012, -L * (0.222 - u * 0.104));
      ctx.stroke();
      if (u > 0.30) {
        ctx.beginPath();
        ctx.moveTo(bxp, L * (0.160 + (1 - u) * 0.03));
        ctx.lineTo(bxp - L * 0.012, L * (0.208 + (1 - u) * 0.02));
        ctx.stroke();
      }
    }

    wrasseBody(L);
    ctx.fillStyle = rgba(body, fade);
    ctx.fill();

    ctx.save();
    ctx.clip();

    /* the flank lightens toward the belly the way a big wrasse's does */
    ctx.fillStyle = rgba(mix(body, hex2rgb(pal.cream), 0.22), 0.34 * fade);
    ctx.beginPath();
    ctx.moveTo(-L * 0.32, L * 0.040);
    ctx.bezierCurveTo(-L * 0.05, L * 0.100, L * 0.24, L * 0.092, L * 0.50, L * 0.018);
    ctx.lineTo(L * 0.52, L * 0.26);
    ctx.lineTo(-L * 0.32, L * 0.26);
    ctx.closePath();
    ctx.fill();

    /* scale rows: faint arcs sweeping back and down, the grid the
       vermiculation is laid over */
    ctx.strokeStyle = rgba(dark, 0.16 * fade);
    ctx.lineWidth = Math.max(0.5, L * 0.006);
    for (var sr = 0; sr < 11; sr++) {
      var sx = L * (0.30 - sr * 0.062);
      ctx.beginPath();
      ctx.moveTo(sx + L * 0.038, -L * 0.22);
      ctx.quadraticCurveTo(sx - L * 0.016, 0, sx + L * 0.026, L * 0.22);
      ctx.stroke();
    }

    /* the labyrinth: a maze of fine pale worm-lines over the whole flank */
    ctx.lineCap = 'round';
    for (var mi = 0; mi < w.marks.length; mi++) {
      var mk = w.marks[mi];
      /* every third line runs dark instead of pale, which is what turns a
         field of squiggles into something that reads as a maze */
      ctx.strokeStyle = mi % 3 === 2
        ? rgba(dark, 0.26 * fade)
        : rgba(line, 0.44 * fade);
      var ca2 = Math.cos(mk.ang), sa2 = Math.sin(mk.ang);
      var px = L * mk.x, py = L * mk.y;
      var step = L * mk.len / 3;
      var amp = L * mk.amp * mk.flip;
      ctx.lineWidth = Math.max(0.5, L * mk.w);
      ctx.beginPath();
      ctx.moveTo(px, py);
      for (var seg = 1; seg <= 3; seg++) {
        var mid = step * (seg - 0.5), end = step * seg;
        var off = seg % 2 ? amp : -amp;
        ctx.quadraticCurveTo(
          px + ca2 * mid - sa2 * off, py + sa2 * mid + ca2 * off,
          px + ca2 * end, py + sa2 * end
        );
      }
      ctx.stroke();
    }

    /* the pair of dark streaks trailing back from the eye */
    ctx.strokeStyle = rgba(dark, 0.62 * fade);
    ctx.lineWidth = Math.max(0.8, L * 0.014);
    ctx.beginPath();
    ctx.moveTo(L * 0.378, -L * 0.072);
    ctx.quadraticCurveTo(L * 0.316, -L * 0.040, L * 0.258, -L * 0.020);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(L * 0.382, -L * 0.108);
    ctx.quadraticCurveTo(L * 0.328, -L * 0.140, L * 0.268, -L * 0.150);
    ctx.stroke();
    ctx.restore();

    /* pectoral fan, rowing — a wrasse swims on these, not on its tail */
    ctx.save();
    ctx.translate(L * 0.250, L * 0.070);
    ctx.rotate(0.25 + flap * 0.34);
    ctx.fillStyle = rgba(fin, 0.8 * fade);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-L * 0.050, L * 0.080, -L * 0.026, L * 0.180);
    ctx.quadraticCurveTo(L * 0.044, L * 0.190, L * 0.074, L * 0.098);
    ctx.quadraticCurveTo(L * 0.064, L * 0.030, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(dark, 0.28 * fade);
    ctx.lineWidth = Math.max(0.5, L * 0.005);
    for (var pf = 0; pf < 5; pf++) {
      var pa = 0.78 + pf * 0.29;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(pa) * L * 0.15, Math.sin(pa) * L * 0.17);
      ctx.stroke();
    }
    ctx.restore();

    /* the lips: one thick rubbery pout built onto the snout rather than
       stuck in front of it */
    ctx.fillStyle = rgba(mix(fin, hex2rgb(pal.cream), 0.13), 0.95 * fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.468, -L * 0.036);
    ctx.quadraticCurveTo(L * 0.528, -L * 0.008, L * 0.522, L * 0.024);
    ctx.quadraticCurveTo(L * 0.532, L * 0.068, L * 0.474, L * 0.086);
    ctx.quadraticCurveTo(L * 0.446, L * 0.024, L * 0.468, -L * 0.036);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(dark, 0.55 * fade);
    ctx.lineWidth = Math.max(0.7, L * 0.011);
    ctx.beginPath();
    ctx.moveTo(L * 0.524, L * 0.024);
    ctx.quadraticCurveTo(L * 0.482, L * 0.034, L * 0.458, L * 0.022);
    ctx.stroke();

    /* small eye, set high and forward under the overhang of the hump */
    ctx.fillStyle = rgba(hex2rgb(pal.cream), 0.5 * fade);
    ctx.beginPath();
    ctx.arc(L * 0.402, -L * 0.092, L * 0.028, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(mix(body, [0, 0, 0], 0.72), 0.95 * fade);
    ctx.beginPath();
    ctx.arc(L * 0.402, -L * 0.092, L * 0.018, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  /* ----------------------------------------------------- regal blue tang */

  function tangBody(L) {
    ctx.beginPath();
    ctx.moveTo(L * 0.500, L * 0.060);
    ctx.quadraticCurveTo(L * 0.430, -L * 0.055, L * 0.330, -L * 0.150);
    ctx.bezierCurveTo(L * 0.190, -L * 0.268, -L * 0.010, -L * 0.278, -L * 0.120, -L * 0.205);
    ctx.quadraticCurveTo(-L * 0.185, -L * 0.160, -L * 0.215, -L * 0.078);
    ctx.lineTo(-L * 0.225, L * 0.072);
    ctx.quadraticCurveTo(-L * 0.190, L * 0.160, -L * 0.110, L * 0.215);
    ctx.bezierCurveTo(L * 0.030, L * 0.295, L * 0.270, L * 0.230, L * 0.390, L * 0.145);
    ctx.quadraticCurveTo(L * 0.462, L * 0.105, L * 0.500, L * 0.060);
    ctx.closePath();
  }

  function drawTang(f, t, dt) {
    var fade = smooth((t - f.t0) / 1200);
    if (fade <= 0) return;
    /* the shoal holds its band and heading, so pass a null depth range */
    advance(f, dt, 0, 0, 0.45);

    var L = f.len;
    var x = f.dir > 0 ? -L * 1.2 + f.travelled : W + L * 1.2 - f.travelled;
    var beat = reduced ? 0 : Math.sin(t * 0.0052 + f.phase);
    var bob = reduced ? 0 : Math.sin(t * 0.0011 + f.phase) * f.bob;
    var sw = beat * L * 0.055;

    var blue = hex2rgb(pal.tang);
    var ink = hex2rgb(pal.tangDark);
    var yellow = hex2rgb(pal.tangYellow);
    var cream = hex2rgb(pal.cream);

    ctx.save();
    ctx.translate(x, f.y + bob);
    ctx.scale(f.dir, 1);
    ctx.rotate(beat * 0.035);

    /* the yellow caudal, black along its upper and lower margins */
    ctx.fillStyle = rgba(yellow, fade);
    ctx.beginPath();
    ctx.moveTo(-L * 0.200, -L * 0.060);
    ctx.quadraticCurveTo(-L * 0.340, -L * 0.160 + sw * 0.6, -L * 0.500, -L * 0.235 + sw);
    ctx.quadraticCurveTo(-L * 0.355, sw * 0.5, -L * 0.500, L * 0.235 + sw);
    ctx.quadraticCurveTo(-L * 0.340, L * 0.160 + sw * 0.6, -L * 0.200, L * 0.060);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = rgba(ink, 0.95 * fade);
    ctx.lineWidth = L * 0.045;
    ctx.beginPath();
    ctx.moveTo(-L * 0.200, -L * 0.060);
    ctx.quadraticCurveTo(-L * 0.340, -L * 0.160 + sw * 0.6, -L * 0.505, -L * 0.235 + sw);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-L * 0.200, L * 0.060);
    ctx.quadraticCurveTo(-L * 0.340, L * 0.160 + sw * 0.6, -L * 0.505, L * 0.235 + sw);
    ctx.stroke();
    ctx.restore();

    /* dorsal and anal fins, blue with a fine dark margin */
    ctx.fillStyle = rgba(blue, fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.300, -L * 0.170);
    ctx.bezierCurveTo(L * 0.140, -L * 0.330, -L * 0.020, -L * 0.345, -L * 0.150, -L * 0.262);
    ctx.lineTo(-L * 0.208, -L * 0.095);
    ctx.bezierCurveTo(-L * 0.040, -L * 0.250, L * 0.140, -L * 0.242, L * 0.302, -L * 0.150);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(ink, 0.8 * fade);
    ctx.lineWidth = Math.max(0.7, L * 0.014);
    ctx.beginPath();
    ctx.moveTo(L * 0.300, -L * 0.170);
    ctx.bezierCurveTo(L * 0.140, -L * 0.330, -L * 0.020, -L * 0.345, -L * 0.150, -L * 0.262);
    ctx.stroke();

    ctx.fillStyle = rgba(blue, fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.180, L * 0.195);
    ctx.bezierCurveTo(L * 0.040, L * 0.330, -L * 0.060, L * 0.330, -L * 0.160, L * 0.250);
    ctx.lineTo(-L * 0.215, L * 0.090);
    ctx.bezierCurveTo(-L * 0.060, L * 0.245, L * 0.060, L * 0.250, L * 0.182, L * 0.180);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(ink, 0.8 * fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.180, L * 0.195);
    ctx.bezierCurveTo(L * 0.040, L * 0.330, -L * 0.060, L * 0.330, -L * 0.160, L * 0.250);
    ctx.stroke();

    tangBody(L);
    ctx.fillStyle = rgba(blue, fade);
    ctx.fill();

    ctx.save();
    ctx.clip();

    /* the palette marking: one heavy black stroke that leaves the eye,
       runs the length of the back, drops at the rear and hooks forward,
       fencing off a lens of clear blue. Dory's "6". */
    ctx.strokeStyle = rgba(ink, 0.96 * fade);
    ctx.lineWidth = L * 0.062;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(L * 0.352, -L * 0.088);
    ctx.bezierCurveTo(L * 0.190, -L * 0.198, L * 0.010, -L * 0.208, -L * 0.098, -L * 0.140);
    ctx.quadraticCurveTo(-L * 0.176, -L * 0.086, -L * 0.164, L * 0.020);
    ctx.quadraticCurveTo(-L * 0.150, L * 0.118, -L * 0.030, L * 0.132);
    ctx.quadraticCurveTo(L * 0.100, L * 0.142, L * 0.176, L * 0.086);
    ctx.stroke();

    /* solid black peduncle where the body meets the yellow */
    ctx.fillStyle = rgba(ink, 0.96 * fade);
    ctx.beginPath();
    ctx.moveTo(-L * 0.235, -L * 0.20);
    ctx.lineTo(-L * 0.150, -L * 0.20);
    ctx.quadraticCurveTo(-L * 0.180, 0, -L * 0.150, L * 0.20);
    ctx.lineTo(-L * 0.235, L * 0.20);
    ctx.closePath();
    ctx.fill();

    /* a soft sheen down the upper flank keeps the blue from going flat */
    ctx.fillStyle = rgba(mix(blue, cream, 0.35), 0.16 * fade);
    ctx.beginPath();
    ctx.ellipse(L * 0.10, -L * 0.02, L * 0.20, L * 0.055, -0.22, 0, TAU);
    ctx.fill();
    ctx.restore();

    /* pectoral fin: nearly clear, so it lightens the flank instead of
       printing an olive blot on it */
    ctx.save();
    ctx.translate(L * 0.250, L * 0.055);
    ctx.rotate(0.4 + beat * 0.28);
    ctx.fillStyle = rgba(mix(yellow, cream, 0.55), 0.3 * fade);
    ctx.beginPath();
    ctx.ellipse(L * 0.045, L * 0.055, L * 0.078, L * 0.032, 0.85, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(mix(blue, cream, 0.4), 0.3 * fade);
    ctx.lineWidth = Math.max(0.5, L * 0.007);
    for (var pr = 0; pr < 4; pr++) {
      var pa2 = 0.55 + pr * 0.24;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(pa2) * L * 0.11, Math.sin(pa2) * L * 0.12);
      ctx.stroke();
    }
    ctx.restore();

    /* the scalpel: a white blade at the tail base, which is what makes a
       tang a surgeonfish */
    ctx.fillStyle = rgba(cream, 0.85 * fade);
    ctx.beginPath();
    ctx.moveTo(-L * 0.150, L * 0.038);
    ctx.lineTo(-L * 0.205, L * 0.052);
    ctx.lineTo(-L * 0.150, L * 0.062);
    ctx.closePath();
    ctx.fill();

    /* eye: the palette marking runs straight through it, so it needs a
       bright rim or it vanishes into the black */
    ctx.fillStyle = rgba(mix(blue, cream, 0.5), 0.8 * fade);
    ctx.beginPath();
    ctx.arc(L * 0.356, -L * 0.106, L * 0.040, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(ink, 0.96 * fade);
    ctx.beginPath();
    ctx.arc(L * 0.356, -L * 0.106, L * 0.030, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(cream, 0.85 * fade);
    ctx.beginPath();
    ctx.arc(L * 0.368, -L * 0.118, L * 0.012, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(ink, 0.8 * fade);
    ctx.lineWidth = Math.max(0.6, L * 0.014);
    ctx.beginPath();
    ctx.moveTo(L * 0.492, L * 0.055);
    ctx.lineTo(L * 0.458, L * 0.048);
    ctx.stroke();

    ctx.restore();
  }

  /* ---------------------------------------------------------- lionfish */

  function lionBody(L) {
    ctx.beginPath();
    ctx.moveTo(L * 0.460, L * 0.010);
    ctx.quadraticCurveTo(L * 0.430, -L * 0.055, L * 0.360, -L * 0.082);
    ctx.quadraticCurveTo(L * 0.270, -L * 0.112, L * 0.170, -L * 0.102);
    ctx.bezierCurveTo(L * 0.040, -L * 0.094, -L * 0.060, -L * 0.072, -L * 0.150, -L * 0.030);
    ctx.lineTo(-L * 0.155, L * 0.028);
    ctx.bezierCurveTo(-L * 0.060, L * 0.072, L * 0.040, L * 0.100, L * 0.150, L * 0.107);
    ctx.quadraticCurveTo(L * 0.300, L * 0.114, L * 0.395, L * 0.075);
    ctx.quadraticCurveTo(L * 0.450, L * 0.050, L * 0.460, L * 0.010);
    ctx.closePath();
  }

  function drawLionfish(f, t, dt) {
    var fade = smooth((t - f.t0) / 1800);
    if (fade <= 0) return;
    advance(f, dt, 0.80, 0.93, 0.42);

    var L = f.len;
    var x = f.dir > 0 ? -L * 1.3 + f.travelled : W + L * 1.3 - f.travelled;
    var bob = reduced ? 0 : Math.sin(t * 0.00048 + f.phase) * L * 0.05;
    /* the whole animal breathes rather than beats — the fins ripple, the
       body barely moves */
    var wob = reduced ? 0 : Math.sin(t * 0.0016 + f.phase) * 0.07;
    var roll = reduced ? 0 : Math.sin(t * 0.0009 + f.phase) * 0.045;

    var maroon = hex2rgb(pal.lion);
    var palec = hex2rgb(pal.lionPale);
    var deep = mix(maroon, [0, 0, 0], 0.32);
    var unit = Math.max(0.8, L * 0.013);

    ctx.save();
    ctx.translate(x, f.y + bob);
    ctx.scale(f.dir, 1);
    ctx.rotate(roll);

    /* the webbing carries most of the fin's colour; the rays are the
       skeleton drawn on top of it */
    var web = mix(maroon, palec, 0.18);

    /* far pectoral first, dimmed, so the near one reads as the closer fan */
    ctx.save();
    ctx.globalAlpha = 0.5;
    finFan(L * 0.120, -L * 0.010, 8, 0.28, 2.14, L * 0.32, L * 0.38, wob * 0.7,
      unit * 0.8, mix(web, [0, 0, 0], 0.3), deep, mix(palec, maroon, 0.5), fade, 0.74);
    ctx.restore();

    /* caudal fan, narrower than the pectorals so the stern stays readable */
    finFan(-L * 0.150, L * 0.002, 9, 2.78, 3.50, L * 0.24, L * 0.24, wob * 0.9,
      unit * 0.75, web, maroon, palec, fade, 0.82);

    /* the thirteen dorsal quills: shorter and finer than the pectoral rays,
       and webbed only across their lower third — separated spines are the
       silhouette a lionfish is recognised by */
    finComb(L * 0.200, -L * 0.100, -L * 0.135, -L * 0.036, 13,
      -1.66, -2.44, L * 0.25, L * 0.20, wob, unit * 0.72, web, maroon, palec, fade, 0.32);

    /* anal spines and the big trailing pelvics */
    finComb(-L * 0.020, L * 0.104, -L * 0.140, L * 0.032, 6,
      1.80, 2.36, L * 0.18, L * 0.15, wob * 0.8, unit * 0.8, web, maroon, palec, fade, 0.44);
    finFan(L * 0.055, L * 0.100, 6, 1.24, 1.98, L * 0.28, L * 0.24, wob * 0.8,
      unit * 0.9, web, maroon, palec, fade, 0.60);

    lionBody(L);
    ctx.fillStyle = rgba(palec, fade);
    ctx.fill();

    ctx.save();
    ctx.clip();
    /* the bands: wide maroon bars over cream, tilted forward at the top
       and narrowing over the caudal peduncle */
    for (var b = 0; b < 11; b++) {
      var u = b / 10;
      var bx0 = L * (0.435 - u * 0.60);
      var wide = L * (0.036 - u * 0.012);
      ctx.fillStyle = rgba(b % 3 === 1 ? deep : maroon, (0.92 - u * 0.1) * fade);
      ctx.beginPath();
      ctx.moveTo(bx0 + L * 0.022, -L * 0.16);
      ctx.quadraticCurveTo(bx0 - L * 0.004, 0, bx0 + L * 0.014, L * 0.16);
      ctx.lineTo(bx0 + L * 0.014 - wide, L * 0.16);
      ctx.quadraticCurveTo(bx0 - L * 0.004 - wide, 0, bx0 + L * 0.022 - wide, -L * 0.16);
      ctx.closePath();
      ctx.fill();
    }
    /* a darker saddle over the nape */
    ctx.fillStyle = rgba(deep, 0.3 * fade);
    ctx.beginPath();
    ctx.ellipse(L * 0.28, -L * 0.075, L * 0.13, L * 0.05, -0.15, 0, TAU);
    ctx.fill();
    ctx.restore();

    /* near pectoral: the great banded fan the fish hunts behind. Half again
       as long as anything else on the animal, and swept down and back
       rather than out in front of the snout. */
    finFan(L * 0.170, L * 0.048, 10, 0.55, 2.42, L * 0.42, L * 0.50, wob,
      unit * 1.15, web, maroon, palec, fade, 0.72);

    /* head: the upturned mouth, the eye, and the tentacles above it */
    ctx.strokeStyle = rgba(deep, 0.85 * fade);
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(0.7, L * 0.011);
    ctx.beginPath();
    ctx.moveTo(L * 0.462, L * 0.008);
    ctx.quadraticCurveTo(L * 0.418, L * 0.034, L * 0.372, L * 0.028);
    ctx.stroke();
    /* the ridge of preopercular spines along the cheek */
    ctx.strokeStyle = rgba(deep, 0.4 * fade);
    ctx.lineWidth = Math.max(0.5, L * 0.006);
    for (var hs = 0; hs < 3; hs++) {
      ctx.beginPath();
      ctx.moveTo(L * (0.322 - hs * 0.032), -L * 0.004);
      ctx.lineTo(L * (0.296 - hs * 0.036), L * 0.040);
      ctx.stroke();
    }

    /* supraocular tentacle — the little feathered flag over each eye */
    var tw = wob * 1.4;
    ctx.strokeStyle = rgba(maroon, 0.9 * fade);
    ctx.lineWidth = Math.max(0.7, L * 0.010);
    ctx.beginPath();
    ctx.moveTo(L * 0.378, -L * 0.070);
    ctx.quadraticCurveTo(L * 0.400, -L * 0.150, L * 0.352 + tw * L * 0.2, -L * 0.205);
    ctx.stroke();
    ctx.fillStyle = rgba(palec, 0.8 * fade);
    ctx.beginPath();
    ctx.ellipse(L * 0.352 + tw * L * 0.2, -L * 0.212, L * 0.022, L * 0.012, -0.5 + tw, 0, TAU);
    ctx.fill();
    /* and a pair of barbels under the jaw */
    ctx.strokeStyle = rgba(maroon, 0.75 * fade);
    ctx.lineWidth = Math.max(0.6, L * 0.008);
    ctx.beginPath();
    ctx.moveTo(L * 0.410, L * 0.040);
    ctx.quadraticCurveTo(L * 0.408, L * 0.090, L * 0.376 - tw * L * 0.15, L * 0.118);
    ctx.stroke();

    ctx.fillStyle = rgba(palec, 0.85 * fade);
    ctx.beginPath();
    ctx.arc(L * 0.372, -L * 0.036, L * 0.033, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(mix(deep, [0, 0, 0], 0.5), 0.95 * fade);
    ctx.beginPath();
    ctx.arc(L * 0.374, -L * 0.036, L * 0.021, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  /* --------------------------------------------------- leafy sea dragon */

  /* Spine and half-widths in body-local units: a long tube of a snout, a
     deep trunk, then a tail that tapers away and curls under. */
  var DRAGON_SPINE = [
    [0.500, 0.118], [0.432, 0.100], [0.362, 0.076], [0.302, 0.046],
    [0.252, 0.004], [0.192, -0.024], [0.112, -0.038], [0.030, -0.036],
    [-0.050, -0.014], [-0.130, 0.028], [-0.200, 0.084], [-0.258, 0.152],
    [-0.298, 0.228], [-0.310, 0.300], [-0.286, 0.352], [-0.236, 0.368]
  ];
  /* the bulge at index 4-5 is the head, the swell at 6-8 the brooding
     trunk, and the rest tapers away down the prehensile tail */
  var DRAGON_WIDTH = [
    0.006, 0.009, 0.015, 0.032, 0.050, 0.054, 0.070, 0.072,
    0.060, 0.046, 0.035, 0.027, 0.021, 0.015, 0.011, 0.007
  ];
  var DRAGON_N = 52;
  /* scratch, reused every frame so the drift doesn't allocate */
  var dgX = new Float32Array(DRAGON_N + 1);
  var dgY = new Float32Array(DRAGON_N + 1);
  var dgNX = new Float32Array(DRAGON_N + 1);
  var dgNY = new Float32Array(DRAGON_N + 1);
  var dgW = new Float32Array(DRAGON_N + 1);

  function catmull(a, b, c, d, u) {
    var u2 = u * u, u3 = u2 * u;
    return 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (3 * b - 3 * c + d - a) * u3);
  }

  function sampleDragon(L, drift) {
    var last = DRAGON_SPINE.length - 1;
    var i, k;
    for (i = 0; i <= DRAGON_N; i++) {
      var f = i / DRAGON_N;
      var u = f * last;
      k = Math.min(last - 1, Math.floor(u));
      var s = u - k;
      var p0 = DRAGON_SPINE[Math.max(0, k - 1)];
      var p1 = DRAGON_SPINE[k];
      var p2 = DRAGON_SPINE[k + 1];
      var p3 = DRAGON_SPINE[Math.min(last, k + 2)];
      /* the drift builds toward the tail, the way a held-still animal
         idles against the current */
      var flex = drift * f * f;
      dgX[i] = L * catmull(p0[0], p1[0], p2[0], p3[0], s);
      dgY[i] = L * (catmull(p0[1], p1[1], p2[1], p3[1], s) + flex);
      var w0 = DRAGON_WIDTH[k], w1 = DRAGON_WIDTH[k + 1];
      dgW[i] = L * (w0 + (w1 - w0) * s);
    }
    for (i = 0; i <= DRAGON_N; i++) {
      var a = i > 0 ? i - 1 : 0, b = i < DRAGON_N ? i + 1 : DRAGON_N;
      var tx = dgX[b] - dgX[a], ty = dgY[b] - dgY[a];
      var m = Math.sqrt(tx * tx + ty * ty) || 1;
      dgNX[i] = -ty / m;
      dgNY[i] = tx / m;
    }
  }

  /* One leaflet, in the leaf's own frame. Deliberately lopsided — a
     symmetric blade reads as clip-art foliage, and the whole point of this
     animal is that it does not look drawn. */
  function leafBlade(x0, len, wide) {
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.bezierCurveTo(x0 + len * 0.16, -wide * 0.72, x0 + len * 0.34, -wide, x0 + len * 0.54, -wide * 0.84);
    ctx.bezierCurveTo(x0 + len * 0.72, -wide * 0.70, x0 + len * 0.90, -wide * 0.56, x0 + len, 0);
    ctx.bezierCurveTo(x0 + len * 0.84, wide * 0.62, x0 + len * 0.62, wide * 0.96, x0 + len * 0.42, wide * 0.92);
    ctx.bezierCurveTo(x0 + len * 0.24, wide * 0.88, x0 + len * 0.11, wide * 0.52, x0, 0);
    ctx.closePath();
    ctx.fill();
  }

  function drawDragon(d, t, dt) {
    var fade = smooth((t - d.t0) / 2200);
    if (fade <= 0) return;
    advance(d, dt, 0.64, 0.86, 0.5);

    var L = d.len;
    var x = d.dir > 0 ? -L * 1.3 + d.travelled : W + L * 1.3 - d.travelled;
    var bob = reduced ? 0 : Math.sin(t * 0.00040 + d.phase) * L * 0.05;
    var drift = reduced ? 0 : Math.sin(t * 0.00075 + d.phase) * 0.055;
    var flutter = reduced ? 0 : Math.sin(t * 0.021 + d.phase);

    var body = hex2rgb(pal.dragon);
    var cream = hex2rgb(pal.cream);
    var dark = mix(body, [0, 0, 0], 0.4);
    /* the appendages are outgrowths of the animal, not decorations stuck
       on it, so they carry a good share of the body's own colour */
    var leafc = mix(hex2rgb(pal.dragonLeaf), body, 0.32);
    var leafEdge = mix(leafc, [0, 0, 0], 0.35);

    ctx.save();
    ctx.translate(x, d.y + bob);
    ctx.scale(d.dir, 1);
    ctx.rotate(drift * 0.6);

    sampleDragon(L, drift);

    /* the appendages hang behind the body so the trunk stays legible */
    for (var li2 = 0; li2 < d.leaves.length; li2++) {
      var lf = d.leaves[li2];
      var idx = Math.round(clamp01(lf.u) * DRAGON_N);
      var sway = reduced ? 0 : Math.sin(t * 0.0013 + lf.phase) * 0.24;
      var nx = dgNX[idx] * lf.side, ny = dgNY[idx] * lf.side;
      var bxp = dgX[idx] + nx * dgW[idx] * 0.8;
      var byp = dgY[idx] + ny * dgW[idx] * 0.8;
      var ang = Math.atan2(ny, nx) + lf.lean + sway;
      var len = L * lf.len;
      var wide = len * lf.wide;

      ctx.save();
      ctx.translate(bxp, byp);
      ctx.rotate(ang);
      ctx.strokeStyle = rgba(dark, 0.75 * fade);
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(0.6, len * 0.075);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(len * 0.40, 0);
      ctx.stroke();

      ctx.fillStyle = rgba(leafc, 0.88 * fade);
      leafBlade(len * 0.32, len * 0.68, wide);
      ctx.strokeStyle = rgba(leafEdge, 0.42 * fade);
      ctx.lineWidth = Math.max(0.4, len * 0.035);
      ctx.stroke();
      if (lf.lobes > 1) {
        ctx.save();
        ctx.translate(len * 0.38, 0);
        ctx.rotate(-0.68 + sway * 0.4);
        ctx.fillStyle = rgba(mix(leafc, cream, 0.20), 0.84 * fade);
        leafBlade(0, len * 0.46, wide * 0.60);
        ctx.restore();
        ctx.save();
        ctx.translate(len * 0.42, 0);
        ctx.rotate(0.74 - sway * 0.4);
        ctx.fillStyle = rgba(mix(leafc, [0, 0, 0], 0.16), 0.84 * fade);
        leafBlade(0, len * 0.40, wide * 0.56);
        ctx.restore();
      }
      /* midrib */
      ctx.strokeStyle = rgba(leafEdge, 0.5 * fade);
      ctx.lineWidth = Math.max(0.4, len * 0.028);
      ctx.beginPath();
      ctx.moveTo(len * 0.34, 0);
      ctx.lineTo(len * 0.94, 0);
      ctx.stroke();
      ctx.restore();
    }

    /* the near-invisible fins: a dorsal ripple over the trunk and a
       pectoral by the gill, both beating far faster than the animal moves */
    ctx.fillStyle = rgba(cream, 0.13 * fade);
    ctx.beginPath();
    for (var fi = 14; fi <= 30; fi++) {
      ctx.lineTo(dgX[fi] - dgNX[fi] * dgW[fi], dgY[fi] - dgNY[fi] * dgW[fi]);
    }
    for (var fj = 30; fj >= 14; fj--) {
      var ripple = 1 + 0.55 * Math.sin(fj * 0.9 + flutter * 2.4);
      ctx.lineTo(
        dgX[fj] - dgNX[fj] * (dgW[fj] + L * 0.022 * ripple),
        dgY[fj] - dgNY[fj] * (dgW[fj] + L * 0.022 * ripple)
      );
    }
    ctx.closePath();
    ctx.fill();

    /* the body itself: one tapering ribbon from snout tip to curled tail */
    ctx.beginPath();
    ctx.moveTo(dgX[0], dgY[0]);
    for (var i2 = 0; i2 <= DRAGON_N; i2++) {
      ctx.lineTo(dgX[i2] + dgNX[i2] * dgW[i2], dgY[i2] + dgNY[i2] * dgW[i2]);
    }
    for (var j2 = DRAGON_N; j2 >= 0; j2--) {
      ctx.lineTo(dgX[j2] - dgNX[j2] * dgW[j2], dgY[j2] - dgNY[j2] * dgW[j2]);
    }
    ctx.closePath();
    ctx.fillStyle = rgba(body, fade);
    ctx.fill();

    ctx.save();
    ctx.clip();
    /* pale bars over the trunk, dark rings down the tail */
    ctx.lineCap = 'butt';
    for (var bi = 6; bi < DRAGON_N; bi += 3) {
      var deepEnd = bi / DRAGON_N;
      ctx.strokeStyle = deepEnd < 0.55
        ? rgba(cream, 0.34 * fade)
        : rgba(dark, 0.42 * fade);
      ctx.lineWidth = Math.max(0.6, L * (deepEnd < 0.55 ? 0.012 : 0.009));
      ctx.beginPath();
      ctx.moveTo(dgX[bi] + dgNX[bi] * dgW[bi], dgY[bi] + dgNY[bi] * dgW[bi]);
      ctx.lineTo(dgX[bi] - dgNX[bi] * dgW[bi], dgY[bi] - dgNY[bi] * dgW[bi]);
      ctx.stroke();
    }
    /* the shaded underside */
    ctx.fillStyle = rgba(dark, 0.18 * fade);
    ctx.beginPath();
    for (var ui = 0; ui <= DRAGON_N; ui++) {
      ctx.lineTo(dgX[ui] + dgNX[ui] * dgW[ui], dgY[ui] + dgNY[ui] * dgW[ui]);
    }
    for (var uj = DRAGON_N; uj >= 0; uj--) {
      ctx.lineTo(dgX[uj] + dgNX[uj] * dgW[uj] * 0.15, dgY[uj] + dgNY[uj] * dgW[uj] * 0.15);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    /* the bony ring plates: a syngnathid wears its skeleton on the outside,
       and the little spurs along the ridge are how you can tell */
    ctx.fillStyle = rgba(dark, 0.45 * fade);
    for (var ri2 = 16; ri2 < DRAGON_N - 2; ri2 += 4) {
      var spur = L * 0.014 * (1 - ri2 / DRAGON_N * 0.6);
      ctx.beginPath();
      ctx.moveTo(dgX[ri2 - 1] - dgNX[ri2 - 1] * dgW[ri2 - 1], dgY[ri2 - 1] - dgNY[ri2 - 1] * dgW[ri2 - 1]);
      ctx.lineTo(dgX[ri2] - dgNX[ri2] * (dgW[ri2] + spur), dgY[ri2] - dgNY[ri2] * (dgW[ri2] + spur));
      ctx.lineTo(dgX[ri2 + 1] - dgNX[ri2 + 1] * dgW[ri2 + 1], dgY[ri2 + 1] - dgNY[ri2 + 1] * dgW[ri2 + 1]);
      ctx.closePath();
      ctx.fill();
    }

    /* pectoral flutter behind the head */
    var pi2 = 13;
    ctx.save();
    ctx.translate(dgX[pi2], dgY[pi2]);
    ctx.rotate(1.1 + flutter * 0.25);
    ctx.fillStyle = rgba(cream, 0.22 * fade);
    ctx.beginPath();
    ctx.ellipse(L * 0.035, 0, L * 0.038, L * 0.016, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    /* eye, set just behind the base of that long snout */
    var ei = 10;
    ctx.fillStyle = rgba(cream, 0.6 * fade);
    ctx.beginPath();
    ctx.arc(dgX[ei], dgY[ei] - L * 0.006, L * 0.019, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(mix(dark, [0, 0, 0], 0.4), 0.95 * fade);
    ctx.beginPath();
    ctx.arc(dgX[ei] + L * 0.003, dgY[ei] - L * 0.007, L * 0.011, 0, TAU);
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
      if (li === 1) drawShark(t, dt);
      if (li === 2) {
        for (var bk = 0; bk < blacktips.length; bk++) drawBlacktip(blacktips[bk], t, dt);
      }
      /* the wrasse works the crest, in front of the near coral */
      if (li === 3) {
        for (var wq = 0; wq < wrasses.length; wq++) drawWrasse(wrasses[wq], t, dt);
      }
      /* and the foreground pane, closest of all */
      if (li === 4) {
        for (var dq = 0; dq < dragons.length; dq++) drawDragon(dragons[dq], t, dt);
        for (var tq = 0; tq < tangs.length; tq++) drawTang(tangs[tq], t, dt);
        for (var lq = 0; lq < lionfishes.length; lq++) drawLionfish(lionfishes[lq], t, dt);
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
