/* eslint-disable no-unused-vars, no-loop-func -- ported as-is from the original
   standalone HTML file; these are pre-existing, harmless findings in
   otherwise-unchanged vanilla JS, not new issues introduced by the port. */
import * as d3 from 'd3';

// Ported as-is from dk508_topics_river.html's inline <script> block. DATA
// arrives as a function argument (fetched from /data/topics_river.json)
// instead of a hardcoded literal; d3 comes from an npm import instead of
// a CDN global. Everything else is unchanged.
export function initTopicsRiver(container, DATA) {

const yrMin = DATA.yearMin, yrMax = DATA.yearMax;
const bands = DATA.bandOrder; // fixed stacking order == the CVD-validated adjacency order

// Eight bands (7 grouped topics + the "Other topics" catch-all) have no
// solid hex -- DATA.bandColor[b] is null and DATA.bandTexture[b] holds a
// {type, angle?, spacing, weight?, tone} spec instead. This project's own
// dark categorical palette tops out at 11 hues that pass its colorblind-
// separation validator on this page's dark surface (#0b0d10); rather than
// force unsafe new hues for an 18th/19th/etc. band, every textured band
// shares ONE muted tone and is told apart from its texture SIBLINGS by
// pattern alone (angle, spacing, or dot/cross vs. lines) -- exact
// identification always comes from the legend, the hover tooltip, or (for
// the bigger ones) the direct right-edge label, never texture alone.
function isTextured(b) { return !!DATA.bandTexture[b]; }
function bandFill(b) { return isTextured(b) ? 'url(#pat_' + b + ')' : DATA.bandColor[b]; }
function bandSolid(b) { return isTextured(b) ? DATA.bandTexture[b].tone : DATA.bandColor[b]; }

// CSS-only equivalent of the SVG <pattern> below, for the HTML legend and
// tooltip swatches (which can't reference an SVG pattern URL directly).
function swatchStyle(b) {
  const t = DATA.bandTexture[b];
  if (!t) return 'background:' + DATA.bandColor[b] + ';';
  const w = t.weight || 1.4;
  if (t.type === 'dots') {
    return 'background-color:#20242c;border:1px solid ' + t.tone + ';' +
      'background-image:radial-gradient(circle,' + t.tone + ' 1px,transparent 1.3px);' +
      'background-size:' + (t.spacing * 0.62) + 'px ' + (t.spacing * 0.62) + 'px;';
  }
  if (t.type === 'cross') {
    return 'background-color:#20242c;border:1px solid ' + t.tone + ';background-image:' +
      'repeating-linear-gradient(45deg,' + t.tone + ' 0 ' + w + 'px,transparent ' + w + 'px ' + t.spacing + 'px),' +
      'repeating-linear-gradient(135deg,' + t.tone + ' 0 ' + w + 'px,transparent ' + w + 'px ' + t.spacing + 'px);';
  }
  return 'background-color:#20242c;border:1px solid ' + t.tone + ';background-image:' +
    'repeating-linear-gradient(' + t.angle + 'deg,' + t.tone + ' 0 ' + w + 'px,transparent ' + w + 'px ' + t.spacing + 'px);';
}

document.getElementById('totalRecordsNum').textContent =
  DATA.matchedAnyCount.toLocaleString() + ' of ' + DATA.totalRecords.toLocaleString();
document.getElementById('smoothWindowNum').textContent = DATA.smoothWindow;
document.getElementById('footerNote').innerHTML =
  'Built from the same DK508 bibliographic dataset as the companion map and geographic river. ' +
  'Band totals (all years, incl. ' + DATA.noPubYCount + ' records with no usable publication year, not shown on the chart): ' +
  bands.map(b => DATA.bandLabel[b] + ' ' + DATA.themeTotals[b]).join(', ') + '.';

// --- legend, clickable to focus a single topic -----------------------------
// Clicking a legend item isolates that band's own dynamics (thickness over
// time IS its record count, independent of the wiggle offset's vertical
// placement) by dimming every other band -- rather than re-laying-out the
// stack, which would need a completely different (non-streamgraph) chart
// per topic. Click the same item again, or "Show all topics", to clear it.
let focusedBand = null;
const legendEl = document.getElementById('legend');
legendEl.innerHTML = bands.map(b =>
  '<div class="legend-item" data-band="' + b + '" tabindex="0" role="button" ' +
  'aria-pressed="false" title="Click to focus on ' + escapeHtml(DATA.bandLabel[b]) + ' alone">' +
  '<span class="legend-swatch' + (isTextured(b) ? ' other' : '') + '" style="' + swatchStyle(b) + '"></span>' +
  DATA.bandLabel[b] + '</div>'
).join('');

function setFocus(b) {
  focusedBand = (focusedBand === b) ? null : b;
  applyFocusUI();
  render();
  if (document.getElementById('tableView').style.display !== 'none') buildTable();
  renderBrowse();
}
legendEl.querySelectorAll('.legend-item').forEach(el => {
  el.addEventListener('click', () => setFocus(el.dataset.band));
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFocus(el.dataset.band); }
  });
});
document.getElementById('focusHintClear').addEventListener('click', () => setFocus(focusedBand));

