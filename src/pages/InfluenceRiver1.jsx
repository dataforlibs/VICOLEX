import React, { useEffect, useRef } from 'react';
import './InfluenceRiver.css';
import { initInfluenceRiver } from './influenceRiverLogic';

const SKELETON_HTML = `<div class="viz-root" data-palette="#199e70,#3987e5,#e66767">
  <h1>Russia &amp; Poland in Ukraine's History</h1>
  <div class="companion-row">
    <a id="aboutLink" href="#/" target="_blank" rel="noopener" title="About this project: data, motivation, and methodology">← About this project</a>
    <a id="companionLink" href="#/map" target="_blank" rel="noopener" title="Opens the companion map/network explorer -- keep both files in the same folder for this link to work">🗺️ Companion map &amp; network explorer →</a>
    <a id="companionLink2" href="#/topics" target="_blank" rel="noopener" title="Opens the companion subject-themes river -- keep both files in the same folder for this link to work">📊 Companion chart: Subject themes over time →</a>
  </div>
  <p class="subtitle">
    How often the Library of Congress DK508 (Ukraine — History) catalog's own subject headings
    associate Ukraine's history with Russia, Poland, and other neighboring or imperial powers,
    year by year from 650 BC to 2027 AD. Dashed lines mark well-documented political turning points —
    hover one, or anywhere on the chart, for detail.
  </p>
  <div class="methodology">
    <b>What this measures:</b> for each year, how many subject-heading date-subdivisions in the
    catalog — whose place is the actor's own name ("Russia," "Poland," "Soviet Union," never a
    shared/Ukrainian place like "Galicia" or "Crimea") — have a date range covering that year,
    summed across all 8,446 records. Concretely: a single heading dated, say, "1917-1991" is
    counted once for <i>every one of those 75 years</i>, not once for the book — so it adds the
    same total weight as 75 separate single-year headings would, just spread across the chart
    instead of piled on one year. That's deliberate: it's what lets one long-spanning survey book
    show up as sustained coverage across the whole period it discusses, and it's why the numbers
    on this chart are called <b>mention-years</b>, not mentions or books — the same book is
    "counted" many times if its subject heading spans many years. This is <b>documented
    association in the bibliography</b>, not adjudicated territorial control or political
    legitimacy. Ukraine's own subject heading
    (<b id="ukraineContextNum">—</b> mention-years across this span — several times Russia,
    Poland, and Other combined) is drawn as a thin reference <b>line</b>, not a stacked band, so
    it gives scale without burying the Russia/Poland story the filled areas exist to tell. No
    subject heading in this catalog names Russia, Poland, or these other powers before 1501,
    though Ukraine's own line runs continuously back to 650 BC (ancient Black Sea colonies). The
    x-axis is also non-linear, the same compression used by the companion map's year sliders:
    years before 1900 are squeezed to keep the chart focused on the 20th–21st century, where 87%
    of the Russia/Poland/Other data actually is — nothing is dropped, just given less width (see
    the dashed marker on the chart, or the table view for exact by-decade values either side of it).
  </div>

  <div class="toolbar">
    <button id="btnChartView" class="active" type="button">Chart</button>
    <button id="btnTableView" type="button">Table (by decade)</button>
    <button id="toggleMarks" type="button">☰ Show individual mentions (dots &amp; lines)</button>
    <span class="spacer"></span>
    <span class="hint">Hover the chart for year-by-year detail, incl. real record titles from the catalog.</span>
  </div>

  <div id="chartWrap">
    <svg id="chart"></svg>
    <div id="tooltip"></div>
  </div>

  <div class="legend" id="legend"></div>
  <div id="markCaption">
    Every book behind the areas/line above, layered on top in that same band's own color, one
    mark per about-mention. Why a dot and not a line, or vice versa, comes straight from how the
    catalog itself dated that mention: a <b style="color:var(--text-primary);">dot</b> means the
    subject heading names one specific year (e.g. "…—1991—"), a
    <b style="color:var(--text-primary);">line</b> means it names an explicit span (e.g.
    "…—1917-1921—" or "To 1648") — the mark just draws whatever precision the cataloger
    originally recorded, nothing is estimated or rounded here. Both are scattered at a fixed
    random height inside their band purely to keep marks from stacking directly on top of each
    other — vertical position within a band carries no meaning, and a wide, imprecise
    range is drawn fainter than a short, precise one so century-spanning surveys don't visually
    bury specific mentions. Within the <b style="color:var(--text-primary);">Russia</b> band
    only, marks split into three shades by language: warm orange is
    <b style="color:var(--text-primary);">Ukrainian</b>, plain red is
    <b style="color:var(--text-primary);">Russian</b> specifically, and a third, dimmer red is
    Polish/English/German/anything else — kept separate from plain red so "red" always means
    Russian, not "everyone who isn't Ukrainian." (Poland and Other stay a single color — the
    same shading looks muddy on blue or green, so it isn't used there.)
    <b style="color:var(--text-primary);">Ukraine's own gold marks are every one of its 12,861
    mentions</b> — it alone has ~8x as many as the other three bands combined, so expect a much
    denser cluster of gold than any other color here; that density is real, not a rendering
    artifact.
  </div>

  <div class="methodology" id="readingTheShape">
    <b>Reading the shape:</b> Ukraine's own line dwarfs the other three throughout — even at
    their closest, in 2012, Russia + Poland + Other combined (273 mention-years) still comes to
    just over half of Ukraine's own total that year (494). The year most people would guess —
    1991, independence, and the single highest point on both Russia's and Ukraine's own lines —
    isn't actually the closest: that year the combined bands (762) came to just 40% of Ukraine's
    total (1,899), a wider relative gap than 2012's despite far bigger absolute numbers on both
    sides. Before 1900 the gap is starker still: no
    subject heading names Russia, Poland, or these other powers before 1501, and combined they
    stay in the single digits through the entire 19th century, while Ukraine's own heading —
    thin as it is that far back — already runs continuously to 650 BC. That earliest stretch
    comes from a real, specific place: records about Olbia, an ancient Greek colony on the
    Black Sea coast that the Library of Congress catalogs under the subject heading "Olbia
    (Extinct city)" — literally tagged extinct, since it's an archaeological site today, not a
    living settlement — with a documented span of roughly 650 BC to 350 AD, sitting on the
    territory of modern Ukraine. It's why the line starts exactly where it does: not an estimate
    or a rounding artifact, but the founding-to-abandonment date range this catalog's own
    cataloging assigns to that one ancient city.
    <br><br>
    The Russia band's real growth starts right at the 1917 revolution: it averages about 18
    mention-years a year across 1901–1920, then jumps sharply in 1922 — from 23 the year before to
    255 — and stays roughly there — a long plateau, not a steady climb — for the rest of the
    Soviet era (average 257 across 1946–1985) and into the 1990s–2000s, peaking at 734 in 1991
    alone, its single highest point in the whole span. Poland, by contrast, stays in a narrower
    band through the 20th century — mostly mid-20s to mid-40s from the 1910s on, a single-digit
    reading only in the earliest, thinnest years around 1900 — present continuously, but never
    approaching Russia's scale. Other powers barely register at any point, rarely reaching double
    digits.
    <br><br>
    That timing isn't incidental. Poland's numbers step from 23–24 to 45 right at 1918 — the
    Ukrainian–Polish War — and hold in the 35–45 range through 1939, precisely the years Poland
    administered Galicia and Volhynia. Russia's own step lands at the 1917 revolution too (17 to
    32), then jumps again in 1922 and holds near 257 for the rest of the Soviet era — years
    Ukraine was administratively part of the Russian/Soviet state. The underlying subject
    headings are broader than "occupation" alone (diplomatic relations, military history,
    boundary disputes, biographies, and each power's own internal political history cataloged
    alongside a Ukraine-focused record all count), so this is closer to "how strongly the
    catalog's own vocabulary associates each period with these two neighbors" than a direct
    occupation-year tally — but the alignment with real political control in the 20th century is
    real, not noise. It's much weaker earlier: the pre-1900 numbers are thin enough (often single
    digits) that they don't show the same clean step at 1569 (Union of Lublin) or 1772
    (Partitions of Poland) that the 20th century shows at 1917–1918.
    <br><br>
    Ukraine's own line spikes the same year Russia's does: both series hit their all-time peak
    in 1991, the year of independence — then Ukraine's line stays elevated through the mid-2000s
    (averaging 1,449 mention-years/year across 1991–2005) before falling off substantially. Every
    series drops after 2014, which is worth reading carefully: a subject heading can only cover a
    year once some cataloged record's date range reaches that far, and even with this chart's data
    now running all the way to 2027 — thirteen years past 2014 — none of the four series has
    climbed back to its pre-2014 level; Ukraine's own line, for instance, keeps drifting down from
    720 in 2014 to the 140s by the mid-2020s rather than recovering. That's still most plausibly a
    data-coverage effect rather than declining interest: detailed, date-subdivided historical
    subject headings (as opposed to a plain "Ukraine" heading with no date at all) take years to
    decades to accumulate for any period, the same lag this project's companion Historiography
    &amp; historians theme documents for WWII and the Famine — recent years just haven't had that
    much time yet, no matter how far this chart's own end date gets pushed out.
    <br><br>
    Zero-value stretches on this chart are doing real analytical work, but they're not all the
    same kind of "gap." The Russia, Poland, and Other bands share one enormous structural gap —
    every single year before 1501 (2,201 consecutive years) — which is a hard fact about this
    catalog's holdings: no subject heading here names any of those powers that early, full stop.
    A subtler kind shows up inside the Other band specifically, which goes quiet twice in the
    18th–19th century — 1796 to 1799 (4 years) and 1801 to 1866 (66 years), broken only by a
    single active year, 1800 — and that one is genuinely ambiguous: it could mean this catalog
    holds nothing that documents another power's association with Ukraine across those decades,
    or it could mean cataloging practice for that era simply didn't apply this kind of dated
    subject heading as often, independent of what actually happened historically. Telling those
    two apart isn't something the chart can do on its own — it's exactly the kind of question a
    zero stretch like this is meant to prompt a closer look at, rather than settle by itself. The
    post-2014 drop-off above is the third kind, an edge effect of how recently that history
    happened rather than a gap in the history it describes.
  </div>

  <div id="tableView">
    <div class="tbl-scroll">
      <table>
        <thead><tr><th>Decade</th><th>Russia</th><th>Poland</th><th>Other powers</th><th>Ukraine (itself)</th></tr></thead>
        <tbody id="tableBody"></tbody>
      </table>
    </div>
  </div>

  <div class="footer-note" id="footerNote"></div>
</div>

`;

export default function InfluenceRiver() {
  const ref = useRef(null);

  useEffect(() => {
    let handle = null;
    let cancelled = false;
    const node = ref.current;

    if (node) {
      node.innerHTML = SKELETON_HTML;
    }

    fetch(`${process.env.PUBLIC_URL}/data/influence_river.json`)
      .then((res) => res.json())
      .then((DATA) => {
        if (cancelled || !node) return;
        handle = initInfluenceRiver(node, DATA);
      })
      .catch((err) => {
        console.error('Failed to load influence_river.json', err);
      });

    return () => {
      cancelled = true;
      if (handle) handle.destroy();
      if (node) node.innerHTML = '';
    };
  }, []);

  return <div ref={ref} />;
}
