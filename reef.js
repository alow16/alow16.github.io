/* ------------------------------------------------------------------ *
 * reef.js — a canvas coral reef that grows itself in on page load,
 *           then populates with wildlife.
 *
 * Styled after Vivian Lopez Rowe's cover illustration for "Remarkably
 * Bright Creatures": flat gouache shapes with rounded ends, no outlines,
 * navy silhouettes layered behind saturated orange / green / purple
 * corals, cream dot detailing, and a watercolour-grained blue wash.
 *
 * The reef is built from the growth forms a real one is: branching and
 * digitate colonies, corymbose and tabular Acropora, columnar pillar coral,
 * foliose whorls, massive mounds, sea fans and whips, kelp, and the
 * free-living discs that lie loose on the sand. Each has its own skeleton,
 * its own way of unfurling, and its own share of the mix per depth (see
 * KINDS, buildForm and MIX).
 *
 * Order of events:
 *   1. the water wash and light shafts settle
 *   2. navy kelp, tables and coral silhouettes rise in the deep layers
 *   3. bright finger corals, plates, columns, kelp blades and mounds grow in
 *      up front, cream dots beading along them as they finish
 *   4. wildlife arrives: fish schools fade in and start swimming, bubbles
 *      trickle off the reef, a whale shark and blacktip reef sharks cross
 *      the mid-water, a humphead wrasse patrols the reef crest, a coral
 *      grouper holds its territory over the near coral with a party of
 *      ribboned sweetlips idling behind it and a herd of yellow tangs
 *      grazing above, lionfish hang over the near coral, a shoal of regal
 *      blue tangs and a pair or two of moorish idols drift through the near
 *      foreground, a leafy sea dragon works the bed below them, and
 *      starfish, urchins, anemones and clams dot the floor
 *
 * Every animal is sized from a real body length in metres against a depth
 * plane (see METRES / planes below), so the whale shark really is thirty
 * times the tang — the small ones are legible because they swim close to
 * the glass, not because they were drawn big.
 *
 * How many of each is not a composition choice either. A fish appears in
 * the number it is actually found in: the grouper alone because it holds a
 * territory, the sweetlips in a small loose company, the yellow tangs in a
 * grazing herd, and the moorish idols strictly in pairs.
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
      /* the two hues the plate corals brought with them: Turbinaria's
         mustard, and the blue-green of a table Acropora in clear water */
      teal: ['#1f9d94', '#2ab5a6', '#177f7c'],
      gold: ['#e0a52a', '#eabb47', '#c78d1d'],
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
      /* moorish idol: two soot bars over a pearl body, with the yellow
         saddle over the muzzle and the black-and-white caudal */
      idolBar: '#1c2433',
      idolPale: '#f3efe2',
      idolYellow: '#f2c33a',
      /* ribboned sweetlips: gold ribbons edged in ink over a cream flank,
         and the gold fins those ribbons run out onto */
      sweet: '#efbe2c',
      sweetPale: '#f7f1de',
      sweetLine: '#1d2534',
      /* yellow tang: one flat cadmium yellow, and the white peduncle blade */
      ytang: '#f4bf14',
      ytangDeep: '#d59b06',
      /* coral grouper: vermilion under a scatter of cobalt spots */
      grouper: '#d4442a',
      grouperDeep: '#9d2a1a',
      grouperSpot: '#5fc4e6',
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
      teal: ['#146f69', '#1b8a7e', '#0e5a57'],
      gold: ['#ad7c1c', '#bd9130', '#946611'],
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
      idolBar: '#111823',
      idolPale: '#d5d0c2',
      idolYellow: '#cfa11e',
      sweet: '#c99b17',
      sweetPale: '#dcd5c0',
      sweetLine: '#131926',
      ytang: '#cf9f0c',
      ytangDeep: '#a67a04',
      grouper: '#a5321e',
      grouperDeep: '#711d12',
      grouperSpot: '#3d93b0',
      dragon: '#96682a',
      dragonLeaf: '#657a34',
      urchin: '#251a38'
    }
  };

  var pal;

  /* A reef is one place, not a paint chart. At this density every hue family
     in the palette would be on screen a dozen times over and the whole thing
     would read as confetti, so each build keeps four families and folds the
     other two onto the ones it kept. Green always survives — the kelp needs
     it — and the fish and the big animals are exempt, which is what lets
     them stay legible against whatever the coral settled on.

     The four are chosen by temperature rather than drawn freely: green, one
     of the two warms, and two of the three cools. Drawn freely, a build can
     come up green-orange-gold and read as a single hue. A dropped family
     also folds onto its own temperature, so a coral the palette meant to be
     warm stays warm. */
  var famMap = {};
  var WARM = ['orange', 'gold'];
  var COOL = ['purple', 'magenta', 'teal'];

  function pickFamilies() {
    var keepWarm = WARM[ri(2)];
    var a = ri(3), b = (a + 1 + ri(2)) % 3;   /* two distinct cools */
    famMap = { green: 'green' };
    for (var w = 0; w < WARM.length; w++) famMap[WARM[w]] = keepWarm;
    for (var k = 0; k < COOL.length; k++) {
      famMap[COOL[k]] = k === a || k === b ? COOL[k]
        : rnd() < 0.5 ? COOL[a] : COOL[b];
    }
  }

  function fam(name) { return pal[famMap[name] || name]; }

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
     where the small, ornate animals drift close enough to be read.

     `count` is deliberately high: on a healthy reef the colonies grow into
     each other and there is no bare bed between them, so the slots have to
     overlap rather than tile. The beds are also spread further apart than
     they need to be for depth alone, which is what turns four crowded rows
     into one massif with a crest instead of four visible bands. */
  var LAYERS = [
    { scale: 0.52, veil: 0.20, floor: 0.780, silhouette: true,  count: 25 },
    { scale: 0.68, veil: 0.11, floor: 0.865, silhouette: true,  count: 20 },
    { scale: 0.95, veil: 0.04, floor: 0.955, silhouette: false, count: 18 },
    { scale: 1.30, veil: 0.00, floor: 1.045, silhouette: false, count: 10 },
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
    grouper:    0.42,
    sweetlips:  0.40,
    lionfish:   0.35,
    tang:       0.28,
    dragon:     0.24,
    idol:       0.20,
    yellowTang: 0.18,
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
    /* a coral grouper is an ambush predator that spends the day propped on
       its pectorals over one head of coral — it barely commutes */
    grouper:    0.12,
    /* sweetlips hover rather than swim, sculling on the pectorals */
    sweetlips:  0.16,
    lionfish:   0.07,
    tang:       0.30,
    /* a grazing Zebrasoma stops at every mouthful, so it covers ground
       slower than the regal tang shoal that is just passing through */
    yellowTang: 0.22,
    idol:       0.26,
    dragon:     0.06,
    reefFish:   0.34
  };
  var TEMPO = 1.35;
  /* The reef runs at a fraction of that rate — a slower, more watchable
     scene. Travel and body motion both scale by it, because a fish that
     covers ground 2.5x slower beats its tail 2.5x slower too; slow only the
     travel and every animal thrashes its way to nowhere. */
  var PACE = 1 / 2.5;

  var W = 0, H = 0, dpr = 1;
  /* pixels per metre at depth plane 1.0, calibrated off the whale shark */
  var pxPerM = 1;
  /* a phone shows the reef through a narrower window, so the near plane has
     to come closer still or nothing in it survives the shrink */
  var nearBoost = 1;

  function sizeOf(m, plane) { return m * pxPerM * plane; }
  /* px per millisecond, matching how the roamers integrate travel */
  function speedOf(mps, plane) { return mps * TEMPO * PACE * pxPerM * plane / 1000; }

  var waves = [];
  var colonies = [], mounds = [], forms = [], fish = [], bubbles = [], critters = [];
  var shark = null, blacktips = [], wrasses = [];
  var lionfishes = [], tangs = [], dragons = [];
  var groupers = [], sweetlipses = [], yellowtangs = [], idols = [];
  var grain = null;
  var GROWN_AT = 0;

  /* How high the reef is allowed to build. The prose is laid out by CSS and
     its depth swings hard with the viewport — three paragraphs that take a
     third of a desktop window take two thirds of a phone — so ask the page
     where it ends rather than guessing at a fraction of the height. Every
     colony is then fitted under this line, and nothing grows into the text
     at any size. */
  var ceilingY = 0;

  function readCeiling() {
    var el = document.querySelector('.prose') || document.querySelector('.content');
    var y = el
      /* plus a band of quiet water, so the crest sits clear of the last line
         rather than crowding up against it */
      ? el.getBoundingClientRect().bottom + (window.scrollY || 0) + H * 0.09
      : H * 0.42;
    /* however long the page runs, the reef keeps somewhere to stand */
    return Math.min(H * 0.88, Math.max(H * 0.28, y));
  }

  /* What a finished colony actually reaches above its base, walking the node
     chain the same way the draw does. */
  function colonyRise(nodes) {
    var y = new Float32Array(nodes.length);
    var top = 0;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      y[i] = (n.p < 0 ? 0 : y[n.p]) + Math.sin(n.abs) * n.len;
      if (y[i] < top) top = y[i];
    }
    return -top;
  }

  /* The bed is a rolling contour, so the layers don't stack up as bands. */
  function floorAt(li, x) {
    var w = waves[li];
    return w.base + w.amp * (Math.sin(x * w.f1 + w.p1) * 0.62 + Math.sin(x * w.f2 + w.p2) * 0.38);
  }

  /* ------------------------------------------------- growth vocabulary */

  /* Every shape here is a chain or fan of round-capped segments. Keeping the
     width nearly constant along a chain is what gives the flat, blunt
     cut-paper look instead of a tapering twig.

     Most kinds are described declaratively — how many levels, how many kids
     per level, how far they splay — and grown by the recursive rule in
     buildColony. The two that a recursive rule can't say anything true about
     (a corymb finishes at one height however far its branches ran; a stand of
     columns is not a tree at all) carry a `layout` that lays their skeleton
     out by hand instead. Either way the result is one node list, so they all
     grow in and sway through the same code.

     Three more growth forms — tabular, foliose and free-living — aren't
     segment chains under any description, and are built as filled outlines
     further down (see buildForm). */
  /* A note on sizes, since they only work as a set. Every stemLen below is a
     fraction of canvas height, and a colony's finished height is roughly that
     times its level count. They are tuned into three storeys — kelp and whips
     emergent at around a quarter of the frame, the branching and columnar
     colonies at a sixth, the plates and corymbose heads at a twelfth — so a
     dense planting reads as a reef with a crest rather than as a few towers
     standing over a flat carpet. Change one and the storey it belongs to
     stops meaning anything. */
  var KINDS = {
    /* tall kelp blade */
    kelp: {
      levels: function (l) { return 5 + ri(5); },
      kids: function () { return 1; },
      spread: 0,
      lenRatio: function () { return rr(0.94, 1.02); },
      widthRatio: 0.985,
      upBias: 0.07,
      curvy: true,
      stemLen: 0.044,
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
      stemLen: 0.052,
      stemWidth: 0.72,
      sway: 0.005
    },
    /* chunky branching coral */
    branch: {
      levels: function () { return 3 + ri(3); },
      kids: function (d) { return d === 1 ? 3 : rnd() < 0.4 ? 3 : 2; },
      spread: function (d) { return (0.85 - d * 0.06) * rr(0.85, 1.25); },
      lenRatio: function (d) { return d === 1 ? rr(0.78, 0.95) : rr(0.66, 0.82); },
      widthRatio: 0.88,
      upBias: 0.36,
      stemLen: 0.062,
      stemWidth: 0.34,
      sway: 0.005
    },
    /* thin sea whip, beaded with cream dots */
    whip: {
      levels: function () { return 6 + ri(4); },
      kids: function (d) { return d === 1 && rnd() < 0.5 ? 2 : 1; },
      spread: 0.5,
      lenRatio: function () { return rr(0.95, 1.0); },
      widthRatio: 0.99,
      upBias: 0.08,
      curvy: true,
      stemLen: 0.036,
      stemWidth: 0.16,
      tall: true,
      sway: 0.017,
      /* a whip earns its keep from the beading — it always gets dots, all
         the way down, or it reads as a stray wire */
      beadChance: 1,
      beadFrom: function () { return 1; },
      beadPer: 2
    },
    /* sea fan: a short stem exploding into a wide lattice of ribs */
    fan: {
      levels: function () { return 1 + ri(2); },
      kids: function (d) { return d === 1 ? 7 + ri(4) : 1; },
      spread: function (d) { return d === 1 ? 1.3 : 0.06; },
      lenRatio: function (d) { return d === 1 ? rr(3.4, 4.8) : rr(0.7, 0.85); },
      widthRatio: 0.55,
      upBias: 0.14,
      stemLen: 0.024,
      stemWidth: 0.6,
      sway: 0.02
    },
    /* corymbose Acropora — the low, dense plate of blunt fingers you swim
       over on a reef flat. The defining trick isn't the branching, it's that
       every branchlet stops at the same ceiling however far out its parent
       ran, so a colony that spreads sideways still finishes level on top. */
    corymbose: {
      stemLen: 0.034,
      stemWidth: 1.15,
      sway: 0.004,
      beadChance: 0.8,
      /* pale axial corallites — the growing tip of an Acropora branchlet is
         a shade lighter than the rest of it, and only at the tip */
      beadFrom: function (levels) { return levels; },
      beadPer: 1,
      beadU: function () { return 0.92; },
      layout: function (nodes, unit) {
        var root = nodes[0];
        var half = unit * rr(2.3, 3.6);
        var crown = unit * rr(1.4, 2.3);
        var ribs = 4 + ri(4);

        for (var i = 0; i < ribs; i++) {
          var u = (ribs === 1 ? 0 : (i / (ribs - 1)) * 2 - 1) + rr(-0.05, 0.05);
          var out = u < 0 ? -1 : 1;
          /* the outer ribs lie almost flat and travel furthest; the middle
             of the colony barely leans at all */
          var abs = UP + u * rr(0.95, 1.30);
          var reach = half * (0.26 + Math.abs(u) * rr(0.74, 1.02));
          var segs = 2 + ri(2);
          var ribW = root.w * rr(0.30, 0.42);

          /* walk the rib out from the top of the base stub, hanging
             branchlets at every joint on the way */
          var px = Math.cos(root.abs) * root.len;
          var py = Math.sin(root.abs) * root.len;
          var parent = 0;

          for (var s = 0; s < segs; s++) {
            /* a branch sags a little further out as it goes, the way one
               does once it is carrying its own weight */
            abs += out * rr(0.02, 0.15);
            var slen = reach / segs;
            var seg = {
              p: parent,
              a: abs - nodes[parent].abs,
              abs: abs,
              len: slen,
              w: Math.max(1.1, ribW * (1 - s * 0.08)),
              d: 1,
              t0: nodes[parent].t1 - 40 + rr(0, 60),
              phase: rr(0, TAU)
            };
            seg.t1 = seg.t0 + 260;
            parent = nodes.push(seg) - 1;
            px += Math.cos(abs) * slen;
            py += Math.sin(abs) * slen;

            /* one branchlet per joint, two or three crowding the far end */
            var kids = s === segs - 1 ? 1 + ri(2) : rnd() < 0.72 ? 1 : 0;
            for (var k = 0; k < kids; k++) {
              var spot = px + rr(-0.1, 0.1) * unit;
              /* the ceiling domes very slightly toward the middle, and each
                 branchlet stops a little short of it in its own way — level
                 to the millimetre is a hedge, not a coral */
              var ceil = -crown * (1 - 0.26 * Math.min(1, (spot / half) * (spot / half))) * rr(0.80, 1.02);
              var rise = Math.max(unit * 0.34, py - ceil);
              var bAbs = UP + rr(-0.16, 0.16) + out * 0.10 * (k - (kids - 1) / 2);
              var br = {
                p: parent,
                a: bAbs - abs,
                abs: bAbs,
                len: rise,
                w: Math.max(1, ribW * rr(0.56, 0.82)),
                d: 2,
                t0: seg.t1 - 30 + rr(0, 90),
                phase: rr(0, TAU)
              };
              br.t1 = br.t0 + 240;
              nodes.push(br);
            }
          }
        }
        return 2;
      }
    },
    /* columnar: pillar coral and the thick Porites stands — a handful of
       blunt columns off one encrusting base, each leaning its own way and
       then straightening as it climbs toward the light */
    columnar: {
      stemLen: 0.036,
      stemWidth: 1.0,
      sway: 0.0025,
      beadChance: 0.4,
      beadFrom: function () { return 1; },
      beadPer: 2,
      layout: function (nodes, unit) {
        var root = nodes[0];
        var cols = 2 + ri(4);
        var splay = rr(0.42, 0.92);

        for (var i = 0; i < cols; i++) {
          var u = (cols === 1 ? 0 : (i / (cols - 1)) * 2 - 1) + rr(-0.12, 0.12);
          var abs = UP + u * splay;
          var segs = 3 + ri(3);
          var segLen = unit * rr(0.85, 1.5);
          var w = root.w * rr(0.50, 0.78);
          var parent = 0;

          for (var s = 0; s < segs; s++) {
            /* pull hard back to vertical after the first segment: the lean
               is set at the base, and the column stands up out of it */
            if (s > 0) abs += (UP - abs) * 0.55 + rr(-0.07, 0.07);
            var node = {
              p: parent,
              a: abs - nodes[parent].abs,
              abs: abs,
              len: segLen * (1 - s * 0.05),
              /* barely any taper — a column that narrows reads as a twig */
              w: Math.max(1.4, w * (1 - s * 0.06)),
              d: s === 0 ? 1 : 2,
              t0: nodes[parent].t1 - 50 + rr(0, 70),
              phase: rr(0, TAU)
            };
            node.t1 = node.t0 + 300 * Math.pow(0.94, s);
            parent = nodes.push(node) - 1;
          }
        }
        return 2;
      }
    }
  };

  function buildColony(kindName, cx, floorY, layer, li, startT) {
    var K = KINDS[kindName];
    var nodes = [];
    var dots = [];
    var levels = 0;
    /* tall shapes compress less between layers, so the deep kelp still
       reaches up the way it does on the cover */
    var hScale = K.tall ? Math.pow(layer.scale, 0.6) : layer.scale;
    /* a wide spread, because a crowded row of same-sized colonies reads as
       a picket fence — the lumpiness of the crest comes from here */
    var stem = H * K.stemLen * hScale * rr(0.62, 1.45);
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

    if (K.layout) {
      levels = K.layout(nodes, stem, layer);
    } else {
      levels = K.levels(layer);
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
    }

    /* fit the colony under the text: measure what it really reaches and, if
       it would overrun, shrink the whole thing uniformly. Scaling lengths
       alone would leave a squat, fat version of a tall shape. */
    var rise = colonyRise(nodes);
    var headroom = floorY - ceilingY;
    if (rise > headroom && headroom > 0) {
      var fit = headroom / rise;
      for (var z = 0; z < nodes.length; z++) {
        nodes[z].len *= fit;
        nodes[z].w = Math.max(1, nodes[z].w * fit);
      }
    }

    /* cream dot detailing, the cover's sucker-and-bead motif. Where it lands
       is the kind's business: beads all down a whip, a single pale corallite
       on the tip of an Acropora branchlet, nothing at all in the deep
       silhouette layers, where it would just be noise. */
    var beaded = !layer.silhouette && rnd() < (K.beadChance === undefined ? 0.38 : K.beadChance);
    if (beaded) {
      var from = K.beadFrom ? K.beadFrom(levels) : Math.max(1, levels - 2);
      var per = K.beadPer || 3;
      for (var n = 1; n < nodes.length; n++) {
        if (nodes[n].d < from) continue;
        for (var q = 0; q < per; q++) {
          dots.push({
            n: n,
            u: K.beadU ? K.beadU(q, per) : (q + 0.5) / per,
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
      tone = rnd() < 0.75 ? pick(fam('green')) : pick(fam('purple'));
    } else if (kindName === 'whip') {
      tone = rnd() < 0.5 ? pick(fam('magenta')) : pick(fam('purple'));
    } else if (kindName === 'hand') {
      tone = pick(rnd() < 0.45 ? fam('green') : rnd() < 0.6 ? fam('purple') : fam('orange'));
    } else if (kindName === 'fan') {
      tone = pick(rnd() < 0.5 ? fam('magenta') : fam('purple'));
    } else if (kindName === 'corymbose') {
      /* the Acropora blues and greens, with the odd gold or purple colony
         so a bank of them doesn't come out as clones */
      tone = pick(rnd() < 0.38 ? fam('teal') : rnd() < 0.55 ? fam('green')
        : rnd() < 0.6 ? fam('gold') : fam('purple'));
    } else if (kindName === 'columnar') {
      /* pillar and Porites stands are sandy gold more often than not */
      tone = pick(rnd() < 0.55 ? fam('gold') : rnd() < 0.6 ? fam('orange') : fam('teal'));
    } else {
      tone = pick(rnd() < 0.6 ? fam('orange') : fam('purple'));
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

  /* --------------------------------------------- plates, whorls, discs */

  /* Three growth forms that no chain of round-capped segments can tell the
     truth about, so they are built as filled outlines and unfurl rather than
     growing tip-first:

       tabular    — Acropora hyacinthus, one stout trunk holding a table out
                    flat to the light, rim finely ragged, top studded with
                    short upright branchlets
       foliose    — Turbinaria and Montipora foliosa: whorls of thin plate
                    stacked and ruffled like cabbage leaves, each shelf
                    shading the one below
       freeLiving — Fungia, Cycloseris, Heliofungia: solitary corals that
                    never cement themselves down, so these are the only
                    corals in the scene that lie tilted

     They share buildForm/drawForm and the layer plumbing the mounds use, so
     they take their turn in the reef's growth order like everything else. */
  function buildForm(kindName, cx, floorY, layer, li, startT) {
    var s = layer.scale;
    var f = {
      kind: kindName,
      x: cx,
      y: floorY,
      li: li,
      t0: startT,
      phase: rr(0, TAU),
      plain: layer.silhouette
    };

    if (kindName === 'tabular') {
      f.rx = H * 0.078 * s * rr(0.75, 1.4);
      f.ry = f.rx * rr(0.11, 0.17);
      /* a table on the slope stands on a real trunk — which is also what
         lifts it clear of the sand line and up into the water column, where
         its flat silhouette is the most legible shape on the reef */
      f.stalk = f.rx * rr(0.85, 1.55);
      f.tilt = rr(-0.10, 0.10);
      /* the rim of a table is never a clean edge — it is a few hundred
         branch tips that all stopped growing outward at slightly different
         times. The wobble goes almost entirely into the thickness, since
         that is the dimension the eye reads a nearly edge-on plate by. */
      f.rimX = [];
      f.rimY = [];
      var rimN = 34;
      for (var i = 0; i < rimN; i++) {
        f.rimX.push(rr(0.975, 1.02));
        f.rimY.push(rr(0.78, 1.14));
      }
      /* the short upright branchlets that stud a table's upper surface. `v`
         is how far back across that surface each one roots — without it they
         all line up along the far rim like candles on a cake. */
      f.nubs = [];
      var nubN = layer.silhouette ? 5 + ri(5) : 9 + ri(8);
      for (var n = 0; n < nubN; n++) {
        f.nubs.push({
          u: rr(-0.9, 0.9),
          v: rr(0.1, 1),
          h: rr(0.06, 0.17),
          w: rr(0.03, 0.055),
          lean: rr(-0.5, 0.5)
        });
      }
      /* back to front, so a near branchlet crosses in front of a far one */
      f.nubs.sort(function (a, b) { return b.v - a.v; });
      f.paleTips = !layer.silhouette && rnd() < 0.6;
      f.tone = hex2rgb(layer.silhouette ? pick(pal.deep)
        : pick(rnd() < 0.45 ? fam('teal') : rnd() < 0.6 ? fam('orange') : fam('purple')));
      GROWN_AT = Math.max(GROWN_AT, startT + 1800);

    } else if (kindName === 'foliose') {
      var span = H * 0.060 * s * rr(0.8, 1.5);
      var count = 4 + ri(4);
      f.shelves = [];
      var lift = 0;
      for (var sh = 0; sh < count; sh++) {
        /* each whorl grows out of the lip of the one below, so it starts
           narrower and a little off to one side. The jitter matters: taper
           the widths cleanly and the colony comes out a Christmas tree, when
           a real one has the odd upper whorl overreaching the one beneath. */
        var k = (1 - (sh / count) * rr(0.42, 0.64)) * rr(0.84, 1.16);
        var seg = {
          w: span * k,
          h: span * rr(0.15, 0.24) * k,
          y: -lift,
          /* the whorls step alternately either side of the stalk, so the
             stack zigzags up it instead of sitting concentric */
          dx: (sh % 2 === 0 ? -1 : 1) * rr(0.06, 0.22) * span * k,
          lean: rr(-0.20, 0.20),
          lobes: 2 + ri(3),
          ripple: rr(0.10, 0.30),
          phase: rr(0, TAU),
          t0: startT + sh * rr(190, 340)
        };
        f.shelves.push(seg);
        /* the whorls climb as well as widen — a Turbinaria colony builds a
           tower of shelves — but they have to overlap as they go, or the
           stack reads as a pile of loose saucers */
        lift += span * rr(0.20, 0.34) * k;
        GROWN_AT = Math.max(GROWN_AT, seg.t0 + 1100);
      }
      /* the encrusting stalk every whorl grows off, which is the other half
         of not reading as loose saucers. It stops at the topmost whorl —
         run it to the full height of the stack and it pokes out the top. */
      f.trunk = -f.shelves[f.shelves.length - 1].y;
      f.trunkW = span * rr(0.20, 0.30);
      f.trunkLean = rr(-0.1, 0.1);
      f.beaded = !layer.silhouette && rnd() < 0.45;
      f.tone = hex2rgb(layer.silhouette ? pick(pal.deep)
        : pick(rnd() < 0.4 ? fam('gold') : rnd() < 0.6 ? fam('teal') : rnd() < 0.6 ? fam('green') : fam('magenta')));

    } else {
      f.r = H * 0.022 * s * rr(0.7, 1.55);
      /* however it happened to settle */
      f.tilt = rr(-0.34, 0.34);
      f.septa = 13 + ri(13);
      /* Heliofungia is the one that wears its tentacles out all day; the
         rest of the family keeps them in and reads as a ribbed disc */
      f.tent = !layer.silhouette && rnd() < 0.42 ? 11 + ri(10) : 0;
      f.wob = [];
      for (var w = 0; w < f.tent; w++) f.wob.push(rr(0, 1));
      f.tone = hex2rgb(layer.silhouette ? pick(pal.deep)
        : pick(rnd() < 0.35 ? fam('magenta') : rnd() < 0.5 ? fam('orange')
            : rnd() < 0.6 ? fam('gold') : fam('green')));
      GROWN_AT = Math.max(GROWN_AT, startT + 900);
    }

    /* the same fit under the text the colonies get. A free-living disc lies
       flat on the bed and could never reach it. */
    var headroom = floorY - ceilingY;
    var rise = kindName === 'tabular' ? f.stalk + f.ry * 1.14 + f.rx * 0.17
      : kindName === 'foliose' ? f.trunk + f.shelves[f.shelves.length - 1].h
      : 0;
    if (rise > headroom && headroom > 0) {
      var fit = headroom / rise;
      if (kindName === 'tabular') {
        f.rx *= fit;
        f.ry *= fit;
        f.stalk *= fit;
      } else {
        f.trunk *= fit;
        f.trunkW *= fit;
        for (var sc = 0; sc < f.shelves.length; sc++) {
          f.shelves[sc].w *= fit;
          f.shelves[sc].h *= fit;
          f.shelves[sc].y *= fit;
          f.shelves[sc].dx *= fit;
        }
      }
    }

    return f;
  }

  /* small bed life: starfish, urchins, anemones, clams. Cheap, mostly
     static shapes scattered along the floor between the coral. */
  function buildCritter(cx, floorY, li, layer, startT) {
    var kind = rnd() < 0.30 ? 'star' : rnd() < 0.58 ? 'urchin' : rnd() < 0.80 ? 'anemone' : 'clam';
    var r = H * 0.013 * layer.scale * rr(0.65, 1.3);
    var tone = kind === 'urchin' ? pal.urchin
      : kind === 'anemone' ? pick(rnd() < 0.5 ? fam('magenta') : fam('purple'))
      : kind === 'clam' ? pick(rnd() < 0.5 ? fam('orange') : fam('purple'))
      : pick(rnd() < 0.5 ? fam('orange') : fam('magenta'));

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

  /* The cobalt spotting on a coral grouper. Same principle as the wrasse's
     scribble: fixed in body-local units, so it is a marking and not a
     shimmer. The spots are small, evenly scattered and slightly larger over
     the flank than on the head, which is how the real fish is speckled. */
  function grouperSpots() {
    var s = [];
    for (var i = 0; i < 96; i++) {
      var x = rr(-0.34, 0.46);
      s.push({
        x: x,
        /* laid over the whole flank and trimmed by the body's own clip,
           so the spotting reaches the back and the snout the way it does
           on the animal, instead of pooling in the middle */
        y: rr(-0.21, 0.21),
        /* they shrink toward the snout */
        r: rr(0.009, 0.016) * (x > 0.28 ? 0.75 : 1)
      });
    }
    return s;
  }

  /* A leafy sea dragon's appendages are not scattered decoration — each one
     grows off a named bony spine, and the layout is the single most
     recognisable thing about the animal: a crest over the head, big fronds
     off the nape, a hanging fan under the chest and belly, a prominent pair
     at the tail base, then diminishing pairs down the tail.
       u     — position along the spine, snout tip 0 to tail tip 1
       side  — +1 dorsal ridge, -1 ventral ridge
       lean  — how far it sweeps astern, whichever ridge it grew from
       depth — -1 far flank, 0 on the ridge, +1 the flank facing the viewer;
               this is what stops a side-on animal reading as a paper cutout */
  var DRAGON_LEAVES = [
    /* head: supraorbital spine, the coronet, cheek and throat */
    { u: 0.195, side:  1, lean:  0.55, len: 0.105, wide: 0.16, lobes: 1, depth:  0 },
    { u: 0.250, side:  1, lean:  0.22, len: 0.225, wide: 0.13, lobes: 3, depth:  0 },
    { u: 0.292, side:  1, lean:  0.48, len: 0.165, wide: 0.13, lobes: 2, depth:  0 },
    { u: 0.222, side: -1, lean:  0.72, len: 0.090, wide: 0.17, lobes: 1, depth:  0 },
    { u: 0.300, side: -1, lean:  0.40, len: 0.185, wide: 0.14, lobes: 2, depth:  0 },
    { u: 0.262, side:  1, lean: -0.20, len: 0.140, wide: 0.14, lobes: 2, depth: -1 },
    { u: 0.235, side: -1, lean:  0.14, len: 0.110, wide: 0.16, lobes: 1, depth: -1 },
    /* nape and shoulder — the heaviest cluster on the animal */
    { u: 0.335, side:  1, lean:  0.24, len: 0.225, wide: 0.13, lobes: 3, depth:  0 },
    { u: 0.385, side:  1, lean:  0.44, len: 0.180, wide: 0.13, lobes: 2, depth:  0 },
    { u: 0.360, side:  1, lean: -0.10, len: 0.155, wide: 0.14, lobes: 2, depth: -1 },
    { u: 0.350, side: -1, lean:  0.14, len: 0.215, wide: 0.14, lobes: 3, depth:  0 },
    { u: 0.320, side: -1, lean:  0.60, len: 0.115, wide: 0.16, lobes: 1, depth:  1 },
    /* trunk */
    { u: 0.440, side:  1, lean:  0.34, len: 0.205, wide: 0.13, lobes: 3, depth:  0 },
    { u: 0.420, side: -1, lean:  0.26, len: 0.200, wide: 0.14, lobes: 2, depth:  0 },
    { u: 0.490, side: -1, lean:  0.44, len: 0.165, wide: 0.13, lobes: 2, depth:  0 },
    { u: 0.470, side:  1, lean: -0.06, len: 0.130, wide: 0.14, lobes: 2, depth: -1 },
    { u: 0.455, side: -1, lean:  0.04, len: 0.135, wide: 0.16, lobes: 2, depth:  1 },
    { u: 0.400, side:  1, lean:  0.62, len: 0.120, wide: 0.14, lobes: 2, depth:  1 },
    /* tail base: the pair that trails furthest behind the animal */
    { u: 0.560, side:  1, lean:  0.42, len: 0.200, wide: 0.13, lobes: 2, depth:  0 },
    { u: 0.585, side: -1, lean:  0.50, len: 0.165, wide: 0.13, lobes: 2, depth:  0 },
    { u: 0.540, side: -1, lean:  0.22, len: 0.115, wide: 0.15, lobes: 1, depth: -1 },
    /* and down the tail, alternating and shrinking to nothing */
    { u: 0.650, side:  1, lean:  0.50, len: 0.165, wide: 0.13, lobes: 2, depth:  0 },
    { u: 0.700, side: -1, lean:  0.58, len: 0.140, wide: 0.13, lobes: 1, depth:  0 },
    { u: 0.760, side:  1, lean:  0.58, len: 0.120, wide: 0.13, lobes: 1, depth:  0 },
    { u: 0.820, side: -1, lean:  0.64, len: 0.098, wide: 0.14, lobes: 1, depth:  0 },
    { u: 0.880, side:  1, lean:  0.64, len: 0.078, wide: 0.15, lobes: 1, depth:  0 },
    { u: 0.940, side: -1, lean:  0.68, len: 0.058, wide: 0.16, lobes: 1, depth:  0 }
  ];

  /* Jitter the plan per animal, and give every leaf its own drift phase so
     the whole plant never sways as one piece. */
  function dragonLeaves() {
    var out = [];
    for (var i = 0; i < DRAGON_LEAVES.length; i++) {
      var s = DRAGON_LEAVES[i];
      out.push({
        u: s.u + rr(-0.010, 0.010),
        side: s.side,
        /* generous jitter on the lean especially: a real animal's leaves
           splay, and a fixed sweep angle reads as one printed fern frond */
        lean: s.lean + rr(-0.30, 0.30),
        len: s.len * rr(0.86, 1.16),
        wide: s.wide * rr(0.86, 1.18),
        lobes: s.lobes,
        depth: s.depth,
        phase: rr(0, TAU)
      });
    }
    return out;
  }

  /* ----------------------------------------------------------- builder */

  /* What grows where, as weights rather than a ladder of magic thresholds.
     The deep silhouette layers lean on the forms that survive being reduced
     to an outline — tables, columns, whorls, kelp — while the near layers
     carry the fussier ones, whose beading and ridges only land up close.
     Whips are absent from the deep mix on purpose: with no cream beading
     they'd read as stray wires.

     The weights are also what keeps a crowded reef looking like a reef. The
     emergent kinds — kelp and whips — are held to about a tenth between them,
     because they are tall and thin and read as a hedge the moment there are
     many of them. The mass belongs to the reef-builders: branching, digitate,
     corymbose, tabular, foliose, columnar, massive. */
  var MIX = {
    deep: ['kelp', 9, 'hand', 12, 'branch', 14, 'fan', 5,
           'corymbose', 12, 'columnar', 12, 'tabular', 14, 'foliose', 10,
           'mound', 8],
    near: ['kelp', 6, 'hand', 12, 'branch', 12, 'whip', 6, 'fan', 6,
           'corymbose', 14, 'columnar', 10, 'tabular', 12, 'foliose', 12,
           'mound', 10]
  };

  function chooseKind(mix) {
    var total = 0, i;
    for (i = 1; i < mix.length; i += 2) total += mix[i];
    var r = rnd() * total;
    for (i = 1; i < mix.length; i += 2) {
      r -= mix[i];
      if (r <= 0) return mix[i - 1];
    }
    return mix[0];
  }

  /* A massive coral: the flat domes that carry most of a reef's bulk. `low`
     asks for one of the encrusting lumps that pack the gaps between the
     bigger shapes rather than a boulder in its own right. */
  function addMound(cx, floorY, li, layer, startT, rx, low) {
    var textureRoll = layer.silhouette || low ? 1 : rnd();
    mounds.push({
      li: li,
      x: cx,
      y: floorY,
      rx: rx,
      ry: rx * (low ? rr(0.26, 0.5) : rr(0.45, 0.7)),
      t0: startT,
      /* the massive corals stay earthy — purple, orange, mustard. Let the
         crust go the full rainbow and a dense reef reads as confetti. */
      tone: hex2rgb(layer.silhouette ? pick(pal.deep)
        : pick(rnd() < 0.34 ? fam('purple') : rnd() < 0.5 ? fam('orange') : fam('gold'))),
      beaded: textureRoll >= 0.35 && textureRoll < 0.65,
      groove: textureRoll < 0.35,
      dots: 3 + ri(4),
      seed: rnd()
    });
    GROWN_AT = Math.max(GROWN_AT, startT + 700);
  }

  function buildScene() {
    rnd = mulberry32(seed);
    colonies = []; mounds = []; forms = []; fish = []; bubbles = []; waves = [];
    critters = []; blacktips = []; wrasses = [];
    lionfishes = []; tangs = []; dragons = [];
    groupers = []; sweetlipses = []; yellowtangs = []; idols = [];
    GROWN_AT = 0;

    pickFamilies();
    ceilingY = readCeiling();
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

      /* The base course, laid before anything else in the layer so it all
         grows in front. A reef bed is not sand with coral standing on it —
         it is coral, encrusting and massive colonies packed shoulder to
         shoulder, with the big shapes rising out of them. */
      var crust = Math.round(slots * 3);
      for (var q = 0; q < crust; q++) {
        var qx = W * ((q + rr(0.1, 0.9)) / crust);
        addMound(qx, floorAt(li, qx), li, layer,
          120 + li * 160 + (q / crust) * 900 + rr(0, 120),
          H * 0.026 * layer.scale * rr(0.5, 1.45), true);
      }

      for (var i = 0; i < slots; i++) {
        /* spread across the width, jittered, and thinned toward the middle
           on the nearest layer, which is the only one tall enough to reach
           the text */
        var u = (i + rr(0.15, 0.85)) / slots;
        if (li === 3) u = u < 0.5 ? u * 0.74 : 1 - (1 - u) * 0.74;
        var cx = W * u;
        var floorY = floorAt(li, cx);
        /* the stagger is a fraction of the layer's slot count, not a fixed
           step per slot: crowd the reef and a per-slot step would drag the
           growing-in out for half a minute */
        var startT = 200 + li * 190 + (i / slots) * 1000 + rr(0, 140);
        var kind = chooseKind(layer.silhouette ? MIX.deep : MIX.near);

        /* bed life scattered independently of whatever grows in this slot */
        if (li >= 1 && rnd() < 0.34) {
          var crx = cx + rr(-1, 1) * H * 0.028 * layer.scale;
          critters.push(buildCritter(crx, floorAt(li, crx), li, layer, startT + rr(80, 260)));
        }

        /* free-living corals aren't attached to anything, so they don't
           compete for a slot — they lie about on the open sand wherever the
           current happened to leave them, including in front of whatever
           else is growing here */
        if (li >= 1 && rnd() < 0.2) {
          var fx = cx + rr(-1, 1) * H * 0.040 * layer.scale;
          forms.push(buildForm('freeLiving', fx, floorAt(li, fx), layer, li, startT + rr(120, 420)));
        }

        if (kind === 'mound') {
          addMound(cx, floorY, li, layer, startT,
            H * 0.045 * layer.scale * rr(0.7, 1.6), false);
          continue;
        }

        /* the plate corals are filled outlines rather than segment chains,
           so they keep their own books */
        if (kind === 'tabular' || kind === 'foliose') {
          forms.push(buildForm(kind, cx, floorY, layer, li, startT));
          continue;
        }

        /* kelp comes up in clumps of blades from nearly the same spot, and
           corymbose Acropora often crowds a neighbour the same way */
        var clump = kind === 'kelp' ? 2 + ri(2)
          : kind === 'corymbose' && rnd() < 0.45 ? 2
          : 1;
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

    /* ---- the reef proper: the fish that live on the coral, not over it ----

       Three planes between the crest and the foreground pane, near enough
       that a 20 cm fish is a fish and not a fleck. How many of each is not a
       composition choice: it is how the animal is actually found. A coral
       grouper holds a territory alone, a sweetlips hangs in a small loose
       party under a ledge, and a yellow tang grazes in a herd. */

    /* coral grouper (Cephalopholis miniata): solitary and territorial. Two
       would be two territories, so on a wide canvas there may be a second —
       but far away along the reef, never beside the first. Keeping them
       apart takes three things, because any one of them can be undone: one
       heading, so they never close on each other; a fixed offset along it;
       and separate bands, so the still frame a reduced-motion viewer gets
       can't land them on the same patch of coral either. And because a
       territory is a territory, neither re-picks a depth on wrap. */
    var gpPlane = 1.70 * nearBoost;
    var gpCount = W > 1000 && rnd() < 0.45 ? 2 : 1;
    var gpDir = rnd() < 0.5 ? -1 : 1;
    for (var gp = 0; gp < gpCount; gp++) {
      var gpLen = sizeOf(METRES.grouper, gpPlane) * rr(0.86, 1.14);
      groupers.push({
        len: gpLen,
        /* low down, propped over the coral it ambushes from */
        y: H * (gp ? rr(0.82, 0.89) : rr(0.72, 0.79)),
        dir: gpDir,
        travel: W + gpLen * 2.4,
        speed: speedOf(MPS.grouper, gpPlane) * rr(0.9, 1.1),
        travelled: rr(0, W * 0.4) + gp * W * 0.5,
        rest: 0.24 + gp * 0.42,
        t0: 3400 + gp * 2600 + rr(0, 1000),
        phase: rr(0, TAU),
        spots: grouperSpots()
      });
    }

    /* ribboned sweetlips (Plectorhinchus polytaenia): a day fish only in the
       sense that it is visible — it spends the light hours idling in a small
       company of three or four in the lee of a coral head, and goes out to
       feed after dark. So: a small group, loosely spaced, all facing the
       same way, and barely moving. */
    var slPlane = 2.00 * nearBoost;
    var slLen = sizeOf(METRES.sweetlips, slPlane);
    var slCount = 2 + ri(3);
    var slDir = rnd() < 0.5 ? -1 : 1;
    var slBand = H * rr(0.70, 0.84);
    var slLead = rr(0, W);
    for (var sl = 0; sl < slCount; sl++) {
      sweetlipses.push({
        len: slLen * rr(0.84, 1.14),
        y: slBand + rr(-1, 1) * slLen * 0.42,
        dir: slDir,
        travel: W + slLen * 3.4,
        speed: speedOf(MPS.sweetlips, slPlane) * rr(0.96, 1.04),
        /* a loose party, not a queue: they stagger back over a couple of
           body lengths each and drift out of rank as they go */
        travelled: slLead - sl * slLen * rr(0.7, 1.9),
        rest: 0.50 - sl * 0.06,
        t0: 3800 + sl * 320 + rr(0, 500),
        phase: rr(0, TAU)
      });
    }

    /* yellow tangs graze in a herd — on a Hawaiian reef you meet forty at
       once, working a rock face together and all turning at the same moment.
       They get the largest count in the scene and the tightest formation. */
    var ytPlane = 2.60 * nearBoost;
    var ytLen = sizeOf(METRES.yellowTang, ytPlane);
    var ytCount = W > 900 ? 7 + ri(5) : 5 + ri(4);
    var ytDir = rnd() < 0.5 ? -1 : 1;
    var ytBand = H * rr(0.64, 0.80);
    var ytLead = rr(0, W);
    for (var yt = 0; yt < ytCount; yt++) {
      /* two ragged ranks rather than one line, which is what a grazing
         aggregation looks like side-on */
      var ytRow = yt % 2;
      yellowtangs.push({
        len: ytLen * rr(0.80, 1.18),
        y: ytBand + (ytRow ? 1 : -1) * ytLen * rr(0.15, 0.62),
        dir: ytDir,
        travel: W + ytLen * 8,
        speed: speedOf(MPS.yellowTang, ytPlane) * rr(0.95, 1.05),
        travelled: ytLead - (yt >> 1) * ytLen * rr(1.1, 2.2) - ytRow * ytLen * 0.6,
        rest: 0.58 - yt * 0.028,
        t0: 4000 + yt * 170 + rr(0, 320),
        phase: rr(0, TAU),
        bob: ytLen * rr(0.06, 0.16)
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

    /* moorish idols pair off and stay paired — they are one of the few reef
       fish you can count on to come past two at a time, swimming close
       enough that the trailing dorsal filaments overlap. So they are built
       as pairs, never as a lone fish and never as a school: one pair, or two
       pairs if there is width for them, and each pair keeps its own band and
       heading so it stays a pair for as long as the page is open. */
    var idPairs = W > 1000 ? 1 + ri(2) : 1;
    var idLen = sizeOf(METRES.idol, fg);
    for (var ip = 0; ip < idPairs; ip++) {
      var ipDir = rnd() < 0.5 ? -1 : 1;
      var ipBand = H * rr(0.58, 0.80);
      var ipLead = rr(0, W);
      var ipSpeed = speedOf(MPS.idol, fg) * rr(0.94, 1.06);
      var ipTravel = W + idLen * 4;
      for (var im = 0; im < 2; im++) {
        idols.push({
          len: idLen * rr(0.88, 1.10),
          /* one a little above and behind the other, the way a pair holds
             station: close enough to read as together, offset enough that
             neither is hidden */
          y: ipBand + (im ? idLen * rr(0.24, 0.46) : -idLen * rr(0.02, 0.18)),
          dir: ipDir,
          travel: ipTravel,
          speed: ipSpeed,
          travelled: ipLead - im * idLen * rr(0.5, 1.0),
          rest: 0.44 + ip * 0.26 - im * 0.05,
          t0: 3900 + ip * 1500 + im * 260 + rr(0, 500),
          phase: rr(0, TAU),
          bob: idLen * rr(0.05, 0.12)
        });
      }
    }

    /* leafy sea dragon: at 6 cm/s it is the slowest thing in the scene, a
       shade under even the lionfish, which is exactly right — it drifts
       rather than swims, and the near plane is the only place its foliage
       reads. It keeps to the bottom of the frame because that is where it
       lives: a hand's breadth off the bed, working the weed for mysids. */
    var dgPlane = fg * 1.3;
    var dgLen = sizeOf(METRES.dragon, dgPlane) * rr(0.9, 1.1);
    dragons.push({
      len: dgLen,
      y: H * rr(0.855, 0.945),
      dir: rnd() < 0.5 ? -1 : 1,
      travel: W + dgLen * 3.2,
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

  /* ------------------------------------------- plates, whorls, discs */

  function drawForm(f, t) {
    if (f.kind === 'tabular') drawTable(f, t);
    else if (f.kind === 'foliose') drawFoliose(f, t);
    else drawFreeLiving(f, t);
  }

  function drawTable(f, t) {
    var trunk = easeOut(clamp01((t - f.t0) / 520));
    if (trunk <= 0) return;
    var spread = easeOut(clamp01((t - f.t0 - 340) / 900));
    var nubs = easeOutBack(clamp01((t - f.t0 - 1140) / 460));
    var tone = f.tone;

    ctx.save();
    ctx.translate(f.x, f.y);

    /* the trunk, blunt and round-capped like every other stem here */
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(tone, 1);
    ctx.lineWidth = Math.max(2, f.rx * 0.17);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -f.stalk * trunk);
    ctx.stroke();

    if (spread <= 0) { ctx.restore(); return; }

    /* the table itself, which spreads outward from the top of the trunk
       and lifts almost imperceptibly on the surge */
    ctx.translate(0, -f.stalk);
    ctx.rotate(f.tilt + (reduced ? 0 : Math.sin(t * 0.00045 + f.phase) * 0.014));

    var rx = f.rx * spread;
    var ry = f.ry * (0.55 + 0.45 * spread);
    var N = f.rimX.length;

    ctx.beginPath();
    for (var i = 0; i <= N; i++) {
      var a = ((i % N) / N) * TAU;
      var j = i % N;
      ctx.lineTo(Math.cos(a) * rx * f.rimX[j], Math.sin(a) * ry * f.rimY[j]);
    }
    ctx.closePath();
    ctx.fillStyle = rgba(tone, 1);
    ctx.fill();

    ctx.save();
    ctx.clip();
    /* the shaded underside is what gives the plate its thickness — without
       it the table reads as a disc floating on a stick */
    ctx.fillStyle = rgba(mix(tone, [0, 0, 0], 0.32), 0.9);
    ctx.fillRect(-rx, -ry * 0.08, rx * 2, ry * 1.4);
    /* the branch lines that radiate out across the top face. They stop well
       short of the middle: run them all the way in and the table stops being
       a coral and starts being a parasol. */
    if (!f.plain) {
      ctx.strokeStyle = rgba(mix(tone, [255, 255, 255], 0.3), 0.22);
      ctx.lineWidth = Math.max(0.6, f.rx * 0.018);
      for (var g = 0; g < 7; g++) {
        var ga = Math.PI + ((g + 0.5) / 7) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ga) * rx * 0.42, Math.sin(ga) * ry * 0.42 - ry * 0.05);
        ctx.lineTo(Math.cos(ga) * rx * 1.02, Math.sin(ga) * ry * 1.02);
        ctx.stroke();
      }
    }
    ctx.restore();

    if (nubs > 0) {
      var cream = hex2rgb(pal.cream);
      ctx.lineCap = 'round';
      for (var n = 0; n < f.nubs.length; n++) {
        var nb = f.nubs[n];
        var bx = rx * nb.u;
        var by = -ry * Math.sqrt(Math.max(0, 1 - nb.u * nb.u)) * nb.v;
        var h = f.rx * nb.h * nubs;
        var tx = bx + nb.lean * h * 0.28;
        var ty = by - h;
        ctx.strokeStyle = rgba(tone, 1);
        ctx.lineWidth = Math.max(1.2, f.rx * nb.w);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        if (f.paleTips && nubs > 0.55) {
          ctx.fillStyle = rgba(cream, 0.85);
          ctx.beginPath();
          ctx.arc(tx, ty, Math.max(0.8, f.rx * nb.w * 0.42), 0, TAU);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  /* One foliose whorl seen edge-on: a shallow lens whose upper margin
     ruffles the way the growing edge of a plate coral does. `drop` slides
     the whole outline down, for the dark lip drawn under each shelf. */
  function shelfPath(w, h, sh, drop) {
    var N = 18, i, u;
    ctx.beginPath();
    for (i = 0; i <= N; i++) {
      u = -1 + (2 * i) / N;
      var lift = 1 - u * u;
      ctx.lineTo(
        w * u,
        -h * lift * (0.55 + sh.ripple * Math.sin(u * sh.lobes * Math.PI + sh.phase)) + drop
      );
    }
    for (i = N; i >= 0; i--) {
      u = -1 + (2 * i) / N;
      ctx.lineTo(w * u, h * 0.34 * (1 - u * u * 0.7) + drop);
    }
    ctx.closePath();
  }

  function drawFoliose(f, t) {
    var cream = hex2rgb(pal.cream);
    var drift = reduced ? 0 : Math.sin(t * 0.0006 + f.phase);

    /* the stalk, in shadow: the whorls are what faces the light */
    var climb = easeOut(clamp01((t - f.t0) / 900));
    if (climb <= 0) return;
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(mix(f.tone, [0, 0, 0], 0.34), 1);
    ctx.lineWidth = Math.max(2, f.trunkW);
    ctx.beginPath();
    ctx.moveTo(f.x, f.y);
    ctx.lineTo(f.x + f.trunkLean * f.trunk * climb, f.y - f.trunk * climb);
    ctx.stroke();

    /* bottom shelf first, so each whorl overlaps and shades the one below */
    for (var s = 0; s < f.shelves.length; s++) {
      var sh = f.shelves[s];
      var p = easeOut(clamp01((t - sh.t0) / 720));
      if (p <= 0) continue;
      var w = sh.w * p;
      var h = sh.h * p;

      ctx.save();
      /* each whorl rides the stalk, so it follows whatever lean it has */
      ctx.translate(f.x + sh.dx - f.trunkLean * sh.y, f.y + sh.y);
      ctx.rotate(sh.lean + drift * 0.012 * (1 + s * 0.4));

      /* a dark lip under the leading edge: this is what makes a stack read
         as separate plates rather than one lumpy mass */
      shelfPath(w, h, sh, h * 0.42);
      ctx.fillStyle = rgba(mix(f.tone, [0, 0, 0], 0.38), 1);
      ctx.fill();

      /* upper whorls catch more light than the shaded ones beneath them —
         except in the deep layers, which are flat silhouettes and take their
         shape from the lips alone */
      shelfPath(w, h, sh, 0);
      ctx.fillStyle = rgba(
        f.plain ? f.tone : mix(f.tone, [255, 255, 255], Math.min(0.2, s * 0.055)), 1);
      ctx.fill();

      /* cream beading picked out along the top two margins only, where the
         eye is already looking */
      if (f.beaded && s >= f.shelves.length - 2 && p > 0.85) {
        ctx.fillStyle = rgba(cream, 0.8);
        for (var b = 0; b < 4; b++) {
          var u = -0.72 + b * 0.48;
          var lift = 1 - u * u;
          ctx.beginPath();
          ctx.arc(
            w * u,
            -h * lift * (0.55 + sh.ripple * Math.sin(u * sh.lobes * Math.PI + sh.phase)),
            Math.max(0.8, h * 0.11), 0, TAU
          );
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  function drawFreeLiving(f, t) {
    var grow = easeOutBack(clamp01((t - f.t0) / 640));
    if (grow <= 0) return;
    /* a solitary coral inflates and deflates through the day; this is the
       only coral here whose whole body breathes rather than sways */
    var breathe = reduced ? 0 : Math.sin(t * 0.0011 + f.phase) * 0.02;
    var r = f.r * grow * (1 + breathe);
    var tone = f.tone;
    var cream = hex2rgb(pal.cream);
    var i;

    ctx.save();
    ctx.translate(f.x, f.y - r * 0.30);
    ctx.rotate(f.tilt);

    /* the tentacle crown, laid down first so the rim of the disc covers
       where each one roots */
    if (f.tent) {
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(0.8, r * 0.08);
      ctx.strokeStyle = rgba(mix(tone, [255, 255, 255], 0.12), 0.9);
      for (i = 0; i < f.tent; i++) {
        var a = ((i + 0.5) / f.tent) * TAU;
        var wob = reduced ? 0 : Math.sin(t * 0.0016 + f.phase + i * 1.7) * 0.14;
        var reach = r * (0.62 + 0.7 * f.wob[i]) * grow;
        var x0 = Math.cos(a) * r * 0.8;
        var y0 = Math.sin(a) * r * 0.38;
        var x1 = Math.cos(a + wob) * (r * 0.8 + reach);
        var y1 = Math.sin(a + wob) * (r * 0.38 + reach * 0.5) - r * 0.06;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo((x0 + x1) * 0.5, (y0 + y1) * 0.5 - r * 0.1, x1, y1);
        ctx.stroke();
        ctx.fillStyle = rgba(cream, 0.7);
        ctx.beginPath();
        ctx.arc(x1, y1, Math.max(0.7, r * 0.05), 0, TAU);
        ctx.fill();
      }
    }

    /* the disc, squashed because we are looking across it rather than down */
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.46, 0, 0, TAU);
    ctx.closePath();
    ctx.fillStyle = rgba(tone, 1);
    ctx.fill();

    ctx.save();
    ctx.clip();
    ctx.fillStyle = rgba(mix(tone, [0, 0, 0], 0.28), 0.75);
    ctx.fillRect(-r, r * 0.07, r * 2, r * 0.5);
    /* septa: the blades radiating from the mouth, which is how you tell a
       loose Fungia from a pebble */
    if (!f.plain) {
      ctx.strokeStyle = rgba(mix(tone, [0, 0, 0], 0.34), 0.5);
      ctx.lineWidth = Math.max(0.6, r * 0.045);
      for (i = 0; i < f.septa; i++) {
        var sa = (i / f.septa) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(sa) * r * 0.17, Math.sin(sa) * r * 0.08);
        ctx.lineTo(Math.cos(sa) * r * 1.04, Math.sin(sa) * r * 0.5);
        ctx.stroke();
      }
    }
    ctx.restore();

    if (!f.plain) {
      ctx.fillStyle = rgba(cream, 0.72);
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.02, r * 0.2, r * 0.075, 0, 0, TAU);
      ctx.fill();
    }

    ctx.restore();
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

      var wig = Math.sin(t * 0.011 * PACE + f.phase);
      var y = f.y + (reduced ? 0 : Math.sin(t * 0.0013 * PACE + f.phase) * f.bob);
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
    var bob = reduced ? 0 : Math.sin(t * 0.00042 * PACE + shark.phase) * L * 0.035;
    var beat = reduced ? 0 : Math.sin(t * 0.0011 * PACE + shark.phase);
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
    var bob = reduced ? 0 : Math.sin(t * 0.0007 * PACE + b.phase) * L * 0.03;
    var beat = reduced ? 0 : Math.sin(t * 0.0030 * PACE + b.phase);
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
    var bob = reduced ? 0 : Math.sin(t * 0.00055 * PACE + w.phase) * L * 0.035;
    /* wrasses row with their pectorals and only bring the tail in to
       accelerate, so the caudal beat is slow and the fin flap is not */
    var beat = reduced ? 0 : Math.sin(t * 0.0016 * PACE + w.phase);
    var flap = reduced ? 0 : Math.sin(t * 0.0042 * PACE + w.phase);
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
    var beat = reduced ? 0 : Math.sin(t * 0.0052 * PACE + f.phase);
    var bob = reduced ? 0 : Math.sin(t * 0.0011 * PACE + f.phase) * f.bob;
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
    var bob = reduced ? 0 : Math.sin(t * 0.00048 * PACE + f.phase) * L * 0.05;
    /* the whole animal breathes rather than beats — the fins ripple, the
       body barely moves */
    var wob = reduced ? 0 : Math.sin(t * 0.0016 * PACE + f.phase) * 0.07;
    var roll = reduced ? 0 : Math.sin(t * 0.0009 * PACE + f.phase) * 0.045;

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

  /* ----------------------------------------------------- moorish idol */

  /* Zanclus cornutus: a disc with a tube for a snout, and the longest
     dorsal filament on the reef trailing off the back of it. Everything
     recognisable about the animal is in that silhouette, so the body is
     kept honestly deep and the filament honestly long — at full stretch it
     runs most of a body length past the tail. */
  function idolBody(L) {
    ctx.beginPath();
    ctx.moveTo(L * 0.500, L * 0.056);
    ctx.quadraticCurveTo(L * 0.474, L * 0.006, L * 0.432, -L * 0.024);
    ctx.quadraticCurveTo(L * 0.372, -L * 0.070, L * 0.328, -L * 0.152);
    ctx.bezierCurveTo(L * 0.276, -L * 0.272, L * 0.170, -L * 0.342, L * 0.040, -L * 0.350);
    ctx.bezierCurveTo(-L * 0.110, -L * 0.358, -L * 0.248, -L * 0.232, -L * 0.316, -L * 0.086);
    ctx.lineTo(-L * 0.320, L * 0.086);
    ctx.bezierCurveTo(-L * 0.250, L * 0.252, -L * 0.090, L * 0.372, L * 0.060, L * 0.360);
    ctx.bezierCurveTo(L * 0.230, L * 0.346, L * 0.358, L * 0.230, L * 0.418, L * 0.112);
    ctx.quadraticCurveTo(L * 0.468, L * 0.082, L * 0.500, L * 0.056);
    ctx.closePath();
  }

  /* A tilted bar across the disc, drawn tall enough to run off both edges
     so the clip does the shaping. `top` and `bot` are the bar's leading
     edge where it crosses the back and the belly — it leans forward as it
     comes down, the way both of the idol's bars do. */
  function idolBar(L, top, bot, wide) {
    ctx.beginPath();
    ctx.moveTo(L * top, -L * 0.5);
    ctx.lineTo(L * bot, L * 0.5);
    ctx.lineTo(L * (bot - wide), L * 0.5);
    ctx.lineTo(L * (top - wide), -L * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  function drawIdol(f, t, dt) {
    var fade = smooth((t - f.t0) / 1400);
    if (fade <= 0) return;
    /* pairs hold their band and heading, or they stop being a pair */
    advance(f, dt, 0, 0, 0.45);

    var L = f.len;
    var x = f.dir > 0 ? -L * 1.6 + f.travelled : W + L * 1.6 - f.travelled;
    var beat = reduced ? 0 : Math.sin(t * 0.0044 * PACE + f.phase);
    var bob = reduced ? 0 : Math.sin(t * 0.0010 * PACE + f.phase) * f.bob;
    var sw = beat * L * 0.05;

    var bar = hex2rgb(pal.idolBar);
    var pale = hex2rgb(pal.idolPale);
    var yell = hex2rgb(pal.idolYellow);

    ctx.save();
    ctx.translate(x, f.y + bob);
    ctx.scale(f.dir, 1);
    ctx.rotate(beat * 0.03);

    /* the filament: the third dorsal spine, drawn out into a ribbon that
       streams astern and lags behind the body's beat. It goes down first,
       behind everything, because the fin it grows from is behind the fish */
    var fx0 = L * 0.070, fy0 = -L * 0.340;
    var lag = reduced ? 0 : Math.sin(t * 0.0030 * PACE + f.phase - 0.9);
    var FN = 16, up = [], dn = [];
    for (var fi = 0; fi <= FN; fi++) {
      var u = fi / FN;
      var px = fx0 - u * L * 0.95;
      var py = fy0 - Math.sin(u * 2.2) * L * 0.26
        + lag * Math.sin(u * 3.6) * L * 0.075 * u;
      var hw = L * 0.028 * (1 - u * 0.9);
      up.push([px, py - hw]);
      dn.push([px, py + hw]);
    }
    ctx.fillStyle = rgba(pale, 0.9 * fade);
    ctx.beginPath();
    ctx.moveTo(up[0][0], up[0][1]);
    for (var fu = 1; fu <= FN; fu++) ctx.lineTo(up[fu][0], up[fu][1]);
    for (var fd = FN; fd >= 0; fd--) ctx.lineTo(dn[fd][0], dn[fd][1]);
    ctx.closePath();
    ctx.fill();

    /* caudal: small, dark, with a pale trailing edge */
    ctx.fillStyle = rgba(bar, 0.95 * fade);
    ctx.beginPath();
    ctx.moveTo(-L * 0.290, -L * 0.075);
    ctx.quadraticCurveTo(-L * 0.400, -L * 0.150 + sw * 0.6, -L * 0.492, -L * 0.180 + sw);
    ctx.quadraticCurveTo(-L * 0.430, sw * 0.5, -L * 0.492, L * 0.180 + sw);
    ctx.quadraticCurveTo(-L * 0.400, L * 0.150 + sw * 0.6, -L * 0.290, L * 0.075);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(pale, 0.75 * fade);
    ctx.lineWidth = Math.max(0.6, L * 0.016);
    ctx.beginPath();
    ctx.moveTo(-L * 0.492, -L * 0.180 + sw);
    ctx.quadraticCurveTo(-L * 0.430, sw * 0.5, -L * 0.492, L * 0.180 + sw);
    ctx.stroke();

    /* the rear dorsal and anal lobes, which carry the second bar out off
       the body — on an idol the black does not stop at the skin */
    ctx.fillStyle = rgba(bar, 0.92 * fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.010, -L * 0.330);
    ctx.quadraticCurveTo(-L * 0.140, -L * 0.430, -L * 0.286, -L * 0.300);
    ctx.lineTo(-L * 0.314, -L * 0.100);
    ctx.quadraticCurveTo(-L * 0.190, -L * 0.290, L * 0.010, -L * 0.330);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-L * 0.020, L * 0.352);
    ctx.quadraticCurveTo(-L * 0.170, L * 0.400, -L * 0.284, L * 0.280);
    ctx.lineTo(-L * 0.316, L * 0.100);
    ctx.quadraticCurveTo(-L * 0.190, L * 0.290, -L * 0.020, L * 0.352);
    ctx.closePath();
    ctx.fill();

    /* the long black pelvics, hanging under the chest and swinging with
       the beat */
    ctx.save();
    ctx.translate(L * 0.185, L * 0.270);
    ctx.rotate(0.18 + beat * 0.12);
    ctx.fillStyle = rgba(bar, 0.9 * fade);
    ctx.beginPath();
    ctx.moveTo(0, -L * 0.030);
    ctx.quadraticCurveTo(L * 0.010, L * 0.130, -L * 0.060, L * 0.240);
    ctx.quadraticCurveTo(-L * 0.108, L * 0.150, -L * 0.086, -L * 0.020);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    idolBody(L);
    ctx.fillStyle = rgba(pale, fade);
    ctx.fill();

    ctx.save();
    ctx.clip();

    /* the two bars. The first swallows the eye and the pectoral base, the
       second takes the whole back half; between them the pale band warms
       toward yellow as it runs aft, and behind the second bar the peduncle
       comes back pale and yellow again before the black tail */
    ctx.fillStyle = rgba(mix(pale, yell, 0.38), 0.62 * fade);
    ctx.fillRect(-L * 0.02, -L * 0.5, L * 0.20, L);
    ctx.fillStyle = rgba(mix(pale, yell, 0.70), 0.72 * fade);
    ctx.fillRect(-L * 0.330, -L * 0.5, L * 0.075, L);
    ctx.fillStyle = rgba(bar, 0.95 * fade);
    idolBar(L, 0.300, 0.382, 0.185);
    idolBar(L, -0.060, 0.040, 0.250);

    /* the yellow saddle: a band laid across the snout behind the lips,
       shaped by the same clip as the bars, and the black lips in front */
    ctx.fillStyle = rgba(yell, 0.95 * fade);
    idolBar(L, 0.505, 0.575, 0.115);
    ctx.fillStyle = rgba(bar, 0.9 * fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.520, L * 0.100);
    ctx.lineTo(L * 0.520, L * 0.010);
    ctx.lineTo(L * 0.452, L * 0.062);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    /* pectoral: a small clear-yellow paddle over the first bar */
    ctx.save();
    ctx.translate(L * 0.215, L * 0.105);
    ctx.rotate(0.42 + beat * 0.24);
    ctx.fillStyle = rgba(yell, 0.28 * fade);
    ctx.beginPath();
    ctx.ellipse(L * 0.030, L * 0.042, L * 0.058, L * 0.024, 0.9, 0, TAU);
    ctx.fill();
    ctx.restore();

    /* eye: buried in the black bar, so it takes a pale ring to be found —
       which is exactly the trick the bar is playing on a predator */
    ctx.fillStyle = rgba(mix(bar, pale, 0.42), 0.75 * fade);
    ctx.beginPath();
    ctx.arc(L * 0.306, -L * 0.086, L * 0.042, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(bar, 0.98 * fade);
    ctx.beginPath();
    ctx.arc(L * 0.306, -L * 0.086, L * 0.030, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(pale, 0.85 * fade);
    ctx.beginPath();
    ctx.arc(L * 0.318, -L * 0.098, L * 0.012, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  /* ------------------------------------------------ ribboned sweetlips */

  /* Plectorhinchus polytaenia: an oblong grunt with rubbery lips and, in
     place of the bars everything else on this reef wears, ribbons — six or
     seven gold stripes edged in ink, running the whole length of the fish
     and out onto the fins. */
  function sweetBody(L) {
    ctx.beginPath();
    ctx.moveTo(L * 0.500, L * 0.024);
    ctx.quadraticCurveTo(L * 0.480, -L * 0.040, L * 0.428, -L * 0.082);
    ctx.quadraticCurveTo(L * 0.340, -L * 0.152, L * 0.230, -L * 0.188);
    ctx.bezierCurveTo(L * 0.060, -L * 0.228, -L * 0.110, -L * 0.206, -L * 0.232, -L * 0.130);
    ctx.quadraticCurveTo(-L * 0.288, -L * 0.094, -L * 0.302, -L * 0.055);
    ctx.lineTo(-L * 0.306, L * 0.055);
    ctx.quadraticCurveTo(-L * 0.282, L * 0.106, -L * 0.222, L * 0.146);
    ctx.bezierCurveTo(-L * 0.080, L * 0.230, L * 0.110, L * 0.242, L * 0.272, L * 0.190);
    ctx.quadraticCurveTo(L * 0.402, L * 0.146, L * 0.472, L * 0.082);
    ctx.quadraticCurveTo(L * 0.496, L * 0.058, L * 0.500, L * 0.024);
    ctx.closePath();
  }

  /* One ribbon: a shallow arc from the snout to the peduncle. Stroked
     twice, wide in ink and narrow in gold, which is how the stripe gets its
     edging for the price of two passes — but the two passes are run over
     the whole set rather than per stripe, because the ribbons converge at
     the head and a per-stripe edge would print over its neighbour's gold. */
  /* Where the fin speckling goes, one entry per unpaired fin: the strip it
     is scattered along and how many spots that strip carries. */
  var SWEET_SPOTS = [
    { x0: -0.26, x1:  0.19, y0: -0.300, y1: -0.185, n: 11 },   /* dorsal */
    { x0: -0.27, x1: -0.07, y0:  0.280, y1:  0.185, n:  5 },   /* anal */
    { x0: -0.46, x1: -0.30, y0: -0.150, y1:  0.150, n:  7 }    /* caudal */
  ];

  /* The three unpaired fins in one path: the long dorsal, spiny in front and
     soft behind; the anal; and the shallowly forked caudal, which is the
     only one of the three that swings with the beat. */
  function sweetFins(L, sw) {
    ctx.beginPath();
    ctx.moveTo(-L * 0.280, -L * 0.060);
    ctx.quadraticCurveTo(-L * 0.390, -L * 0.130 + sw * 0.6, -L * 0.482, -L * 0.190 + sw);
    ctx.quadraticCurveTo(-L * 0.400, sw * 0.5, -L * 0.482, L * 0.190 + sw);
    ctx.quadraticCurveTo(-L * 0.390, L * 0.130 + sw * 0.6, -L * 0.280, L * 0.060);
    ctx.closePath();

    ctx.moveTo(L * 0.212, -L * 0.180);
    ctx.quadraticCurveTo(L * 0.120, -L * 0.320, -L * 0.020, -L * 0.312);
    ctx.quadraticCurveTo(-L * 0.150, -L * 0.304, -L * 0.252, -L * 0.180);
    ctx.lineTo(-L * 0.290, -L * 0.078);
    ctx.bezierCurveTo(-L * 0.130, -L * 0.212, L * 0.060, -L * 0.230, L * 0.214, -L * 0.166);
    ctx.closePath();

    ctx.moveTo(-L * 0.060, L * 0.226);
    ctx.quadraticCurveTo(-L * 0.140, L * 0.310, -L * 0.240, L * 0.246);
    ctx.lineTo(-L * 0.292, L * 0.086);
    ctx.quadraticCurveTo(-L * 0.170, L * 0.200, -L * 0.058, L * 0.212);
    ctx.closePath();
  }

  function sweetRibbon(L, y0, y1, col, wide, alpha) {
    ctx.strokeStyle = rgba(col, alpha);
    ctx.lineWidth = L * wide;
    ctx.beginPath();
    ctx.moveTo(L * 0.470, L * y0);
    ctx.bezierCurveTo(L * 0.240, L * (y0 * 0.55 + y1 * 0.45),
      L * 0.000, L * (y0 * 0.25 + y1 * 0.75), -L * 0.310, L * y1);
    ctx.stroke();
  }

  function drawSweetlips(f, t, dt) {
    var fade = smooth((t - f.t0) / 1600);
    if (fade <= 0) return;
    /* the party keeps its ledge: hold the band and the heading */
    advance(f, dt, 0, 0, 0.5);

    var L = f.len;
    var x = f.dir > 0 ? -L * 1.4 + f.travelled : W + L * 1.4 - f.travelled;
    /* a hovering fish, not a swimming one: the tail idles, the pectorals
       do the work, and the whole animal rocks a degree or two */
    var beat = reduced ? 0 : Math.sin(t * 0.0026 * PACE + f.phase);
    var scull = reduced ? 0 : Math.sin(t * 0.0068 * PACE + f.phase);
    var bob = reduced ? 0 : Math.sin(t * 0.00075 * PACE + f.phase) * L * 0.035;
    var sw = beat * L * 0.045;

    var gold = hex2rgb(pal.sweet);
    var pale = hex2rgb(pal.sweetPale);
    var ink = hex2rgb(pal.sweetLine);

    ctx.save();
    ctx.translate(x, f.y + bob);
    ctx.scale(f.dir, 1);
    ctx.rotate(beat * 0.022);

    /* caudal, dorsal and anal go down as one path so the speckling can be
       clipped to them — spots that float off the fin edge read as debris in
       the water rather than as markings on the animal */
    sweetFins(L, sw);
    ctx.fillStyle = rgba(gold, 0.95 * fade);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = rgba(ink, 0.72 * fade);
    /* scattered over each fin's own span rather than over one bounding box,
       or the clip throws most of them away and the few survivors clump */
    for (var fb = 0; fb < SWEET_SPOTS.length; fb++) {
      var band = SWEET_SPOTS[fb];
      for (var sp = 0; sp < band.n; sp++) {
        var u = (sp + 0.5) / band.n;
        var jit = ((sp * 0.6180) % 1) - 0.5;
        ctx.beginPath();
        ctx.arc(L * (band.x0 + (band.x1 - band.x0) * u),
          L * (band.y0 + (band.y1 - band.y0) * (0.5 + jit * 1.7)),
          L * 0.017, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();

    sweetBody(L);
    ctx.fillStyle = rgba(pale, fade);
    ctx.fill();

    ctx.save();
    ctx.clip();
    /* five ribbons, converging on the snout and fanning as they run aft —
       the stripes follow the body's taper rather than sitting parallel. The
       ink is only a hair wider than the gold: these are gold bands edged in
       black over a cream flank, not black bands with gold in them. */
    var rb, v;
    for (rb = 0; rb < 5; rb++) {
      v = rb / 4;
      sweetRibbon(L, -0.085 + v * 0.170, -0.200 + v * 0.400, ink, 0.054, 0.88 * fade);
    }
    for (rb = 0; rb < 5; rb++) {
      v = rb / 4;
      sweetRibbon(L, -0.085 + v * 0.170, -0.200 + v * 0.400, gold, 0.046, 0.96 * fade);
    }
    /* and the head, where the ribbons break up into the throat stripes */
    ctx.strokeStyle = rgba(ink, 0.8 * fade);
    ctx.lineWidth = L * 0.016;
    ctx.lineCap = 'round';
    for (var hb = 0; hb < 3; hb++) {
      ctx.beginPath();
      ctx.moveTo(L * (0.500 - hb * 0.010), L * (0.030 + hb * 0.052));
      ctx.quadraticCurveTo(L * 0.400, L * (0.070 + hb * 0.060), L * 0.300, L * (0.130 + hb * 0.055));
      ctx.stroke();
    }
    ctx.restore();

    /* the rubbery lips a sweetlips is named for */
    ctx.fillStyle = rgba(mix(gold, pale, 0.4), 0.95 * fade);
    ctx.beginPath();
    ctx.ellipse(L * 0.482, L * 0.030, L * 0.036, L * 0.030, -0.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(ink, 0.75 * fade);
    ctx.lineWidth = Math.max(0.6, L * 0.011);
    ctx.beginPath();
    ctx.moveTo(L * 0.502, L * 0.014);
    ctx.quadraticCurveTo(L * 0.462, L * 0.046, L * 0.436, L * 0.036);
    ctx.stroke();

    /* pectoral, sculling — this is the fin that holds a hovering fish still */
    ctx.save();
    ctx.translate(L * 0.230, L * 0.090);
    ctx.rotate(0.55 + scull * 0.30);
    ctx.fillStyle = rgba(mix(gold, pale, 0.5), 0.55 * fade);
    ctx.beginPath();
    ctx.ellipse(L * 0.050, L * 0.055, L * 0.098, L * 0.038, 0.85, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(ink, 0.28 * fade);
    ctx.lineWidth = Math.max(0.5, L * 0.006);
    for (var pw = 0; pw < 4; pw++) {
      var pwa = 0.60 + pw * 0.22;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(pwa) * L * 0.14, Math.sin(pwa) * L * 0.15);
      ctx.stroke();
    }
    ctx.restore();

    /* eye, sitting in the top ribbon */
    ctx.fillStyle = rgba(pale, 0.9 * fade);
    ctx.beginPath();
    ctx.arc(L * 0.376, -L * 0.070, L * 0.040, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(ink, 0.96 * fade);
    ctx.beginPath();
    ctx.arc(L * 0.376, -L * 0.070, L * 0.028, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(pale, 0.8 * fade);
    ctx.beginPath();
    ctx.arc(L * 0.387, -L * 0.081, L * 0.011, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  /* --------------------------------------------------------- yellow tang */

  /* Zebrasoma flavescens: a kite of one flat cadmium yellow. There is no
     pattern to draw, so the whole animal has to be carried by the outline —
     the sail-high dorsal and anal, the drawn-out snout it uses to pick
     algae out of crevices, and the white blade at the tail base. */
  function yellowTangBody(L) {
    ctx.beginPath();
    ctx.moveTo(L * 0.500, L * 0.062);
    ctx.quadraticCurveTo(L * 0.452, L * 0.012, L * 0.402, -L * 0.042);
    ctx.quadraticCurveTo(L * 0.332, -L * 0.114, L * 0.272, -L * 0.206);
    ctx.bezierCurveTo(L * 0.160, -L * 0.322, L * 0.000, -L * 0.352, -L * 0.120, -L * 0.292);
    ctx.quadraticCurveTo(-L * 0.216, -L * 0.242, -L * 0.256, -L * 0.080);
    ctx.lineTo(-L * 0.262, L * 0.080);
    ctx.quadraticCurveTo(-L * 0.220, L * 0.236, -L * 0.120, L * 0.296);
    ctx.bezierCurveTo(L * 0.010, L * 0.364, L * 0.190, L * 0.302, L * 0.300, L * 0.192);
    ctx.quadraticCurveTo(L * 0.400, L * 0.110, L * 0.442, L * 0.080);
    ctx.quadraticCurveTo(L * 0.482, L * 0.070, L * 0.500, L * 0.062);
    ctx.closePath();
  }

  function drawYellowTang(f, t, dt) {
    var fade = smooth((t - f.t0) / 1300);
    if (fade <= 0) return;
    /* the herd holds one band and one heading */
    advance(f, dt, 0, 0, 0.5);

    var L = f.len;
    var x = f.dir > 0 ? -L * 1.3 + f.travelled : W + L * 1.3 - f.travelled;
    var beat = reduced ? 0 : Math.sin(t * 0.0058 * PACE + f.phase);
    var bob = reduced ? 0 : Math.sin(t * 0.0012 * PACE + f.phase) * f.bob;
    /* a grazer nods at the rock every few seconds and then levels off */
    var graze = reduced ? 0 : Math.max(0, Math.sin(t * 0.00042 * PACE + f.phase * 1.7)) * 0.22;
    var sw = beat * L * 0.05;

    var yel = hex2rgb(pal.ytang);
    var deep = hex2rgb(pal.ytangDeep);
    var cream = hex2rgb(pal.cream);

    ctx.save();
    ctx.translate(x, f.y + bob);
    ctx.scale(f.dir, 1);
    ctx.rotate(beat * 0.03 + graze);

    /* caudal: shallow-lunate and the same yellow as the rest */
    ctx.fillStyle = rgba(yel, fade);
    ctx.beginPath();
    ctx.moveTo(-L * 0.235, -L * 0.070);
    ctx.quadraticCurveTo(-L * 0.360, -L * 0.150 + sw * 0.6, -L * 0.492, -L * 0.198 + sw);
    ctx.quadraticCurveTo(-L * 0.378, sw * 0.5, -L * 0.492, L * 0.198 + sw);
    ctx.quadraticCurveTo(-L * 0.360, L * 0.150 + sw * 0.6, -L * 0.235, L * 0.070);
    ctx.closePath();
    ctx.fill();

    /* the two sails. A Zebrasoma's dorsal and anal are as deep as its body
       again — hold them back and the fish reads as any other yellow disc */
    ctx.fillStyle = rgba(yel, fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.262, -L * 0.212);
    ctx.bezierCurveTo(L * 0.170, -L * 0.480, L * 0.020, -L * 0.610, -L * 0.090, -L * 0.556);
    ctx.quadraticCurveTo(-L * 0.196, -L * 0.500, -L * 0.248, -L * 0.100);
    ctx.bezierCurveTo(-L * 0.180, -L * 0.290, L * 0.050, -L * 0.348, L * 0.264, -L * 0.196);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(L * 0.180, L * 0.256);
    ctx.bezierCurveTo(L * 0.080, L * 0.470, -L * 0.040, L * 0.548, -L * 0.140, L * 0.486);
    ctx.quadraticCurveTo(-L * 0.226, L * 0.430, -L * 0.256, L * 0.100);
    ctx.bezierCurveTo(-L * 0.180, L * 0.290, L * 0.020, L * 0.336, L * 0.182, L * 0.240);
    ctx.closePath();
    ctx.fill();

    /* fin rays: a slightly deeper yellow, fanning out of the body into the
       membranes. The only detail the fish has, so it does the shading too */
    ctx.strokeStyle = rgba(deep, 0.5 * fade);
    ctx.lineWidth = Math.max(0.5, L * 0.008);
    ctx.lineCap = 'round';
    for (var ry = 0; ry < 9; ry++) {
      var rv = ry / 8;
      ctx.beginPath();
      ctx.moveTo(L * (0.232 - rv * 0.430), -L * (0.196 - rv * 0.070));
      ctx.lineTo(L * (0.196 - rv * 0.380), -L * (0.400 + Math.sin(rv * 3.0) * 0.140));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(L * (0.150 - rv * 0.380), L * (0.236 - rv * 0.100));
      ctx.lineTo(L * (0.120 - rv * 0.340), L * (0.390 + Math.sin(rv * 3.0) * 0.110));
      ctx.stroke();
    }

    yellowTangBody(L);
    ctx.fillStyle = rgba(yel, fade);
    ctx.fill();

    ctx.save();
    ctx.clip();
    /* a faint darker wash along the back and over the peduncle keeps a
       flat yellow disc from going papery */
    ctx.fillStyle = rgba(deep, 0.22 * fade);
    ctx.beginPath();
    ctx.ellipse(L * 0.020, -L * 0.230, L * 0.240, L * 0.090, -0.10, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(mix(yel, cream, 0.45), 0.14 * fade);
    ctx.beginPath();
    ctx.ellipse(L * 0.150, L * 0.055, L * 0.150, L * 0.058, -0.20, 0, TAU);
    ctx.fill();
    ctx.restore();

    /* pectoral, almost clear */
    ctx.save();
    ctx.translate(L * 0.212, L * 0.062);
    ctx.rotate(0.42 + beat * 0.30);
    ctx.fillStyle = rgba(mix(yel, cream, 0.5), 0.35 * fade);
    ctx.beginPath();
    ctx.ellipse(L * 0.042, L * 0.052, L * 0.082, L * 0.032, 0.88, 0, TAU);
    ctx.fill();
    ctx.restore();

    /* the scalpel — a surgeonfish is a surgeonfish because of this blade,
       and on a yellow tang it is the one white mark on the animal */
    ctx.fillStyle = rgba(cream, 0.95 * fade);
    ctx.beginPath();
    ctx.moveTo(-L * 0.180, L * 0.030);
    ctx.lineTo(-L * 0.248, L * 0.050);
    ctx.lineTo(-L * 0.180, L * 0.062);
    ctx.closePath();
    ctx.fill();

    /* the snout: pale at the tip, with the small nipping mouth */
    ctx.fillStyle = rgba(mix(yel, cream, 0.35), 0.75 * fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.500, L * 0.062);
    ctx.quadraticCurveTo(L * 0.452, L * 0.012, L * 0.408, -L * 0.036);
    ctx.lineTo(L * 0.436, L * 0.086);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(deep, 0.85 * fade);
    ctx.lineWidth = Math.max(0.6, L * 0.013);
    ctx.beginPath();
    ctx.moveTo(L * 0.502, L * 0.062);
    ctx.lineTo(L * 0.466, L * 0.066);
    ctx.stroke();

    /* eye */
    ctx.fillStyle = rgba(deep, 0.9 * fade);
    ctx.beginPath();
    ctx.arc(L * 0.286, -L * 0.108, L * 0.042, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(hex2rgb(pal.tangDark), 0.95 * fade);
    ctx.beginPath();
    ctx.arc(L * 0.286, -L * 0.108, L * 0.030, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(cream, 0.8 * fade);
    ctx.beginPath();
    ctx.arc(L * 0.298, -L * 0.119, L * 0.011, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  /* -------------------------------------------------------- coral grouper */

  /* Cephalopholis miniata, the coral hind: a heavy vermilion bass under a
     scatter of cobalt spots, built round a mouth that can take a fish half
     its own length. It hangs over the coral on its pectorals and moves in
     short unhurried shifts, which is what the drawing has to say. */
  function grouperBody(L) {
    ctx.beginPath();
    ctx.moveTo(L * 0.480, L * 0.010);
    ctx.quadraticCurveTo(L * 0.442, -L * 0.062, L * 0.380, -L * 0.100);
    ctx.bezierCurveTo(L * 0.280, -L * 0.154, L * 0.140, -L * 0.180, L * 0.010, -L * 0.176);
    ctx.bezierCurveTo(-L * 0.130, -L * 0.170, -L * 0.240, -L * 0.132, -L * 0.312, -L * 0.080);
    ctx.lineTo(-L * 0.322, L * 0.076);
    ctx.bezierCurveTo(-L * 0.240, L * 0.130, -L * 0.120, L * 0.172, L * 0.020, L * 0.180);
    ctx.bezierCurveTo(L * 0.170, L * 0.188, L * 0.322, L * 0.152, L * 0.412, L * 0.094);
    ctx.quadraticCurveTo(L * 0.468, L * 0.056, L * 0.480, L * 0.010);
    ctx.closePath();
  }

  function drawGrouper(f, t, dt) {
    var fade = smooth((t - f.t0) / 1600);
    if (fade <= 0) return;
    /* it holds its band and its heading — this is a fish with an address */
    advance(f, dt, 0, 0, 0.4);

    var L = f.len;
    var x = f.dir > 0 ? -L * 1.4 + f.travelled : W + L * 1.4 - f.travelled;
    /* it does not cruise: it sits, then shifts. The tail is mostly still
       and the pectorals do the holding */
    var beat = reduced ? 0 : Math.sin(t * 0.0022 * PACE + f.phase);
    var scull = reduced ? 0 : Math.sin(t * 0.0075 * PACE + f.phase);
    var bob = reduced ? 0 : Math.sin(t * 0.00062 * PACE + f.phase) * L * 0.030;
    var sw = beat * L * 0.040;

    var red = hex2rgb(pal.grouper);
    var deep = hex2rgb(pal.grouperDeep);
    var spot = hex2rgb(pal.grouperSpot);
    var cream = hex2rgb(pal.cream);

    ctx.save();
    ctx.translate(x, f.y + bob);
    ctx.scale(f.dir, 1);
    ctx.rotate(beat * 0.018);

    /* the far pectoral, dimmed */
    ctx.save();
    ctx.globalAlpha = 0.45 * fade;
    ctx.translate(L * 0.230, L * 0.030);
    ctx.rotate(-0.30 - scull * 0.16);
    ctx.fillStyle = rgba(deep, 1);
    ctx.beginPath();
    ctx.ellipse(L * 0.070, L * 0.040, L * 0.110, L * 0.046, 0.55, 0, TAU);
    ctx.fill();
    ctx.restore();

    /* the four fins that carry the spotting go down as one path: the
       rounded caudal a hind accelerates on rather than cruises with, the
       long dorsal with its low spiny front and rounded soft lobe, and the
       rounded anal and pelvic */
    ctx.beginPath();
    ctx.moveTo(-L * 0.290, -L * 0.080);
    ctx.bezierCurveTo(-L * 0.420, -L * 0.190 + sw, -L * 0.500, -L * 0.130 + sw, -L * 0.500, sw);
    ctx.bezierCurveTo(-L * 0.500, L * 0.130 + sw, -L * 0.420, L * 0.190 + sw, -L * 0.290, L * 0.080);
    ctx.closePath();

    ctx.moveTo(L * 0.300, -L * 0.128);
    ctx.quadraticCurveTo(L * 0.150, -L * 0.246, L * 0.010, -L * 0.250);
    ctx.bezierCurveTo(-L * 0.120, -L * 0.254, -L * 0.220, -L * 0.232, -L * 0.292, -L * 0.130);
    ctx.lineTo(-L * 0.310, -L * 0.086);
    ctx.bezierCurveTo(-L * 0.140, -L * 0.190, L * 0.100, -L * 0.200, L * 0.302, -L * 0.116);
    ctx.closePath();

    ctx.moveTo(-L * 0.060, L * 0.176);
    ctx.quadraticCurveTo(-L * 0.150, L * 0.290, -L * 0.256, L * 0.240);
    ctx.lineTo(-L * 0.300, L * 0.096);
    ctx.quadraticCurveTo(-L * 0.180, L * 0.190, -L * 0.058, L * 0.170);
    ctx.closePath();

    ctx.moveTo(L * 0.190, L * 0.150);
    ctx.quadraticCurveTo(L * 0.150, L * 0.290, L * 0.050, L * 0.290);
    ctx.quadraticCurveTo(L * 0.080, L * 0.190, L * 0.096, L * 0.140);
    ctx.closePath();

    ctx.fillStyle = rgba(red, 0.95 * fade);
    ctx.fill();
    ctx.save();
    ctx.clip();
    /* the spots run out onto the fins too, finer there than on the flank */
    for (var fs = 0; fs < 44; fs++) {
      var fsx = -L * 0.50 + L * 0.72 * ((fs * 0.3719) % 1);
      var fsy = (fs % 2 ? 1 : -1) * L * (0.09 + 0.20 * ((fs * 0.6180) % 1));
      ctx.fillStyle = rgba(deep, 0.45 * fade);
      ctx.beginPath();
      ctx.arc(fsx, fsy, L * 0.017, 0, TAU);
      ctx.fill();
      ctx.fillStyle = rgba(spot, 0.8 * fade);
      ctx.beginPath();
      ctx.arc(fsx, fsy, L * 0.011, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    /* the spine tips standing proud of the membrane */
    ctx.strokeStyle = rgba(deep, 0.6 * fade);
    ctx.lineWidth = Math.max(0.5, L * 0.008);
    ctx.lineCap = 'round';
    for (var gs = 0; gs < 9; gs++) {
      var gv = gs / 8;
      ctx.beginPath();
      ctx.moveTo(L * (0.290 - gv * 0.290), -L * (0.130 + gv * 0.030));
      ctx.lineTo(L * (0.286 - gv * 0.286), -L * (0.190 + gv * 0.048));
      ctx.stroke();
    }

    grouperBody(L);
    ctx.fillStyle = rgba(red, fade);
    ctx.fill();

    ctx.save();
    ctx.clip();
    /* the back darkens toward the dorsal, the belly lifts a little */
    ctx.fillStyle = rgba(deep, 0.4 * fade);
    ctx.beginPath();
    ctx.ellipse(L * 0.030, -L * 0.140, L * 0.320, L * 0.090, -0.06, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(mix(red, cream, 0.35), 0.25 * fade);
    ctx.beginPath();
    ctx.ellipse(L * 0.070, L * 0.130, L * 0.280, L * 0.070, 0.04, 0, TAU);
    ctx.fill();

    /* and the spots — small, bright and everywhere, each with a thin dark
       ring, which is what makes them sit on the fish instead of over it */
    for (var sq = 0; sq < f.spots.length; sq++) {
      var s = f.spots[sq];
      ctx.fillStyle = rgba(deep, 0.5 * fade);
      ctx.beginPath();
      ctx.arc(L * s.x, L * s.y, L * s.r * 1.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = rgba(spot, 0.9 * fade);
      ctx.beginPath();
      ctx.arc(L * s.x, L * s.y, L * s.r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    /* the mouth: big, oblique, and hinged back past the eye. This is the
       whole reason the head is shaped the way it is */
    ctx.strokeStyle = rgba(deep, 0.9 * fade);
    ctx.lineWidth = Math.max(0.7, L * 0.014);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(L * 0.482, L * 0.014);
    ctx.quadraticCurveTo(L * 0.420, L * 0.070, L * 0.322, L * 0.090);
    ctx.stroke();
    /* the lower jaw, jutting slightly past the upper */
    ctx.fillStyle = rgba(mix(red, cream, 0.2), 0.9 * fade);
    ctx.beginPath();
    ctx.moveTo(L * 0.486, L * 0.030);
    ctx.quadraticCurveTo(L * 0.440, L * 0.078, L * 0.376, L * 0.100);
    ctx.quadraticCurveTo(L * 0.436, L * 0.104, L * 0.470, L * 0.070);
    ctx.closePath();
    ctx.fill();
    /* the gill cover's trailing edge */
    ctx.strokeStyle = rgba(deep, 0.45 * fade);
    ctx.lineWidth = Math.max(0.5, L * 0.009);
    ctx.beginPath();
    ctx.moveTo(L * 0.268, -L * 0.150);
    ctx.quadraticCurveTo(L * 0.212, -L * 0.020, L * 0.244, L * 0.140);
    ctx.stroke();

    /* near pectoral, sculling to hold station */
    ctx.save();
    ctx.translate(L * 0.242, L * 0.048);
    ctx.rotate(0.34 + scull * 0.22);
    ctx.fillStyle = rgba(mix(red, cream, 0.30), 0.6 * fade);
    ctx.beginPath();
    ctx.ellipse(L * 0.078, L * 0.046, L * 0.122, L * 0.050, 0.52, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(deep, 0.4 * fade);
    ctx.lineWidth = Math.max(0.5, L * 0.006);
    for (var gr = 0; gr < 5; gr++) {
      var ga = 0.16 + gr * 0.20;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ga) * L * 0.19, Math.sin(ga) * L * 0.17);
      ctx.stroke();
    }
    ctx.restore();

    /* eye: a grouper's is large, forward and pale-rimmed, sat high on the
       head where an ambush predator wants it */
    ctx.fillStyle = rgba(mix(spot, cream, 0.35), 0.75 * fade);
    ctx.beginPath();
    ctx.arc(L * 0.352, -L * 0.062, L * 0.048, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(mix(deep, [0, 0, 0], 0.45), 0.95 * fade);
    ctx.beginPath();
    ctx.arc(L * 0.354, -L * 0.062, L * 0.031, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(cream, 0.8 * fade);
    ctx.beginPath();
    ctx.arc(L * 0.366, -L * 0.074, L * 0.012, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  /* --------------------------------------------------- leafy sea dragon */

  /* Phycodurus eques, side-on, in the posture it actually holds while it
     drifts: the snout angled down about forty degrees, a hard kink at the
     nape, a level armoured trunk, and a long tail trailing away astern. The
     tail is deliberately not curled — a leafy sea dragon, unlike a seahorse
     or its weedy cousin, cannot grip anything with it.
     Body-local units: +x forward, +y down. */
  /* The knots are spaced to the animal's real proportions, because getting
     these wrong is what turns a sea dragon into a pipefish: snout an eighth
     of the length, head a ninth, trunk a bare quarter, and then half the
     animal is tail. */
  var DRAGON_SPINE = [
    [0.474, 0.095], [0.429, 0.048], [0.379, 0.006], [0.331, -0.021],
    [0.279, -0.036], [0.211, -0.041], [0.144, -0.041], [0.076, -0.039],
    [0.009, -0.034], [-0.061, -0.028], [-0.130, -0.020], [-0.200, -0.010],
    [-0.269, 0.001], [-0.337, 0.015], [-0.406, 0.030], [-0.474, 0.047]
  ];
  /* The body is not a ribbon centred on its spine, and drawing it as one is
     what makes a syngnathid look like a worm. The snout is a thin tube; the
     head behind it is a deep box that starts abruptly; the back runs flat
     from nape to vent while the belly swells into a keel underneath; and at
     the vent the whole thing quits and becomes a tapering whip. */
  var DRAGON_TOP = [
    0.005, 0.012, 0.020, 0.052, 0.068, 0.074, 0.072, 0.062,
    0.046, 0.035, 0.027, 0.021, 0.016, 0.012, 0.008, 0.003
  ];
  var DRAGON_BOT = [
    0.005, 0.013, 0.024, 0.058, 0.088, 0.108, 0.114, 0.092,
    0.050, 0.035, 0.028, 0.022, 0.017, 0.012, 0.008, 0.003
  ];
  var DRAGON_N = 64;
  /* landmarks, as sample indices — the head furniture has to hang off the
     same skeleton the outline does or it drifts loose of the animal */
  var DG_SNOUT_BASE = 9, DG_EYE = 13, DG_CORONET = 15, DG_GILL = 18;
  var DG_PECTORAL = 19, DG_VENT = 34;
  /* scratch, reused every frame so the drift doesn't allocate */
  var dgX = new Float32Array(DRAGON_N + 1);
  var dgY = new Float32Array(DRAGON_N + 1);
  var dgNX = new Float32Array(DRAGON_N + 1);
  var dgNY = new Float32Array(DRAGON_N + 1);
  var dgT = new Float32Array(DRAGON_N + 1);
  var dgB = new Float32Array(DRAGON_N + 1);

  function catmull(a, b, c, d, u) {
    var u2 = u * u, u3 = u2 * u;
    return 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (3 * b - 3 * c + d - a) * u3);
  }

  /* catmull over a flat array of knots, for the two width profiles */
  function catmullAt(arr, k, s, last) {
    return catmull(arr[Math.max(0, k - 1)], arr[k], arr[k + 1],
                   arr[Math.min(last, k + 2)], s);
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
      /* the trunk is a rigid box of bone and barely moves — everything this
         animal does with its body, it does with the last third of it */
      var g = f > 0.5 ? (f - 0.5) / 0.5 : 0;
      var flex = drift * g * g;
      /* every bony ring stands a hair proud of the one behind it, and that
         faint scalloping is most of what makes a syngnathid outline look
         machined instead of drawn */
      var ring = 1 + 0.045 * Math.cos(f * 138);
      dgX[i] = L * catmull(p0[0], p1[0], p2[0], p3[0], s);
      dgY[i] = L * (catmull(p0[1], p1[1], p2[1], p3[1], s) + flex);
      dgT[i] = L * ring * Math.max(0.002, catmullAt(DRAGON_TOP, k, s, last));
      dgB[i] = L * ring * Math.max(0.002, catmullAt(DRAGON_BOT, k, s, last));
    }
    for (i = 0; i <= DRAGON_N; i++) {
      var a = i > 0 ? i - 1 : 0, b = i < DRAGON_N ? i + 1 : DRAGON_N;
      var tx = dgX[b] - dgX[a], ty = dgY[b] - dgY[a];
      var m = Math.sqrt(tx * tx + ty * ty) || 1;
      /* +N is dorsal, -N ventral, whichever way the spine happens to run */
      dgNX[i] = -ty / m;
      dgNY[i] = tx / m;
    }
  }

  /* the outline, dorsal ridge forward then ventral ridge back */
  function dragonPath(shrink) {
    var i;
    ctx.beginPath();
    for (i = 0; i <= DRAGON_N; i++) {
      ctx.lineTo(dgX[i] + dgNX[i] * dgT[i] * shrink, dgY[i] + dgNY[i] * dgT[i] * shrink);
    }
    for (i = DRAGON_N; i >= 0; i--) {
      ctx.lineTo(dgX[i] - dgNX[i] * dgB[i] * shrink, dgY[i] - dgNY[i] * dgB[i] * shrink);
    }
    ctx.closePath();
  }

  /* One leaflet, in the leaf's own frame: a lance that swells past its root
     and draws out to a point, never a paddle. Deliberately lopsided too — a
     symmetric blade reads as clip-art foliage, and the whole point of this
     animal is that it does not look drawn. */
  function leafBlade(x0, len, wide) {
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.bezierCurveTo(x0 + len * 0.12, -wide * 0.80, x0 + len * 0.34, -wide, x0 + len * 0.70, -wide * 0.44);
    ctx.quadraticCurveTo(x0 + len * 0.90, -wide * 0.18, x0 + len, 0);
    ctx.quadraticCurveTo(x0 + len * 0.88, wide * 0.24, x0 + len * 0.62, wide * 0.58);
    ctx.bezierCurveTo(x0 + len * 0.32, wide * 0.94, x0 + len * 0.10, wide * 0.68, x0, 0);
    ctx.closePath();
    ctx.fill();
  }

  /* One appendage, root to tip: a bare bony stalk, a blade broadest past
     its middle, one or two lobes branching off the stalk, and a midrib with
     veins running off it. */
  function drawDragonLeaf(lf, L, t, fade, base, edge, cream) {
    var idx = Math.round(clamp01(lf.u) * DRAGON_N);
    var w = lf.side > 0 ? dgT[idx] : dgB[idx];
    var nx = dgNX[idx] * lf.side, ny = dgNY[idx] * lf.side;
    /* a ridge leaf stands on the outline; a flank leaf roots inside it */
    var root = lf.depth === 0 ? 0.9 : lf.depth < 0 ? 0.5 : 0.28;
    var sway = reduced ? 0 : Math.sin(t * 0.0013 * PACE + lf.phase) * 0.20;
    var ang = Math.atan2(ny, nx) - lf.side * (lf.lean + sway);
    var len = L * lf.len * (lf.depth === 0 ? 1 : lf.depth < 0 ? 0.86 : 0.94);
    var wide = len * lf.wide;
    var a = fade * (lf.depth === 0 ? 0.9 : lf.depth < 0 ? 0.58 : 1);

    ctx.save();
    ctx.translate(dgX[idx] + nx * w * root, dgY[idx] + ny * w * root);
    ctx.rotate(ang);

    ctx.strokeStyle = rgba(edge, 0.78 * a);
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(0.6, len * 0.07);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len * 0.38, 0);
    ctx.stroke();

    /* the lobes go down first, so the main blade sits over them */
    if (lf.lobes > 1) {
      ctx.save();
      ctx.translate(len * 0.28, 0);
      ctx.rotate(-0.50 + sway * 0.5);
      ctx.fillStyle = rgba(mix(base, cream, 0.18), 0.70 * a);
      leafBlade(0, len * 0.48, wide * 0.62);
      ctx.restore();
    }
    if (lf.lobes > 2) {
      ctx.save();
      ctx.translate(len * 0.34, 0);
      ctx.rotate(0.56 - sway * 0.5);
      ctx.fillStyle = rgba(mix(base, [0, 0, 0], 0.14), 0.70 * a);
      leafBlade(0, len * 0.42, wide * 0.58);
      ctx.restore();
    }

    ctx.fillStyle = rgba(base, 0.76 * a);
    leafBlade(len * 0.28, len * 0.72, wide);
    ctx.strokeStyle = rgba(edge, 0.30 * a);
    ctx.lineWidth = Math.max(0.4, len * 0.032);
    ctx.stroke();

    ctx.strokeStyle = rgba(edge, 0.46 * a);
    ctx.lineWidth = Math.max(0.4, len * 0.024);
    ctx.beginPath();
    ctx.moveTo(len * 0.30, 0);
    ctx.lineTo(len * 0.92, 0);
    ctx.moveTo(len * 0.58, 0);
    ctx.lineTo(len * 0.76, -wide * 0.52);
    ctx.moveTo(len * 0.62, 0);
    ctx.lineTo(len * 0.80, wide * 0.50);
    ctx.stroke();
    ctx.restore();
  }

  /* Everything on one flank, so the body can be drawn between the passes. */
  function dragonLeafPass(d, L, t, fade, want, leafc, farLeaf, cream) {
    for (var i = 0; i < d.leaves.length; i++) {
      var lf = d.leaves[i];
      if (lf.depth !== want) continue;
      var c = want < 0 ? farLeaf : want > 0 ? mix(leafc, cream, 0.12) : leafc;
      drawDragonLeaf(lf, L, t, fade, c, mix(c, [0, 0, 0], 0.28), cream);
    }
  }

  function drawDragon(d, t, dt) {
    var fade = smooth((t - d.t0) / 2200);
    if (fade <= 0) return;
    /* it works the bed, so on each lap it re-picks a depth in the bottom
       tenth of the frame rather than anywhere in open water */
    advance(d, dt, 0.855, 0.945, 0.5);

    var L = d.len;
    var x = d.dir > 0 ? -L * 1.5 + d.travelled : W + L * 1.5 - d.travelled;
    var bob = reduced ? 0 : Math.sin(t * 0.00040 * PACE + d.phase) * L * 0.030;
    var pitch = reduced ? 0 : Math.sin(t * 0.00031 * PACE + d.phase * 1.7) * 0.05;
    var drift = reduced ? 0 : Math.sin(t * 0.00075 * PACE + d.phase) * 0.045;
    /* the fins beat an order of magnitude faster than the animal travels —
       they are the only part of a sea dragon that ever looks hurried */
    var flutter = reduced ? 0 : Math.sin(t * 0.019 * PACE + d.phase);
    var undul = reduced ? 0 : t * 0.012 * PACE + d.phase;

    var body = hex2rgb(pal.dragon);
    var cream = hex2rgb(pal.cream);
    var dark = mix(body, [0, 0, 0], 0.42);
    var deep = mix(body, [0, 0, 0], 0.62);
    var pale = mix(body, cream, 0.55);
    /* the appendages are outgrowths of the animal, not decorations stuck
       on it, so they carry a good share of the body's own colour */
    var leafc = mix(hex2rgb(pal.dragonLeaf), body, 0.52);
    /* and the far-flank ones sit behind that much more water */
    var farLeaf = mix(leafc, hex2rgb(pal.water[2]), 0.16);
    var i, k, h, span;

    ctx.save();
    ctx.translate(x, d.y + bob);
    ctx.scale(d.dir, 1);
    ctx.rotate(drift * 0.5 + pitch);

    sampleDragon(L, drift);

    /* far flank, then the ridges — both behind the body */
    dragonLeafPass(d, L, t, fade, -1, leafc, farLeaf, cream);
    dragonLeafPass(d, L, t, fade, 0, leafc, farLeaf, cream);

    /* The dorsal fin: a clear membrane over the tail base, rippling far too
       fast to follow. It and the pectorals are the whole engine — there is
       no tail fin behind it, and nothing else on the animal pushes water,
       which is why it can be swimming and still read as drifting weed. */
    ctx.fillStyle = rgba(mix(cream, body, 0.58), 0.40 * fade);
    ctx.beginPath();
    for (i = 32; i <= 46; i++) {
      ctx.lineTo(dgX[i] + dgNX[i] * dgT[i], dgY[i] + dgNY[i] * dgT[i]);
    }
    for (i = 46; i >= 32; i--) {
      span = 0.5 + 0.5 * Math.cos(Math.PI * (i - 39) / 7);
      h = dgT[i] + L * 0.026 * span * (1 + 0.20 * Math.sin(i * 0.8 + undul));
      ctx.lineTo(dgX[i] + dgNX[i] * h, dgY[i] + dgNY[i] * h);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(mix(cream, body, 0.10), 0.40 * fade);
    ctx.lineWidth = Math.max(0.4, L * 0.004);
    ctx.beginPath();
    for (i = 33; i < 46; i += 2) {
      span = 0.5 + 0.5 * Math.cos(Math.PI * (i - 39) / 7);
      h = dgT[i] + L * 0.026 * span * (1 + 0.20 * Math.sin(i * 0.8 + undul));
      ctx.moveTo(dgX[i] + dgNX[i] * dgT[i], dgY[i] + dgNY[i] * dgT[i]);
      ctx.lineTo(dgX[i] + dgNX[i] * h, dgY[i] + dgNY[i] * h);
    }
    ctx.stroke();

    /* the anal fin, which is a nub barely worth the name */
    ctx.fillStyle = rgba(mix(cream, body, 0.58), 0.40 * fade);
    ctx.beginPath();
    ctx.moveTo(dgX[DG_VENT - 2] - dgNX[DG_VENT - 2] * dgB[DG_VENT - 2],
               dgY[DG_VENT - 2] - dgNY[DG_VENT - 2] * dgB[DG_VENT - 2]);
    ctx.lineTo(dgX[DG_VENT] - dgNX[DG_VENT] * (dgB[DG_VENT] + L * 0.016),
               dgY[DG_VENT] - dgNY[DG_VENT] * (dgB[DG_VENT] + L * 0.016));
    ctx.lineTo(dgX[DG_VENT + 2] - dgNX[DG_VENT + 2] * dgB[DG_VENT + 2],
               dgY[DG_VENT + 2] - dgNY[DG_VENT + 2] * dgB[DG_VENT + 2]);
    ctx.closePath();
    ctx.fill();

    /* the body itself */
    dragonPath(1);
    ctx.fillStyle = rgba(body, fade);
    ctx.fill();

    ctx.save();
    ctx.clip();

    /* countershading as two flat tones rather than a gradient, to stay in
       the same gouache the rest of the reef is painted in */
    ctx.beginPath();
    for (i = 0; i <= DRAGON_N; i++) {
      ctx.lineTo(dgX[i] + dgNX[i] * dgT[i], dgY[i] + dgNY[i] * dgT[i]);
    }
    for (i = DRAGON_N; i >= 0; i--) {
      ctx.lineTo(dgX[i] + dgNX[i] * dgT[i] * 0.35, dgY[i] + dgNY[i] * dgT[i] * 0.35);
    }
    ctx.closePath();
    ctx.fillStyle = rgba(dark, 0.26 * fade);
    ctx.fill();

    ctx.beginPath();
    for (i = 0; i <= DRAGON_N; i++) {
      ctx.lineTo(dgX[i] - dgNX[i] * dgB[i], dgY[i] - dgNY[i] * dgB[i]);
    }
    for (i = DRAGON_N; i >= 0; i--) {
      ctx.lineTo(dgX[i] - dgNX[i] * dgB[i] * 0.45, dgY[i] - dgNY[i] * dgB[i] * 0.45);
    }
    ctx.closePath();
    ctx.fillStyle = rgba(pale, 0.20 * fade);
    ctx.fill();

    /* the cheek plate, and the ridges that fan back across it from the eye */
    ctx.beginPath();
    for (i = 10; i <= 18; i++) {
      ctx.lineTo(dgX[i] - dgNX[i] * dgB[i], dgY[i] - dgNY[i] * dgB[i]);
    }
    for (i = 18; i >= 10; i--) ctx.lineTo(dgX[i], dgY[i]);
    ctx.closePath();
    ctx.fillStyle = rgba(pale, 0.30 * fade);
    ctx.fill();
    ctx.strokeStyle = rgba(deep, 0.18 * fade);
    ctx.lineWidth = Math.max(0.4, L * 0.005);
    ctx.beginPath();
    for (k = 0; k < 3; k++) {
      var q = 15 + k * 2;
      ctx.moveTo(dgX[DG_EYE], dgY[DG_EYE]);
      ctx.lineTo(dgX[q] - dgNX[q] * dgB[q] * (0.5 + k * 0.22),
                 dgY[q] - dgNY[q] * dgB[q] * (0.5 + k * 0.22));
    }
    ctx.stroke();

    /* The bony rings: eighteen round the trunk and twice that down the
       tail. A syngnathid wears its skeleton on the outside, and this is
       what you actually see of it — a seam every few millimetres, the whole
       length of the animal. */
    ctx.lineCap = 'butt';
    ctx.lineWidth = Math.max(0.4, L * 0.005);
    ctx.strokeStyle = rgba(deep, 0.16 * fade);
    ctx.beginPath();
    for (i = 4; i < DRAGON_N; i += 2) {
      ctx.moveTo(dgX[i] + dgNX[i] * dgT[i], dgY[i] + dgNY[i] * dgT[i]);
      ctx.lineTo(dgX[i] - dgNX[i] * dgB[i], dgY[i] - dgNY[i] * dgB[i]);
    }
    ctx.stroke();

    /* pale bands round the snout, pale bars every few rings over the trunk,
       dark rings down the tail where the bars give out */
    ctx.strokeStyle = rgba(pale, 0.44 * fade);
    ctx.lineWidth = Math.max(0.5, L * 0.006);
    ctx.beginPath();
    for (i = 3; i <= DG_SNOUT_BASE; i += 3) {
      ctx.moveTo(dgX[i] + dgNX[i] * dgT[i], dgY[i] + dgNY[i] * dgT[i]);
      ctx.lineTo(dgX[i] - dgNX[i] * dgB[i], dgY[i] - dgNY[i] * dgB[i]);
    }
    ctx.stroke();
    ctx.strokeStyle = rgba(cream, 0.30 * fade);
    ctx.lineWidth = Math.max(0.7, L * 0.011);
    ctx.beginPath();
    for (i = 18; i <= 32; i += 4) {
      ctx.moveTo(dgX[i] + dgNX[i] * dgT[i], dgY[i] + dgNY[i] * dgT[i]);
      ctx.lineTo(dgX[i] - dgNX[i] * dgB[i] * 0.9, dgY[i] - dgNY[i] * dgB[i] * 0.9);
    }
    ctx.stroke();
    ctx.strokeStyle = rgba(deep, 0.34 * fade);
    ctx.lineWidth = Math.max(0.5, L * 0.008);
    ctx.beginPath();
    for (i = 38; i < DRAGON_N - 2; i += 4) {
      ctx.moveTo(dgX[i] + dgNX[i] * dgT[i], dgY[i] + dgNY[i] * dgT[i]);
      ctx.lineTo(dgX[i] - dgNX[i] * dgB[i], dgY[i] - dgNY[i] * dgB[i]);
    }
    ctx.stroke();

    /* cream beading along the flank, the same detailing the corals carry */
    ctx.fillStyle = rgba(cream, 0.28 * fade);
    for (i = 20; i <= 32; i += 5) {
      ctx.beginPath();
      ctx.arc(dgX[i] + dgNX[i] * dgT[i] * 0.15, dgY[i] + dgNY[i] * dgT[i] * 0.15,
              Math.max(0.5, L * 0.005), 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    /* The spines standing at the ring junctions, dorsal and ventral. Every
       leaf on the animal grows out of one of these, so they have to be
       there whether or not a leaf happens to be sitting on them. */
    ctx.fillStyle = rgba(dark, 0.36 * fade);
    for (k = 0; k < 2; k++) {
      var from = k === 0 ? 17 : 47, to = k === 0 ? 30 : DRAGON_N - 2;
      for (i = from; i < to; i += 3) {
        var sp = L * 0.009 * (1 - i / DRAGON_N * 0.55);
        ctx.beginPath();
        ctx.moveTo(dgX[i - 1] + dgNX[i - 1] * dgT[i - 1], dgY[i - 1] + dgNY[i - 1] * dgT[i - 1]);
        ctx.lineTo(dgX[i] + dgNX[i] * (dgT[i] + sp), dgY[i] + dgNY[i] * (dgT[i] + sp));
        ctx.lineTo(dgX[i + 1] + dgNX[i + 1] * dgT[i + 1], dgY[i + 1] + dgNY[i + 1] * dgT[i + 1]);
        ctx.closePath();
        ctx.fill();
      }
    }
    for (i = 18; i < DRAGON_N - 2; i += 4) {
      var spv = L * 0.007 * (1 - i / DRAGON_N * 0.5);
      ctx.beginPath();
      ctx.moveTo(dgX[i - 1] - dgNX[i - 1] * dgB[i - 1], dgY[i - 1] - dgNY[i - 1] * dgB[i - 1]);
      ctx.lineTo(dgX[i] - dgNX[i] * (dgB[i] + spv), dgY[i] - dgNY[i] * (dgB[i] + spv));
      ctx.lineTo(dgX[i + 1] - dgNX[i + 1] * dgB[i + 1], dgY[i + 1] - dgNY[i + 1] * dgB[i + 1]);
      ctx.closePath();
      ctx.fill();
    }

    /* the coronet: the bony crest over the back of the head that the
       biggest leaf of all grows from */
    ctx.fillStyle = rgba(dark, 0.6 * fade);
    ctx.beginPath();
    ctx.moveTo(dgX[DG_CORONET - 2] + dgNX[DG_CORONET - 2] * dgT[DG_CORONET - 2],
               dgY[DG_CORONET - 2] + dgNY[DG_CORONET - 2] * dgT[DG_CORONET - 2]);
    ctx.lineTo(dgX[DG_CORONET] + dgNX[DG_CORONET] * (dgT[DG_CORONET] + L * 0.048) - L * 0.022,
               dgY[DG_CORONET] + dgNY[DG_CORONET] * (dgT[DG_CORONET] + L * 0.048));
    ctx.lineTo(dgX[DG_CORONET + 2] + dgNX[DG_CORONET + 2] * dgT[DG_CORONET + 2],
               dgY[DG_CORONET + 2] + dgNY[DG_CORONET + 2] * dgT[DG_CORONET + 2]);
    ctx.closePath();
    ctx.fill();

    /* the pectorals, whirring away on the neck */
    ctx.save();
    ctx.translate(dgX[DG_PECTORAL], dgY[DG_PECTORAL] + dgT[DG_PECTORAL] * 0.35);
    ctx.rotate(2.86 + flutter * 0.22);
    ctx.fillStyle = rgba(mix(cream, body, 0.55), 0.42 * fade);
    ctx.beginPath();
    ctx.ellipse(L * 0.036, 0, L * 0.042, L * 0.014, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(mix(cream, body, 0.10), 0.44 * fade);
    ctx.lineWidth = Math.max(0.4, L * 0.004);
    ctx.beginPath();
    for (k = -2; k <= 2; k++) {
      ctx.moveTo(0, 0);
      ctx.lineTo(L * 0.068, k * L * 0.007);
    }
    ctx.stroke();
    ctx.restore();

    /* the gill opening, a slot high on the back of the head */
    ctx.fillStyle = rgba(deep, 0.34 * fade);
    ctx.beginPath();
    ctx.ellipse(dgX[DG_GILL] + dgNX[DG_GILL] * dgT[DG_GILL] * 0.45,
                dgY[DG_GILL] + dgNY[DG_GILL] * dgT[DG_GILL] * 0.45,
                L * 0.008, L * 0.004, -0.5, 0, TAU);
    ctx.fill();

    /* the mouth: a hinged trapdoor at the tip of the tube, and the only
       moving part of a feeding apparatus that works by suction */
    ctx.strokeStyle = rgba(deep, 0.55 * fade);
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(0.5, L * 0.005);
    ctx.beginPath();
    ctx.moveTo(dgX[1] - dgNX[1] * dgB[1] * 1.1, dgY[1] - dgNY[1] * dgB[1] * 1.1);
    ctx.lineTo(dgX[3] - dgNX[3] * dgB[3] * 1.1, dgY[3] - dgNY[3] * dgB[3] * 1.1);
    ctx.stroke();

    /* the eye, with the dark lines that radiate off it — a real field mark,
       and the thing that makes the head read as a head and not a knot of
       weed with a stick on the front */
    var ex = dgX[DG_EYE] + dgNX[DG_EYE] * dgT[DG_EYE] * 0.30;
    var ey = dgY[DG_EYE] + dgNY[DG_EYE] * dgT[DG_EYE] * 0.30;
    ctx.strokeStyle = rgba(deep, 0.30 * fade);
    ctx.lineWidth = Math.max(0.4, L * 0.005);
    ctx.beginPath();
    for (k = 0; k < 6; k++) {
      var ea = k * (TAU / 6) + 0.35;
      ctx.moveTo(ex + Math.cos(ea) * L * 0.021, ey + Math.sin(ea) * L * 0.021);
      ctx.lineTo(ex + Math.cos(ea) * L * 0.030, ey + Math.sin(ea) * L * 0.030);
    }
    ctx.stroke();
    ctx.fillStyle = rgba(cream, 0.72 * fade);
    ctx.beginPath();
    ctx.arc(ex, ey, L * 0.020, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(mix(deep, [0, 0, 0], 0.45), 0.95 * fade);
    ctx.beginPath();
    ctx.arc(ex + L * 0.004, ey + L * 0.002, L * 0.012, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(cream, 0.8 * fade);
    ctx.beginPath();
    ctx.arc(ex + L * 0.008, ey - L * 0.003, L * 0.004, 0, TAU);
    ctx.fill();

    /* and the near flank last, hanging over the body */
    dragonLeafPass(d, L, t, fade, 1, leafc, farLeaf, cream);

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
      for (var fm = 0; fm < forms.length; fm++) {
        if (forms[fm].li === li) drawForm(forms[fm], t);
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
      /* the wrasse works the crest, in front of the near coral — and then
         the reef fish proper, in plane order so the nearer ones overlap the
         farther: grouper, sweetlips, then the yellow tang herd */
      if (li === 3) {
        for (var wq = 0; wq < wrasses.length; wq++) drawWrasse(wrasses[wq], t, dt);
        for (var gq = 0; gq < groupers.length; gq++) drawGrouper(groupers[gq], t, dt);
        for (var sq = 0; sq < sweetlipses.length; sq++) drawSweetlips(sweetlipses[sq], t, dt);
        for (var yq = 0; yq < yellowtangs.length; yq++) drawYellowTang(yellowtangs[yq], t, dt);
      }
      /* and the foreground pane, closest of all */
      if (li === 4) {
        for (var dq = 0; dq < dragons.length; dq++) drawDragon(dragons[dq], t, dt);
        for (var iq = 0; iq < idols.length; iq++) drawIdol(idols[iq], t, dt);
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
