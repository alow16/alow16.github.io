/* ------------------------------------------------------------------ *
 * Anthony Low — caption fitting
 *
 * Centres a caption block under its image while leaving the lines ragged
 * right. CSS can't do this: `fit-content` sizes from max-content — the whole
 * caption on one line — which overruns the figure and collapses back to the
 * full width, so the block ends up flush left however it is centred. What we
 * want is the width of the longest line *after* wrapping, which only exists
 * once the browser has laid the text out. So measure the line boxes and pin
 * the caption to the widest one; the auto margins in styles.css do the rest.
 *
 * Runs before the reveal cascade uncovers the figure, so the resize is never
 * seen. Without this file the caption simply stays full width and flush left.
 * ------------------------------------------------------------------ */

(function () {
  'use strict';

  var captions = document.querySelectorAll('[data-fit-caption]');
  if (!captions.length || typeof document.createRange !== 'function') return;

  function widestLine(el) {
    var range = document.createRange();
    range.selectNodeContents(el);

    // One rect per line box. Sub-pixel slivers show up between inline nodes,
    // so ignore anything too narrow to be a line of text.
    var rects = range.getClientRects();
    var widest = 0;
    for (var i = 0; i < rects.length; i++) {
      if (rects[i].width > 1 && rects[i].width > widest) widest = rects[i].width;
    }
    return widest;
  }

  function fit(el) {
    // Drop any previous result first: the wrapping has to be re-measured
    // against the full width the figure currently offers, not last fit.
    el.style.width = '';

    var widest = widestLine(el);
    if (!widest) return;

    /* Round up. At the exact fractional width the final word of the longest
       line can fall off the end and re-wrap, which would leave the block
       narrower than the text it is meant to hold. */
    el.style.width = Math.ceil(widest) + 'px';
  }

  function fitAll() {
    for (var i = 0; i < captions.length; i++) fit(captions[i]);
  }

  fitAll();

  // Metrics move when a fallback font is swapped out, and the wrap point
  // changes with the column, so re-fit on both.
  if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
    document.fonts.ready.then(fitAll);
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitAll, 150);
  });
})();