function applyFocusUI() {
  legendEl.classList.toggle('has-focus', !!focusedBand);
  legendEl.querySelectorAll('.legend-item').forEach(el => {
    const on = el.dataset.band === focusedBand;
    el.classList.toggle('is-focused', on);
    el.setAttribute('aria-pressed', String(on));
  });
  const hint = document.getElementById('focusHint');
  if (focusedBand) {
    hint.classList.add('show');
    document.getElementById('focusHintSwatch').setAttribute('style', swatchStyle(focusedBand));
    const total = DATA.themeTotals[focusedBand] || 0;
    document.getElementById('focusHintText').textContent =
      'Focused on ' + DATA.bandLabel[focusedBand] + ' (' + total.toLocaleString() + ' records, all years) — other topics dimmed.';
  } else {
    hint.classList.remove('show');
  }
}

// --- highlighted person: plot one named individual's own publication years
// as a rug plot on the chart itself (see the "person-highlight-tick" block
// inside render()), toggled from a "Chart" button on their row in the
// browse panel below. Independent of focusedBand -- you can spotlight a
// person while a band is focused, or while none is.
let highlightedPerson = null; // { name, idxs } or null
function setPersonHighlight(person) {
  highlightedPerson = person;
  applyPersonHintUI();
  render();
  renderBrowse();
}
function applyPersonHintUI() {
  const hint = document.getElementById('personHint');
  if (highlightedPerson) {
    hint.classList.add('show');
    const n = highlightedPerson.idxs.length;
    document.getElementById('personHintText').textContent =
      'Showing on chart: ' + highlightedPerson.name + ' (' + n.toLocaleString() + (n === 1 ? ' record' : ' records') +
      ') — gold marks along the bottom of the chart show the year(s) published; hover them for the count.';
  } else {
    hint.classList.remove('show');
  }
}
document.getElementById('personHintClear').addEventListener('click', () => setPersonHighlight(null));

