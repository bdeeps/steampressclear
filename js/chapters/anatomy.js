// Chapter 1: take a steam iron apart, and meet the laundry's boiler press. Generic models (no maker's
// design). The household iron is a 2,000 W steam iron at 1 unit ≈ 4 cm; the press is drawn at
// 1 unit ≈ 10 cm and shrunk to fit beside it. Parts and jobs follow IS 302 (Part 2/Sec 3):2024, which
// is identical to IEC 60335-2-3:2022 (BIS listing): it covers dry and steam irons, including those
// with a separate water reservoir or boiler of up to 5 litres (search summary of the IEC scope).
// Auto shut-off timings are typical of makers' manuals we found: about 30 s lying flat or on its side,
// about 8 min standing on its heel (search summaries of several manuals).
import { THREE } from '../kit.js';
import { makeIron, makeBoilerPress, fitNarrow, amps, COL, IRON, tsat, ATM, BAR, PRESS, link, tallView } from '../press.js';

const VIEW = { pos: [6.4, 4.9, 8.4], target: [-0.4, 1.8, 0] };
const PARTS = {
  sole: ['Soleplate', 'The hot, smooth metal face, usually aluminium or stainless steel, sometimes with a non-stick or ceramic coating. It is about a centimetre thick, so it stores heat, and steam leaves through the small holes in it.'],
  element: ['Heating element', 'A coil of resistance wire packed in powder inside a metal tube, bent into a U and cast right into the soleplate. 2,000 W of electric current turns into heat there.'],
  thermo: ['Thermostat', 'A bimetal strip under the dial. As the plate heats, the strip curls and pushes two contacts apart, cutting the current; as it cools they touch again. Turning the dial moves the contacts, so it sets the temperature. It must never be bent, adjusted or bypassed.'],
  chamber: ['Steam chamber', 'A pocket on top of the hot soleplate. Water drips in, hits metal at well over 100 °C, flashes into steam and is pushed out through the holes.'],
  tank: ['Water tank and drip valve', 'A see-through tank with a needle valve. The steam knob lifts the needle, so drops fall into the steam chamber. More drops, more steam.'],
  dial: ['Temperature dial', 'Marked with fabrics or dots: one dot for nylon and silk, two for wool and polyester, three for cotton and linen.'],
  handle: ['Handle and buttons', 'The orange button squirts an extra burst of water into the chamber for a shot of steam. The blue one pumps water out of the spray nozzle at the front.'],
  board: ['Auto shut-off', 'A small circuit board with a tilt sensor and a timer. If the iron lies still on its soleplate or side for about 30 seconds, or stands on its heel for about 8 minutes, it cuts the power.'],
  scale: ['Anti-scale cartridge', 'Many irons have a resin cartridge or a self-clean valve to fight limescale, the chalk that hard water leaves behind when it boils away.'],
  cord: ['Cord and earth', 'Three wires: live, neutral and earth. The earth wire bonds the metal soleplate to the earth pin, so a fault trips the circuit instead of making the iron live.'],
  boiler: ['Boiler', 'A small steel tank that boils water at a few bar, so the water inside is at about 150 °C. A pressure switch turns the heater off at the set pressure.'],
  valve: ['Safety valve', 'A spring-loaded valve that lifts and lets steam out if the pressure ever climbs past the maker\'s limit, for example if the pressure switch fails. It must never be weighted, plugged, adjusted or removed.'],
  gauge: ['Pressure gauge and sight glass', 'The gauge shows the pressure above the air outside. The glass tube shows the water level, so the boiler is never run dry.'],
  piron: ['Boiler iron', 'A heavy all-metal iron with its own small heater. Pressing the trigger opens a valve and steam from the hose blasts through the soleplate.'],
  table: ['Vacuum table', 'A fan under the perforated top sucks air down through the cloth. It pulls the steam right through and then cools and dries the cloth in seconds.'],
};

