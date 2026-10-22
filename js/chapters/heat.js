// Chapter 3 (centrepiece): the heat sums of a steam iron.
// Left: the iron, see-through, with its element glowing while the thermostat's contacts are closed.
// Right: the thermostat's bimetal strip, drawn big, curling as it warms. Behind: the soleplate's
// temperature over the last two minutes, and where the element's power goes.
// The model is IronSim in press.js:
//   C dT/dt = P (while the contacts are closed) − G (T − 30 °C) − ṁ (c ΔT + L)
// with C = 620 J/K (illustrative store of an aluminium soleplate and its parts), G = 1.0 W/K standing
// in air or 2.0 W/K gliding over cloth (illustrative), and every gram of water warmed from 30 °C and
// boiled at 100 °C taking 2.55 kJ (BoilClear's latent heat, 2,257 J/g). The thermostat opens 5 °C
// above the set point and closes 5 °C below it (a 10 °C swing, illustrative).
// The bimetal: brass on invar, Δα ≈ 18 × 10⁻⁶ per K, 0.8 mm thick and 25 mm long (illustrative):
// κ = 3 Δα ΔT ÷ (2t) (Timoshenko), tip lift κL²/2, about 1.9 mm when it is 170 °C above the room.
import { THREE } from '../kit.js';
import {
  makeIron, makeBimetalModel, IronSim, IRON, AMB, COL, board, panelBg, title, axes, line, dashH, bars, fitNarrow, placeBoards, puffs, rng, dotStr,
  warmUp, steadySteam, steamHeat, amps, curvature, tipLift, BIMETAL, clamp, fmtT, link, hissSound,
  tallView, narrowBoards,
} from '../press.js';

const VIEW = { pos: [3.4, 6.6, 16.4], target: [3.4, 3.9, 0] };

const REEL = [
    { ms: 5200, caption: 'The thermostat is a strip of two metals: it curls as it warms and clicks the element off and on.', set: { set: 200, P: 2000, steam: 0, where: 'air', fast: 4 }, act: (s, inst) => inst.cold(), view: { pos: [6.4, 5.6, 10.6], target: [5.4, 3.0, 0] }, tall: { pos: [3.6, 7.8, 11.4], target: [2.0, 5.8, 0] }, spin: 0.15 },
    { ms: 5200, caption: 'Steam is costly: a 2,000 watt iron has heat to spare for only about 40 grams a minute.', set: { set: 200, P: 2000, steam: 40, where: 'cloth', fast: 1 }, act: (s, inst) => inst.warm(), view: { pos: [3.4, 6.6, 16.4], target: [3.4, 3.9, 0] }, tall: { pos: [3.6, 7.8, 11.4], target: [2.0, 5.8, 0] }, spin: 0.2 },
];