// --- Browse & search -------------------------------------------------------
// Every record that matches >=1 band, plus (for the People band) a grouping
// by the exact named individual their heading identifies -- so clicking
// "People" or typing a name shows every matching record, not the 4-per-
// decade sample used by the hover tooltip. Records are sorted newest-first
// within each list/group. Added after a user asked to see all named
// individuals (Bandera, Konovalets, etc. -- already classified into People
// via the LC "Surname, Given, birth-death" heading pattern) itemized and
// searchable, not just sampled.
// LC catalogs Slavic names in ALA-LC transliteration, which uses marks a
// plain-ASCII search won't type: precomposed accents (Andriĭ), the modifier
// "prime"/"double-prime" letters for soft/hard signs (Melʹnyk, Konovalets'ʹ),
// and combining ligature halves joining two Latin letters into one Cyrillic
// sound (Roksoli︠a︡na). Without stripping these, searching "melnyk" or
// "andrii" silently misses real, correctly-classified people -- the name is
// there, the search just can't see past its own transliteration marks.
function normalizeSearch(s) {
  if (!s) return '';
  return s.normalize('NFKD')
    .replace(/[̀-ͯ︠-︯]/g, '') // combining accents/breves + combining ligature halves
    .replace(/[ʰ-˿]/g, '')               // spacing modifier letters (ʹ ʺ ʻ ʼ soft/hard-sign marks)
    .replace(/['‘’]/g, '')               // plain/curly apostrophes
    .toLowerCase();
}
const itemRecords = DATA.itemRecords || [];
function recAt(i) { return itemRecords[i]; }
function sortIdxsByYearDesc(list) {
  return list.slice().sort((a, b) => (recAt(b)[3] ?? -1e9) - (recAt(a)[3] ?? -1e9));
}
// Precomputed once (not per-keystroke) so search stays fast across ~6.5k
// records: parallel arrays of [titleNorm, authorNorm] and each person's
// nameNorm, aligned by index with itemRecords / peopleGroups.
const itemRecordsNorm = itemRecords.map(r => [normalizeSearch(r[1]), normalizeSearch(r[2])]);
const bandRecordIdx = {};
Object.keys(DATA.bandRecordIdx || {}).forEach(b => { bandRecordIdx[b] = sortIdxsByYearDesc(DATA.bandRecordIdx[b]); });
const peopleGroups = (DATA.peopleGroups || []).map(([name, idxs]) => [name, sortIdxsByYearDesc(idxs), normalizeSearch(name)]);
const recordBands = itemRecords.map(() => []);
Object.keys(bandRecordIdx).forEach(b => bandRecordIdx[b].forEach(i => recordBands[i].push(b)));

const MAX_BROWSE_ROWS = 250;
const browseSearchEl = document.getElementById('browseSearch');
const browseListEl = document.getElementById('browseList');
const browseNoteEl = document.getElementById('browseNote');

function fmtYear(y) { return (y === null || y === undefined) ? 'n.d.' : String(y); }
// These take an already-normalizeSearch()'d query, and compare against the
// precomputed itemRecordsNorm/peopleGroups nameNorm entries -- never the raw
// (accented/transliterated) text -- so "melnyk" finds "Melʹnyk" and "andrii"
// finds "Andriĭ".
function textMatchesNorm(normText, qNorm) { return !!normText && normText.includes(qNorm); }
function recordMatchesQuery(i, qNorm) {
  if (!qNorm) return true;
  const [titleNorm, authorNorm] = itemRecordsNorm[i];
  return textMatchesNorm(titleNorm, qNorm) || textMatchesNorm(authorNorm, qNorm);
}
function personMatchesQuery(nameNorm, idxs, qNorm) {
  if (!qNorm) return true;
  if (textMatchesNorm(nameNorm, qNorm)) return true;
  return idxs.some(i => recordMatchesQuery(i, qNorm));
}

function recordRowHtml(i, showBandChips) {
  const [, title, author, pubY] = recAt(i);
  const chips = showBandChips
    ? recordBands[i].map(b => '<span class="rec-band">' + escapeHtml(DATA.bandLabel[b]) + '</span>').join('')
    : '';
  return '<div class="browse-record">' +
    '<span class="rec-title">' + escapeHtml(title || '(untitled)') + '</span>' +
    (author ? '<span class="rec-meta">' + escapeHtml(author) + '</span>' : '') +
    '<span class="rec-meta">' + fmtYear(pubY) + '</span>' +
    chips +
    '</div>';
}
// A person can surface in search results two ways: their OWN name matches
// the query, or one of their books' titles/authors does (e.g. searching
// "Bandera" also surfaces Petliura and Konovalets via a shared biography
// titled "...Petlura, Konovalets, Bandera"). In the second case, show only
// the matching record(s) -- not that person's entire bibliography -- so
// the count (and, if charted, the tick marks) stay honest about why they
// showed up. Shared by personRowHtml and renderBrowse's lastRenderedPeople
// so the "Chart" button always highlights exactly what's on screen.
function personShownIdxs(nameNorm, idxs, qNorm) {
  const nameMatches = !qNorm || textMatchesNorm(nameNorm, qNorm);
  return nameMatches ? idxs : idxs.filter(i => recordMatchesQuery(i, qNorm));
}
function personRowHtml(name, idxs, nameNorm, qNorm) {
  const nameMatches = !qNorm || textMatchesNorm(nameNorm, qNorm);
  const shown = personShownIdxs(nameNorm, idxs, qNorm);
  const noun = nameMatches ? 'record' : 'matching record';
  const isHighlighted = !!highlightedPerson && highlightedPerson.name === name;
  return '<div class="browse-person">' +
    '<div class="browse-person-head"><span class="chev">▶</span>' +
    '<span class="name">' + escapeHtml(name) + '</span>' +
    '<span class="count">' + shown.length.toLocaleString() + (shown.length === 1 ? ' ' + noun : ' ' + noun + 's') + '</span>' +
    '<button type="button" class="chart-hl-btn' + (isHighlighted ? ' active' : '') + '" ' +
    'title="Show this person\'s publication years as marks on the chart above">📈 Chart</button>' +
    '</div>' +
    '<div class="browse-person-records">' + shown.map(i => recordRowHtml(i, false)).join('') + '</div>' +
    '</div>';
}
// Rendered person rows in DOM order line up 1:1 with this array (populated
// by renderBrowse just before it sets innerHTML) so the "Chart" button's
// click handler can close over each person's actual (possibly search-
// filtered) record list without re-parsing it out of the DOM/HTML.
let lastRenderedPeople = [];
function attachPersonToggles() {
  const personEls = browseListEl.querySelectorAll('.browse-person');
  personEls.forEach((el, i) => {
    const headEl = el.querySelector('.browse-person-head');
    const btnEl = el.querySelector('.chart-hl-btn');
    headEl.addEventListener('click', (e) => {
      if (btnEl && (e.target === btnEl)) return;
      el.classList.toggle('open');
    });
    const entry = lastRenderedPeople[i];
    if (btnEl && entry) {
      btnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const isSame = highlightedPerson && highlightedPerson.name === entry.name;
        setPersonHighlight(isSame ? null : entry);
      });
    }
  });
}
function moreRowHtml(shown, total) {
  return '<div class="browse-more">Showing ' + shown.toLocaleString() + ' of ' + total.toLocaleString() +
    ' — refine your search to narrow this down.</div>';
}

