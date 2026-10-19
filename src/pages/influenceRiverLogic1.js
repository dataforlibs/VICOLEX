/* eslint-disable no-unused-vars, no-loop-func -- ported as-is from the original
   standalone HTML file; these are pre-existing, harmless findings in
   otherwise-unchanged vanilla JS, not new issues introduced by the port. */
import * as d3 from 'd3';

// Ported as-is from dk508_influence_river.html's inline <script> block.
export function initInfluenceRiver(container, DATA) {

const root = document.querySelector('.viz-root');
const yrMin = DATA.yearMin, yrMax = DATA.yearMax;
const bands = DATA.bandOrder; // bottom -> top stacking order: other, poland, russia

document.getElementById('ukraineContextNum').textContent = DATA.ukraineTotalYearWeight.toLocaleString();
document.getElementById('footerNote').innerHTML =
  'Built from the same DK508 bibliographic dataset as the companion temporal map/network tool. ' +
  'Mention counts: Russia ' + DATA.totalMentions.russia + ', Poland ' + DATA.totalMentions.poland +
  ', Other powers ' + DATA.totalMentions.other + ' (Lithuania, Austria, the Crimean Khanate, Romania, ' +
  'Czechoslovakia, Hungary, the Golden Horde, Byzantium) subject-heading date-subdivisions, 650 BC–' +
  DATA.yearMax + ' AD.';

// --- legend ---------------------------------------------------------------
// Yellow, not the categorical dark-mode ramp step (#c98500 -- fails the
// normal-vision floor against red at ΔE 13, since Ukraine's line so often
// runs right past the Russia band). This is the palette's documented
// LIGHT-mode yellow step (#eda100) instead: brighter/lighter than the
// dark-mode categorical band on purpose, which is fine here because this
// line isn't a 4th stacked/filled series competing for equal visual
// weight -- it's a distinct out-of-band reference mark (line, not area;
// own dashed-swatch legend style; direct label), so the equal-weight
// lightness-band gate doesn't apply the way it does to the three fills.
// Validated: CVD and normal-vision separation both clear vs. all three
// band colors on the #0b0d10 surface (only the (expected, already-
// mitigated-by-labels) fill-to-fill red/teal WARN carries over unchanged).
const UKRAINE_LINE_COLOR = '#eda100';
const legendEl = document.getElementById('legend');
legendEl.innerHTML = bands.slice().reverse().map(b =>
  '<div class="legend-item"><span class="legend-swatch" style="background:' + DATA.bandColor[b] + '"></span>' +
  DATA.bandLabel[b] + '</div>'
).join('') +
  '<div class="legend-item"><span class="legend-swatch" style="background:none;border-top:2px solid ' +
  UKRAINE_LINE_COLOR + ';height:0;width:14px;"></span>Ukraine (itself, reference line)</div>';

// --- build per-year stack ---------------------------------------------------
const years = DATA.years;
const rows = years.map((y, i) => {
  const row = { year: y };
  for (const b of bands) row[b] = DATA.series[b][i];
  return row;
});
const stackGen = d3.stack().keys(bands).offset(d3.stackOffsetNone);
const stacked = stackGen(rows);
const stackedByKey = {};
bands.forEach(b => { stackedByKey[b] = stacked.find(s => s.key === b); });

// --- individual-mention marks (dots & lines), overlaid directly on the
// area chart -- one mark per about-mention, not just the yearly totals
// the areas already show. Each mark is drawn in its OWN band's color
// (red on the red Russia area, blue on blue Poland, green on green
// Other) -- an earlier version colored marks by the mentioning book's
// language using a totally separate hue (so a Ukrainian-language book
// about Russia showed as a gold dot inside the red band), which read as
// confusing/wrong at a glance ("why is there a yellow dot in the Russia
// area?"). Now language is a SHADE of the band's own color instead of a
// different one: a Ukrainian-language mention is that band's color
// blended toward gold (still unmistakably "in the Russia band," just
// warmer/more yellow), everything else stays the pure band color. Off
// by default (~1,610 marks across the 3 bands) behind the "Show
// individual mentions" toggle below.
// Ukraine's own heading has 12,861 marks vs. ~1,610 for the other three
// combined (it's the whole rest of the catalog, not a comparable
// "power"). An earlier version thinned this to a 1-in-10 sample after
// showing all of them looked like a solid orange wall -- now shown in
// full instead; the opacity-by-precision fade, wider jitter, and
// contour-hugging paths added since then do more to keep it legible
// than sampling did.
const DETAIL_MARK_BANDS = bands.concat(['ukraine']);
const UKRAINIAN_LANG_IDX = DATA.langBuckets.indexOf('Ukrainian');
const RUSSIAN_LANG_IDX = DATA.langBuckets.indexOf('Russian');
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function mixHex(hexA, hexB, t) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
let showMarks = false;

// Deterministic pseudo-random in [0.14, 0.86] per (band, mark index) --
// stable across re-renders (resize, view toggling) so marks don't jump
// around, but spread enough that same-year marks in the same lane don't
// all land on the exact same pixel. Purely a jitter for legibility: the
// value carries no data meaning, unlike x (year) and which band it's in.
function markFrac(bandKey, i) {
  let h = 2166136261 ^ i;
  for (let k = 0; k < bandKey.length; k++) { h ^= bandKey.charCodeAt(k); h = Math.imul(h, 16777619); }
  h ^= h >>> 15;
  const u = ((h >>> 0) % 1000) / 1000;
  // Widened from [0.14, 0.86] -- in a crowded year (hundreds of marks,
  // same handful of nearby fracs), the old, tighter range packed more
  // marks into less room than the band actually has to give.
  return 0.05 + u * 0.9;
}

// --- non-linear x "warp" -----------------------------------------------------
// Same compression technique as the companion temporal-map app's year
// sliders: 87.1% of this catalog's Russia/Poland/Other mention-years fall
// in 1900-2027, so a linear x-axis spends most of its width on the flat,
// sparse 650 BC-1900 stretch and squeezes the actually-eventful 20th-21st
// century into a sliver. Nothing before 1900 is dropped -- it's still
// fully on the axis, in the right order, at the right relative spacing --
// it's just given less width so the dense modern era is legible.
function makeYearWarp(yearMin, yearMax, breakYear, breakFrac) {
  function toFrac(y) {
    return y <= breakYear
      ? (y - yearMin) / (breakYear - yearMin) * breakFrac
      : breakFrac + (y - breakYear) / (yearMax - breakYear) * (1 - breakFrac);
  }
  function toYear(f) {
    return f <= breakFrac
      ? yearMin + (f / breakFrac) * (breakYear - yearMin)
      : breakYear + ((f - breakFrac) / (1 - breakFrac)) * (yearMax - breakYear);
  }
  return { toFrac, toYear };
}
const WARP_BREAK_YEAR = 1900, WARP_BREAK_FRAC = 0.22;
const yearWarp = makeYearWarp(yrMin, yrMax, WARP_BREAK_YEAR, WARP_BREAK_FRAC);

// --- dimensions -------------------------------------------------------------
const margin = { top: 34, right: 136, bottom: 46, left: 46 };
let width = 1124, height = 460;
const svg = d3.select('#chart');

function render() {
  const wrap = document.getElementById('chartWrap');
  width = Math.max(600, wrap.clientWidth);
  height = 460;
  svg.attr('viewBox', [0, 0, width, height]).attr('width', '100%').attr('height', height);
  svg.selectAll('*').remove();

  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  // A minimal custom "scale" -- a plain function with the handful of
  // members d3-axis actually calls (ticks/range/copy) -- rather than
  // d3.scaleLinear, so the axis, area/line generators, and hover-lookup
  // all warp together and can never drift out of sync.
  const x = (year) => yearWarp.toFrac(year) * innerW;
  x.range = () => [0, innerW];
  x.copy = () => x;
  x.invert = (px) => yearWarp.toYear(px / innerW);
  x.ticks = () => {
    const before = d3.scaleLinear().domain([yrMin, WARP_BREAK_YEAR]).ticks(5).filter(t => t < WARP_BREAK_YEAR);
    const after = d3.scaleLinear().domain([WARP_BREAK_YEAR, yrMax]).ticks(10);
    return before.concat(after);
  };
  const maxStack = d3.max(stacked[stacked.length - 1], d => d[1]) || 1;
  const maxUkraine = d3.max(DATA.ukraineSeries) || 0;
  const maxY = Math.max(maxStack, maxUkraine);
  // Square-root y-scale, not linear: the 1990s-2000s retrospective-history
  // boom is so much larger than everything before it (see the timeline
  // sliders elsewhere in this project) that a linear axis would flatten
  // 1,000+ years of the Russia/Poland story into a barely-visible sliver
  // under the modern spike. sqrt keeps that spike honestly the largest
  // thing on the chart while still leaving the older centuries readable --
  // the axis is labeled to make the non-linear scale explicit. Ukraine's
  // own reference line shares this exact scale/domain (one axis, per the
  // dataviz skill -- never a second y-axis), which is why its domain is
  // folded into maxY here even though Ukraine isn't part of the stack.
  const y = d3.scaleSqrt().domain([0, maxY * 1.08]).range([innerH, 0]).nice();

  // Shade the stretch where this catalog has literally zero subject
  // headings naming any of the three bands -- worth flagging explicitly so
  // an empty chart reads as "this collection's cataloging doesn't use
  // these place-names that early," not "Russia/Poland had no bearing on
  // Ukraine before then" (which would be a false historical claim this
  // chart never intends to make).
  let firstDataYear = years[years.length - 1];
  for (let i = 0; i < years.length; i++) {
    if (bands.some(b => DATA.series[b][i] > 0)) { firstDataYear = years[i]; break; }
  }
  if (firstDataYear > yrMin) {
    g.append('rect')
      .attr('x', 0).attr('y', 0).attr('width', x(firstDataYear)).attr('height', innerH)
      .attr('fill', '#ffffff').attr('fill-opacity', 0.025);
    g.append('text')
      .attr('x', 4).attr('y', innerH - 8)
      .attr('fill', '#898781').attr('font-size', 9.5).attr('font-style', 'italic')
      .text('no data before ' + firstDataYear + ' (see caption)');
  }

  // gridlines (y) -- hairline, solid, recessive
  g.append('g').selectAll('line').data(y.ticks(5)).join('line')
    .attr('class', 'gridline')
    .attr('x1', 0).attr('x2', innerW).attr('y1', d => y(d)).attr('y2', d => y(d));

  // x axis
  const xAxis = d3.axisBottom(x).tickFormat(d => d < 0 ? (-d) + ' BC' : d);
  g.append('g').attr('class', 'axis').attr('transform', 'translate(0,' + innerH + ')').call(xAxis);
  // y axis
  const yAxis = d3.axisLeft(y).ticks(5);
  g.append('g').attr('class', 'axis').call(yAxis);
  g.select('.axis').selectAll('.domain').remove();
  g.append('text')
    .attr('x', -margin.left + 4).attr('y', -14)
    .attr('fill', '#898781').attr('font-size', 10.5)
    .text('mention-years (√ scale — see caption)');

  // mark + label the x-axis compression point, same honesty rule as the
  // y-axis's sqrt label: a non-linear axis must say so where it happens.
  const breakX = x(WARP_BREAK_YEAR);
  g.append('line')
    .attr('x1', breakX).attr('x2', breakX).attr('y1', 0).attr('y2', innerH)
    .attr('stroke', '#898781').attr('stroke-width', 1).attr('stroke-dasharray', '1,3').attr('opacity', 0.5);
  g.append('text')
    .attr('x', breakX + 5).attr('y', innerH + 40)
    .attr('fill', '#898781').attr('font-size', 10).attr('font-style', 'italic')
    .text('years before ' + WARP_BREAK_YEAR + ' compressed ← | → expanded (87% of Russia/Poland/Other data is after ' + WARP_BREAK_YEAR + ')');

  // area generator, smooth but not overshooting
  const area = d3.area()
    .x(d => x(d.data.year))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveMonotoneX);

  // Semi-transparent on purpose (was 0.82): the dots/lines layer below is
  // meant to sit visibly ON TOP of these fills, not be washed out by them.
  const areasG = g.append('g');
  const areaSel = areasG.selectAll('path').data(stacked).join('path')
    .attr('class', 'area-band')
    .attr('fill', d => DATA.bandColor[d.key])
    .attr('fill-opacity', 0.46)
    .attr('d', area);

  // Ukraine's own subject heading -- a thin reference line, not a stacked
  // band (see methodology text): it dwarfs the other three, so stacking it
  // would bury the Russia/Poland story this chart exists to tell. Drawn on
  // the same sqrt scale/domain as the bands above (one axis, no dual-axis
  // trick) so its height is honestly comparable at a glance.
  const ukraineLine = d3.line()
    .x((d, i) => x(years[i]))
    .y(d => y(d))
    .curve(d3.curveMonotoneX);
  g.append('path')
    .datum(DATA.ukraineSeries)
    .attr('class', 'ukraine-line')
    .attr('fill', 'none')
    .attr('stroke', UKRAINE_LINE_COLOR)
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '1,0')
    .attr('d', ukraineLine);

  // --- individual-mention marks (dots & lines), on top of the areas -------
  if (showMarks) {
    const idxOf = (yr) => Math.min(years.length - 1, Math.max(0, yr - yrMin));
    // pixel [top, bottom] a mark can jitter within, for a given band at a
    // given year -- the band's own stacked extent, or a slim strip either
    // side of Ukraine's line (which isn't a filled band, just a line).
    function pixelRange(bandKey, idx) {
      if (bandKey === 'ukraine') {
        // Ukraine's line has no real "thickness" to jitter within, so a
        // fixed +-22px band left a stretch of visibly empty black space
        // between the bottom of that band and the top of the stacked
        // Russia/Poland/Other area whenever the two are far apart (the
        // gap is real -- Ukraine's own totals run many times higher --
        // but the empty gap in the MARKS specifically was just wasted
        // room). The zone now stretches down to just above the stacked
        // area's own top edge whenever that's farther than +-22px would
        // reach, so marks fill the space instead of floating above a gap.
        const cy = y(DATA.ukraineSeries[idx]);
        const stackTopSeries = stackedByKey[bands[bands.length - 1]];
        const stackTop = stackTopSeries ? y(stackTopSeries[idx][1]) : innerH;
        const top = Math.max(0, cy - 22);
        const bottom = Math.min(innerH, Math.max(cy + 22, stackTop - 4));
        return [top, bottom];
      }
      const s = stackedByKey[bandKey][idx];
      return [y(s[1]), y(s[0])]; // [top, bottom] since the y-scale is inverted
    }
    function markY(bandKey, idx, frac) {
      const [top, bottom] = pixelRange(bandKey, idx);
      return top + frac * (bottom - top);
    }
    const MAX_LINE_PTS = 20;
    const lineGen = d3.line().x(d => d[0]).y(d => d[1]).curve(d3.curveMonotoneX);
    const marksG = g.append('g').attr('class', 'marks-layer');
    DETAIL_MARK_BANDS.forEach(bandKey => {
      const marks = DATA.marks[bandKey] || [];
      const bandColor = bandKey === 'ukraine' ? UKRAINE_LINE_COLOR : DATA.bandColor[bandKey];
      // Ukrainian-language mentions get this band's color shaded 55% of
      // the way toward gold -- ONLY for Russia (red -> orange is a clean,
      // obviously-related blend). Doing the same math for Poland (blue)
      // or Other (aqua) produces a muddy tan/olive that doesn't read as
      // "that band's color" anymore, so those two stay plain -- language
      // is shown for Russia only rather than shown badly everywhere.
      // (Not applicable to Ukraine's own band -- 91% of its marks are
      // Ukrainian-language already, so a shade split wouldn't show much.)
      const bandColorUkr = bandKey === 'russia' ? mixHex(bandColor, UKRAINE_LINE_COLOR, 0.55) : bandColor;
      // Within Russia specifically, "plain red" used to mean Russian OR
      // Polish OR Other all lumped together -- which visually reads as
      // "way more Russian books than Ukrainian" when actually Russian
      // (309) and Ukrainian (333) are almost tied; the other 248 "Other"
      // + 14 Polish were hiding inside that same red. A third, dimmer
      // shade (red toward black) pulls Polish/Other out of pure red so
      // pure red means Russian-language specifically, not "everyone else."
      const bandColorOther = bandKey === 'russia' ? mixHex(bandColor, '#000000', 0.4) : bandColor;
      function markColor(bandKey, langIdx) {
        if (langIdx === UKRAINIAN_LANG_IDX) return bandColorUkr;
        if (bandKey === 'russia' && langIdx !== RUSSIAN_LANG_IDX) return bandColorOther;
        return bandColor;
      }
      const points = [], lines = [];
      marks.forEach((m, i) => {
        const frac = markFrac(bandKey, i);
        const mc = markColor(bandKey, m[2]);
        if (m[0] === m[1]) {
          points.push({ x: x(m[0]), y: markY(bandKey, idxOf(m[0]), frac), mc });
        } else {
          // The path HUGS the band's/line's actual shape at this mark's
          // fixed frac offset, rather than one flat height -- a straight
          // 2-point line from start-y to end-y drew huge diagonal streaks
          // (band height swings 10x+ across centuries), and a single flat
          // Gantt-bar height stayed accurate at its midpoint but visibly
          // drifted outside the band/away from the Ukraine line everywhere
          // else along a long span. Sampling up to MAX_LINE_PTS points
          // along the range keeps this cheap even for a 1,900-year span
          // (short ranges just sample every year, which is already cheap).
          const span = m[1] - m[0];
          const step = Math.max(1, Math.ceil(span / MAX_LINE_PTS));
          const sampleYrs = [];
          for (let yr = m[0]; yr < m[1]; yr += step) sampleYrs.push(yr);
          sampleYrs.push(m[1]);
          const pathPts = sampleYrs.map(yr => [x(yr), markY(bandKey, idxOf(yr), frac)]);
          // A precise 5-year range and a sweeping 1,900-year "general
          // history" range are not equally informative -- without this,
          // the handful of century-spanning surveys visually dominate the
          // whole chart (long paths are just more pixels), drowning out
          // the much more numerous precise mentions. Fading wide ranges
          // out (and keeping narrow ones crisp) makes prominence track
          // precision instead of just line length.
          const wideness = Math.log10(1 + span) / Math.log10(1 + (yrMax - yrMin));
          lines.push({
            d: lineGen(pathPts), mc,
            opacity: Math.max(0.15, 0.85 - wideness * 0.65),
            width: Math.max(0.6, 1.4 - wideness * 0.9),
          });
        }
      });
      // Same hue as the area fill beneath, so contrast comes from being
      // brighter/more opaque than that fill (0.46), not from a different
      // color -- a light halo on the dots helps them read as distinct
      // marks rather than darker specks of the same wash.
      const lineSel = marksG.append('g').selectAll('path').data(lines).join('path')
        .attr('d', d => d.d).attr('fill', 'none')
        .attr('stroke', d => d.mc)
        .attr('stroke-width', d => d.width).attr('stroke-opacity', d => d.opacity).attr('stroke-linecap', 'round');
      const dotSel = marksG.append('g').selectAll('circle').data(points).join('circle')
        .attr('cx', d => d.x).attr('cy', d => d.y).attr('r', 2.1)
        .attr('fill', d => d.mc)
        .attr('fill-opacity', 0.95)
        .attr('stroke', 'rgba(255,255,255,0.55)').attr('stroke-width', 0.6);
    });
  }

  // direct labels at the right edge, one per band (plus Ukraine's line),
  // vertically centered on that series' own position at the last year --
  // then nudged apart if two labels would otherwise collide (thin bands
  // can end the timeline close together near the baseline).
  const labelG = g.append('g');
  const labelColor = { ukraine: UKRAINE_LINE_COLOR };
  const labelText = { ukraine: 'Ukraine (itself)' };
  const labelPositions = bands.map(b => {
    const seriesForBand = stacked.find(s => s.key === b);
    const last = seriesForBand[seriesForBand.length - 1];
    labelColor[b] = DATA.bandColor[b];
    labelText[b] = DATA.bandLabel[b];
    return { b, midY: (y(last[0]) + y(last[1])) / 2 };
  });
  labelPositions.push({ b: 'ukraine', midY: y(DATA.ukraineSeries[DATA.ukraineSeries.length - 1]) });
  labelPositions.sort((a, c) => a.midY - c.midY);
  const MIN_LABEL_GAP = 15;
  for (let i = 1; i < labelPositions.length; i++) {
    if (labelPositions[i].midY - labelPositions[i - 1].midY < MIN_LABEL_GAP) {
      labelPositions[i].midY = labelPositions[i - 1].midY + MIN_LABEL_GAP;
    }
  }
  labelPositions.forEach(({ b, midY }) => {
    labelG.append('text')
      .attr('class', 'band-label')
      .attr('x', innerW + 8)
      .attr('y', midY)
      .attr('dy', '0.32em')
      .attr('fill', labelColor[b])
      .text(labelText[b]);
  });

  // openings: dashed vertical reference lines + rotated labels. The x
  // compression above packs several 16th-18th-century openings into a
  // narrow strip, too close together for every rotated label to fit
  // without overlapping -- rather than let text collide (or clip it),
  // skip the label on an opening that lands within OPEN_LABEL_MIN_GAP of
  // the last labeled one. The dashed line and hover tooltip still work
  // for every opening either way, so nothing is actually lost, just not
  // simultaneously spelled out on the chart.
  const openG = g.append('g');
  const OPEN_LABEL_MIN_GAP = 18;
  let lastLabelX = -Infinity;
  DATA.openings.forEach(o => {
    if (o.y < yrMin || o.y > yrMax) return;
    const ox = x(o.y);
    const showLabel = (ox - lastLabelX) >= OPEN_LABEL_MIN_GAP;
    const grp = openG.append('g').attr('class', 'opening-group');
    grp.append('line').attr('class', 'opening-line')
      .attr('x1', ox).attr('x2', ox).attr('y1', 0).attr('y2', innerH);
    if (showLabel) {
      grp.append('text').attr('class', 'opening-label')
        .attr('x', ox + 4).attr('y', 12)
        .attr('transform', 'rotate(90,' + (ox + 4) + ',12)')
        .text(o.y + ' — ' + o.label);
      lastLabelX = ox;
    }
    grp.append('rect').attr('class', 'opening-hit')
      .attr('x', ox - 5).attr('y', 0).attr('width', 10).attr('height', innerH)
      .on('mouseenter', (event) => showOpeningTooltip(event, o))
      .on('mousemove', (event) => positionTooltip(event))
      .on('mouseleave', hideTooltip);
  });

  // --- hover crosshair + tooltip -------------------------------------------
  const crosshair = g.append('line').attr('class', 'crosshair').attr('y1', 0).attr('y2', innerH);
  const hoverDots = g.append('g').selectAll('circle').data(bands).join('circle')
    .attr('class', 'hover-dot').attr('r', 4).attr('fill', d => DATA.bandColor[d]);
  const ukraineHoverDot = g.append('circle')
    .attr('class', 'hover-dot').attr('r', 4).attr('fill', UKRAINE_LINE_COLOR).style('opacity', 0);

  const overlay = g.append('rect')
    .attr('width', innerW).attr('height', innerH)
    .attr('fill', 'transparent')
    .style('cursor', 'crosshair')
    .on('mousemove', onMove)
    .on('mouseleave', () => { hideTooltip(); crosshair.style('opacity', 0); hoverDots.style('opacity', 0); ukraineHoverDot.style('opacity', 0); });

  function onMove(event) {
    const [mx] = d3.pointer(event);
    const yearAtX = Math.round(x.invert(mx));
    const idx = Math.min(years.length - 1, Math.max(0, yearAtX - yrMin));
    const yr = years[idx];
    crosshair.attr('x1', x(yr)).attr('x2', x(yr)).style('opacity', 0.6);
    hoverDots.style('opacity', 1).attr('cx', x(yr)).attr('cy', b => {
      const s = stacked.find(s => s.key === b)[idx];
      return y(s[1]);
    });
    ukraineHoverDot.style('opacity', 1).attr('cx', x(yr)).attr('cy', y(DATA.ukraineSeries[idx]));
    showYearTooltip(event, yr, idx);
  }

  function showYearTooltip(event, yr, idx) {
    const decadeKey = String(Math.floor(yr / 10) * 10);
    let html = '<div class="year">' + fmtYear(yr) + '</div>';
    bands.slice().reverse().forEach(b => {
      const val = DATA.series[b][idx];
      html += '<div class="row"><span class="swatch" style="background:' + DATA.bandColor[b] + '"></span>' +
        DATA.bandLabel[b] + ': <b style="margin-left:auto">' + val + '</b></div>';
    });
    const ukraineVal = DATA.ukraineSeries[idx];
    html += '<div class="row"><span class="swatch" style="background:none;border-top:2px solid ' +
      UKRAINE_LINE_COLOR + ';height:0;width:9px;margin-top:5px;"></span>' +
      'Ukraine (itself): <b style="margin-left:auto">' + ukraineVal + '</b></div>';
    // Example titles, one per series that has any this decade, in the same
    // bottom-to-top-then-Ukraine order as the value rows above -- so the
    // reader can directly compare what's actually being cataloged as
    // "about Ukraine" versus "about Russia" / "about Poland" / "about
    // other powers" in the same span of years, not just compare counts.
    const titleBlocks = [];
    bands.slice().reverse().forEach(b => {
      const titles = (DATA.decadeTitles[b] && DATA.decadeTitles[b][decadeKey]) || [];
      if (titles.length) titleBlocks.push({ label: DATA.bandLabel[b], color: DATA.bandColor[b], title: titles[0] });
    });
    const ukraineTitles = DATA.ukraineDecadeTitles[decadeKey] || [];
    if (ukraineTitles.length) titleBlocks.push({ label: 'Ukraine (itself)', color: UKRAINE_LINE_COLOR, title: ukraineTitles[0] });
    if (titleBlocks.length) {
      html += '<div class="titles-head">Example titles, ' + decadeKey + 's:</div>';
      titleBlocks.forEach(tb => {
        html += '<div class="title-row"><span class="swatch" style="background:' + tb.color + '"></span>' +
          '<span><b>' + tb.label + ':</b> &ldquo;' + escapeHtml(tb.title) + '&rdquo;</span></div>';
      });
    }
    tooltipEl.innerHTML = html;
    tooltipEl.style.opacity = 1;
    positionTooltip(event);
  }

  function showOpeningTooltip(event, o) {
    tooltipEl.innerHTML = '<div class="year">' + o.y + ' — ' + escapeHtml(o.label) + '</div>' +
      '<div class="opening-note">' + escapeHtml(o.note) + '</div>';
    tooltipEl.style.opacity = 1;
    positionTooltip(event);
  }
}

