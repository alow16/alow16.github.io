/* ------------------------------------------------------------------ *
 * Anthony Low — title scramble
 *
 * The two nav titles arrive as noise: every letter cycles through random
 * upper- and lower-case glyphs, then locks into place left to right. The
 * body of the page is held back (see .scrambling in styles.css) until the
 * last letter settles, so the writing lands as one piece.
 *
 * The titles are set in a proportional serif, so a naive scramble changes
 * width every frame — enough to wrap the nav onto two lines. Each position
 * therefore draws from the glyphs that measure close to the letter it will
 * settle on, which keeps the word's width near-constant for free.
 * ------------------------------------------------------------------ */

(function () {
  'use strict';

  var POOL = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  /* STEP and LEAD set the length of the run; TICK is the churn rate and is
     deliberately left out of that scaling, so a longer scramble means each
     letter turns over more glyphs rather than turning over more slowly. */
  var STEP = 116;  // ms between one letter locking and the next
  var TICK = 42;   // ms between glyph swaps on the letters still churning
  var LEAD = 340;  // ms head start the first title gets over the second
  var HOLD = 90;   // ms of stillness after the last letter, before the body

  var TOLERANCE = 0.18;  // how far a stand-in glyph may stray in width
  var MIN_CHOICES = 5;   // ...relaxed until at least this many qualify

  var root = document.documentElement;

  /* Hand the page over to the CSS reveal cascade. Called on every exit
     path — a title that never got to scramble must not hide the body. */
  function release() {
    root.classList.remove('scrambling');
    root.classList.add('booted');
  }

  var targets = [];
  var nodes = document.querySelectorAll('[data-scramble]');
  for (var n = 0; n < nodes.length; n++) {
    var text = nodes[n].textContent.replace(/\s+/g, ' ').trim();
    if (text) targets.push({ el: nodes[n], text: text });
  }

  // No JS-driven boot (reduced motion, or nothing to scramble): stand down.
  if (!root.classList.contains('scrambling') || !targets.length) {
    release();
    return;
  }

  /* Measure every glyph in the title's own font. letter-spacing is missing
     from the canvas font shorthand, but it is a constant per character and
     so drops out of a width comparison. */
  function measurePool(el) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return null;

    var cs = window.getComputedStyle(el);
    ctx.font = [cs.fontStyle, cs.fontWeight, cs.fontSize, cs.fontFamily].join(' ');

    var table = [];
    for (var i = 0; i < POOL.length; i++) {
      var ch = POOL.charAt(i);
      var w = ctx.measureText(ch).width;
      if (!(w > 0)) return null;
      table.push({ ch: ch, w: w });
    }
    return table;
  }

  /* The glyphs that can stand in for `ch` without shifting the line. */
  function standInsFor(ch, table) {
    if (!table) {
      // No canvas to measure with: same-case substitution is the safe
      // approximation, since case drives most of the width difference.
      var sameCase = ch === ch.toUpperCase()
        ? POOL.slice(26)
        : POOL.slice(0, 26);
      return sameCase.split('');
    }

    var target = null;
    for (var i = 0; i < table.length; i++) {
      if (table[i].ch === ch) { target = table[i].w; break; }
    }
    if (target === null) return POOL.split('');

    var picks = [];
    for (var t = TOLERANCE; picks.length < MIN_CHOICES && t <= 1; t *= 1.6) {
      picks = [];
      for (var j = 0; j < table.length; j++) {
        if (Math.abs(table[j].w - target) <= target * t) picks.push(table[j].ch);
      }
    }
    return picks;
  }

  var pool = measurePool(targets[0].el);
  var standIns = {};
  var end = 0;

  for (var t = 0; t < targets.length; t++) {
    var target = targets[t];
    var offset = t * LEAD;

    /* Freeze the title at its finished width and forbid wrapping. The
       stand-in glyphs hold the width to within a pixel or two, and this
       makes sure the leftovers can never break the nav onto a new line. */
    target.el.style.width = target.el.getBoundingClientRect().width + 'px';
    target.el.style.display = 'inline-block';
    target.el.style.whiteSpace = 'nowrap';

    // Screen readers would otherwise announce whatever noise is on screen.
    target.el.setAttribute('aria-label', target.text);

    target.chars = [];
    for (var i = 0; i < target.text.length; i++) {
      var ch = target.text.charAt(i);

      if (ch === ' ') {
        target.chars.push({ ch: ch, settleAt: 0, choices: null, glyph: ' ' });
        continue;
      }

      if (!standIns[ch]) standIns[ch] = standInsFor(ch, pool);

      var settleAt = offset + i * STEP + Math.random() * STEP * 0.9;
      target.chars.push({
        ch: ch,
        settleAt: settleAt,
        choices: standIns[ch],
        glyph: ''
      });
      if (settleAt > end) end = settleAt;
    }
  }

  function finish() {
    for (var i = 0; i < targets.length; i++) {
      targets[i].el.textContent = targets[i].text;
      targets[i].el.style.width = '';
      targets[i].el.style.display = '';
      targets[i].el.style.whiteSpace = '';
    }
    release();
  }

  var startedAt = null;
  var lastTick = null;

  function frame(now) {
    if (startedAt === null) startedAt = now;
    var elapsed = now - startedAt;

    var swap = lastTick === null || elapsed - lastTick >= TICK;
    if (swap) lastTick = elapsed;

    for (var i = 0; i < targets.length; i++) {
      var chars = targets[i].chars;
      var out = '';
      for (var j = 0; j < chars.length; j++) {
        var c = chars[j];
        if (elapsed >= c.settleAt) {
          out += c.ch;
        } else {
          if (swap) {
            c.glyph = c.choices[(Math.random() * c.choices.length) | 0];
          }
          out += c.glyph;
        }
      }
      targets[i].el.textContent = out;
    }

    if (elapsed >= end + HOLD) finish();
    else requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