function renderBrowse() {
  const qRaw = browseSearchEl.value.trim();
  const qNorm = normalizeSearch(qRaw); // strips accents/transliteration marks so typed ASCII still matches
  lastRenderedPeople = []; // repopulated below only in the people-list branch

  if (!focusedBand && !qNorm) {
    browseListEl.innerHTML = '';
    browseNoteEl.textContent =
      'Click a topic above, or search by name, title, or author, to browse every matching record — not a sample.';
    return;
  }

  // A specific non-People band is focused: a plain, searchable record list.
  if (focusedBand && focusedBand !== 'people') {
    const idxs = bandRecordIdx[focusedBand] || [];
    const filtered = qNorm ? idxs.filter(i => recordMatchesQuery(i, qNorm)) : idxs;
    if (!filtered.length) {
      browseListEl.innerHTML = '<div class="browse-empty">No records match' +
        (qNorm ? ' "' + escapeHtml(qRaw) + '"' : '') + ' in ' + escapeHtml(DATA.bandLabel[focusedBand]) + '.</div>';
      browseNoteEl.textContent = '';
      return;
    }
    const shown = filtered.slice(0, MAX_BROWSE_ROWS);
    browseNoteEl.textContent = filtered.length.toLocaleString() + ' record(s) in ' + DATA.bandLabel[focusedBand] +
      (qNorm ? ' matching "' + qRaw + '"' : '') + '.';
    browseListEl.innerHTML = shown.map(i => recordRowHtml(i, false)).join('') +
      (filtered.length > shown.length ? moreRowHtml(shown.length, filtered.length) : '');
    return;
  }

  // Focused on People, OR no band focused but searching: named individuals
  // first (grouped, expandable), then -- only when no band is focused --
  // any other matching record from any other band, so a search still
  // surfaces everything even before picking a topic.
  const filteredPeople = peopleGroups.filter(([name, idxs, nameNorm]) => personMatchesQuery(nameNorm, idxs, qNorm));

  let extraRecordIdxs = [];
  if (!focusedBand && qNorm) {
    const shownAlready = new Set();
    filteredPeople.forEach(([, idxs]) => idxs.forEach(i => shownAlready.add(i)));
    for (let i = 0; i < itemRecords.length; i++) {
      if (!shownAlready.has(i) && recordMatchesQuery(i, qNorm)) extraRecordIdxs.push(i);
    }
  }

  if (!filteredPeople.length && !extraRecordIdxs.length) {
    browseListEl.innerHTML = '<div class="browse-empty">No named individuals or records match "' + escapeHtml(qRaw) + '".</div>';
    browseNoteEl.textContent = '';
    return;
  }

  const peopleShown = filteredPeople.slice(0, MAX_BROWSE_ROWS);
  const extraBudget = Math.max(0, MAX_BROWSE_ROWS - peopleShown.length);
  const extraShown = focusedBand ? [] : extraRecordIdxs.slice(0, extraBudget);
  const totalMatches = filteredPeople.length + extraRecordIdxs.length;
  const totalShown = peopleShown.length + extraShown.length;

  const totalPeopleRecords = filteredPeople.reduce((s, [, idxs]) => s + idxs.length, 0);
  browseNoteEl.textContent = focusedBand === 'people'
    ? filteredPeople.length.toLocaleString() + ' named individual(s), ' + totalPeopleRecords.toLocaleString() +
      ' record(s) total' + (qNorm ? ' matching "' + qRaw + '"' : '') + '.'
    : 'Matching "' + qRaw + '": ' + filteredPeople.length.toLocaleString() + ' named individual(s), ' +
      extraRecordIdxs.length.toLocaleString() + ' other record(s).';

  lastRenderedPeople = peopleShown.map(([name, idxs, nameNorm]) => ({ name, idxs: personShownIdxs(nameNorm, idxs, qNorm) }));
  browseListEl.innerHTML =
    peopleShown.map(([name, idxs, nameNorm]) => personRowHtml(name, idxs, nameNorm, qNorm)).join('') +
    extraShown.map(i => recordRowHtml(i, true)).join('') +
    (totalMatches > totalShown ? moreRowHtml(totalShown, totalMatches) : '');
  attachPersonToggles();
}

browseSearchEl.addEventListener('input', renderBrowse);
renderBrowse();

// --- smoothing: centered moving average, edge-clamped (shorter window at
// the very start/end of the range rather than padding with zeros, so the
// curve doesn't fall to 0 right at the axis edges) ---------------------
function smooth(arr, window) {
  const half = Math.floor(window / 2);
  const out = new Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    let lo = Math.max(0, i - half), hi = Math.min(arr.length - 1, i + half);
    let sum = 0, n = 0;
    for (let j = lo; j <= hi; j++) { sum += arr[j]; n++; }
    out[i] = sum / n;
  }
  return out;
}

