import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import './TemporalMap.css';
import { initTemporalMap } from './temporalMapLogic';

// The DATA JSON here is ~3.5MB, so it's NOT bundled into the JS build --
// it's fetched at runtime from public/data/temporal_map.json (see
// PUBLIC_URL below, needed so the fetch resolves correctly if this app is
// deployed under a GitHub Pages subpath like username.github.io/repo-name/).
const SKELETON_HTML = `<div id="map"></div>
<div id="networkContainer">
  <svg id="networkSvg"></svg>
  <div id="networkHoverBox">Hover a node for details, drag to reposition, click to pin it in the right panel.</div>
  <div id="networkControls">
    <button id="networkResetZoom" type="button">🔍 Reset zoom</button>
    <button id="networkReheat" type="button">🔄 Re-layout</button>
  </div>
</div>

<div id="leftPanel">
  <h1>DK508 — Ukraine History, over time</h1>
  <div class="companion-row">
    <a id="aboutLink" href="#/" target="_blank" rel="noopener" title="About this project: data, motivation, and methodology">← About this project</a>
    <a id="companionLink" href="#/influence" target="_blank" rel="noopener" title="Opens the companion chart -- keep both files in the same folder for this link to work">📈 Companion chart: Russia &amp; Poland in Ukraine's history →</a>
    <a id="companionLink2" href="#/topics" target="_blank" rel="noopener" title="Opens the companion subject-themes river -- keep both files in the same folder for this link to work">📊 Companion chart: Subject themes over time →</a>
  </div>
  <div class="sub">Two independent timelines, each with a selectable RANGE. The radial icicle on the right adapts live to whatever's currently visible on the map.</div>

  <div class="timeline" style="border-top: none; padding-top: 0; margin-top: 0;">
    <div class="timeline-title">🔎 Keyword search</div>
    <div class="sub" style="margin: 1px 0 0 0;">Searches titles, subject headings, and place names, restricted to the current timeline &amp; language filter below — a record only matches if it's <b style="color:#e8e8e8;">also</b> about somewhere within the active date range. The map itself switches to showing <b style="color:#e8e8e8;">just the matched location(s)</b>. If you change the timeline, hit Search again to refresh.</div>
    <div id="kwSearchRow">
      <input type="text" id="kwSearchInput" placeholder="e.g. famine, Cossack, Odesa…">
      <button id="kwSearchBtn" type="button">Search</button>
      <button id="kwClearBtn" type="button" title="Clear the search box and results, and restore the full map">✕ Clear</button>
    </div>
    <div id="kwSearchMsg"></div>
    <div id="kwActiveBanner">
      <span id="kwActiveBannerText"></span>
      <span id="kwActiveBannerBtns">
        <button id="kwActiveBannerView" type="button">View list</button>
        <button id="kwActiveBannerClear" type="button">✕ Clear</button>
      </span>
    </div>
  </div>

  <div class="style-row">
    <span class="style-label">View:</span>
    <label class="style-opt"><input type="radio" name="mainView" value="map" checked> Map</label>
    <label class="style-opt"><input type="radio" name="mainView" value="network"> Network</label>
  </div>
  <div class="sub" id="networkViewNote" style="display:none; margin-top: 2px;">
    A node-link graph of subject places that co-occur in the same record (the same relationship the "subject place ↔ subject place" links describe). Node size = records here; fill color = detected community; ring thickness/brightness = coreness (how deeply embedded in a mutually-reinforcing cluster -- thick/bright = core, thin/dark = periphery). Drag nodes, scroll/pinch to zoom, click a node to pin it in the right panel and see its own ego-network stats.
  </div>
  <label class="toggle" style="margin-top: 4px;"><input type="checkbox" id="toggleCommunityColor"> Color map markers by detected community</label>
  <div class="sub" style="margin: 2px 0 0 0;">Same clustering as the network graph (bubbles map style only). Also lets you isolate a single community below, on either view.</div>
  <div id="networkHud" style="display:none;">
    <div id="networkStats">Building network…</div>
    <div id="modularityLine"></div>
    <details id="modularityInfo">
      <summary>What are modularity &amp; communities?</summary>
      <div class="sub">
        A "community" here is a cluster of places that co-occur with each other (as subjects of the
        same records) noticeably more than they co-occur with the rest of the network — found by
        greedy modularity optimization (the core step of the Louvain method), not assigned by hand.
        "Modularity" (Q) scores the whole partition from -0.5 to 1: how much more internal linkage
        the found clusters have than you'd expect from a random network with the same node degrees.
        Above ~0.3 usually means real structure, not noise -- though one dominant hub community (like
        a "Ukraine" cluster in a Ukraine-history collection) mathematically drags the score down even
        when the partition is meaningful, since a hub's own contribution can go slightly negative.
        Click a community below to isolate it.
      </div>
    </details>
    <div id="corePeripheryLine"></div>
    <details id="corePeripheryInfo">
      <summary>What's core vs. periphery?</summary>
      <div class="sub">
        This is an ego/degeneracy view of the same graph, independent of the community split above.
        Each place's "coreness" (k-core number) is the deepest peeling round it survives: strip away
        whatever currently has only 1 connection, then whatever now has only 2, and so on -- coreness
        is the round a place finally falls out at. High coreness = sits inside a densely,
        mutually-reinforcing cluster (the network's structural "core"); coreness 0-1 = hangs off by a
        single link with nothing backing it up ("periphery"). Pin any place (click it on the map or
        in the network) to see its own ego-network stats in the right panel: how many places it
        connects to, its coreness, which community it's in, and how interconnected ITS neighbors are
        with each other.
      </div>
    </details>
    <details id="betweennessInfo">
      <summary>What's a "structural bridge"?</summary>
      <div class="sub">
        Also independent of the community split. A place's betweenness score asks: across every pair
        of OTHER places, how often does the shortest path between them run through here? A place with
        modest degree can still score high if its few connections happen to stitch together parts of
        the network that would otherwise only route through the dominant hub -- removing it would
        fragment the graph more than its connection count suggests. The single biggest hub (if there
        is one) usually tops the list trivially, since almost every path runs through it; the more
        telling entries are further down, where degree is low but the bridge score isn't.
      </div>
    </details>
    <div id="communityListHeader">
      <b>Communities</b>
      <button id="communityShowAll" type="button">Show all</button>
    </div>
    <div id="communityList"></div>
    <div id="communityDetail"></div>
    <div id="bridgeListHeader">
      <b>Structural bridges</b>
    </div>
    <div id="bridgeList"></div>
  </div>

  <div class="style-row">
    <span class="style-label">Map style:</span>
    <label class="style-opt"><input type="radio" name="mapStyle" value="bubbles" checked> Bubbles</label>
    <label class="style-opt"><input type="radio" name="mapStyle" value="hex"> Hexagons</label>
    <label class="style-opt"><input type="radio" name="mapStyle" value="heat"> Heatmap</label>
  </div>
  <div class="sub" id="styleNote" style="margin-top: 2px;">Bubbles are individually clickable (pin the subjects panel). Hexagons aggregate nearby places and are also clickable; heatmaps are density-only.</div>

  <details class="unknown-box" id="langFilterBox" style="border-top: 1px solid #2c333b; border-bottom: 1px solid #2c333b; padding: 8px 0; margin: 4px 0 8px 0;">
    <summary id="langFilterSummary">Filter by language: showing all</summary>
    <div class="lang-controls">
      <button class="zoomBtn" id="langSelectAll" type="button">Select all</button>
      <button class="zoomBtn" id="langClearAll" type="button">Clear all</button>
    </div>
    <div class="lang-list" id="langList"></div>
  </details>

  <div class="timeline">
    <div class="timeline-title"><span class="dot" style="background:#4fa3ff"></span>Temporal aboutness — what places are written ABOUT</div>
    <div class="sub" style="margin: 1px 0 4px 0;">Scale is compressed before the dashed line (1700 AD) — this collection has few records that far back, so recent centuries get more room to work with.</div>
    <canvas class="hist" id="aboutHist"></canvas>
    <div class="row">
      <button class="playBtn" id="aboutPlay">▶</button>
      <div class="range-wrap about" id="aboutWrap">
        <div class="range-track"></div>
        <div class="range-break-mark" id="aboutBreakMark" style="display:none;"></div>
        <div class="range-highlight" id="aboutHighlight" style="background:#4fa3ff"></div>
        <input type="range" id="aboutMin">
        <input type="range" id="aboutMax">
      </div>
    </div>
    <div class="row" style="justify-content: space-between;">
      <span class="rangeLabel" id="aboutLabel">---- to ----</span>
    </div>
    <div class="toggle-row">
      <label class="toggle"><input type="checkbox" id="toggleModern" checked> Show this layer</label>
      <button class="zoomBtn" id="zoomAbout" title="Fit the map view to the currently visible aboutness markers">🔍 Zoom map to this</button>
    </div>
    <details class="unknown-box">
      <summary id="aboutUnknownSummary">0 mentions from unmapped locations in this range</summary>
      <div class="unknown-list" id="aboutUnknownList"></div>
    </details>
    <details class="unknown-box">
      <summary id="noAboutSummary">0 record(s) in the whole collection have no temporal-aboutness data at all</summary>
      <div class="unknown-list">
        These records' subject headings never name a place with a date (often because they're about a
        PERSON or ORGANIZATION — a biography or bibliography — rather than a place), so there's nothing
        to plot on this layer at ANY date range. They're not missing from the collection, just from this
        particular view.
        <button class="zoomBtn" id="noAboutBtn" type="button" style="margin-top:6px;">📖 Browse these records</button>
      </div>
    </details>
  </div>

  <div class="timeline">
    <div class="timeline-title"><span class="dot" style="background:#8bd17c"></span>Year of publication — where books were PUBLISHED</div>
    <div class="sub" style="margin: 1px 0 4px 0;">Scale is compressed before the dashed line (1980) — nearly 95% of dated records were published after that, so recent decades get more room to work with.</div>
    <canvas class="hist" id="pubHist"></canvas>
    <div class="row">
      <button class="playBtn" id="pubPlay">▶</button>
      <div class="range-wrap pub" id="pubWrap">
        <div class="range-track"></div>
        <div class="range-break-mark" id="pubBreakMark" style="display:none;"></div>
        <div class="range-highlight" id="pubHighlight" style="background:#8bd17c"></div>
        <input type="range" id="pubMin">
        <input type="range" id="pubMax">
      </div>
    </div>
    <div class="row" style="justify-content: space-between;">
      <span class="rangeLabel" id="pubLabel">---- to ----</span>
    </div>
    <div class="toggle-row">
      <label class="toggle"><input type="checkbox" id="togglePubs" checked> Show this layer</label>
      <button class="zoomBtn" id="zoomPub" title="Fit the map view to the currently visible publication markers">🔍 Zoom map to this</button>
    </div>
    <details class="unknown-box">
      <summary id="pubUnknownSummary">0 records from unmapped locations in this range</summary>
      <div class="unknown-list" id="pubUnknownList"></div>
    </details>
  </div>

  <div class="timeline">
    <label class="toggle"><input type="checkbox" id="toggleIntersect">Only show records that satisfy BOTH timelines above</label>
    <div class="sub" style="margin: 4px 0 0 0;">Off by default: the two timelines are independent (a record can be ABOUT the 1930s and PUBLISHED in 2015). Turn this on to require both — e.g. only records ABOUT your selected years that were ALSO published in your selected years.</div>
  </div>

  <div class="timeline">
    <label class="toggle"><input type="checkbox" id="toggleAncient" checked><span class="dot" style="background:#e8a33d"></span> Ancient/medieval subjects (BC/early dates — driven by the aboutness timeline above; negative years on that timeline are BC)</label>
  </div>

  <div class="timeline">
    <label class="toggle"><input type="checkbox" id="toggleLinks"><span class="dot" style="background:#f0b429"></span> Show links: publication place ↔ subject place</label>
    <div class="sub" style="margin: 4px 0 0 0;">For each currently-shown record, draws an arc from where it was PUBLISHED to what place it is ABOUT. Thicker/brighter arcs = more records share that pair. Hover an arc for details.</div>
    <div id="linksStats" class="unknown-box"></div>
  </div>

  <div class="timeline">
    <label class="toggle"><input type="checkbox" id="toggleGeoLinks"><span class="dot" style="background:#38bdf8"></span> Show links: subject place ↔ subject place</label>
    <div class="sub" style="margin: 4px 0 0 0;">For each currently-shown record that's ABOUT two or more places at once, draws an arc between every pair of those places. Thicker/brighter arcs = more records mention that pair together. Hover an arc for details.</div>
    <div id="geoLinksStats" class="unknown-box"></div>
  </div>

  <div id="stats"></div>
</div>

<div id="rightPanel">
  <div class="rp-header">
    <h1>Subjects — current view</h1>
    <button id="collapseBtn" title="Collapse this panel">▶</button>
  </div>
  <div class="rp-body">
    <div class="sub">A radial icicle (zoomable sunburst) of LC subject headings for whichever records are behind the markers you're currently looking at — active layers, selected time ranges, AND the map's current pan/zoom. Move anything and this updates. Click any circle on the map to pin this panel to just that location.</div>
    <div id="pinBanner">
      <span id="pinLabel"></span>
      <button id="pinBackBtn">✕ Back to current view</button>
    </div>
    <div id="sunburstStats"></div>
    <div id="topicStreamSection">
      <div class="timeline-title">Subject themes over time</div>
      <div class="sub" style="margin:0 0 4px 0;">Non-geographic LC subject topics (same bands as the companion Subject Themes River) among these records, by publication year. Click a topic below to isolate it; hover for its date range.</div>
      <svg id="topicStreamSvg"></svg>
      <div id="topicStreamLegend"></div>
      <div id="topicStreamFocusHint">
        <span id="topicStreamFocusText"></span>
        <button id="topicStreamFocusClear" type="button">✕ Show all</button>
      </div>
      <div id="topicStreamHoverBox"><span class="ts-hint">Hover a topic for its date range, or click to isolate it in the chart…</span></div>
      <div id="topicStreamLabel"></div>
    </div>
    <div id="pinEgoSection">
      <div class="timeline-title">Position in the network</div>
      <div id="pinEgoBody"></div>
    </div>
    <div id="pinPubSection">
      <div class="timeline-title">Publication years for these records</div>
      <canvas id="pinPubHist" class="hist"></canvas>
      <div id="pinPubHistLabel"></div>
    </div>
    <div id="pinPubMapSection">
      <div class="timeline-title">Where these were published</div>
      <div id="pinPubMap"></div>
      <div id="pinPubMapLabel"></div>
    </div>
    <div id="pinBooksSection">
      <div class="timeline-title" id="pinBooksTitle">Books at this location</div>
      <div id="pinBooksSort" class="sub" style="margin:2px 0 4px 0;">
        Sort: <label><input type="radio" name="pinBooksSort" value="yearNew" checked> newest first</label>
        <label><input type="radio" name="pinBooksSort" value="yearOld"> oldest first</label>
        <label><input type="radio" name="pinBooksSort" value="alpha"> title</label>
      </div>
      <div id="pinBooksList" class="kw-title-list"></div>
    </div>
    <div id="sunburstChart"><svg id="sunburstSvg"></svg></div>
    <div id="searchRow">
      <input type="text" id="sunSearchInput" placeholder="Find a term…">
      <button id="sunSearchBtn">Find</button>
    </div>
    <div id="sunSearchMsg"></div>
    <button id="sunResetBtn">↺ Reset zoom</button>
    <div id="sunBreadcrumb"></div>
    <div id="sunHoverBox"><span style="color:#6b7178;">Hover a wedge for details…</span></div>
  </div>
</div>

<div id="kwResultsOverlay">
  <div id="kwResultsModal">
    <div class="rp-header">
      <h1 id="kwResultsTitle">Search results</h1>
      <button id="kwResultsClose" type="button" title="Close">✕</button>
    </div>
    <div id="kwResultsSummary"></div>
    <div id="kwSortRow">
      <span class="style-label">Locations:</span>
      <label class="style-opt"><input type="radio" name="kwSortLoc" value="count" checked> Most results first</label>
      <label class="style-opt"><input type="radio" name="kwSortLoc" value="alpha"> A–Z</label>
      <span class="style-label" style="margin-left: 8px;">Titles:</span>
      <label class="style-opt"><input type="radio" name="kwSortTitle" value="alpha" checked> A–Z</label>
      <label class="style-opt"><input type="radio" name="kwSortTitle" value="yearNew"> Year, newest</label>
      <label class="style-opt"><input type="radio" name="kwSortTitle" value="yearOld"> Year, oldest</label>
    </div>
    <div id="kwResultsList"></div>
  </div>
</div>

`;

export default function TemporalMap() {
  const ref = useRef(null);

  useEffect(() => {
    let handle = null;
    let cancelled = false;
    const node = ref.current;

    if (node) {
      node.innerHTML = SKELETON_HTML;
    }

    fetch(`${process.env.PUBLIC_URL}/data/temporal_map.json`)
      .then((res) => res.json())
      .then((DATA) => {
        if (cancelled || !node) return;
        handle = initTemporalMap(node, DATA);
      })
      .catch((err) => {
        console.error('Failed to load temporal_map.json', err);
      });

    return () => {
      cancelled = true;
      if (handle) handle.destroy();
      if (node) node.innerHTML = '';
    };
  }, []);

  return <div ref={ref} />;
}