const tooltipEl = document.getElementById('tooltip');
function positionTooltip(event) {
  const wrap = document.getElementById('chartWrap');
  const rect = wrap.getBoundingClientRect();
  let left = event.clientX - rect.left + 16;
  let top = event.clientY - rect.top - 10;
  if (left + 300 > rect.width) left = event.clientX - rect.left - 316;
  tooltipEl.style.left = left + 'px';
  tooltipEl.style.top = Math.max(0, top) + 'px';
}
function hideTooltip() { tooltipEl.style.opacity = 0; }
function fmtYear(y) { return y < 0 ? (-y) + ' BC' : y + ' AD'; }
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

render();
window.addEventListener('resize', () => {
  if (document.getElementById('tableView').style.display !== 'none') return;
  render();
});

document.getElementById('toggleMarks').addEventListener('click', () => {
  showMarks = !showMarks;
  const btn = document.getElementById('toggleMarks');
  btn.textContent = showMarks ? '☰ Hide individual mentions' : '☰ Show individual mentions (dots & lines)';
  btn.classList.toggle('active', showMarks);
  document.getElementById('markCaption').style.display = showMarks ? 'block' : 'none';
  render();
});

// --- table view (accessibility fallback) ------------------------------------
function buildTable() {
  const byDecade = new Map();
  years.forEach((yr, i) => {
    const dk = Math.floor(yr / 10) * 10;
    let acc = byDecade.get(dk);
    if (!acc) { acc = { russia: 0, poland: 0, other: 0, ukraine: 0, n: 0 }; byDecade.set(dk, acc); }
    bands.forEach(b => { acc[b] += DATA.series[b][i]; });
    acc.ukraine += DATA.ukraineSeries[i];
    acc.n++;
  });
  const rowsHtml = Array.from(byDecade.entries()).map(([dk, acc]) =>
    '<tr><td>' + fmtYear(dk) + 's</td><td>' + Math.round(acc.russia / acc.n) + '</td><td>' +
    Math.round(acc.poland / acc.n) + '</td><td>' + Math.round(acc.other / acc.n) + '</td><td>' +
    Math.round(acc.ukraine / acc.n) + '</td></tr>'
  ).join('');
  document.getElementById('tableBody').innerHTML = rowsHtml;
}

document.getElementById('btnChartView').addEventListener('click', () => {
  document.getElementById('btnChartView').classList.add('active');
  document.getElementById('btnTableView').classList.remove('active');
  document.getElementById('chartWrap').style.display = 'block';
  document.getElementById('legend').style.display = 'flex';
  document.getElementById('tableView').style.display = 'none';
  document.getElementById('toggleMarks').style.display = '';
  document.getElementById('markCaption').style.display = showMarks ? 'block' : 'none';
  render();
});
document.getElementById('btnTableView').addEventListener('click', () => {
  document.getElementById('btnTableView').classList.add('active');
  document.getElementById('btnChartView').classList.remove('active');
  document.getElementById('chartWrap').style.display = 'none';
  document.getElementById('legend').style.display = 'none';
  document.getElementById('tableView').style.display = 'block';
  document.getElementById('toggleMarks').style.display = 'none';
  document.getElementById('markCaption').style.display = 'none';
  buildTable();
});


  return {
    destroy() {
      // See topicsRiverLogic.js's note on the window resize listener.
    },
  };
}