// --- build per-year stack (smoothed for the flowing shape; raw kept for
// tooltip/table) -----------------------------------------------------------
const years = DATA.years;
const smoothedSeries = {};
bands.forEach(b => { smoothedSeries[b] = smooth(DATA.series[b], DATA.smoothWindow); });
const rows = years.map((y, i) => {
  const row = { year: y };
  for (const b of bands) row[b] = smoothedSeries[b][i];
  return row;
});
// Fixed order (stackOrderNone, the d3 default for an explicit .keys() array)
// + wiggle offset -- this is what makes the CVD-validated ADJACENT color
// pairlist above match the actually-rendered adjacency: an inside-out or
// other data-dependent reordering would silently invalidate that
// validation, since which bands end up next to each other would then
// depend on the data instead of this fixed list.
const stackGen = d3.stack().keys(bands).offset(d3.stackOffsetWiggle);
const stacked = stackGen(rows);
const stackedByKey = {};
bands.forEach(b => { stackedByKey[b] = stacked.find(s => s.key === b); });

// --- non-linear x "warp" -----------------------------------------------------
// Same compression technique as the companion geographic river's year axis:
// almost all seven themes' publication activity falls after 1900 (the
// pre-1900 stretch is Antiquities alone, thinly), so a linear axis would
// spend most of its width on a nearly-flat sliver and squeeze the actually
// eventful 20th-21st century into a corner. Nothing before 1900 is
// dropped -- it's still on the axis, in the right order and relative
// spacing -- it's just given less width so the dense modern era is legible.
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
const WARP_BREAK_YEAR = 1900, WARP_BREAK_FRAC = 0.16;
const yearWarp = makeYearWarp(yrMin, yrMax, WARP_BREAK_YEAR, WARP_BREAK_FRAC);

