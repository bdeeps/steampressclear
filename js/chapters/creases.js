// Chapter 2 (centrepiece): why heat, moisture and pressure take creases out.
// Left: a cloth on an ironing board with an iron gliding over it (1 unit ≈ 4 cm). Right: the chains
// inside one fibre, magnified millions of times, with their hydrogen bonds (dashed blue) and water.
// The model, column by column across the cloth:
//  · Under the iron the cloth heats towards the soleplate. While it is damp it cannot go above
//    100 °C: the heat goes into drying it (latent heat, 2,257 J/g; BoilClear). Steam from the holes
//    condenses on cooler cloth, wetting it and heating it to 100 °C at once.
//  · The chains can slide when the cloth is above its glass transition. Water lowers that temperature
//    for cotton and wool (it breaks the hydrogen bonds between chains); polyester barely takes up water.
//    The fabric numbers and the "mobility" curve are in press.js (FAB, tgOf, mobility): the glass
//    transitions are from the literature, the size of the water effect is illustrative.
//  · Where the iron presses and the chains can slide, the crease flattens: dA/dt = −2.5 m A per second,
//    with m the mobility from 0 to 1 (illustrative rate).
//  · Off the iron the cloth cools (time constant 4 s) and slowly dries. Below the glass transition the
//    chains lock and keep the flat shape: the hydrogen bonds re-form in their new places.
// Care-label limits: ISO 3758's dots (one 110 °C, two 150 °C, three 200 °C).
import { THREE } from '../kit.js';
import {
  makeIron, makeIroningBoard, makeCloth, makeChains, FAB, tgOf, mobility, AMB, COL, board, panelBg, title, fitNarrow, placeBoards, puffs, rng, dotStr, clamp, approach, link, hissSound,
  tallView,
} from '../press.js';

const NX = 120, VIEW = { pos: [1.6, 9.8, 18.6], target: [1.8, 5.3, 0] };

const REEL = [
    { ms: 5200, caption: 'A crease is long chain molecules bent into a fold and held by hydrogen bonds.', set: { fab: 'cotton', temp: 200, steam: false, glide: false }, act: (s, inst) => inst.crumple(), view: { pos: [5.4, 9.0, 11.4], target: [5.0, 6.4, 0] }, tall: { pos: [0.5, 9.5, 7.7], target: [-0.5, 7.5, 0] }, spin: 0.15 },
    { ms: 5800, caption: 'Steam slips between the chains, heat lets them slide, and the iron presses them flat. Cooling locks the shape.', set: { fab: 'cotton', temp: 200, steam: true, glide: true }, view: { pos: [1.6, 9.8, 18.6], target: [1.8, 5.3, 0] }, tall: { pos: [0.6, 9.4, 8.2], target: [-0.5, 7.2, 0] }, spin: 0.2 },
];

