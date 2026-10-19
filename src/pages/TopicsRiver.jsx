import React, { useEffect, useRef } from 'react';
import './TopicsRiver.css';
import { initTopicsRiver } from './topicsRiverLogic';

const SKELETON_HTML = `<div class="viz-root" data-palette="#9b971e,#ef25d0,#7da21e,#24a4b1,#af8e1f,#25a89a,#a8632f,#2a9dc4,#e66767,#b623f5,#e0507a,#008300,#d55181,#c98500,#9085e9,#199e70,#3987e5,#d95926">
  <h1>Subject Themes in Ukraine's History</h1>
  <div class="companion-row">
    <a id="aboutLink" href="#/" target="_blank" rel="noopener" title="About this project: data, motivation, and methodology">← About this project</a>
    <a id="companionLink1" href="#/map" target="_blank" rel="noopener" title="Opens the companion map/network explorer -- keep both files in the same folder for this link to work">🗺️ Companion map &amp; network explorer →</a>
    <a id="companionLink2" href="#/influence" target="_blank" rel="noopener" title="Opens the companion geographic river (Russia &amp; Poland) -- keep both files in the same folder for this link to work">📈 Companion chart: Russia &amp; Poland river →</a>
  </div>
  <p class="subtitle">
    How much publishing attention nineteen distinct DK508 (Ukraine — History) catalog subject
    topics — eighteen named, solid-color topics, down to a final "Other topics" remainder — have
    received, year by year from 1727 to 2027. Unlike the companion Russia/Poland river, this chart
    tracks <b>when books were published</b> about each topic, not when the underlying events
    happened — see the methodology note for why, and how that changes what the shape means.
  </p>
  <div class="methodology">
    <b>What this measures:</b> for each year, how many distinct records whose subject headings
    match one of eleven original headline themes — <b>Politics and government, Foreign
    relations, Antiquities, Nationalism &amp; independence movements, World War II, Revolution
    &amp; Civil War (1917–21), Famine (Holodomor), OUN &amp; UPA (nationalist underground), Ethnic
    relations, Political persecution &amp; prisoners, Euromaidan Protests (2013–14)</b> — plus
    seven more named topics added later (<b>People, Historiography &amp; historians, Intellectual
    &amp; cultural life, Local &amp; military history, Description &amp; travel, Ethnic groups,
    Social &amp; economic conditions</b>) — were <i>published</i> that year (the same LC
    call-number year used throughout this project). All eighteen are solid-color bands, each its
    own hue. A final catch-all, <b>Other topics</b> (shown with a diagonal-hatch texture, not a
    color — see below), covers every remaining substantive heading that isn't a place, a
    cataloging form label, or a bare date. Together all nineteen bands cover
    <b id="totalRecordsNum">—</b> of this catalog's 8,446 records — up from just 3,398 (40%) when
    only the original seven headline themes are counted. A record can count under more than one
    band.
    <br><br>
    <b>Why some bands are named and others stay in "Other":</b> asked directly whether the
    chart's named themes were exhaustive, the honest answer was no — most of the catalog's real
    subject matter fell outside the original seven bands entirely. Asked to show that remainder
    as distinct topics rather than one undifferentiated lump, the biggest, most coherent clusters
    were broken out into their own seven named bands (<b>People</b> is the largest at 1,010 records
    — any heading naming a specific individual, e.g. "Bandera, Stepan, 1909–1959" — while the
    other six group closely related segments, e.g. Historiography &amp; historians combines
    "Historiography," "Historians," and "History and criticism"). What's left after that — real,
    but each too small or too idiosyncratic on its own to justify a 19th named band — is Other
    topics.
    <br><br>
    <b>How eighteen colors fit a palette that used to cap at eleven:</b> the first version of this
    expansion gave the seven new bands a muted texture instead of a color, since this project's
    dark categorical palette topped out at eleven hues its own colorblind-separation validator
    would pass. Asked to use color instead, seven new hues were picked from the original eleven's
    biggest open gaps on the color wheel, and a solver was run over all 18 colors' pairwise
    colorblind-vision distances to find the one stacking order where every ADJACENT pair (the only
    pairs that actually touch in a stacked chart) clears the validator's target threshold — not
    just its lower floor. Result: every adjacent pair is more visually distinct than this project's
    own bar for a passing palette requires. The one exception is <b>Other topics</b>, which stays
    textured on purpose (see below) rather than claiming a 19th hue.
    <br><br>
    <b>Why "Other topics" stays textured:</b> a plain gray solid was tried first for it and failed
    both the chroma-floor check (it isn't a real hue) and the CVD-separation check against its
    stack neighbor — and giving the residual catch-all a real color would visually claim it's a
    coherent 19th topic, which it isn't. It keeps the diagonal-hatch texture that's a perceptual
    channel independent of hue and color-vision type; exact identification comes from the legend,
    the hover tooltip, or the direct right-edge label, never the pattern alone.
    <br><br>
    Excluded throughout: cataloging <i>form</i> subdivisions that rank high in the raw heading
    counts but describe what <i>kind</i> of book it is, not what it's about (Biography, Congresses,
    Pictorial works, Dictionaries, Catalogs, Guidebooks, and similar), geographic place headings
    (tracked instead by the companion map and river), and bare date/century fragments.
    <br><br>
    <b>Why publication year, not event year:</b> the companion Russia/Poland river plots each
    mention by the year its OWN subject-heading date subdivision covers (e.g. a heading dated
    "1917–1921" counts toward those exact years) — but topical headings like "Nationalism" or
    "Antiquities" carry no date of their own to borrow, and even the episode-named themes
    (Famine, Revolution, WWII) overwhelmingly appear in books published <i>decades</i> after that
    episode, about it, not from it: this catalog has no book physically published during the
    1932–33 famine, for instance. So every band on this chart is dated the only way that's
    actually possible here — by when the book itself came out — which makes this a chart of
    <b>historiography</b> (when people wrote about a theme), not of the theme's own chronology.
    The flowing curve is a <b id="smoothWindowNum">—</b>-year centered moving average of the raw
    yearly counts, smoothed for legibility; hover the chart, or switch to the table, for the exact
    unsmoothed number behind any point.
  </div>

  <div class="toolbar">
    <button id="btnChartView" class="active" type="button">Chart</button>
    <button id="btnTableView" type="button">Table (by decade)</button>
    <span class="spacer"></span>
    <span class="hint">Hover the chart for year-by-year detail, incl. real record titles from the catalog.</span>
  </div>

  <div id="chartWrap">
    <svg id="chart"></svg>
    <div id="tooltip"></div>
  </div>

  <div class="legend" id="legend"></div>
  <div class="focus-hint" id="focusHint">
    <span class="swatch" id="focusHintSwatch"></span>
    <span id="focusHintText"></span>
    <button id="focusHintClear" type="button">Show all topics</button>
  </div>
  <div class="focus-hint person-hint" id="personHint">
    <span class="swatch person-hint-swatch"></span>
    <span id="personHintText"></span>
    <button id="personHintClear" type="button">Clear</button>
  </div>

  <div id="tableView">
    <div class="tbl-scroll">
      <table>
        <thead><tr id="tableHead"></tr></thead>
        <tbody id="tableBody"></tbody>
      </table>
    </div>
  </div>

  <div class="browse-panel">
    <div class="browse-head">
      <h2>Browse &amp; search</h2>
      <input type="text" id="browseSearch" class="browse-search"
             placeholder="Search names, titles, or authors (e.g. &quot;Bandera&quot;, &quot;famine&quot;)…"
             autocomplete="off" />
    </div>
    <div class="browse-note" id="browseNote"></div>
    <div class="browse-list" id="browseList"></div>
  </div>

  <div class="footer-note" id="footerNote"></div>
</div>

`;

export default function TopicsRiver() {
  const ref = useRef(null);

  useEffect(() => {
    let handle = null;
    let cancelled = false;
    const node = ref.current;

    if (node) {
      node.innerHTML = SKELETON_HTML;
    }

    fetch(`${process.env.PUBLIC_URL}/data/topics_river.json`)
      .then((res) => res.json())
      .then((DATA) => {
        if (cancelled || !node) return;
        handle = initTopicsRiver(node, DATA);
      })
      .catch((err) => {
        console.error('Failed to load topics_river.json', err);
      });

    return () => {
      cancelled = true;
      if (handle) handle.destroy();
      if (node) node.innerHTML = '';
    };
  }, []);

  return <div ref={ref} />;
}
