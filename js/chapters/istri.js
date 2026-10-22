// Chapter 5: the istri-wala's charcoal iron (1 unit ≈ 4 cm).
// The model is CharcoalSim in press.js: a 5 kg cast-iron box (2,300 J/K; Indian laundry charcoal irons
// are listed at 4.8 and 5.5 kg, search summaries) heated by charcoal at 30.8 MJ/kg (FAO), half of
// whose heat reaches the iron (illustrative). It loses about 2.2 W per degree while pressing and
// 1.6 W per degree resting (illustrative). The coals smoulder at about 0.025 g/s with the lid shut;
// blowing on them, or fanning them, lets in more air and they burn up to four times faster for a
// while (illustrative). Newton cooling without fire: τ = C ÷ G, about 17 minutes while pressing.
// The trade: Mumbai's Dhobi Ghat at Mahalaxmi, built in 1890, where over 7,000 people wash, dry and
// press more than a lakh (100,000) clothes a day (Wikipedia, Dhobi Ghat (Mumbai)); Kerala's use of
// burning coconut shells instead of charcoal (Wikipedia, Clothes iron); the solar ironing cart of
// Vinisha Umashankar of Tiruvannamalai, a 2021 Earthshot Prize finalist: five hours of sunshine runs
// the iron for six hours (earthshotprize.org).
// Carbon monoxide, in official wording: "Carbon monoxide (CO) is produced whenever any fuel such as
// gas, oil, kerosene, wood, or charcoal is burned"; "You can't see or smell carbon monoxide, but at
// high levels it can kill a person in minutes"; "DON'T ever use a charcoal grill indoors" (US EPA,
// Protect Your Family and Yourself from Carbon Monoxide Poisoning).
import { THREE } from '../kit.js';
import {
  makeCharcoalIron, makeCloth, CharcoalSim, COAL, AMB, COL, board, panelBg, title, axes, line, dashH, fitNarrow, placeBoards, puffs, rng, dotStr, coolTime,
  clamp, fmtT, link,
  tallView, narrowBoards,
} from '../press.js';
import { M, box } from '../kit.js';

const VIEW = { pos: [3.4, 8.4, 16.4], target: [1.6, 4.7, 0] };

const REEL = [
    { ms: 5600, caption: 'The istri-wala\'s iron is five kilograms of hot iron: a heat store, revived by a breath on the coals.', set: { pressing: true, xray: true, fast: 10 }, act: (s, inst) => { inst.reset(); inst.blow(); }, view: { pos: [3.4, 7.6, 13.6], target: [2.2, 4.4, 0] }, tall: { pos: [2.8, 8.6, 9.0], target: [1.2, 6.4, 0] }, spin: 0.3 },
];