export default {
  id: 'creases',
  short: 'Why creases come out',
  title: 'Why heat and steam take creases out',
  subtitle: 'Loosen the bonds, press the chains flat, and let them set again as the cloth cools and dries.',
  view: VIEW,
  learn: `<p>Every fibre is a bundle of very long <b>chain molecules</b>. In <b>cotton</b> and <b>linen</b> the chains are <b>cellulose</b>; in <b>wool</b> they are a protein, <b>keratin</b>. Neighbouring chains hold hands with <b>hydrogen bonds</b>, about 20 times weaker than the bonds inside a chain (see ${link('bondclear', 'BondClear')}). A crease is chains bent into a fold and held there by those bonds.</p>
    <p>To unbend them you have to let go first. <b>Heat</b> shakes the chains. <b>Water</b> does something cleverer: its molecules slip in between the chains and make their own hydrogen bonds, so the chains let go of each other. Above a temperature called the <b>glass transition</b> the chains can slide, and the weight of the iron <b>presses</b> them flat.</p>
    <p>Then comes the part people forget. As the cloth <b>cools and dries</b>, the water leaves and the chains bond to each other again, in their new, flat places. The shape is <b>locked in</b>. That is why a shirt is ironed damp, and why you hang it before it is worn.</p>
    <p><b>Polyester</b> works differently: it hardly takes up water, but heat alone takes it past its glass transition of about 70 to 80 °C. Too hot and it goes shiny and melts, near 250 °C. That is why the care label's <b>dots</b> matter: one dot means up to 110 °C, two up to 150 °C, three up to 200 °C.</p>
    <p class="tip"><b>Try it:</b> iron dry cotton on three dots and watch how slowly the creases go. Now turn on the steam. Then try wool and polyester, and watch the readout when the plate is hotter than the label allows.</p>`,
  terms: [
    { t: 'Hydrogen bond', d: 'A weak pull between a slightly positive hydrogen on one molecule and an oxygen on another.' },
    { t: 'Cellulose', d: 'The long sugar chains that cotton, linen and paper are made of.' },
    { t: 'Keratin', d: 'The protein chains in wool, hair and nails.' },
    { t: 'Glass transition', d: 'The temperature above which a solid\'s long chains can slide past each other, so it softens.' },
    { t: 'Plasticiser', d: 'Something that gets between chains and lets them move. For cotton and wool, water is one.' },
  ],
  defaults: { fab: 'cotton', temp: 200, steam: false, glide: true },
  controls: [
    { key: 'fab', type: 'seg', label: 'Fabric', options: Object.entries(FAB).map(([v, f]) => ({ v, label: f.name })), hint: 'Each starts crumpled again.' },
    { key: 'temp', type: 'range', label: 'Soleplate temperature', min: 60, max: 230, step: 1, ends: ['cool', 'max'], fmt: (v) => `${v.toFixed(0)} °C · ${dotStr(v)}` },
    { key: 'steam', type: 'toggle', label: 'Steam on' },
    { key: 'glide', type: 'toggle', label: 'Iron gliding' },
    { key: 'again', type: 'buttons', label: 'Cloth', items: [{ label: 'Crumple it again', act: (s, inst) => inst.crumple() }, { label: 'Set the label\'s dots', act: (s) => { s.temp = FAB[s.fab].max; } }] },
  ],
  onChange(s, key) { if (key === 'fab') s._re = true; },
  quiz: [
    { q: 'Why does damp cotton iron flat much more easily than dry cotton?', options: ['Water is heavier', 'Water slips between the cellulose chains and breaks their hydrogen bonds, so they can slide', 'Water makes the iron hotter', 'Wet cloth is thinner'], answer: 1, why: 'Water is a plasticiser for cellulose: it lowers the temperature at which the chains can move, far below what a dry fibre needs.' },
    { q: 'What locks the flat shape in after ironing?', options: ['The steam', 'The cloth cooling and drying, so the chains bond again in their new places', 'Starch only', 'Static electricity'], answer: 1, why: 'Below its glass transition, and once the water has gone, the chains stick to each other again: the new shape is set.' },
    { q: 'A polyester shirt label shows two dots. What does that mean?', options: ['Iron at up to 150 °C', 'Iron twice', 'Iron at 200 °C', 'Do not iron'], answer: 0, why: 'In the ISO care symbols one dot is up to 110 °C, two up to 150 °C and three up to 200 °C. Much hotter and polyester goes shiny and can melt.' },
  ],
  reel: REEL,


  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const BX = -1.6;
    const bd = makeIroningBoard(root, { y: 3.0, len: 12, w: 5.0, x: BX });
    const cloth = makeCloth(root, { W: 10.4, D: 4.2, nx: NX, nz: 22, y: bd.topY + 0.02 });
    cloth.mesh.position.x = BX;
    const ironG = new THREE.Group(); root.add(ironG); ironG.scale.setScalar(0.62);
    const ir = makeIron(ironG);   // tip along +x, the way it glides
    const steamP = puffs(root, 120, 0.045, 0xeefaff, rng(4), 0.4, 0.9);
    // the magnified fibre
    const mag = new THREE.Group(); mag.position.set(5.4, 8.3, -1.4); root.add(mag);
    const ch = makeChains(mag, { n: 5, beads: 21, dx: 0.2, dy: 0.45 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.05, 8, 80), new THREE.MeshBasicMaterial({ color: 0x8ef0ff, transparent: true, opacity: 0.5 }));
    ring.position.set(0, 0.95, -0.1); mag.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(2.6, 64), new THREE.MeshBasicMaterial({ color: 0x0b0e14, transparent: true, opacity: 0.85 }));
    disc.position.set(0, 0.95, -0.4); mag.add(disc);
    const lMag = stage.label('Inside one fibre, magnified', [0, 3.85, 0], mag);
    const lHB = stage.label('', [0, -1.95, 0.2], mag, 'hot');
    const lIron = stage.label('', [0, 3.6, 0], ironG, 'hot');
    let S = null, ix = -5, dir = 1, tt = 0, fab = '', under = { T: AMB, w: 0, tg: 220, m: 0 };
    // a gauge board: the cloth's temperature against its glass transition and the label's limit
    const gb = board(root, 5.4, 2.4, 640, 284, (g, w, h) => draw(g, w, h), [7.9, 3.9, 0.6]);
    gb.mesh.rotation.y = -0.35;
    const f = new Float32Array(NX + 1).fill(1), Tc = new Float32Array(NX + 1).fill(AMB), wet = new Float32Array(NX + 1).fill(0), burn = new Float32Array(NX + 1).fill(0);
    const snd = hissSound();
    const crumple = () => { f.fill(1); Tc.fill(AMB); wet.fill(0); burn.fill(0); };
    function draw(g, w, h) {
      panelBg(g, w, h);
      const F = FAB[S?.fab || 'cotton'];
      title(g, 'Cloth under the iron', F.name.toLowerCase());
      const X = (T) => 40 + ((T - 20) / 240) * (w - 80);
      const y0 = 150;
      const grad = g.createLinearGradient(X(20), 0, X(260), 0); grad.addColorStop(0, '#3b7bff'); grad.addColorStop(0.5, '#e8eef8'); grad.addColorStop(1, '#ff5a2a');
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(X(20), y0 - 18, X(260) - X(20), 36);
      g.fillStyle = grad; g.globalAlpha = 0.9; g.fillRect(X(20), y0 - 18, Math.max(0, X(clamp(under.T, 20, 260)) - X(20)), 36); g.globalAlpha = 1;
      g.font = '17px sans-serif';
      for (const t of [50, 100, 150, 200, 250]) { g.fillStyle = 'rgba(255,255,255,.55)'; g.fillText(t + '°', X(t) - 12, y0 + 44); }
      const mark = (T, text, col, up) => { g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.moveTo(X(T), y0 - 30); g.lineTo(X(T), y0 + 26); g.stroke(); g.fillStyle = col; g.font = 'bold 17px sans-serif'; const tw = g.measureText(text).width; g.fillText(text, clamp(X(T) - tw / 2, 8, w - tw - 8), up ? y0 - 40 : y0 + 76); };
      mark(under.tg, `chains slide above ${under.tg.toFixed(0)}°`, COL.hb, true);
      mark(F.max, `label limit ${F.max}° ${'●'.repeat(F.dots)}`, COL.warn, false);
      g.fillStyle = COL.text; g.font = 'bold 22px sans-serif';
      g.fillText(`${under.T.toFixed(0)} °C · ${(under.w * 100).toFixed(0)}% water · chains ${under.m > 0.6 ? 'free' : under.m > 0.15 ? 'loosening' : 'locked'}`, 20, h - 22);
    }
    let redrawT = 0;
    return {
      crumple,
      dispose() { snd.dispose(); },
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s; tt += dt;
        tallView(stage, REEL);
        if (s._re || s.fab !== fab) { s._re = false; fab = s.fab; crumple(); cloth.setColor(FAB[fab].col); }
        const F = FAB[s.fab];
        const narrow = fitNarrow(stage, [lMag]);
        const tall = placeBoards(stage, [gb], { x: -0.5, top: 12.0, z: -1 });
        if (narrow && !tall) { mag.position.set(2.6, 0.2, 3.2); mag.scale.setScalar(0.62); } else { mag.position.set(tall ? -1.0 : 5.4, tall ? 7.0 : 8.3, tall ? 0.4 : -1.4); mag.scale.setScalar(1); }
        // glide the iron back and forth along the cloth
        if (s.glide) { ix += dir * 1.6 * dt; if (ix > 1.9) dir = -1; if (ix < -5.6) dir = 1; }
        ironG.position.set(ix, bd.topY + 0.12, 0);
        const xi0 = ix - 3.0 * 0.62, xi1 = ix + 3.4 * 0.62;
        const hot = s.temp >= 130;
        for (let i = 0; i <= NX; i++) {
          const x = cloth.xOf(i) + BX, underIron = x > xi0 && x < xi1;
          if (underIron) {
            if (s.steam && hot) { wet[i] = Math.min(0.25, wet[i] + 0.12 * dt); if (Tc[i] < 100) Tc[i] = approach(Tc[i], 100, 6, dt); }
            if (wet[i] > 0.002 && Tc[i] >= 99) { Tc[i] = 100; wet[i] = Math.max(0, wet[i] - 0.0006 * (s.temp - 100) * dt); }
            else Tc[i] = approach(Tc[i], s.temp, 1.6, dt);
          } else {
            Tc[i] = approach(Tc[i], AMB, 0.25, dt);
            wet[i] = Math.max(0, wet[i] - (Tc[i] > 45 ? 0.01 : 0.0015) * dt);
          }
          const m = mobility(Tc[i], tgOf(F, wet[i]));
          if (underIron) f[i] *= Math.exp(-2.5 * m * dt);
          if (Tc[i] > F.max + 25) burn[i] = Math.min(1, burn[i] + 0.15 * dt * (Tc[i] - F.max - 25) / 20);
        }
        cloth.set(f, wet, Tc, burn);
        // the column under the middle of the iron drives the magnified view
        const ci = cloth.colOf(ix - BX + 0.2);
        const tg = tgOf(F, wet[ci]), m = mobility(Tc[ci], tg);
        under = { T: Tc[ci], w: wet[ci], tg, m };
        ch.set({ bend: f[ci], free: m, bonds: F.hb ? 1 - 0.85 * m : 0, water: clamp(wet[ci] * 4, 0, 1), hb: F.hb, dt, colorHex: F.col });
        lHB.element.innerHTML = F.hb ? (m > 0.6 ? 'hydrogen bonds broken: chains slide' : m > 0.15 ? 'bonds loosening' : 'hydrogen bonds hold the shape') : (m > 0.6 ? 'above its glass transition: chains slide' : 'below its glass transition: frozen');
        lHB.element.style.setProperty('--c', m > 0.6 ? COL.ok : COL.hb);
        ir.set({ T: s.temp, on: true, level: 0.6, dial: clamp((s.temp - 60) / 170, 0, 1) });
        lIron.element.innerHTML = `${s.temp.toFixed(0)} °C ${dotStr(s.temp)}`; lIron.element.style.setProperty('--c', s.temp > F.max ? COL.warn : COL.hot);
        lIron.visible = false;
        // steam puffs from under the iron
        steamP.step(dt, s.steam && hot ? 60 : 0, () => [ix + (Math.random() - 0.2) * 3.0, bd.topY + 0.15, (Math.random() - 0.5) * 1.8], () => [(Math.random() - 0.5) * 0.6, 0.7 + Math.random() * 0.5, (Math.random() - 0.5) * 0.6], 1.3, 2.2);
        snd.set(s.steam && hot ? 0.12 : 0);
        redrawT += dt; if (redrawT > 0.12) { redrawT = 0; gb.redraw(); }
      },
      readout: (s) => {
        const F = FAB[s.fab], left = (f.reduce((a, b) => a + b, 0) / f.length) * 100;
        const over = s.temp - F.max;
        return `<div class="big">${left < 8 ? 'Pressed flat' : `Creases left: ${left.toFixed(0)}%`}</div>
          <div class="row"><span>Cloth under the iron</span><b style="color:${COL.hot}">${under.T.toFixed(0)} °C, ${(under.w * 100).toFixed(0)}% water</b></div>
          <div class="row"><span>Chains can slide above</span><b style="color:${COL.hb}">${under.tg.toFixed(0)} °C</b></div>
          <div class="row"><span>${F.name} label</span><b ${over > 0 ? 'class="no"' : ''}>${'●'.repeat(F.dots)} up to ${F.max} °C</b></div>
          <small>${over > 0 ? `${over.toFixed(0)} °C over the label. ${F.harm}` : s.steam && s.temp < 130 ? 'Too cool to make steam: the anti-drip valve holds the water back.' : F.hb ? 'Damp cloth stays near 100 °C until it dries: the heat goes into turning its water to steam.' : 'Polyester hardly takes up water, so steam helps it less than heat does.'}</small>`;
      },
    };
  },
};
