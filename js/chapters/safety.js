// Chapter 6: using an iron safely, and keeping its steam holes clear.
// This chapter explains the safety parts; it gives no advice on changing, bypassing or adjusting any
// of them. Sources for the safety statements (official or the standard itself):
//  · Burns and scalds: NHS ("Burns usually happen when dry heat ... such as fire or a hot iron";
//    "Scalds are caused by hot liquids or steam"; "Hold the burn or scald under cool running water for
//    20 minutes"), and WHO's burns fact sheet (cool a thermal burn with cool running water, about
//    20 minutes; do not apply ice, oils, butter or toothpaste).
//  · Irons left on: London Fire Brigade, after a house fire in Southall caused by a clothes iron left
//    on (August 2024): "switch equipment such as irons, hair-straighteners and portable heaters off as
//    soon as you leave the room."
//  · Standards: BIS lists IS 302 (Part 2/Sec 3):2024, identical to IEC 60335-2-3:2022, as the safety
//    standard for electric irons; electric irons have needed the ISI mark since the Electrical Wires,
//    Cables, Appliances and Protection Devices and Accessories (Quality Control) Order, 2003 (schedule
//    as published by the Gujarat Chief Electrical Inspector). IS 366 covers performance (search
//    summary of BIS listings only).
//  · Unplug before filling, and the auto shut-off times (about 30 s flat or on its side, about 8 min on
//    its heel): makers' manuals (search summaries); a one-time thermal fuse near the element as a
//    backup to the thermostat: repair guides (search summaries).
// The scale model (illustrative): every litre of water boiled away leaves its hardness behind as
// limescale, mostly calcium carbonate. IS 10500:2012 sets an acceptable limit for drinking water of
// 200 mg/L total hardness (as CaCO₃) and a permissible limit of 600 mg/L (search summaries of lab
// reports quoting the standard). We assume 1.2 L of water a week through the iron, and that a twentieth
// of the scale lodges in the steam holes and their channels, which hold about 0.5 cm³ before they
// close (illustrative). Steam rate falls with the open area of the holes.
// Steam scald sum: a gram of steam condensing on skin and cooling to 37 °C gives 2,257 + 4.19 × 63
// ≈ 2,520 J; a gram of water at 100 °C cooling to 37 °C gives only 264 J.
import { THREE } from '../kit.js';
import {
  makeIron, makeCloth, IronSim, IRON, AMB, COL, FAB, board, panelBg, title, axes, line, dashH, fitNarrow, placeBoards, puffs, rng, dotStr, clamp, approach, fmtT, link, latent, C_WATER, halfW,
  tallView, narrowBoards,
} from '../press.js';
import { M, box } from '../kit.js';

const VIEW = { pos: [4.4, 7.4, 14.6], target: [1.8, 3.2, 0] };
const WEEK_L = 1.2, LODGE = 0.05, HOLE_CM3 = 0.5, CACO3_RHO = 2.7;   // see the header
const scaleFrac = (mgL, months) => clamp(((mgL / 1000) * WEEK_L * (months * 4.35) * LODGE) / CACO3_RHO / HOLE_CM3, 0, 1);

const REEL = [
    { ms: 5000, caption: 'Never leave a hot iron face-down. An auto shut-off cuts it after about 30 seconds, but unplug it anyway.', set: { case: 'facedown', fab: 'polyester', autoff: true, fast: 1 }, act: (s, inst) => inst.reset(), view: { pos: [4.4, 7.4, 14.6], target: [1.8, 3.2, 0] }, tall: { pos: [2.6, 7.2, 7.6], target: [0.8, 5.6, 0] }, spin: 0.25 },
];