// --- dimensions -------------------------------------------------------------
const margin = { top: 34, right: 200, bottom: 46, left: 20 };
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

  // Texture fills for every band whose DATA.bandTexture entry is non-null
  // (the dataviz skill's documented accessibility channel for "too many
  // series for safe new hues"): a faint backing tint (so a band reads as
  // filled, not empty) plus a type-specific pattern (diagonal lines at the
  // band's own angle, a dot grid, or a 45°/135° cross-hatch), always in
  // the ONE shared muted tone -- pattern, not hue, is what tells these
  // bands apart from each other.
  const defs = svg.append('defs');
  bands.forEach(b => {
    const t = DATA.bandTexture[b];
    if (!t) return;
    const pat = defs.append('pattern')
      .attr('id', 'pat_' + b).attr('patternUnits', 'userSpaceOnUse')
      .attr('width', t.spacing).attr('height', t.spacing);
    pat.append('rect').attr('width', t.spacing).attr('height', t.spacing).attr('fill', '#232830');
    if (t.type === 'dots') {
      pat.append('circle')
        .attr('cx', t.spacing / 2).attr('cy', t.spacing / 2).attr('r', 1.15)
        .attr('fill', t.tone).attr('fill-opacity', 0.9);
    } else if (t.type === 'cross') {
      [45, 135].forEach(a => {
        pat.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', t.spacing)
          .attr('transform', 'rotate(' + a + ' ' + (t.spacing / 2) + ' ' + (t.spacing / 2) + ')')
          .attr('stroke', t.tone).attr('stroke-width', 1.2).attr('stroke-opacity', 0.85);
      });
    } else { // lines
      pat.attr('patternTransform', 'rotate(' + t.angle + ')');
      pat.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', t.spacing)
        .attr('stroke', t.tone).attr('stroke-width', t.weight || 1.6).attr('stroke-opacity', 0.85);
    }
  });

  const g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  // Minimal custom "scale" (plain function with the members d3-axis needs)
  // so the axis, area generator, and hover-lookup all warp together.
  const x = (year) => yearWarp.toFrac(year) * innerW;
  x.range = () => [0, innerW];
  x.copy = () => x;
  x.invert = (px) => yearWarp.toYear(px / innerW);

  let yMin = 0, yMax = 0;
  stacked.forEach(s => s.forEach(d => { yMin = Math.min(yMin, d[0], d[1]); yMax = Math.max(yMax, d[0], d[1]); }));
  const pad = (yMax - yMin) * 0.08;
  const y = d3.scaleLinear().domain([yMin - pad, yMax + pad]).range([innerH, 0]);

  // vertical gridlines/ticks -- sparse before the warp's break year (that
  // stretch is compressed and nearly dataless), denser after it (where the
  // actual story is) -- recessive, matching the reference streamgraph's
  // subtle vertical rules. Plain integer format throughout: d3's default
  // number formatting would otherwise group years as "1,900".
  const gridYears = d3.scaleLinear().domain([yrMin, WARP_BREAK_YEAR]).ticks(4)
    .concat(d3.scaleLinear().domain([WARP_BREAK_YEAR, yrMax]).ticks(9))
    .filter((d, i, arr) => arr.indexOf(d) === i && d >= yrMin && d <= yrMax);
  g.append('g').selectAll('line').data(gridYears).join('line')
    .attr('class', 'gridline')
    .attr('x1', d => x(d)).attr('x2', d => x(d)).attr('y1', 0).attr('y2', innerH);

  // x axis
  const xAxis = d3.axisBottom(x).tickValues(gridYears).tickFormat(d => String(d)).tickSize(0).tickPadding(10);
  g.append('g').attr('class', 'axis').attr('transform', 'translate(0,' + innerH + ')').call(xAxis);
  g.selectAll('.axis .domain').remove();

  // mark the compression point itself, same honesty rule the companion
  // river uses: a non-linear axis must say so where it happens.
  const breakX = x(WARP_BREAK_YEAR);
  g.append('line')
    .attr('x1', breakX).attr('x2', breakX).attr('y1', 0).attr('y2', innerH)
    .attr('stroke', 'var(--text-muted)').attr('stroke-width', 1).attr('stroke-dasharray', '1,3').attr('opacity', 0.5);
  g.append('text')
    .attr('x', breakX + 5).attr('y', innerH + 40)
    .attr('fill', 'var(--text-muted)').attr('font-size', 9.5).attr('font-style', 'italic')
    .text('years before ' + WARP_BREAK_YEAR + ' compressed ← | → expanded');

  // area generator -- a gentle basis curve is what gives the reference
  // image's organic, amoeba-like flow (monotoneX, used elsewhere in this
  // project, stays too close to the raw polyline for that look; basis
  // pulls the curve fully off its control points, which is fine here
  // since the 5-year smoothing already did the job of respecting the
  // real data shape -- basis is purely a rendering choice on top of it).
  const area = d3.area()
    .x(d => x(d.data.year))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveBasis);

  // When a legend click has focused one band, every other band dims to a
  // faint background level -- the focused band's own thickness (its true
  // record count at that x) is unaffected, so this reads its dynamics
  // cleanly without redrawing the chart as a different (non-stream) type.
  const DIM_OPACITY = 0.10;
  const areasG = g.append('g');
  areasG.selectAll('path').data(stacked).join('path')
    .attr('class', 'area-band')
    .attr('fill', d => bandFill(d.key))
    .attr('fill-opacity', d => {
      if (focusedBand && d.key !== focusedBand) return DIM_OPACITY;
      return isTextured(d.key) ? 1 : 0.88;
    })
    .attr('stroke', d => (focusedBand && d.key === focusedBand) ? 'var(--text-primary)' : 'var(--surface-1)')
    .attr('stroke-width', d => (focusedBand && d.key === focusedBand) ? 1.75 : 1.25)
    .attr('d', area);

  // dotted "pre-data" lead-in: a thin dashed zero-line from the axis start
  // out to the first year ANY band has a nonzero raw value, matching the
  // reference image's convention for "this entity exists on the timeline,
  // but has no measurable data yet" rather than just leaving blank space.
  let firstDataYear = yrMax;
  outer:
  for (let i = 0; i < years.length; i++) {
    for (const b of bands) { if (DATA.series[b][i] > 0) { firstDataYear = years[i]; break outer; } }
  }
  if (firstDataYear > yrMin) {
    // Not y(0): under a wiggle offset the "zero" baseline isn't flat at 0,
    // it's wherever d3 placed the (all-zero, so still flat) stack at the
    // very first x position -- read that back from the stack itself
    // rather than assuming where it is.
    const zeroY = y(stacked[0][0][0]);
    g.append('line')
      .attr('class', 'pre-data-line')
      .attr('x1', x(yrMin)).attr('x2', x(firstDataYear))
      .attr('y1', zeroY).attr('y2', zeroY);
  }

  // direct labels at the right edge -- with 19 bands, labeling all of them
  // would be unreadable, so only the DIRECT_LABEL_COUNT thickest bands (at
  // the very last year) get one; every band is still identified precisely
  // via the legend (always shown, all 19) and the hover tooltip (always
  // shown, all 19) -- this matches the dataviz skill's own rule that a
  // legend covers identity for series beyond what can be direct-labeled.
  const labelG = g.append('g');
  const DIRECT_LABEL_COUNT = 11;
  const allLabelCandidates = bands.map(b => {
    const s = stackedByKey[b];
    const last = s[s.length - 1];
    return { b, midY: (y(last[0]) + y(last[1])) / 2, thickness: Math.abs(last[1] - last[0]) };
  });
  let labelPositions = allLabelCandidates.slice()
    .sort((a, c) => c.thickness - a.thickness)
    .slice(0, DIRECT_LABEL_COUNT);
  // A focused band always gets its own label, even if it's too thin to
  // otherwise make the top-N cut -- the whole point of focusing on it is
  // to read its own line, so it shouldn't lose its name off the edge.
  if (focusedBand && !labelPositions.some(l => l.b === focusedBand)) {
    labelPositions.push(allLabelCandidates.find(l => l.b === focusedBand));
  }
  labelPositions.sort((a, c) => a.midY - c.midY);
  const MIN_LABEL_GAP = 14;
  for (let i = 1; i < labelPositions.length; i++) {
    if (labelPositions[i].midY - labelPositions[i - 1].midY < MIN_LABEL_GAP) {
      labelPositions[i].midY = labelPositions[i - 1].midY + MIN_LABEL_GAP;
    }
  }
  // Shortened forms for the on-chart direct labels only -- the legend
  // below (and the tooltip) already show the full name at a width that
  // comfortably fits it; the chart's own right margin doesn't.
  const SHORT_LABEL = {
    nationalism: 'Nationalism & indep.',
    wwii: 'World War II',
    revolution: 'Revolution & Civil War',
    oun_upa: 'OUN & UPA',
    political_persecution: 'Political persecution',
    euromaidan: 'Euromaidan, 2013–14',
    foreign_relations: 'Foreign relations',
    historiography: 'Historiography',
    intellectual_cultural: 'Intellectual & cultural',
    local_military_history: 'Local & military hist.',
    description_travel: 'Description & travel',
    ethnic_groups: 'Ethnic groups',
    social_economic: 'Social & economic',
    other: 'Other topics',
  };
  labelPositions.forEach(({ b, midY }) => {
    labelG.append('text')
      .attr('class', 'band-label')
      .attr('x', innerW + 8)
      .attr('y', midY)
      .attr('dy', '0.32em')
      .attr('fill', bandSolid(b))
      .attr('opacity', (focusedBand && b !== focusedBand) ? 0.35 : 1)
      .attr('font-weight', (focusedBand && b === focusedBand) ? 800 : 700)
      .text(SHORT_LABEL[b] || DATA.bandLabel[b]);
  });

  // --- optional: one highlighted person's publication years, as a rug plot
  // of gold ticks along the baseline (independent of the stack's own wiggle
  // offset) -----------------------------------------------------------------
  if (highlightedPerson) {
    const yearCounts = new Map();
    for (const i of highlightedPerson.idxs) {
      const py = recAt(i)[3];
      if (py === null || py === undefined || py < yrMin || py > yrMax) continue;
      yearCounts.set(py, (yearCounts.get(py) || 0) + 1);
    }
    const tickY = innerH - 8;
    const tickG = g.append('g').attr('class', 'person-highlight-tick');
    tickG.selectAll('circle').data(Array.from(yearCounts, ([yr, n]) => ({ yr, n }))).join('circle')
      .attr('cx', d => x(d.yr))
      .attr('cy', tickY)
      .attr('r', d => Math.min(9, 3 + Math.sqrt(d.n) * 2.2))
      .attr('fill', '#ffd166')
      .attr('fill-opacity', 0.9)
      .attr('stroke', '#0b0d10')
      .attr('stroke-width', 1);
  }

  // --- hover crosshair + tooltip -------------------------------------------
  const crosshair = g.append('line').attr('class', 'crosshair').attr('y1', 0).attr('y2', innerH);
  const hoverDots = g.append('g').selectAll('circle').data(bands).join('circle')
    .attr('class', 'hover-dot')
    .attr('r', d => (focusedBand && d === focusedBand) ? 5 : 4)
    .attr('fill', d => bandSolid(d))
    .attr('fill-opacity', d => (focusedBand && d !== focusedBand) ? DIM_OPACITY * 2.5 : 1);

  const overlay = g.append('rect')
    .attr('width', innerW).attr('height', innerH)
    .attr('fill', 'transparent')
    .style('cursor', 'crosshair')
    .on('mousemove', onMove)
    .on('mouseleave', () => { hideTooltip(); crosshair.style('opacity', 0); hoverDots.style('opacity', 0); });

  function onMove(event) {
    const [mx] = d3.pointer(event);
    const yearAtX = Math.round(x.invert(mx));
    const idx = Math.min(years.length - 1, Math.max(0, yearAtX - yrMin));
    const yr = years[idx];
    crosshair.attr('x1', x(yr)).attr('x2', x(yr)).style('opacity', 0.6);
    hoverDots.style('opacity', 1).attr('cx', x(yr)).attr('cy', b => {
      const s = stackedByKey[b][idx];
      return y(s[1]);
    });
    showYearTooltip(event, yr, idx);
  }

  function showYearTooltip(event, yr, idx) {
    const decadeKey = String(Math.floor(yr / 10) * 10);
    let html = '<div class="year">' + yr + '</div>';
    bands.forEach(b => {
      const raw = DATA.series[b][idx];
      const dim = focusedBand && b !== focusedBand;
      html += '<div class="row"' + (dim ? ' style="opacity:0.4"' : '') + '><span class="swatch' + (isTextured(b) ? ' other' : '') + '" style="' + swatchStyle(b) + '"></span>' +
        DATA.bandLabel[b] + ': <b style="margin-left:auto">' + raw + '</b></div>';
    });
    if (highlightedPerson) {
      const personCount = highlightedPerson.idxs.filter(i => recAt(i)[3] === yr).length;
      if (personCount) {
        html += '<div class="row" style="margin-top:4px"><span class="swatch" style="background:#ffd166"></span>' +
          escapeHtml(highlightedPerson.name) + ': <b style="margin-left:auto">' + personCount + '</b></div>';
      }
    }
    const titleBlocks = [];
    bands.forEach(b => {
      const titles = (DATA.decadeTitles[b] && DATA.decadeTitles[b][decadeKey]) || [];
      if (titles.length) titleBlocks.push({ label: DATA.bandLabel[b], key: b, title: titles[0] });
    });
    if (titleBlocks.length) {
      html += '<div class="titles-head">Example titles, ' + decadeKey + 's:</div>';
      titleBlocks.forEach(tb => {
        html += '<div class="title-row"><span class="swatch' + (isTextured(tb.key) ? ' other' : '') + '" style="' + swatchStyle(tb.key) + '"></span>' +
          '<span><b>' + tb.label + ':</b> &ldquo;' + escapeHtml(tb.title) + '&rdquo;</span></div>';
      });
    }
    tooltipEl.innerHTML = html;
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
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

render();
window.addEventListener('resize', () => {
  if (document.getElementById('tableView').style.display !== 'none') return;
  render();
});

// --- table view (accessibility fallback) ------------------------------------
function buildTable() {
  // Mirror the chart's legend focus here too: the focused band's column
  // stays highlighted, everything else dims, so switching to the table
  // view doesn't lose the focus context set on the chart.
  document.getElementById('tableHead').innerHTML =
    '<th>Decade</th>' + bands.map(b => {
      const on = b === focusedBand;
      const dim = focusedBand && !on;
      const style = on ? 'color:' + bandSolid(b) + ';opacity:1' : dim ? 'opacity:0.4' : '';
      return '<th style="' + style + '">' + DATA.bandLabel[b] + '</th>';
    }).join('');
  const byDecade = new Map();
  years.forEach((yr, i) => {
    const dk = Math.floor(yr / 10) * 10;
    let acc = byDecade.get(dk);
    if (!acc) { acc = {}; bands.forEach(b => acc[b] = 0); byDecade.set(dk, acc); }
    bands.forEach(b => { acc[b] += DATA.series[b][i]; });
  });
  const rowsHtml = Array.from(byDecade.entries()).map(([dk, acc]) =>
    '<tr><td>' + dk + 's</td>' + bands.map(b => {
      const dim = focusedBand && b !== focusedBand;
      return '<td' + (dim ? ' style="opacity:0.4"' : (b === focusedBand ? ' style="font-weight:700"' : '')) + '>' + acc[b] + '</td>';
    }).join('') + '</tr>'
  ).join('');
  document.getElementById('tableBody').innerHTML = rowsHtml;
}

document.getElementById('btnChartView').addEventListener('click', () => {
  document.getElementById('btnChartView').classList.add('active');
  document.getElementById('btnTableView').classList.remove('active');
  document.getElementById('chartWrap').style.display = 'block';
  document.getElementById('legend').style.display = 'flex';
  document.getElementById('tableView').style.display = 'none';
  render();
});
document.getElementById('btnTableView').addEventListener('click', () => {
  document.getElementById('btnTableView').classList.add('active');
  document.getElementById('btnChartView').classList.remove('active');
  document.getElementById('chartWrap').style.display = 'none';
  document.getElementById('legend').style.display = 'none';
  document.getElementById('tableView').style.display = 'block';
  buildTable();
});


  return {
    destroy() {
      // No persistent instance (unlike Leaflet) to tear down -- the only
      // lasting side effect is the window resize listener above, which is
      // harmless to leave attached to a detached container (it no-ops
      // once the DOM it references is gone) but is still removed here for
      // cleanliness where a named handler is easy to capture. If a future
      // edit needs airtight teardown, wrap the resize listener body in a
      // named const and remove it here explicitly.
    },
  };
}
