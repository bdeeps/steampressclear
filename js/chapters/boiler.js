// Chapter 4: the laundry's boiler press (drawn at 1 unit ≈ 10 cm, scaled to fit).
// The model is BoilerSim in press.js: 3 L of water and about 2.5 kg of steel heated by a 1,500 W
// element; the air is pushed out by the first steam, so the pressure follows water's saturation
// line (IAPWS-IF97, as in BoilClear's pressure-boiling curve). A pressure switch turns the heater off
// at the set gauge pressure and on again 0.3 bar lower. Pressing the trigger opens a valve of about
// 2 mm² and steam leaves at the speed of sound: ṁ = 0.667 A P ÷ √(R_v T), about 1.5 g/s at 4 bar.
// "Hotter and drier": steam keeps its enthalpy as it expands through the valve to 1 atm, so dry
// steam from 4 bar arrives at about 137 °C, superheated, and even steam that left the boiler 3% wet
// arrives dry (the throttling calorimeter; steam-table fits in press.js).
// The vacuum table: with the fan on, room air pulled through the cloth cools it from about 100 °C
// with a time constant of about 1.5 s; with the fan off it cools in still air, about 15 s
// (both illustrative).
// The safety valve is set by the maker above the working pressure (6.5 bar gauge in our model,
// illustrative). This chapter explains it; it gives no advice on changing it.
// Current: (1,500 + 800 + 250) W ÷ 230 V ≈ 11 A, so it needs a 16 A power socket (MCBClear).
import { THREE } from '../kit.js';
import {
  makeBoilerPress, BoilerSim, PRESS, throttle, flashStore, tsat, psat, ATM, BAR, AMB, COL, board, panelBg, title, axes, line, dashH, dot, fitNarrow, placeBoards, puffs, rng,
  amps, clamp, approach, fmtT, link, hissSound, latent,
  tallView, narrowBoards,
} from '../press.js';

const VIEW = { pos: [3.2, 5.6, 12.8], target: [2.0, 3.6, 0] };
const S_ = 0.42;    // scale of the press model

const REEL = [
    { ms: 5600, caption: 'A laundry boiler at 4 bar holds water at 152 °C, and its steam comes out hot, hard and dry.', set: { set: 4, draw: true, vac: true, xray: true, fast: 1 }, act: (s, inst) => inst.hot(), view: { pos: [3.2, 5.6, 12.8], target: [2.0, 3.6, 0] }, tall: { pos: [1.8, 7.4, 6.8], target: [0.6, 6.0, 0] }, spin: 0.3 },
];

