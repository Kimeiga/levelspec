import { writeFile } from 'node:fs/promises';
import { launchBrowser } from '../../../tests/browser/support/browser.mjs';

// Critical relationships only: these sections reserve dimensions, not compiled acceptance.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1460" height="1000" viewBox="0 0 1460 1000">
<rect width="1460" height="1000" fill="#f8f3e6"/>
<g font-family="sans-serif" fill="#203e44">
<text x="50" y="49" font-size="28" font-weight="700">GALINI REBOOT · S01 critical relationships</text>
<text x="50" y="80" font-size="16">Concept sections / invented dimensions / no production AML or physical acceptance</text>
<rect x="40" y="112" width="1380" height="350" rx="12" fill="#e9efe8"/>
<text x="65" y="149" font-size="22" font-weight="700">A · Eastern descent: an occupied two-stage route</text>
<text x="65" y="176" font-size="15">Unfolded along S6a + the 3 m turning landing + S6b. Dashed headroom is a reservation, not a tested collision envelope.</text>
<path d="M90,260 L150,260 L390,340 L450,340 L710,420 L830,420 L830,438 L90,438 Z" fill="#b8b59b"/>
<path d="M90,260 L150,260 L390,340 L450,340 L710,420 L830,420" fill="none" stroke="#315961" stroke-width="5"/>
<path d="M90,224 L150,224 L390,304 L450,304 L710,384 L830,384" fill="none" stroke="#a26e83" stroke-width="2" stroke-dasharray="8 5"/>
<path d="M150,260 v8 h24 v8 h24 v8 h24 v8 h24 v8 h24 v8 h24 v8 h24 v8 h24 v8 h24 v8 h24 M450,340 v8 h26 v8 h26 v8 h26 v8 h26 v8 h26 v8 h26 v8 h26 v8 h26 v8 h26 v8 h26" fill="none" stroke="#627b7b" stroke-width="1.2"/>
<text x="93" y="247" font-size="14">+8 m</text><text x="392" y="365" font-size="14">+4 m</text><text x="746" y="405" font-size="14">0 m</text>
<text x="210" y="283" font-size="14">S6a · 12 m run</text><text x="495" y="366" font-size="14">S6b · 13 m run</text>
<text x="390" y="280" font-size="13">Turn / 3 m landing</text><path d="M432,286 L420,331" stroke="#52696b"/>
<text x="930" y="226" font-size="17" font-weight="700">Movement contract to develop</text>
<text x="930" y="256" font-size="15">Top: chapel / headland street +8 m</text>
<text x="930" y="285" font-size="15">Middle: inhabited sea-edge landing +4 m</text>
<text x="930" y="314" font-size="15">Bottom: harbor passage / boat district 0 m</text>
<text x="930" y="350" font-size="15">4 m stair width; open sky above flights.</text>
<text x="930" y="379" font-size="15">Adjacent houses must not occupy the stair.</text>
<text x="930" y="408" font-size="15">Parapets and landing exits need detailed review.</text>
<rect x="40" y="482" width="1380" height="390" rx="12" fill="#eee7d7"/>
<text x="65" y="519" font-size="22" font-weight="700">B · Middle crossing arrives inside a taverna gateway</text>
<text x="65" y="546" font-size="15">Section along the bridge / passage direction. Ravine depth and building height are new assumptions, not surveyed facts.</text>
<path d="M90,664 L156,664 L205,829 L645,829 L690,664 L900,664 L900,852 L90,852 Z" fill="#b8b59b"/>
<path d="M130,664 L710,664" stroke="#315961" stroke-width="7"/>
<rect x="710" y="619" width="168" height="45" fill="#fcf7df"/>
<path d="M710,619 L710,586 L878,586 L878,619" fill="#596c70"/>
<path d="M710,664 L900,664" stroke="#315961" stroke-width="7"/>
<path d="M710,619 L878,619" stroke="#315961" stroke-width="3"/>
<path d="M152,662 v-12 M698,662 v-12 M155,650 H695" stroke="#7a8b82" stroke-width="2" fill="none"/>
<text x="360" y="642" font-size="15">Bridge deck +4 m · 31 m crossing</text>
<text x="300" y="783" font-size="16">Dry ravine / scenic, inaccessible</text>
<text x="345" y="809" font-size="13">Illustrative bed at -6 m</text>
<text x="720" y="646" font-size="13">Roofed public passage</text>
<path d="M890,620 V661 M885,620 H895 M885,661 H895" stroke="#a26e83" stroke-width="2"/>
<text x="930" y="588" font-size="17" font-weight="700">Distinct layers / explicit access</text>
<text x="930" y="620" font-size="15">I04: reserve 3.0 m clear above +4 m floor.</text>
<text x="930" y="649" font-size="15">The gateway has a door at each end.</text>
<text x="930" y="678" font-size="15">Building roof is scenic, not walkable.</text>
<text x="930" y="715" font-size="15">Upper bridge is +8 m, farther north.</text>
<text x="930" y="744" font-size="15">It reaches I05 through separate district stairs.</text>
<text x="930" y="773" font-size="15">It does not connect by a jump or an XY cross.</text>
<text x="930" y="810" font-size="15">Masonry support and parapets remain to design.</text>
<text x="55" y="912" font-size="17" font-weight="700">Required after independent selection</text>
<text x="55" y="940" font-size="15">Detailed sections must resolve actual floor limits, stair risers/treads, landing turns, retaining faces, parapets, openings and roofs.</text>
<text x="55" y="966" font-size="15">This sheet establishes intended relationships only. No full-map visibility, body clearance, reachability or gameplay balance is claimed.</text>
</g></svg>`;
await writeFile('projects/galini-reboot/planning/sections.svg', svg);
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1460, height: 1000 } });
  await page.setContent(svg);
  await page.screenshot({ path: 'projects/galini-reboot/planning/sections.png' });
} finally { await browser.close(); }