export default {
  id: 'istri',
  short: 'The istri-wala\'s iron',
  title: 'The istri-wala\'s charcoal iron',
  subtitle: 'Five kilograms of hot iron, a bed of glowing coals, and a breath of air to wake them.',
  view: VIEW,
  learn: `<p>On street corners all over India, the <b>istri-wala</b> or <b>press-wala</b> works at a wooden cart with a padded top, a stack of clothes, a bowl of water, and a heavy <b>box iron</b>. Inside the box is a bed of <b>glowing charcoal</b>; in Kerala, burning <b>coconut shells</b> have long been used instead. It is skilled work: the iron has no dial, so its heat is judged by eye, by hand and by a sprinkle of water.</p>
    <p>Why so heavy? Weight is <b>heat store</b>. Five kilograms of cast iron hold about <b>2,300 joules per degree</b>, nearly four times an electric soleplate. So the box stays hot for a long time between loads of coal, and its weight presses the cloth too. With no fire it would cool from 200 °C to 150 °C in about 6 minutes while pressing.</p>
    <p>When it starts to cool, the istri-wala <b>blows on the coals</b>, or swings the iron or fans it. More air reaches the charcoal, it burns faster and glows brighter, and the iron warms again. Charcoal gives about <b>31 megajoules per kilogram</b>, so a couple of hundred grams last hours.</p>
    <p>Burning charcoal always makes <b>carbon monoxide</b>, a gas you cannot see or smell, which at high levels can kill in minutes. A charcoal iron, sigri or angithi must <b>never be used or left burning in a closed room</b>: only outdoors or with plenty of fresh air. Mumbai's <b>Dhobi Ghat</b>, built in 1890, still washes and presses more than a lakh clothes a day, and in 2021 a 14-year-old from Tiruvannamalai, <b>Vinisha Umashankar</b>, designed a <b>solar ironing cart</b> to replace the charcoal.</p>
    <p class="tip"><b>Try it:</b> speed time up and watch the iron cool as the coals burn down. Blow on the coals, then add fresh ones. Compare how fast it cools while pressing and while resting.</p>`,
  terms: [
    { t: 'Istri-wala', d: 'The person who presses clothes for a living, often from a cart on the street.' },
    { t: 'Box iron', d: 'A hollow iron filled with hot coals or a hot metal block.' },
    { t: 'Heat store', d: 'A heavy, hot object that keeps giving out heat as it cools.' },
    { t: 'Carbon monoxide', d: 'A poisonous gas with no colour or smell, made whenever fuel burns.' },
    { t: 'Dhobi', d: 'A washerman or washerwoman; a dhobi ghat is a place where many work together.' },
  ],
  defaults: { pressing: true, xray: true, fast: 10 },
  controls: [
    { key: 'coal', type: 'buttons', label: 'The coals', items: [{ label: 'Blow on the coals', act: (s, inst) => inst.blow() }, { label: 'Add fresh coals', act: (s, inst) => inst.addCoal() }, { label: 'Start again', act: (s, inst) => inst.reset() }] },
    { key: 'pressing', type: 'toggle', label: 'Pressing clothes', hint: 'Off: it rests on the cart and loses heat more slowly.' },
    { key: 'xray', type: 'toggle', label: 'See the coals inside' },
    { key: 'fast', type: 'seg', label: 'Time', options: [{ v: 1, label: 'Real time' }, { v: 10, label: '×10' }, { v: 60, label: '×60' }] },
  ],
  quiz: [
    { q: 'Why is a charcoal iron so heavy?', options: ['To look strong', 'Its mass stores heat, so it stays hot between loads of coal, and it presses the cloth', 'Charcoal is heavy', 'To stop it being stolen'], answer: 1, why: 'Five kilograms of iron store about 2,300 J per degree, so the iron cools slowly and evenly.' },
    { q: 'Why does blowing on the coals make the iron hotter?', options: ['Breath is warm', 'More air reaches the charcoal, so it burns faster and gives more heat', 'It blows the ash on the iron', 'It does not'], answer: 1, why: 'Burning needs oxygen. Inside a closed box the coals only smoulder; fresh air lets them burn hard again.' },
    { q: 'Where is it safe to use a charcoal iron or sigri?', options: ['In a closed bedroom', 'Only outdoors or with plenty of fresh air, because burning charcoal makes carbon monoxide', 'In a closed kitchen', 'Anywhere'], answer: 1, why: 'Carbon monoxide has no colour or smell and at high levels can kill in minutes. Never burn charcoal in a closed room.' },
  ],
  reel: REEL,


  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    // the cart: a wooden table with a padded top, a stack of folded clothes and a bowl of water
    const wood = M.matte(0x7a5232, { roughness: 0.8 });
    const top = box(12, 0.35, 5.2, wood); top.position.set(0, 2.6, 0); root.add(top);
    const pad = box(11.4, 0.12, 4.8, M.matte(0x8a4a4a)); pad.position.set(0, 2.83, 0); root.add(pad);
    [[-5.5, -2.2], [-5.5, 2.2], [5.5, -2.2], [5.5, 2.2]].forEach(([x, z]) => { const l = box(0.35, 2.45, 0.35, wood); l.position.set(x, 1.22, z); root.add(l); });
    const cols = [0xd9534f, 0x5bc0de, 0xf0ad4e, 0xffffff, 0x5cb85c];
    cols.forEach((c, i) => { const f = box(2.6, 0.22, 2.0, M.matte(c)); f.position.set(-4.0, 3.0 + i * 0.23, -0.9); f.rotation.y = (i % 2 ? 0.05 : -0.04); root.add(f); });
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.45, 0.4, 24, 1, true), M.metal(0xb8bec8, { side: THREE.DoubleSide })); bowl.position.set(-4.4, 3.1, 1.6); root.add(bowl);
    const bw = new THREE.Mesh(new THREE.CircleGeometry(0.56, 24), M.clear(0x4aa3ff, 0.6)); bw.rotation.x = -Math.PI / 2; bw.position.set(-4.4, 3.2, 1.6); root.add(bw);
    const cloth = makeCloth(root, { W: 7, D: 4, nx: 50, nz: 14, y: 2.9, col: 0xeae3d2, seed: 9 });
    cloth.mesh.position.x = 1.8;
    const flat = new Float32Array(51).fill(0.25); cloth.set(flat);
    const ironG = new THREE.Group(); root.add(ironG); ironG.position.set(1.8, 3.0, 0); ironG.scale.setScalar(0.85);
    const ci = makeCharcoalIron(ironG);
    const smoke = puffs(root, 90, 0.07, 0xaab0b8, rng(13), 0.22, 0.5);
    const sim = new CharcoalSim();
    const lT = stage.label('', [0, 3.6, 0], ironG, 'hot');
    const lCO = stage.label('Smoke and carbon monoxide: keep it outdoors', [-2.6, 4.4, 0], ironG);
    const lC = stage.label('', [-1.6, 0.9, 1.6], ironG);
    const bT = board(root, 5.4, 3.0, 680, 378, (g, w, h) => {
      panelBg(g, w, h); title(g, 'The iron\'s temperature', 'last hour');
      const t1 = Math.max(1800, sim.t), t0 = Math.max(0, t1 - 3600), st = t1 - t0 > 1800 ? 900 : 300;
      const xt = []; for (let v = Math.ceil(t0 / st) * st; v <= t1; v += st) xt.push(v);
      const { X, Y } = axes(g, w, h, { x0: 62, y1: 56, y0: h - 46, xMin: t0, xMax: t1, yMin: 0, yMax: 300, xTicks: xt, yTicks: [0, 100, 200, 300], xFmt: (v) => (v / 60).toFixed(0) + ' min', yFmt: (v) => v + '°' });
      dashH(g, X(t0), X(t1), Y(200), '●●● 200°', 'rgba(255,122,89,.7)', true);
      dashH(g, X(t0), X(t1), Y(150), '●● 150°', 'rgba(255,181,71,.7)', true);
      dashH(g, X(t0), X(t1), Y(110), '● 110°', 'rgba(142,240,255,.7)', true);
      line(g, sim.rows.filter((r) => r[0] >= t0).map((r) => [r[0], r[1]]), X, Y, COL.hot, 4);
    }, [7.4, 6.6, -1.4]);
    bT.mesh.rotation.y = -0.35;
    let S = null, tt = 0, redraw = 0, glide = 0;
    const reset = () => { sim.reset(205); sim.coal = 0.2; sim.rows = []; };
    reset();
    return {
      reset, blow: () => { sim.blow = 1; }, addCoal: () => sim.addCoal(),
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s; tt += dt;
        tallView(stage, REEL);
        const narrow = fitNarrow(stage, [lC, lCO]);
        placeBoards(stage, [bT], { x: 1.6, top: 10.6, scale: 1.1, z: -1 });
        narrowBoards(narrow, [[bT, [7.2, 2.0, 0.6]]]);
        sim.pressing = s.pressing;
        const span = dt * s.fast, n = Math.max(1, Math.ceil(span / 0.5));
        for (let i = 0; i < n; i++) { sim.step(span / n); sim.record(10, 3600); }
        glide += dt * (s.pressing ? 1.3 : 0);
        ironG.position.x = 1.8 + (s.pressing ? Math.sin(glide) * 1.4 : 0);
        ci.set({ glow: sim.glow + 0.25 * sim.blow, coal: clamp(sim.coal / 0.25, 0, 1), open: 0, xray: s.xray, tt });
        const p = ironG.position;
        smoke.step(dt, 6 + 30 * sim.blow * (sim.coal > 0.005 ? 1 : 0), () => [p.x - 2.0 + Math.random() * 4, p.y + 1.9, (Math.random() - 0.5) * 2.4], () => [(Math.random() - 0.5) * 0.3, 0.6 + Math.random() * 0.4, (Math.random() - 0.5) * 0.3], 3.0, 3.0);
        lT.element.innerHTML = `${sim.T.toFixed(0)} °C ${dotStr(sim.T)}`;
        lT.element.style.setProperty('--c', sim.T > 210 ? COL.warn : COL.hot);
        lC.element.innerHTML = `coals: ${(sim.coal * 1000).toFixed(0)} g${sim.blow > 0.05 ? ' · blowing!' : ''}`;
        lCO.visible = !narrow;
        redraw += dt; if (redraw > 0.25) { redraw = 0; bT.redraw(); }
      },
      readout: (s) => {
        const G = s.pressing ? COAL.G : COAL.Grest;
        const air = 1 + 3 * clamp(sim.blow, 0, 1);
        const rate = sim.coal > 0.005 ? COAL.burn * air * clamp(sim.coal / 0.05, 0.2, 1) * 3600 * 1000 : 0;
        const store = Math.max(0, COAL.C * (sim.T - 100)) / 1000;
        return `<div class="big">Iron at ${sim.T.toFixed(0)} °C</div>
          <div class="row"><span>Coals left · burning</span><b style="color:${COL.hot}">${(sim.coal * 1000).toFixed(0)} g · ${rate.toFixed(0)} g an hour</b></div>
          <div class="row"><span>Heat stored above 100 °C</span><b>${store.toFixed(0)} kJ</b></div>
          <div class="row"><span>That is a 1,000 W iron running for</span><b>${fmtT(store)}</b></div>
          <div class="row"><span>With no fire, cools to ●● 150 °C in</span><b>${fmtT(coolTime(sim.T, 150, G))}</b></div>
          <small>Burning charcoal makes carbon monoxide. Never use a charcoal iron, sigri or angithi in a closed room.</small>`;
      },
    };
  },
};