export default {
  id: 'heat',
  short: 'The heat sums',
  title: 'The heat sums: warm-up, thermostat and steam',
  subtitle: 'Two thousand watts into a thick plate, a strip of two metals that bends, and grams of steam a minute.',
  view: VIEW,
  learn: `<p>Switch on a 2,000 W iron and every second 2,000 joules go into the soleplate and the parts cast into it. They store about <b>620 joules per degree</b>, so the plate warms by about 3 °C a second at first, and reaches three dots (200 °C) in about <b>a minute</b>. As it gets hotter it loses more heat to the air, so the last few degrees come more slowly.</p>
    <p>Then the <b>thermostat</b> takes over. It is a <b>bimetal strip</b>: brass bonded to a metal that hardly expands. As it warms the brass side grows more, so the strip <b>curls</b>, by about 2 mm at the tip, and pushes the contacts apart. The element switches off. The plate cools a little, the strip straightens, the contacts close, and it starts again. The dial only moves the contacts closer or further, so it sets the temperature. Watch the orange stripes on the chart: that is the element clicking on and off.</p>
    <p>Steam is the expensive part. Turning one gram of tap water into steam takes about <b>2,550 joules</b>, more than seven times what it takes just to warm it to boiling (see ${link('boilclear', 'BoilClear')}). After the losses, a 2,000 W iron holding 200 °C has about 1,650 W to spare, enough for roughly <b>40 grams of steam a minute</b>. Ask for more and the plate cools, and the thermostat keeps the element on all the time. A <b>steam shot</b> borrows heat stored in the plate: each 4 g burst cools it by about 16 °C.</p>
    <p class="tip"><b>Try it:</b> press "Start cold" and time the warm-up. Then turn on the steam and watch the stripes get longer. Try a steam shot, and a smaller 1,000 W iron.</p>`,
  terms: [
    { t: 'Heat capacity', d: 'How many joules it takes to warm something by one degree.' },
    { t: 'Bimetal strip', d: 'Two metals bonded together that expand by different amounts, so the strip bends when heated.' },
    { t: 'Duty cycle', d: 'The share of the time a heater is switched on.' },
    { t: 'Latent heat', d: 'The heat that turns a liquid into a gas without changing its temperature: 2,257 J for each gram of water.' },
    { t: 'Steam rate', d: 'How many grams of steam an iron makes each minute.' },
  ],
  defaults: { set: 200, P: 2000, steam: 0, where: 'cloth', fast: 1 },
  controls: [
    { key: 'set', type: 'range', label: 'Dial', min: 80, max: 210, step: 1, ends: ['●', '●●●'], fmt: (v) => `${v.toFixed(0)} °C · ${dotStr(v)}` },
    { key: 'P', type: 'seg', label: 'Element', options: [{ v: 1000, label: '1,000 W' }, { v: 1600, label: '1,600 W' }, { v: 2000, label: '2,000 W' }, { v: 2400, label: '2,400 W' }] },
    { key: 'steam', type: 'seg', label: 'Steam knob', options: [{ v: 0, label: 'Dry' }, { v: 20, label: '20 g/min' }, { v: 40, label: '40 g/min' }, { v: 60, label: '60 g/min' }] },
    { key: 'where', type: 'seg', label: 'The iron is', options: [{ v: 'air', label: 'Standing' }, { v: 'cloth', label: 'Ironing' }] },
    { key: 'go', type: 'buttons', label: 'Do', items: [{ label: 'Start cold', act: (s, inst) => inst.cold() }, { label: 'Steam shot', act: (s, inst) => inst.shot() }] },
    { key: 'fast', type: 'seg', label: 'Time', options: [{ v: 1, label: 'Real time' }, { v: 4, label: '×4' }] },
  ],
  quiz: [
    { q: 'What makes the thermostat switch the element off?', options: ['A timer', 'A bimetal strip that curls as it warms and pushes the contacts apart', 'The water running out', 'The plug getting hot'], answer: 1, why: 'Brass expands more than the metal it is bonded to, so the strip bends and opens the contacts at the temperature the dial sets.' },
    { q: 'Roughly how much steam can a 2,000 W iron keep making while holding 200 °C?', options: ['About 4 g a minute', 'About 40 g a minute', 'About 400 g a minute', 'As much as you like'], answer: 1, why: 'About 1,650 W is left after the losses, and each gram of steam from tap water takes about 2,550 J: 1,650 ÷ 2,550 ≈ 0.65 g a second, or about 40 g a minute.' },
    { q: 'Why does a big steam shot make the soleplate cooler for a while?', options: ['The water is cold', 'Turning water into steam takes heat, and in a burst it comes out of the heat stored in the plate', 'The thermostat switches off', 'The steam blows on the plate'], answer: 1, why: 'A 4 g burst takes about 10 kJ, far more than the element gives in that second, so it comes from the plate: about 16 °C at 620 J per degree.' },
  ],
  reel: REEL,


  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const ironG = new THREE.Group(); root.add(ironG); ironG.position.set(-1.0, 0, 0.8); ironG.rotation.y = 0.35;
    const ir = makeIron(ironG);
    const bm = new THREE.Group(); bm.position.set(3.0, 0.9, 2.2); bm.scale.setScalar(0.85); root.add(bm);
    const strip = makeBimetalModel(bm, { L: 4 });
    const lStrip = stage.label('Bimetal strip: brass on invar', [2.0, -0.9, 0.6], bm);
    const lContact = stage.label('', [4.2, 2.4, 0.4], bm, 'hot');
    const lPlate = stage.label('', [1.2, -0.1, 1.7], ironG, 'hot');
    const sim = new IronSim({ P: 2000, set: 200 });
    const steamP = puffs(root, 120, 0.05, 0xeefaff, rng(8), 0.35, 0.9);
    const snd = hissSound();
    // chart: soleplate temperature over the last 2 minutes, with the element's on-stripes
    const bT = board(root, 6.4, 3.3, 760, 392, (g, w, h) => {
      panelBg(g, w, h); title(g, 'Soleplate temperature', 'last 2 minutes');
      const t1 = Math.max(120, sim.t), t0 = t1 - 120;
      const xt = []; for (let v = Math.ceil(t0 / 30) * 30; v <= t1; v += 30) xt.push(v);
      const { X, Y, y0 } = axes(g, w, h, { x0: 70, y1: 56, y0: h - 46, xMin: t0, xMax: t1, yMin: 0, yMax: 240, xTicks: xt, yTicks: [0, 50, 100, 150, 200], xFmt: (v) => `${(v - t1).toFixed(0)} s`, yFmt: (v) => v + '°' });
      const rows = sim.rows.filter((r) => r[0] >= t0);
      g.fillStyle = 'rgba(255,122,89,.35)';
      for (let i = 1; i < rows.length; i++) if (rows[i][2]) g.fillRect(X(rows[i - 1][0]), y0 - 12, X(rows[i][0]) - X(rows[i - 1][0]) + 0.5, 12);
      dashH(g, X(t0), X(t1), Y(sim.o.set), `dial ${sim.o.set.toFixed(0)}°`, 'rgba(255,181,71,.9)');
      dashH(g, X(t0), X(t1), Y(IRON.steamMin), 'steam works above', 'rgba(142,240,255,.6)', true);
      line(g, rows.map((r) => [r[0], r[1]]), X, Y, COL.hot, 4);
    }, [8.6, 6.3, -0.6]);
    bT.mesh.rotation.y = -0.32;
    // power budget
    const bP = board(root, 6.4, 2.9, 760, 344, (g, w, h) => {
      panelBg(g, w, h); title(g, 'Where the power goes', 'watts, now');
      const P = sim.on ? sim.o.P : 0;
      bars(g, [
        { label: 'Element', value: P, color: COL.hot },
        { label: 'Lost to air and cloth', value: sim.heatOut, color: COL.heat },
        { label: 'Making steam', value: sim.steamW, color: COL.steam },
        { label: 'Steam it can keep up', value: steadySteam(sim.o.P, sim.o.set, sim.G) * 60000, color: COL.ok, text: `${(steadySteam(sim.o.P, sim.o.set, sim.G) * 60000).toFixed(0)} g/min at ${sim.o.set.toFixed(0)}°` },
      ], { y: 62, w, rowH: 64, labelW: 250, max: 2600, unit: (v) => `${v.toFixed(0)} W` });
    }, [8.6, 2.8, 0.4]);
    bP.mesh.rotation.y = -0.32;
    let S = null, tt = 0, redraw = 0;
    const warm = () => { sim.reset(sim.o.set); sim.on = false; };
    const cold = () => { sim.reset(AMB); };
    warm();
    return {
      cold, warm, shot: () => sim.shot(),
      dispose() { snd.dispose(); },
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s; tt += dt;
        tallView(stage, REEL);
        Object.assign(sim.o, { P: s.P, set: s.set, steam: s.steam, where: s.where });
        const narrow = fitNarrow(stage, [lStrip]);
        placeBoards(stage, [bT, bP], { x: 1.6, top: 12.4, gap: 3.6, scale: 1.05, z: -1 });
        narrowBoards(narrow, [[bT, [8.4, 4.3, -0.6]], [bP, [8.4, 1.5, 0.6]]]);
        const span = dt * s.fast, n = Math.max(1, Math.ceil(span / 0.05));
        for (let i = 0; i < n; i++) { sim.step(span / n); sim.record(0.5, 130); }
        ir.set({ xray: true, T: sim.T, on: sim.on, level: 0.7, dial: clamp((s.set - 60) / 170, 0, 1) });
        // bimetal: real curvature × 25 for the drawing; the dial sets where the contact arm sits
        const k = curvature(sim.T - AMB) * BIMETAL.L * 0.35;
        const kSet = curvature(s.set - AMB) * BIMETAL.L * 0.35;
        const yAt = (kk) => { let y = 0, a = 0; const sl = 4 / 24; for (let i = 0; i < 24; i++) { const mid = a + (kk * sl) / 2; y += Math.sin(mid) * sl; a += kk * sl; } return y; };
        strip.set(k, { dialY: yAt(kSet) + 0.1 + 0.6 - 0.02 });
        lContact.element.innerHTML = sim.on ? 'contacts closed: element ON' : 'contacts pushed apart: OFF';
        lContact.element.style.setProperty('--c', sim.on ? COL.hot : COL.cold);
        lPlate.element.innerHTML = `${sim.T.toFixed(0)} °C ${dotStr(sim.T)}`;
        const steamOn = sim.flow > 0;
        steamP.step(dt, steamOn ? 30 + sim.flow * 60000 * 2 : 0, () => { const a = Math.random() * 5 - 2, b = (Math.random() - 0.5) * 2; return [ironG.position.x + a * Math.cos(0.35) + b * Math.sin(0.35), 0.05, ironG.position.z - a * Math.sin(0.35) + b * Math.cos(0.35)]; }, () => [(Math.random() - 0.5) * 1.2, 0.4 + Math.random() * 0.6, (Math.random() - 0.5) * 1.2], 1.4, 2.4);
        snd.set(steamOn ? 0.1 + sim.flow * 2000 : 0);
        redraw += dt; if (redraw > 0.15) { redraw = 0; bT.redraw(); bP.redraw(); }
      },
      readout: (s) => {
        const wu = warmUp(s.P, Math.min(s.set, 210), { G: IRON.Gair });
        const lift = tipLift(sim.T - AMB) * 1000, duty = s.P > 0 ? clamp((IRON.Gcloth * (s.set - AMB) + (s.steam / 60000) * steamHeat()) / s.P, 0, 1) : 0;
        const keep = steadySteam(s.P, s.set, sim.G) * 60000;
        return `<div class="big">Soleplate ${sim.T.toFixed(0)} °C</div>
          <div class="row"><span>Element</span><b style="color:${sim.on ? COL.hot : COL.cold}">${sim.on ? 'on' : 'off'} · ${s.P.toLocaleString('en')} W · ${amps(s.P).toFixed(1)} A</b></div>
          <div class="row"><span>Warm-up to ${Math.min(s.set, 210).toFixed(0)} °C, standing</span><b>${fmtT(wu)}</b></div>
          <div class="row"><span>Bimetal tip lift</span><b>${lift.toFixed(2)} mm</b></div>
          <div class="row"><span>Steam it can keep up</span><b style="color:${COL.steam}">${keep.toFixed(0)} g/min</b></div>
          <div class="row"><span>Element on, ironing</span><b>${duty >= 1 ? 'all the time' : Math.round(duty * 100) + '% of the time'}</b></div>
          ${sim.leak ? '<small>Below about 130 °C the anti-drip valve holds the water back, or it would drip out as hot water.</small>' : s.steam > keep + 2 ? `<small>You are asking for ${s.steam} g/min, more than the element can keep up with: the plate will sag below the dial.</small>` : '<small>The stripes on the chart show the element clicking on and off.</small>'}`;
      },
    };
  },
};