export default {
  id: 'press',
  short: 'The boiler press',
  title: 'The laundry\'s boiler press',
  subtitle: 'Steam at a few bar is hotter, drier and stored up, and a vacuum table pulls it through the cloth.',
  view: VIEW,
  learn: `<p>Walk into a dry cleaner's or a busy laundry and the irons are joined by hoses to a <b>boiler</b>. It is a small steel tank of water, heated and <b>sealed</b>, so the steam cannot escape until the iron's trigger is pressed. Just as in a pressure cooker (see ${link('pressurecookerclear', 'PressureCookerClear')}), the pressure rises and the water has to get <b>hotter</b> before it boils: at <b>4 bar</b> above the air it boils at about <b>152 °C</b> (${link('boilclear', 'BoilClear')} has the curve).</p>
    <p>That pressure does three things. The steam blasts out <b>hard</b>, about 1.5 grams a second, enough to go right through thick cotton. As it expands through the valve it stays <b>hotter than 100 °C</b> and <b>dry</b>, so it does not leave wet spots. And the hot water is a <b>store</b>: if the pressure fell, every litre at 152 °C could flash into about 100 g of steam. That is why the boiler has a <b>pressure switch</b> to turn its heater off, a <b>gauge</b>, a <b>sight glass</b> for the water level, and a <b>safety valve</b> that opens by itself if the pressure ever gets too high. These parts must never be tampered with, weighted down or blocked.</p>
    <p>Under the cloth is a <b>vacuum table</b>. A fan sucks air down through the perforated top, so the steam is pulled <b>through</b> every layer. When the iron lifts, the same fan pulls room air through, and the cloth <b>cools and dries in seconds</b>, locking the press in. The whole set draws about <b>11 A</b>, so it needs a proper 16 A power socket (${link('mcbclear', 'MCBClear')}).</p>
    <p class="tip"><b>Try it:</b> raise the set pressure and read the boiler's temperature and the steam's. Press the trigger, then switch the vacuum off and watch how long the cloth stays hot.</p>`,
  terms: [
    { t: 'Gauge pressure', d: 'Pressure above the air outside, the number a pressure gauge shows.' },
    { t: 'Bar', d: 'A unit of pressure, about the pressure of the air at sea level.' },
    { t: 'Pressure switch', d: 'A switch that turns a boiler\'s heater off at a set pressure and on again when it falls.' },
    { t: 'Superheated steam', d: 'Steam hotter than the boiling point at its pressure, so it holds no water drops.' },
    { t: 'Vacuum table', d: 'An ironing table with a fan that sucks air down through the cloth.' },
  ],
  defaults: { set: 4, draw: false, vac: true, xray: true, fast: 1 },
  controls: [
    { key: 'set', type: 'range', label: 'Pressure switch set to', min: 1, max: 5, step: 0.1, ends: ['1 bar', '5 bar'], fmt: (v) => `${v.toFixed(1)} bar gauge` },
    { key: 'draw', type: 'toggle', label: 'Trigger pressed (steam on)' },
    { key: 'vac', type: 'toggle', label: 'Vacuum fan on' },
    { key: 'xray', type: 'toggle', label: 'See inside the boiler' },
    { key: 'go', type: 'buttons', label: 'Boiler', items: [{ label: 'Start from cold', act: (s, inst) => inst.cold() }, { label: 'Lift the iron off the cloth', act: (s, inst) => inst.lift() }] },
    { key: 'fast', type: 'seg', label: 'Time', options: [{ v: 1, label: 'Real time' }, { v: 10, label: '×10' }, { v: 30, label: '×30' }] },
  ],
  quiz: [
    { q: 'Why is the water in a 4 bar boiler at about 152 °C and not 100 °C?', options: ['The heater is stronger', 'Higher pressure means water must be hotter before it can boil', 'Steel makes water hotter', 'It is not: it is at 100 °C'], answer: 1, why: 'Boiling point rises with pressure. It is the same reason a pressure cooker cooks at about 120 °C.' },
    { q: 'What does the vacuum table do after the iron lifts?', options: ['Heats the cloth more', 'Pulls room air through the cloth so it cools and dries fast, setting the press', 'Blows steam back up', 'Nothing'], answer: 1, why: 'Cooling and drying is what locks the chains in their flat shape, so doing it in seconds gives a sharp, lasting press.' },
    { q: 'What is a boiler\'s safety valve for?', options: ['To make steam for ironing', 'To open by itself if the pressure ever climbs past the maker\'s limit', 'To fill the boiler', 'To show the water level'], answer: 1, why: 'The pressure switch should stop the heater first; the safety valve is the backup and must never be blocked, weighted or adjusted.' },
  ],
  reel: REEL,


  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const pg = new THREE.Group(); pg.scale.setScalar(S_); pg.position.set(0.9, 0, 0); root.add(pg);
    const pr = makeBoilerPress(pg);
    const T = pr.TOP;
    const sim = new BoilerSim({ set: 4 });
    const steamIn = puffs(pg, 160, 0.09, 0xdff6ff, rng(3), 0.65, 0.2);
    const steamUp = puffs(pg, 120, 0.12, 0xdff6ff, rng(5), 0.55, 0.8);
    const reliefP = puffs(pg, 60, 0.12, 0xffffff, rng(9), 0.7, 1.2);
    const snd = hissSound();
    // the cloth on the table: a flat slab whose colour shows its temperature
    const clothMat = new THREE.MeshStandardMaterial({ color: 0xf1ede4, roughness: 0.9 });
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.06, 3.0), clothMat); cloth.position.set(0, T + 0.03, 0); cloth.receiveShadow = true; pg.add(cloth);
    const lB = stage.label('', [0, -1.8, 1.4], pr.boiler, 'hot');
    const lV = stage.label('Safety valve', [0.1, 2.1, 0.2], pr.boiler);
    const lS = stage.label('', [0, 2.8, 0.6], pr.ironG, 'hot');
    const lC = stage.label('', [-3.2, T + 0.5, 1.9], pg);
    // chart: boiler pressure over time; and the cloth's cooling after the iron lifts
    const bP = board(root, 4.6, 2.6, 640, 362, (g, w, h) => {
      panelBg(g, w, h); title(g, 'Boiler', 'gauge pressure, bar');
      const t1 = Math.max(600, sim.t), t0 = Math.max(0, t1 - 1500), st = t1 - t0 > 900 ? 300 : 120;
      const xt = []; for (let v = Math.ceil(t0 / st) * st; v <= t1; v += st) xt.push(v);
      const { X, Y } = axes(g, w, h, { x0: 60, y1: 56, y0: h - 46, xMin: t0, xMax: t1, yMin: 0, yMax: 7, xTicks: xt, yTicks: [0, 2, 4, 6], xFmt: (v) => (v / 60).toFixed(0) + ' min', yFmt: String });
      dashH(g, X(t0), X(t1), Y(PRESS.relief), 'safety valve (backup)', 'rgba(255,90,110,.85)');
      dashH(g, X(t0), X(t1), Y(sim.o.set), 'switch turns heater off', 'rgba(255,181,71,.85)', true);
      line(g, sim.rows.filter((r) => r[0] >= t0).map((r) => [r[0], r[1]]), X, Y, COL.hot, 4);
    }, [5.6, 5.3, -1.4]);
    bP.mesh.rotation.y = -0.3;
    const cool = { T: 100, t: 99, vac: true, track: [] };
    const bC = board(root, 4.6, 2.6, 640, 362, (g, w, h) => {
      panelBg(g, w, h); title(g, 'Cloth after the iron lifts', '°C');
      const { X, Y } = axes(g, w, h, { x0: 60, y1: 56, y0: h - 46, xMin: 0, xMax: 30, yMin: 20, yMax: 110, xTicks: [0, 10, 20, 30], yTicks: [40, 70, 100], xFmt: (v) => v + ' s', yFmt: String });
      const curve = (tau) => Array.from({ length: 61 }, (_, i) => [i / 2, AMB + (100 - AMB) * Math.exp(-(i / 2) / tau)]);
      line(g, curve(1.5), X, Y, COL.ok, cool.vac ? 5 : 2); line(g, curve(15), X, Y, COL.heat, cool.vac ? 2 : 5);
      g.font = 'bold 18px sans-serif'; g.fillStyle = COL.ok; g.fillText('vacuum on', X(3), Y(42)); g.fillStyle = COL.heat; g.fillText('vacuum off', X(17), Y(64));
      if (cool.t < 30) dot(g, X(cool.t), Y(cool.T), '#fff', 8);
    }, [5.6, 2.4, -0.4]);
    bC.mesh.rotation.y = -0.3;
    let S = null, tt = 0, redraw = 0, ix = 0, dir = 1;
    const cold = () => { sim.reset(); cool.t = 99; };
    const hot = () => { sim.reset(); sim.T = tsat(ATM + sim.o.set * BAR) - 0.5; sim.on = false; for (let t = 0; t < 900; t += 2) { sim.t = t; sim.rows.push([t, Math.max(0, (psat(sim.T) - ATM) / BAR) * Math.min(1, t / 300), sim.T]); } sim.t = 900; };
    const lift = () => { cool.t = 0; cool.T = 100; if (S) S.draw = false; };
    hot();
    return {
      cold, hot, lift,
      dispose() { snd.dispose(); },
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s; tt += dt;
        tallView(stage, REEL);
        sim.o.set = s.set; sim.o.draw = s.draw;
        const narrow = fitNarrow(stage, [lC, lV]);
        const tall = placeBoards(stage, [bP, bC], { x: 0.2, top: 10.4, gap: 2.9, scale: 1.1, z: -1 });
        narrowBoards(narrow, [[bP, [5.6, 1.9, -0.6]]]);
        bC.mesh.visible = !narrow || tall;
        const span = dt * s.fast, n = Math.max(1, Math.ceil(span / 0.1));
        for (let i = 0; i < n; i++) { sim.step(span / n); sim.record(2, 1500); }
        if (s.draw) { ix += dir * 2.2 * dt; if (ix > 2.6) dir = -1; if (ix < -2.6) dir = 1; cool.t = 99; }
        cool.vac = s.vac;
        if (cool.t < 30) { cool.t += dt; cool.T = AMB + (100 - AMB) * Math.exp(-cool.t / (s.vac ? 1.5 : 15)); }
        const clothT = s.draw ? 100 : cool.t < 30 ? cool.T : AMB;
        clothMat.color.set(0xf1ede4).lerp(new THREE.Color(0xff9a5a), clamp((clothT - 40) / 120, 0, 0.5));
        pr.set({ gauge: sim.gauge, heaterOn: sim.on, level: clamp(sim.m / PRESS.water, 0.05, 1) * 0.75, xray: s.xray, ironX: ix, ironZ: 0.2, relief: sim.relief, fanSpin: s.vac ? dt * 14 : 0 });
        const flowing = sim.flow > 0 && s.draw;
        const iw = pr.ironG.position;
        steamIn.step(dt, flowing ? (s.vac ? 90 : 20) : 0, () => [iw.x + (Math.random() - 0.4) * 2.2, T + 0.05, iw.z + (Math.random() - 0.5) * 1.1], () => [(Math.random() - 0.5) * 0.3, -1.6 - Math.random(), (Math.random() - 0.5) * 0.3], 0.6, 0.6);
        steamUp.step(dt, flowing ? (s.vac ? 6 : 70) : 0, () => [iw.x + (Math.random() - 0.4) * 2.4, T + 0.15, iw.z + (Math.random() - 0.5) * 1.4], () => [(Math.random() - 0.5) * 0.8, 0.8 + Math.random() * 0.6, (Math.random() - 0.5) * 0.8], 1.4, 2.2);
        const vp = pr.boiler.position;
        reliefP.step(dt, sim.relief ? 40 : 0, () => [vp.x + 0.1, vp.y + 1.85, 0], () => [(Math.random() - 0.5) * 0.4, 2.2, (Math.random() - 0.5) * 0.4], 1.0, 2.0);
        snd.set(flowing ? 0.2 : sim.relief ? 0.3 : 0);
        const th = throttle(sim.gauge);
        lB.element.innerHTML = `${sim.gauge.toFixed(1)} bar · water at ${sim.T.toFixed(0)} °C${sim.on ? ' · heater on' : ''}`;
        lS.element.innerHTML = flowing ? `steam out at ${th.Tout.toFixed(0)} °C, dry` : 'trigger released';
        lS.element.style.setProperty('--c', flowing ? COL.steam : COL.text);
        lS.visible = !narrow || flowing;
        lC.element.innerHTML = `cloth ${clothT.toFixed(0)} °C`;
        redraw += dt; if (redraw > 0.2) { redraw = 0; bP.redraw(); bC.redraw(); }
      },
      readout: (s) => {
        const th = throttle(sim.gauge), store = flashStore(sim.m, sim.T) * 1000, W = PRESS.heater + PRESS.ironW + (s.vac ? PRESS.vacW : 0);
        const heatUp = (sim.m * 4186 + 2.5 * 500) * (tsat(ATM + s.set * BAR) - AMB) / PRESS.heater;
        return `<div class="big">${sim.gauge.toFixed(1)} bar · ${sim.T.toFixed(0)} °C</div>
          <div class="row"><span>Steam after the valve</span><b style="color:${COL.steam}">${sim.gauge > 0.2 ? `${th.Tout.toFixed(0)} °C, dry` : 'none yet'}</b></div>
          <div class="row"><span>Even steam this wet comes out dry</span><b>${sim.gauge > 0.2 ? `${((1 - th.xMin) * 100).toFixed(1)}% water` : '–'}</b></div>
          <div class="row"><span>Steam flow, trigger pressed</span><b>${(sim.flow * 1000).toFixed(1)} g/s</b></div>
          <div class="row"><span>Stored: could flash into</span><b style="color:${COL.hot}">${store.toFixed(0)} g of steam</b></div>
          <div class="row"><span>Current, boiler + iron${s.vac ? ' + fan' : ''}</span><b>${amps(W).toFixed(1)} A</b></div>
          <small>From cold it takes about ${Math.round(heatUp / 60)} min to reach pressure. ${sim.relief ? 'The safety valve has lifted: the pressure reached the maker\'s limit.' : `The pressure switch holds it near ${s.set.toFixed(1)} bar. The safety valve, set higher by the maker, is the backup.`}</small>`;
      },
    };
  },
};