const REEL = [
    { ms: 5600, caption: 'A steam iron is a thick hot plate, a heating element cast inside it, a thermostat and a tank of water.', set: { kind: 'iron', xray: false, part: '' }, anim: { explode: [0, 1] }, view: { pos: [6.6, 6.4, 8.6], target: [-0.2, 3.2, 0] }, tall: { pos: [4.0, 5.4, 6.2], target: [-0.4, 3.0, 0] }, spin: 0.5 },
    { ms: 4800, caption: 'The laundry\'s press adds a boiler at a few bar and a table that sucks the steam through the cloth.', set: { kind: 'press', explode: 0, xray: true, part: '' }, view: { pos: [6.4, 6.2, 9.8], target: [-0.6, 3.6, 0] }, tall: { pos: [3.6, 5.4, 4.7], target: [0.3, 3.6, 0] }, spin: 0.4 },
];

export default {
  id: 'anatomy',
  short: 'Inside a steam iron',
  title: 'Inside a steam iron, and a laundry\'s press',
  subtitle: 'A hot metal plate, a thermostat, a few drops of water, and a lot of heat.',
  view: VIEW,
  learn: `<p>In India, "press" means ironing. At home it is a <b>steam iron</b>; at the laundry it is a <b>boiler press</b>; and at the istri-wala's cart it is a heavy box of <b>glowing charcoal</b>. All three do the same job: they make cloth <b>hot</b>, often <b>damp</b>, and press it <b>flat</b>.</p>
    <p>The steam iron's heart is its <b>soleplate</b>, a thick plate of aluminium or steel. Cast inside it is a U-shaped <b>heating element</b>. At 2,000 W it draws about <b>8.7 amps</b> from a 230 V socket. Under the dial sits a <b>thermostat</b>: a bimetal strip that bends as it warms and switches the element off and on to hold the temperature you chose.</p>
    <p>On top of the soleplate is a <b>steam chamber</b>. A <b>drip valve</b> lets drops fall from the <b>water tank</b>; they hit metal at 150 to 200 °C and flash into steam, which leaves through the <b>holes</b>. An <b>auto shut-off</b> in the heel cuts the power if the iron is left still.</p>
    <p>The laundry's press does the same with more muscle: a separate <b>boiler</b> makes steam at a few <b>bar</b>, a hose carries it to a heavy iron, and a <b>vacuum table</b> pulls it through the cloth. Its <b>safety valve</b> and the iron's <b>thermostat</b> are safety parts: they must never be tampered with.</p>
    <p class="tip"><b>Try it:</b> take the iron apart and tap a part to read what it does. Then switch to the boiler press.</p>`,
  terms: [
    { t: 'Soleplate', d: 'The flat metal bottom of an iron that touches the cloth.' },
    { t: 'Heating element', d: 'A resistance wire in a metal sheath that turns electric current into heat.' },
    { t: 'Thermostat', d: 'A switch that turns the heater off when hot enough and on again when it cools.' },
    { t: 'Drip valve', d: 'A needle valve that lets water fall drop by drop into the steam chamber.' },
    { t: 'Boiler press', d: 'A laundry iron fed by a separate boiler that makes steam under pressure.' },
    { t: 'Safety valve', d: 'A valve that opens by itself to let steam out if a boiler\'s pressure gets too high.' },
  ],
  defaults: { explode: 0, kind: 'iron', xray: false, part: '' },
  controls: [
    { key: 'kind', type: 'seg', label: 'Which machine', options: [{ v: 'iron', label: 'Steam iron' }, { v: 'press', label: 'Boiler press' }] },
    { key: 'explode', type: 'range', label: 'Take the iron apart', min: 0, max: 1, step: 0.01, ends: ['together', 'exploded'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'xray', type: 'toggle', label: 'See through the shell', hint: 'On the press, this shows the water and heater inside the boiler.' },
    { key: 'pick', type: 'buttons', label: 'Show me', items: ['sole', 'element', 'thermo', 'chamber', 'tank', 'board', 'cord', 'boiler', 'valve', 'table'].map((k) => ({ label: PARTS[k][0].replace(/ and .*/, ''), act: (s) => { s.part = k; s.kind = ['boiler', 'valve', 'table', 'gauge', 'piron'].includes(k) ? 'press' : 'iron'; } })) },
  ],
  quiz: [
    { q: 'What turns the heater off when the soleplate is hot enough?', options: ['The drip valve', 'A bimetal thermostat that bends as it warms', 'The auto shut-off timer', 'The earth wire'], answer: 1, why: 'The strip curls as it heats and pushes the contacts apart; as it cools they close again. The auto shut-off is a separate timer for an iron left still.' },
    { q: 'Where does the steam in a household steam iron come from?', options: ['A small boiler in the handle', 'Drops of water falling onto the hot soleplate in the steam chamber', 'The water tank boils', 'Steam from the mains'], answer: 1, why: 'The drip valve lets water fall onto metal far above 100 °C, where it flashes to steam at once.' },
    { q: 'About how much current does a 2,000 W iron draw from a 230 V socket?', options: ['0.9 A', '8.7 A', '20 A', '87 A'], answer: 1, why: 'I = P ÷ V = 2,000 ÷ 230 ≈ 8.7 A. That is why an iron belongs on a proper socket, not a thin extension cord.' },
  ],
  reel: REEL,


  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const ironRoot = new THREE.Group(); root.add(ironRoot);
    const ir = makeIron(ironRoot);
    const pressRoot = new THREE.Group(); pressRoot.scale.setScalar(0.42); pressRoot.position.set(0, 0, 0); root.add(pressRoot);
    const pr = makeBoilerPress(pressRoot);
    const L = (txt, obj, pos, cls = '') => stage.label(txt, pos, obj, cls);
    const P = ir.parts;
    const lab = {
      sole: L('Soleplate and steam holes', P.sole, [2.6, -0.05, 1.5]),
      element: L('Heating element', P.element, [-1.0, 0.2, 1.3], 'hot'),
      chamber: L('Steam chamber', P.chamber, [1.4, 0.35, -1.2]),
      thermo: L('Thermostat (bimetal)', P.thermo, [-0.3, 0.5, -0.9], 'hot'),
      tank: L('Water tank', P.tank, [2.1, 1.15, 1.2]),
      dial: L('Dial: ● ●● ●●●', P.dial, [-0.4, 0.4, -0.7]),
      knob: L('Steam knob and drip valve', P.knob, [0.3, 0.35, 0.6]),
      handle: L('Steam-shot and spray buttons', P.handle, [0.9, 3.4, 0]),
      board: L('Auto shut-off', P.board, [-0.2, 0.55, 0.7]),
      scale: L('Anti-scale cartridge', P.tank, [1.9, 0.4, 0.75]),
      cord: L('Three-core cord', P.cord, [-5.0, 0.4, 1.4]),
    };
    const T = pr.TOP;
    const plab = {
      boiler: L('Boiler, about 150 °C inside', pr.boiler, [0, -1.6, 1.4], 'hot'),
      valve: L('Safety valve', pr.boiler, [0.1, 2.2, 0.3], 'hot'),
      gauge: L('Pressure gauge', pr.boiler, [-1.6, 2.4, 0.3]),
      piron: L('Boiler iron', pr.ironG, [0.4, 2.6, 0.6]),
      table: L('Vacuum table', pressRoot, [4.4, T + 0.6, 2.2]),
      fan: L('Vacuum fan', pressRoot, [3.5, T - 2.6, 2.0]),
      hose: L('Steam hose', pressRoot, [-5.6, T + 4.5, -1.2]),
    };
    const inner = ['element', 'chamber', 'thermo', 'board', 'scale', 'knob'];
    const pickIron = [P.sole, P.element, P.chamber, P.thermo, P.shell, P.tank, P.dial, P.knob, P.handle, P.board, P.cord];
    const pickPress = [pr.boiler, pr.valve, pr.gauge, pr.ironG, pr.g];
    const pickMap = (o) => {
      let p = o;
      while (p) {
        if (p === P.sole) return 'sole'; if (p === P.element) return 'element'; if (p === P.chamber) return 'chamber'; if (p === P.thermo) return 'thermo';
        if (p === P.tank) return o === P.scale ? 'scale' : 'tank'; if (p === P.dial) return 'dial'; if (p === P.knob) return 'tank'; if (p === P.handle) return 'handle';
        if (p === P.board) return 'board'; if (p === P.cord) return 'cord'; if (p === P.shell) return 'thermo';
        if (p === pr.valve) return 'valve'; if (p === pr.gauge) return 'gauge'; if (p === pr.boiler) return 'boiler'; if (p === pr.ironG) return 'piron'; if (p === pr.g) return 'table';
        p = p.parent;
      }
      return '';
    };
    let S = null, kind = '', tt = 0;
    return {
      pick(o) { if (S) S.part = pickMap(o); },
      update(dt, s) {
        dt = Math.max(0, dt); S = s; tt += dt;
        tallView(stage, REEL);
        if (s.kind !== kind) { kind = s.kind; stage.pickables = kind === 'iron' ? pickIron : pickPress; }
        const isIron = s.kind === 'iron';
        ironRoot.visible = isIron; pressRoot.visible = !isIron;
        const narrow = fitNarrow(stage, [lab.cord, lab.scale, lab.knob, plab.fan, plab.hose]);
        const ek = s.explode * s.explode * (3 - 2 * s.explode);
        ironRoot.scale.setScalar(1 - 0.3 * ek); ironRoot.position.set(0.3 * ek, 0, 0);
        ir.set({ explode: s.explode, xray: s.xray, T: 190, on: Math.sin(tt * 1.3) > 0, level: 0.7, dial: 0.85 });
        pr.set({ gauge: 4, heaterOn: Math.sin(tt * 0.9) > 0.2, level: 0.65, xray: s.xray, ironX: Math.sin(tt * 0.6) * 2.2, ironZ: 0.2, fanSpin: dt * 12 });
        Object.entries(lab).forEach(([k, l]) => { l.visible = isIron && (!inner.includes(k) || s.explode > 0.3 || s.xray) && !(narrow && [ 'cord', 'scale', 'knob'].includes(k)); l.element.classList.toggle('hot', k === s.part || (!s.part && (k === 'element' || k === 'thermo'))); l.element.style.setProperty('--c', k === s.part ? COL.steam : COL.hot); });
        Object.entries(plab).forEach(([k, l]) => { l.visible = !isIron && !(narrow && (k === 'fan' || k === 'hose')); l.element.classList.toggle('hot', k === s.part || (!s.part && (k === 'valve' || k === 'boiler'))); l.element.style.setProperty('--c', k === s.part ? COL.steam : COL.hot); });
      },
      readout: (s) => {
        if (s.part && PARTS[s.part]) return `<div class="big">${PARTS[s.part][0]}</div><small>${PARTS[s.part][1]}</small>`;
        if (s.kind === 'press') {
          const W = PRESS.heater + PRESS.ironW + PRESS.vacW;
          return `<div class="big">A laundry's boiler press</div>
            <div class="row"><span>Boiler at 4 bar gauge</span><b style="color:${COL.hot}">water at ${tsat(ATM + 4 * BAR).toFixed(0)} °C</b></div>
            <div class="row"><span>Boiler + iron + fan</span><b>${W.toLocaleString('en')} W · ${amps(W).toFixed(1)} A</b></div>
            <div class="row"><span>Socket it needs</span><b>a 16 A power socket</b></div>
            <small>Tap a part, or pick one under "Show me".</small>`;
        }
        return `<div class="big">A 2,000 W steam iron</div>
          <div class="row"><span>Current at 230 V</span><b style="color:${COL.hot}">${amps(IRON.P).toFixed(1)} A</b></div>
          <div class="row"><span>Soleplate on ●●●</span><b>up to 200 °C</b></div>
          <div class="row"><span>Water to steam</span><b style="color:${COL.steam}">2,257 J for every gram</b></div>
          <small>Tap a part, or pick one under "Show me". Current: ${link('mcbclear', 'MCBClear')}.</small>`;
      },
    };
  },
};