export default {
  id: 'safety',
  short: 'Safety and care',
  title: 'Safe ironing, and keeping the steam holes clear',
  subtitle: 'Hot metal, steam that scalds, the safety parts that look after you, and the chalk hard water leaves.',
  view: VIEW,
  learn: `<p>A soleplate at 200 °C burns skin in a moment, and <b>steam is worse than boiling water</b>. When a gram of steam touches your skin it condenses and gives up its latent heat: about <b>2,500 joules</b>, ten times what a gram of boiling water gives as it cools (${link('boilclear', 'BoilClear')}). The NHS's first aid for any burn or scald: hold it under <b>cool running water for 20 minutes</b>, and get help for big or deep burns. No ice, butter or toothpaste.</p>
    <p>Habits that keep you safe: <b>never leave a hot iron lying face-down</b>, on cloth or anywhere else; stand it on its heel. <b>Switch it off and unplug it</b> as soon as you leave the room, and <b>unplug before filling</b> the tank. Keep the cord away from the hot plate and out of children's reach, and use a <b>three-pin earthed socket</b>: the earth wire bonds the metal soleplate so a fault trips the circuit. In India, electric irons must carry the <b>ISI mark</b>; the safety standard is <b>IS 302 (Part 2/Sec 3)</b>, the same as the world's IEC 60335-2-3.</p>
    <p>The iron looks after you too. The <b>thermostat</b> holds the temperature, many irons carry a one-time <b>thermal fuse</b> as a backup if the thermostat ever sticks, and the <b>auto shut-off</b> cuts the power if the iron lies still. These are safety parts: <b>never tamper with them</b>. If an iron overheats, sparks or leaks, stop using it and have it checked or replaced.</p>
    <p>Hard water leaves <b>limescale</b>: chalk that stays behind when water boils away. It builds up in the steam chamber and <b>clogs the holes</b>. Use the water the maker recommends, often filtered or a mix with distilled, and use the anti-scale or self-clean feature as the manual says.</p>
    <p class="tip"><b>Try it:</b> leave the iron face-down on a shirt and watch the auto shut-off. Then pick hard water and run the months forward.</p>`,
  terms: [
    { t: 'Scald', d: 'A burn from hot liquid or steam.' },
    { t: 'Auto shut-off', d: 'A timer and tilt sensor that cut the power if the iron is left still.' },
    { t: 'Thermal fuse', d: 'A one-time fuse that cuts the power for good if the iron gets far too hot.' },
    { t: 'Earthing', d: 'A wire from the metal body to the earth pin, so a fault makes current flow to earth and trips the circuit.' },
    { t: 'Limescale', d: 'Chalky calcium carbonate left behind when hard water is heated and boiled away.' },
  ],
  defaults: { case: 'facedown', fab: 'polyester', autoff: true, hard: 300, months: 6, fast: 1 },
  controls: [
    { key: 'case', type: 'seg', label: 'What happens when', options: [{ v: 'facedown', label: 'Left face-down' }, { v: 'heel', label: 'Left on its heel' }, { v: 'scale', label: 'Hard water' }], hint: 'Each starts again.' },
    { key: 'fab', type: 'seg', label: 'Under the iron', options: [{ v: 'cotton', label: 'Cotton shirt' }, { v: 'polyester', label: 'Polyester shirt' }] },
    { key: 'autoff', type: 'toggle', label: 'Iron has auto shut-off', hint: 'Older and simpler irons have none. The model never disables a safety part: it compares two irons.' },
    { key: 'hard', type: 'seg', label: 'Water', options: [{ v: 0, label: 'Distilled' }, { v: 100, label: 'Soft' }, { v: 300, label: 'Hard' }, { v: 600, label: 'Very hard' }], fmt: (v) => `${v} mg/L` },
    { key: 'months', type: 'range', label: 'Months of use', min: 0, max: 24, step: 0.5, fmt: (v) => v.toFixed(1) + ' months' },
    { key: 'fast', type: 'seg', label: 'Time', options: [{ v: 1, label: 'Real time' }, { v: 10, label: '×10' }] },
  ],
  onChange(s, key) { if (key === 'case' || key === 'autoff' || key === 'fab') s._re = true; },
  quiz: [
    { q: 'Why is a steam scald so much worse than a splash of boiling water?', options: ['Steam is hotter than 200 °C', 'Steam gives up its latent heat as it condenses on the skin: about ten times more heat per gram', 'Steam is acidic', 'It is not worse'], answer: 1, why: 'Condensing a gram of steam gives about 2,257 J before it even starts to cool; a gram of boiling water cooling to skin temperature gives about 264 J.' },
    { q: 'You have to answer the door in the middle of ironing. What should you do?', options: ['Lay the iron face-down on the shirt', 'Switch it off, unplug it and stand it on its heel', 'Leave it on the cloth for a minute', 'Turn the dial to max'], answer: 1, why: 'Fire services ask that irons are switched off as soon as you leave the room. Face-down it can scorch, melt or set fire to what it rests on.' },
    { q: 'What first aid does the NHS give for a burn or scald?', options: ['Ice', 'Butter or toothpaste', 'Cool running water for 20 minutes', 'Pop the blisters'], answer: 2, why: 'Cool running water for 20 minutes, as soon as possible. No ice, creams or butter, and do not burst blisters.' },
  ],
  reel: REEL,


  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const table = box(13, 0.4, 6, M.matte(0x6c7d93)); table.position.set(0, 0.8, 0); root.add(table);
    const cloth = makeCloth(root, { W: 9, D: 4.6, nx: 60, nz: 16, y: 1.0, col: 0x9ec3e6, seed: 21 });
    const flat = new Float32Array(61).fill(0.12), burn = new Float32Array(61).fill(0), hot = new Float32Array(61).fill(AMB);
    const pivot = new THREE.Group(); pivot.position.set(0, 1.08, 0); root.add(pivot);
    const ironG = new THREE.Group(); pivot.add(ironG);
    const ir = makeIron(ironG);
    const sim = new IronSim({ P: 2000, set: 200, steam: 0, where: 'air' });
    const smoke = puffs(root, 70, 0.08, 0xb0a89a, rng(17), 0.4, 0.6);
    const steamP = puffs(root, 60, 0.05, 0xeefaff, rng(2), 0.35, 0.9);
    const lState = stage.label('', [0, 4.2, 0], pivot, 'hot');
    const lHole = stage.label('', [4.2, -0.4, 2.0], root, 'hot');
    // a close-up of the steam holes for the hard-water case: discs that close up with scale
    const holesG = new THREE.Group(); holesG.position.set(-4.6, 2.9, 2.2); holesG.scale.setScalar(0.8); root.add(holesG);
    const plate = new THREE.Mesh(new THREE.CircleGeometry(2.2, 48), M.metal(0xc4c9d1, { roughness: 0.25, side: THREE.DoubleSide })); holesG.add(plate);
    const holeMeshes = [], scaleRings = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 6) * Math.PI * 2, r = i === 6 ? 0 : 1.2;
      const h = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), M.matte(0x0a0b0e)); h.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.01); holesG.add(h); holeMeshes.push(h);
      const ringM = new THREE.Mesh(new THREE.RingGeometry(0.01, 0.42, 32), M.matte(0xf4f1e4)); ringM.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.02); holesG.add(ringM); scaleRings.push(ringM);
    }
    const lHoles = stage.label('Steam holes, close up', [0, 2.6, 0], holesG);
    let fabNow = '', S = null, tt = 0, redraw = 0, cut = false, cutAt = 0, clothRows = [], clothT = AMB, damage = 0;
    const bT = board(root, 5.6, 3.0, 700, 376, (g, w, h) => {
      panelBg(g, w, h);
      if (S?.case === 'scale') {
        title(g, 'Steam the iron can push out', '% of new');
        const { X, Y } = axes(g, w, h, { x0: 62, y1: 56, y0: h - 46, xMin: 0, xMax: 24, yMin: 0, yMax: 100, xTicks: [0, 6, 12, 18, 24], yTicks: [0, 50, 100], xFmt: (v) => v + ' mo', yFmt: String });
        [[0, COL.ok], [100, COL.steam], [300, COL.heat], [600, COL.warn]].forEach(([mg, c]) => line(g, Array.from({ length: 49 }, (_, i) => [i / 2, 100 * (1 - scaleFrac(mg, i / 2))]), X, Y, c, mg === S.hard ? 5 : 2));
        g.font = 'bold 17px sans-serif'; g.fillStyle = '#fff'; g.fillText(`${S.hard} mg/L`, X(Math.min(22, S.months)) + 8, Y(100 * (1 - scaleFrac(S.hard, S.months))) - 8);
        return;
      }
      title(g, 'Soleplate and cloth', '°C');
      const t1 = Math.max(S?.case === 'heel' ? 900 : 120, sim.t), t0 = 0, st = t1 > 400 ? 120 : 30;
      const xt = []; for (let v = 0; v <= t1; v += st) xt.push(v);
      const { X, Y } = axes(g, w, h, { x0: 62, y1: 56, y0: h - 46, xMin: t0, xMax: t1, yMin: 0, yMax: 240, xTicks: xt, yTicks: [0, 100, 200], xFmt: (v) => (t1 > 400 ? (v / 60).toFixed(0) + ' min' : v + ' s'), yFmt: String });
      const F = FAB[S?.fab || 'cotton'];
      if (S?.case === 'facedown') dashH(g, X(t0), X(t1), Y(F.max), `${F.name.toLowerCase()} label ${'●'.repeat(F.dots)}`, 'rgba(255,90,110,.85)', true);
      line(g, sim.rows.map((r) => [r[0], r[1]]), X, Y, COL.hot, 4);
      if (S?.case === 'facedown') line(g, clothRows, X, Y, COL.cold, 3);
    }, [7.0, 4.6, -1.6]);
    bT.mesh.rotation.y = -0.35;
    const reset = () => {
      sim.reset(200); sim.on = false; cut = false; cutAt = 0; clothRows = []; clothT = AMB; damage = 0; burn.fill(0); hot.fill(AMB);
      if (S) cloth.setColor(FAB[S.fab].col);
    };
    reset();
    return {
      reset,
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s; tt += dt;
        tallView(stage, REEL);
        if (s._re || fabNow !== s.fab) { s._re = false; fabNow = s.fab; reset(); }
        const narrow = fitNarrow(stage, [lHoles]);
        placeBoards(stage, [bT], { x: 0.8, top: 9.6, scale: 1.1, z: -1 });
        narrowBoards(narrow, [[bT, [7.2, 2.0, 0.4]]]);
        const isScale = s.case === 'scale';
        holesG.visible = isScale; lHole.visible = isScale;
        // pose: face-down on the cloth, or standing on its heel
        const heel = s.case === 'heel';
        pivot.rotation.z = approach(pivot.rotation.z, heel ? Math.PI / 2 : 0, 4, dt);
        ironG.position.set(heel ? 3.0 : 0, 0.02, 0);
        cloth.mesh.visible = true;
        if (!isScale) {
          const limit = heel ? 480 : 30;
          sim.o.where = 'air';
          const span = dt * s.fast, n = Math.max(1, Math.ceil(span / 0.05));
          for (let i = 0; i < n; i++) {
            if (s.autoff && !cut && sim.t >= limit) { cut = true; cutAt = sim.t; }
            if (cut) { sim.o.set = -100; } else sim.o.set = 200;
            sim.step(span / n);
            // cloth under a face-down plate heats towards it (illustrative time constant 3 s)
            if (!heel) clothT = approach(clothT, sim.T, 1 / 3, span / n); else clothT = approach(clothT, AMB, 0.2, span / n);
            const F = FAB[s.fab];
            if (!heel && clothT > F.max + 20) damage = Math.min(1, damage + (span / n) * (clothT - F.max - 20) / 400);
            sim.record(heel ? 5 : 0.5, 4000);
            if (!clothRows.length || sim.t - clothRows.at(-1)[0] >= (heel ? 5 : 0.5)) clothRows.push([sim.t, clothT]);
          }
          for (let i = 0; i <= 60; i++) { const x = cloth.xOf(i); const under = !heel && x > -3 && x < 3.4; burn[i] = under ? damage * clamp(1 - Math.abs(x - 0.2) / 3.4, 0, 1) * 1.4 : 0; hot[i] = under ? clothT : AMB; }
          cloth.set(flat, null, hot, burn);
          smoke.step(dt, damage > 0.05 && damage < 0.99 ? 20 : damage >= 0.99 ? 8 : 0, () => [(Math.random() - 0.4) * 5, 1.3, (Math.random() - 0.5) * 2.6], () => [(Math.random() - 0.5) * 0.3, 0.7, (Math.random() - 0.5) * 0.3], 2.4, 2.6);
          lState.element.innerHTML = cut ? `auto shut-off: power cut at ${fmtT(cutAt)}` : sim.on ? 'element on' : `holding ${sim.T.toFixed(0)} °C`;
          lState.element.style.setProperty('--c', cut ? COL.ok : COL.hot);
          lState.visible = true;
        } else {
          sim.T = 200; clothT = AMB;
          cloth.set(flat, null, null, null);
          const k = scaleFrac(s.hard, s.months);
          scaleRings.forEach((r, i) => { const kk = clamp(k * (0.8 + 0.4 * ((i * 37) % 10) / 10), 0, 1); r.geometry.dispose(); r.geometry = new THREE.RingGeometry(Math.max(0.01, 0.42 * (1 - kk)), 0.42, 32); });
          lHole.element.innerHTML = `holes ${(k * 100).toFixed(0)}% blocked`;
          steamP.step(dt, 40 * (1 - k), () => [(Math.random() - 0.5) * 4, 1.15, (Math.random() - 0.5) * 2], () => [(Math.random() - 0.5) * 0.4, 0.8, (Math.random() - 0.5) * 0.4], 1.2, 2.2);
          lState.visible = false;
        }
        ir.set({ T: sim.T, on: sim.on && !cut, level: 0.6, dial: 0.85, lamp: sim.on && !cut });
        redraw += dt; if (redraw > 0.2) { redraw = 0; bT.redraw(); }
      },
      readout: (s) => {
        if (s.case === 'scale') {
          const k = scaleFrac(s.hard, s.months), grams = (s.hard / 1000) * WEEK_L * s.months * 4.35;
          return `<div class="big">Steam holes ${(k * 100).toFixed(0)}% blocked</div>
            <div class="row"><span>Water through the iron</span><b>${(WEEK_L * s.months * 4.35).toFixed(0)} L in ${s.months.toFixed(1)} months</b></div>
            <div class="row"><span>Chalk it leaves behind</span><b style="color:${COL.heat}">${grams.toFixed(1)} g</b></div>
            <div class="row"><span>IS 10500 drinking water</span><b>acceptable up to 200 mg/L</b></div>
            <small>Every litre boiled away leaves its hardness behind. Use the water the maker recommends and the self-clean or anti-scale feature.</small>`;
        }
        const F = FAB[s.fab], steamJ = latent(100) / 1000 + (C_WATER / 1000) * 63;
        return `<div class="big">${s.case === 'heel' ? 'Standing on its heel' : `Face-down on a ${F.name.toLowerCase()} shirt`}</div>
          <div class="row"><span>Soleplate</span><b style="color:${COL.hot}">${sim.T.toFixed(0)} °C</b></div>
          ${s.case === 'facedown' ? `<div class="row"><span>Cloth under it · label limit</span><b ${clothT > F.max ? 'class="no"' : ''}>${clothT.toFixed(0)} °C · ${F.max} °C</b></div>` : ''}
          <div class="row"><span>Auto shut-off</span><b>${!s.autoff ? 'none on this iron' : cut ? `cut the power at ${fmtT(cutAt)}` : `after ${s.case === 'heel' ? 'about 8 min' : 'about 30 s'} still`}</b></div>
          <div class="row"><span>Heat in 1 g of steam on skin</span><b>${(steamJ / 1000).toFixed(1)} kJ, vs 0.26 kJ for water</b></div>
          <small>${damage > 0.3 ? 'The cloth under the plate is scorching or melting. With no auto shut-off, the thermostat simply keeps it hot.' : 'Even with auto shut-off, switch off and unplug when you step away.'}</small>`;
      },
    };
  },
};
