// Shared parts for SteamPressClear: steam-table physics, a household steam iron's heat budget and
// thermostat, the bimetal strip, fabrics and their glass transitions, a boiler press, the istri-wala's
// charcoal iron, chart boards, steam puffs, and generic 3D models (no maker's design or logo).
// Scenes are built in "scene units": 1 unit ≈ 4 cm unless a chapter says otherwise, +x to the right, +y up.
//
// Numbers shared with sibling boxes, so that they agree:
//  · Steam tables (saturation line, latent heat): copied from BoilClear (boil.js) and PressureCookerClear
//    (cooker.js): IAPWS-IF97 region 4 and BoilClear's latent-heat fit (2,257 kJ/kg at 100 °C).
//  · Current at 230 V: MCBClear and ExtensionBoardClear use I = P ÷ 230 for heaters and irons
//    (an iron is a pure resistance, power factor 1).
//  · Hydrogen bond strength, about 21 kJ/mol against 464 kJ/mol for an O–H covalent bond: BondClear.
import { THREE, M, box, beam, tube, arrow, clamp, smooth, approach, lerp } from './kit.js';
import { audio } from './ui.js';

// ---------------------------------------------------------------- constants
export const K0 = 273.15;              // 0 °C in kelvin
export const ATM = 101.325;            // kPa, one standard atmosphere
export const BAR = 100;                // kPa in 1 bar
export const C_WATER = 4186;           // J/(kg·K)
export const CP_STEAM = 2030;          // J/(kg·K), steam near 1 atm between 100 and 150 °C (steam tables)
export const R_V = 8.314462618 / 0.018015;   // 461.5 J/(kg·K), water vapour
export const MAINS = 230;              // V, Indian mains (as in MCBClear)
export const TAU = Math.PI * 2;
export const AMB = 30;                 // °C, a warm Indian room

// Saturation line of water, IAPWS-IF97 region 4 (same code as BoilClear and PressureCookerClear).
const N = [0, 0.11670521452767e4, -0.72421316703206e6, -0.17073846940092e2, 0.12020824702470e5, -0.32325550322333e7,
  0.14915108613530e2, -0.48232657361591e4, 0.40511340542057e6, -0.23855557567849, 0.65017534844798e3];
export function psat(T) {
  const K = T + K0, th = K + N[9] / (K - N[10]);
  const A = th * th + N[1] * th + N[2], B = N[3] * th * th + N[4] * th + N[5], C = N[6] * th * th + N[7] * th + N[8];
  return 1000 * Math.pow((2 * C) / (-B + Math.sqrt(B * B - 4 * A * C)), 4);
}
export function tsat(P) {
  const b = Math.pow(Math.max(P, 0.05) / 1000, 0.25);
  const E = b * b + N[3] * b + N[6], F = N[1] * b * b + N[4] * b + N[7], Gg = N[2] * b * b + N[5] * b + N[8];
  const D = (2 * Gg) / (-F - Math.sqrt(F * F - 4 * E * Gg));
  return (N[10] + D - Math.sqrt((N[10] + D) ** 2 - 4 * (N[9] + N[10] * D))) / 2 - K0;
}
// Latent heat (J/kg) at T °C, BoilClear's steam-table fit: 2,257 kJ/kg at 100 °C, 2,114 at 150 °C.
export const latent = (T) => 1000 * (2500.9 - 2.2 * T - 0.0024 * T * T);
// Enthalpy of saturated liquid and of saturated (dry) steam, J/kg from 0 °C. A fit to the steam
// tables good to about 0.3% from 20 to 180 °C (hf: 419 kJ/kg at 100 °C, 632 at 150 °C).
export const hf = (T) => 1000 * (4.18 * T + 0.00026 * T * T);
export const hg = (T) => hf(T) + latent(T);
// Heat to turn 1 kg of tap water at Tin into steam at 100 °C: warm it, then boil it.
export const steamHeat = (Tin = AMB) => C_WATER * (100 - Tin) + latent(100);   // ≈ 2.55 MJ/kg from 30 °C
export const amps = (W) => W / MAINS;

// ---------------------------------------------------------------- the household steam iron
// A generic 2,000 W steam iron. Its soleplate and what is cast into it (an aluminium soleplate of about
// 0.55 kg at 900 J/(kg·K), plus about 0.25 kg of steel parts at 500) store about 620 J per degree:
// an illustrative figure for an iron of about 1.2–1.5 kg. Heat lost from the hot metal: about
// 1.0 W per degree above the room when it stands in air (convection plus radiation, roughly
// 12 W/m²K over 0.08 m²), about 2.0 W per degree while it is gliding over cloth, which soaks heat up.
// Both are illustrative, chosen so that a 2 kW iron at 200 °C has about 40 g/min of steam to spare,
// the continuous steam rate makers print for 2 kW irons (24–40 g/min in the specs we checked).
export const IRON = { P: 2000, C: 620, Gair: 1.0, Gcloth: 2.0, hyst: 10, steamMin: 130, shot: 4 };
// The care-label dots (ISO 3758): the most the soleplate should reach. One dot 110 °C, two dots
// 150 °C, three dots 200 °C (Wikipedia, Laundry symbol; and search summaries of the standard).
export const DOTS = [{ n: 1, T: 110, fab: 'nylon, acrylic, silk' }, { n: 2, T: 150, fab: 'wool, polyester' }, { n: 3, T: 200, fab: 'cotton, linen' }];
export const dotsFor = (T) => (T <= 110 ? 1 : T <= 150 ? 2 : T <= 200 ? 3 : 4);
export const dotStr = (T) => { const d = dotsFor(T); return d > 3 ? 'over ●●●' : '●'.repeat(d); };
// How many seconds from Ta to T1 for heater P, store C and loss G (W/K): C dT/dt = P − G (T − Ta).
export function warmUp(P = IRON.P, T1 = 200, { C = IRON.C, G = IRON.Gair, Ta = AMB } = {}) {
  const top = Ta + P / G; if (T1 >= top) return Infinity;
  return (C / G) * Math.log((top - Ta) / (top - T1));
}
// The steam a heater can keep making while the soleplate holds T: what is left after the losses.
export const steadySteam = (P = IRON.P, T = 200, G = IRON.Gcloth, Tin = AMB) => Math.max(0, P - G * (T - AMB)) / steamHeat(Tin);   // kg/s

export class IronSim {
  constructor(o = {}) { this.o = { P: IRON.P, set: 200, steam: 0, where: 'air', ...o }; this.reset(); }
  reset(T = AMB) { Object.assign(this, { T, on: true, t: 0, rows: [], onTime: 0, steamed: 0, leak: false, shotLeft: 0, flow: 0, heatOut: 0, steamW: 0 }); }
  get G() { return this.o.where === 'cloth' ? IRON.Gcloth : IRON.Gair; }
  shot() { this.shotLeft += IRON.shot / 1000; }      // a burst of about 4 g of water onto the hot plate
  step(dt) {
    const o = this.o, h = IRON.hyst / 2;
    if (this.on && this.T >= o.set + h) this.on = false;
    else if (!this.on && this.T <= o.set - h) this.on = true;
    const hot = this.T >= IRON.steamMin;
    // The anti-drip valve keeps the water back while the plate is too cool to turn it to steam.
    let m = hot ? o.steam / 60000 : 0;                // kg/s from the drip valve
    if (hot && this.shotLeft > 0) { const b = Math.min(this.shotLeft, 0.004 * dt); this.shotLeft -= b; m += b / Math.max(dt, 1e-6); }
    if (!hot) this.shotLeft = 0;
    this.leak = !hot && o.steam > 0;
    this.flow = m;
    const heat = this.on ? o.P : 0, loss = this.G * (this.T - AMB), stm = m * steamHeat();
    this.heatOut = loss; this.steamW = stm;
    this.T += ((heat - loss - stm) * dt) / IRON.C;
    this.T = Math.max(AMB - 1, this.T);
    this.steamed += m * dt; this.onTime += this.on ? dt : 0; this.t += dt;
  }
  record(every = 0.5, keep = 240) { if (!this.rows.length || this.t - this.rows.at(-1)[0] >= every) { this.rows.push([this.t, this.T, this.on ? 1 : 0, this.flow]); while (this.rows.length && this.rows[0][0] < this.t - keep) this.rows.shift(); } }
}

// ---------------------------------------------------------------- the bimetal strip
// Two metals bonded together expand by different amounts, so the strip curls as it warms. For two
// layers of equal thickness and similar stiffness, Timoshenko's result gives the curvature
// κ = 3 Δα ΔT ÷ (2 t), with t the total thickness, and a strip of length L clamped at one end lifts
// its tip by about κ L² ÷ 2. Brass (about 19 × 10⁻⁶ per K) on invar (about 1.2 × 10⁻⁶ per K) gives
// Δα ≈ 18 × 10⁻⁶ per K. Strip size (0.8 mm thick, 25 mm long) is illustrative.
export const BIMETAL = { da: 18e-6, t: 0.8e-3, L: 0.025 };
export const curvature = (dT, b = BIMETAL) => (3 * b.da * dT) / (2 * b.t);       // 1/m
export const tipLift = (dT, b = BIMETAL) => (curvature(dT, b) * b.L * b.L) / 2;  // m

// ---------------------------------------------------------------- fabrics
// Why heat and moisture take creases out. Cotton and linen (cellulose) and wool (keratin) hold their
// shape with hydrogen bonds between their long chains; water slips in between the chains, breaks
// those bonds and lowers the glass transition, the temperature above which the chains can slide.
// Polyester and nylon barely take up water: heat alone moves them past their glass transition.
// Glass transitions: PET (polyester) 67–81 °C (Wikipedia, PET); nylon 6 about 50 °C; dry wool about
// 174 °C (Wortmann et al., Biopolymers 2006, as cited in a patent, search summary only); dry cellulose
// is reported anywhere from about 200 to 250 °C. How fast moisture lowers it ("wet" below) is
// illustrative: the papers agree that water plasticises cellulose and keratin strongly, but differ
// on the numbers. Melting: PET about 250–260 °C (Wikipedia, PET), nylon 6 about 220 °C (search
// summaries). Cotton does not melt: it begins to decompose and brown near 210 °C (Luo et al., J.
// Therm. Anal. Calorim. 2017, search summary only).
export const FAB = {
  cotton: { name: 'Cotton', dots: 3, max: 200, tg: 220, wet: 1500, hb: true, col: 0xf1ede4, chain: 'cellulose', harm: 'Too hot and it browns and scorches: cellulose starts to break down near 210 °C.' },
  wool: { name: 'Wool', dots: 2, max: 150, tg: 174, wet: 1200, hb: true, col: 0xd9c9a8, chain: 'keratin', harm: 'Too hot and it yellows, goes shiny or scorches. Press it through a damp cloth.' },
  polyester: { name: 'Polyester', dots: 2, max: 150, tg: 75, wet: 0, hb: false, col: 0x9ec3e6, chain: 'polyester (PET)', harm: 'Too hot and it goes shiny, then softens and sticks: PET melts at about 250–260 °C.' },
  nylon: { name: 'Nylon', dots: 1, max: 110, tg: 50, wet: 150, hb: true, col: 0xc6a6e0, chain: 'nylon', harm: 'It glazes and melts easily: nylon 6 melts near 220 °C.' },
};
export const tgOf = (f, w) => Math.max(20, f.tg - f.wet * clamp(w, 0, 0.3));
export const mobility = (T, tg) => 1 / (1 + Math.exp(-(T - tg) / 10));

// ---------------------------------------------------------------- the boiler press
// A laundry's boiler iron: a small electric boiler (here 3 L of water, a 1,500 W heater) feeds a
// heavy iron (800 W of its own) through a hose; the cloth lies on a vacuum table. Makers' specs we
// found: 3.5 bar for a 2 kW ironing station, up to 5.5 bar for a 1.2 kW + 0.8 kW professional set
// (retailer and maker listings, search summaries). A pressure switch turns the heater off at the set
// pressure; the safety valve is a separate backup set above it by the maker (here 6.5 bar gauge,
// illustrative). A small boiler like this is far below the Boilers Act's definition of a "boiler"
// (more than 22.75 litres under the 1923 Act, at least 25 litres under the Boilers Act 2025), so it
// is the appliance standard (IS 302-2-3 / IEC 60335-2-3 covers irons with a boiler up to 5 litres)
// and the maker's own valve that keep it safe.
export const PRESS = { water: 3, heater: 1500, ironW: 800, vacW: 250, relief: 6.5, hyst: 0.3, orifice: 2.0e-6 };
// Steam through a small valve escapes at the speed of sound (choked): ṁ = 0.667 A P ÷ √(R_v T).
export const choked = (A, PkPa, T) => (0.667 * A * PkPa * 1000) / Math.sqrt(R_V * (T + K0));
// Dry saturated steam from a boiler at gauge pressure g (bar) keeps its enthalpy as it expands through
// the valve to 1 atm, so it arrives hotter than 100 °C and dry: this is the throttling calorimeter.
export function throttle(gBar, x = 1) {
  const Ts = tsat(ATM + gBar * BAR), h = hf(Ts) + x * latent(Ts), h100 = hg(100);
  if (h >= h100) return { Ts, Tout: 100 + (h - h100) / CP_STEAM, wet: 0, xMin: (h100 - hf(Ts)) / latent(Ts) };
  return { Ts, Tout: 100, wet: (h100 - h) / latent(100), xMin: (h100 - hf(Ts)) / latent(Ts) };
}
// Steam the hot water could flash into if the pressure fell to 1 atm: its heat above 100 °C over latent heat.
export const flashStore = (kg, Ts) => (kg * (hf(Ts) - hf(100))) / latent(100);   // kg

export class BoilerSim {
  constructor(o = {}) { this.o = { set: 4, heater: PRESS.heater, draw: false, ...o }; this.reset(); }
  reset() { Object.assign(this, { T: AMB, m: PRESS.water, on: true, t: 0, flow: 0, rows: [], relief: false, used: 0 }); }
  get P() { return Math.max(ATM, psat(this.T)); }
  get gauge() { return (this.P - ATM) / BAR; }
  step(dt) {
    const o = this.o, g = this.gauge;
    if (this.on && g >= o.set) this.on = false; else if (!this.on && g <= o.set - PRESS.hyst) this.on = true;
    this.relief = g >= PRESS.relief;
    this.flow = (o.draw && g > 0.05 ? choked(PRESS.orifice, this.P, this.T) : 0) + (this.relief ? choked(8e-6, this.P, this.T) : 0);
    const heat = this.on ? o.heater : 0, loss = 3 * (this.T - AMB);     // 3 W/K from a lagged boiler (illustrative)
    const C = this.m * C_WATER + 2.5 * 500;                                // water plus about 2.5 kg of steel
    this.T += ((heat - loss - this.flow * latent(this.T)) * dt) / C;
    this.m = Math.max(0.2, this.m - this.flow * dt); this.used += this.flow * dt; this.t += dt;
  }
  record(every = 2, keep = 1500) { if (!this.rows.length || this.t - this.rows.at(-1)[0] >= every) { this.rows.push([this.t, this.gauge, this.T]); while (this.rows[0][0] < this.t - keep) this.rows.shift(); } }
}

// ---------------------------------------------------------------- the charcoal iron
// The istri-wala's box iron: a heavy box with a grate of glowing charcoal inside. Indian sellers list
// laundry charcoal irons of 4.8 and 5.5 kg (search summaries); we take 5 kg of cast iron at
// 460 J/(kg·K), so it stores about 2,300 J per degree, nearly four times an electric soleplate.
// Charcoal gives about 30.8 MJ/kg (FAO). We assume half of the fire's heat reaches the iron and the rest
// leaves with the hot air through the holes (illustrative). The loss from the box: about 2.2 W per
// degree while pressing and 1.6 resting (illustrative). With the lid shut the coals smoulder at about
// 0.025 g/s; blowing or fanning pushes in more air and they burn up to four times faster, fading over
// about 30 s (illustrative).
export const COAL = { C: 5 * 460, HV: 30.8e6, eta: 0.5, G: 2.2, Grest: 1.6, burn: 0.025e-3, fill: 0.25 };
export class CharcoalSim {
  constructor() { this.reset(); }
  reset(T = AMB) { Object.assign(this, { T, coal: COAL.fill, blow: 0, glow: 0.4, t: 0, rows: [], used: 0, pressing: true }); }
  addCoal() { this.coal = Math.min(0.35, this.coal + 0.15); }
  step(dt) {
    const air = 1 + 3 * clamp(this.blow, 0, 1);
    this.glow = approach(this.glow, this.coal > 0.005 ? clamp(0.25 * air, 0, 1) : 0, 2, dt);
    const r = this.coal > 0.005 ? COAL.burn * air * clamp(this.coal / 0.05, 0.2, 1) : 0;    // kg/s
    const G = this.pressing ? COAL.G : COAL.Grest;
    this.T += ((COAL.eta * r * COAL.HV - G * (this.T - AMB)) * dt) / COAL.C;
    this.coal = Math.max(0, this.coal - r * dt); this.used += r * dt; this.t += dt;
    this.blow = Math.max(0, this.blow - dt / 30);
  }
  record(every = 5, keep = 3600) { if (!this.rows.length || this.t - this.rows.at(-1)[0] >= every) { this.rows.push([this.t, this.T]); while (this.rows[0][0] < this.t - keep) this.rows.shift(); } }
}
// Minutes for the box to cool from T1 to T2 with no fire: Newton cooling, τ = C ÷ G.
export const coolTime = (T1, T2, G = COAL.G, C = COAL.C) => (T1 <= T2 ? 0 : (C / G) * Math.log((T1 - AMB) / Math.max(0.1, T2 - AMB)));

// ---------------------------------------------------------------- colours and numbers
export const COL = {
  hot: '#ff7a59', cold: '#6fb6ff', heat: '#ffb547', steam: '#8ef0ff', ok: '#5ce1a9', warn: '#ff5a6e', force: '#c49bff', text: '#e8eef8', hb: '#7fb2ff',
};
export const hex = (c) => new THREE.Color(c).getHex();
export const fmtT = (t) => (!isFinite(t) ? 'never' : t >= 3600 ? `${Math.floor(t / 3600)} h ${String(Math.floor((t % 3600) / 60)).padStart(2, '0')} min` : t >= 60 ? `${Math.floor(t / 60)} min ${String(Math.floor(t % 60)).padStart(2, '0')} s` : `${t.toFixed(0)} s`);
export const link = (slug, name, hash = '') => `<a href="https://glassbox.how/${slug}/${hash ? '#' + hash : ''}">${name}</a>`;

// ---------------------------------------------------------------- boards (live charts in 3D)
export function panelBg(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, w, h); }
export function board(root, w, h, pxW, pxH, draw, pos) {
  const c = document.createElement('canvas'); c.width = pxW; c.height = pxH;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const redraw = () => { draw(g, pxW, pxH); tex.needsUpdate = true; };
  redraw();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  m.position.set(...pos); root.add(m);
  return { tex, redraw, canvas: c, mesh: m };
}
export function axes(g, w, h, { x0 = 84, x1 = w - 28, y0 = h - 64, y1 = 70, xMax, yMax, xMin = 0, yMin = 0, xTicks, yTicks, xFmt = String, yFmt = String }) {
  const X = (x) => x0 + ((x - xMin) / (xMax - xMin)) * (x1 - x0);
  const Y = (y) => y0 - ((y - yMin) / (yMax - yMin)) * (y0 - y1);
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '19px sans-serif';
  for (const t of xTicks) { g.beginPath(); g.moveTo(X(t), y1); g.lineTo(X(t), y0); g.stroke(); const s = xFmt(t); g.fillText(s, X(t) - g.measureText(s).width / 2, y0 + 26); }
  for (const t of yTicks) { g.beginPath(); g.moveTo(x0, Y(t)); g.lineTo(x1, Y(t)); g.stroke(); const s = yFmt(t); g.fillText(s, x0 - 10 - g.measureText(s).width, Y(t) + 6); }
  g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y0); g.lineTo(x1, y0); g.stroke();
  return { X, Y, x0, x1, y0, y1 };
}
export function title(g, text, sub = '') {
  g.fillStyle = COL.text; g.font = 'bold 24px sans-serif'; g.fillText(text, 20, 34);
  if (sub) { const x = 34 + g.measureText(text).width; g.font = '17px sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText(sub, x, 34); }
}
export function line(g, pts, X, Y, col, wdt = 5) {
  if (pts.length < 2) return;
  g.strokeStyle = col; g.lineWidth = wdt; g.lineJoin = 'round'; g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
  g.stroke();
}
export function dot(g, x, y, col, r = 10) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
export function dashH(g, X0, X1, y, text = '', col = 'rgba(255,255,255,.5)', left = false) {
  g.strokeStyle = col; g.setLineDash([8, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(X0, y); g.lineTo(X1, y); g.stroke(); g.setLineDash([]);
  if (text) { g.font = '17px sans-serif'; g.fillStyle = col; g.fillText(text, left ? X0 + 6 : X1 - g.measureText(text).width - 4, y - 8); }
}
export function bars(g, rows, { x = 20, y = 64, w = 600, rowH = 52, labelW = 230, unit = (v) => v, max = null } = {}) {
  const mx = max ?? Math.max(1e-9, ...rows.map((r) => Math.abs(r.value))) * 1.15, span = w - labelW - 20;
  rows.forEach((r, i) => {
    const yy = y + i * rowH, L = (Math.min(Math.abs(r.value), mx) / mx) * span;
    g.font = 'bold 19px sans-serif'; g.fillStyle = r.color; g.fillText(r.label, x, yy + 24);
    g.globalAlpha = 0.85; g.fillStyle = r.color; g.fillRect(x + labelW, yy + 6, Math.max(2, L), rowH - 18); g.globalAlpha = 1;
    g.font = '18px sans-serif'; g.fillStyle = '#fff'; const t = r.text ?? unit(r.value), tw = g.measureText(t).width;
    g.fillText(t, x + labelW + L + 8 + tw > w ? x + labelW + L - tw - 8 : x + labelW + L + 8, yy + 25);
  });
}

// ---------------------------------------------------------------- layout helpers
export const inReel = () => document.body.classList.contains('gb-reel');
// On a phone-width stage: hide minor labels and nudge the picture down, clear of the readout.
export function fitNarrow(stage, minor = []) {
  const narrow = stage.host.clientWidth < 560;
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const y = narrow && !inReel() ? -0.14 : 0;
  if (!stage.shift || stage.shift[1] !== y) stage.setShift(0, y);
  return narrow;
}
// Boards sit beside the model. In the tall reel video they stack above it instead, so the portrait
// frame is filled.
export function placeBoards(stage, boards, { x = 0, top = 9.2, gap = 3.0, scale = 1.15, z = 0 } = {}) {
  const tall = inReel() && stage.camera.aspect < 0.9;
  boards.forEach((b, i) => {
    if (!b.home) { b.home = b.mesh.position.clone(); b.homeRot = b.mesh.rotation.y; }
    if (tall) { b.mesh.position.set(x, top - i * gap, z); b.mesh.rotation.y = 0; b.mesh.scale.setScalar(scale); }
    else { b.mesh.position.copy(b.home); b.mesh.rotation.y = b.homeRot; b.mesh.scale.setScalar(1); }
  });
  return tall;
}

// ---------------------------------------------------------------- 3D bits
export function rng(seed = 1) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export function dots(n, r, color = 0xffffff, seg = 8, opacity = 1) {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2)), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }), n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  const o = new THREE.Object3D(), col = new THREE.Color(color);
  for (let i = 0; i < n; i++) { mesh.setColorAt(i, col); o.scale.setScalar(0.0001); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); }
  mesh.place = (i, x, y, z, s = 1) => { o.position.set(x, y, z); o.scale.setScalar(Math.max(0.0001, s)); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); };
  mesh.tint = (i, c) => mesh.setColorAt(i, c);
  mesh.done = () => { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; };
  return mesh;
}
// Puffs of steam or smoke that drift from a source: step(dt, rate, at(), vel(p), life).
export function puffs(parent, n, r, color, rnd, opacity = 0.75, lift = 0.6) {
  const d = dots(n, r, color, 8, opacity); parent.add(d);
  const P = Array.from({ length: n }, () => ({ life: 0, max: 1, p: [0, -99, 0], v: [0, 0, 0] }));
  let acc = 0;
  return {
    mesh: d,
    step(dt, rate, at, vel, life = 1.2, grow = 1.8) {
      acc = Math.min(20, acc + rate * dt);
      for (let i = 0; i < n; i++) {
        const q = P[i];
        if (q.life <= 0 && acc >= 1) { acc -= 1; q.life = q.max = life * (0.75 + 0.5 * rnd()); q.p = at(); q.v = vel(q.p); }
        if (q.life > 0) { q.life -= dt; q.p[0] += q.v[0] * dt; q.p[1] += q.v[1] * dt; q.p[2] += q.v[2] * dt; q.v[1] += lift * dt; }
        const k = q.life / q.max;
        d.place(i, q.p[0], q.p[1], q.p[2], q.life > 0 ? 0.5 + grow * (1 - k) : 0.0001);
      }
      d.done();
    },
    clear() { P.forEach((q) => { q.life = 0; }); acc = 0; },
  };
}
// An arrow that ignores depth, aimed from a point along a direction with a length.
const UP = new THREE.Vector3(0, 1, 0), tmpV = new THREE.Vector3();
export function flowArrow(color, r = 0.05, head = 0.28) {
  const a = arrow(color, 1, head, r);
  a.traverse((o) => { if (o.material) { o.material.depthTest = false; o.renderOrder = 10; } });
  a.aim = (from, dir, len) => {
    a.position.set(...from);
    tmpV.set(...dir); if (tmpV.lengthSq() < 1e-9) tmpV.set(1, 0, 0);
    a.quaternion.setFromUnitVectors(UP, tmpV.normalize());
    a.set(Math.max(0.001, len));
    if (len < 0.05) a.visible = false;
  };
  return a;
}
const C_COLD = new THREE.Color(0x3b7bff), C_MID = new THREE.Color(0xe8eef8), C_HOT = new THREE.Color(0xff5a2a);
export function tempColor(T, lo = 20, hi = 220, out = new THREE.Color()) {
  const k = clamp((T - lo) / (hi - lo), 0, 1);
  return k < 0.5 ? out.copy(C_COLD).lerp(C_MID, k * 2) : out.copy(C_MID).lerp(C_HOT, (k - 0.5) * 2);
}
export function hissSound() {
  let ac = null, src = null, bp = null, gain = null;
  const start = () => {
    if (ac || inReel()) return;
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
    bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 2;
    gain = ac.createGain(); gain.gain.value = 0;
    src.connect(bp).connect(gain).connect(ac.destination); src.start();
  };
  window.addEventListener('pointerdown', start); window.addEventListener('keydown', start);
  return {
    set(level) { if (!ac) return; gain.gain.setTargetAtTime(audio.muted ? 0 : clamp(level, 0, 0.3), ac.currentTime, 0.05); },
    dispose() {
      window.removeEventListener('pointerdown', start); window.removeEventListener('keydown', start);
      try { src?.stop(); ac?.close(); } catch { /* already closed */ }
      ac = null;
    },
  };
}

// ---------------------------------------------------------------- iron shapes
// The outline of a generic iron seen from above: a square heel at x = −3 and a rounded point at
// x = +3.4, 3 units (12 cm) wide. halfW(x) is the half-width at x.
export const XB = -3.0, XT = 3.4, HW = 1.5;
export function halfW(x, xb = XB, xt = XT, W = HW) {
  if (x <= xb - 1e-6 || x >= xt) return 0;
  let w;
  const knee = xb + (xt - xb) * 0.31;
  if (x < knee) w = W; else { const k = (x - knee) / (xt - knee); w = W * Math.sqrt(Math.max(0, 1 - k * k)); }
  const r = 0.3 * (W / HW);
  if (x < xb + r) { const d = xb + r - x; w = Math.min(w, W - r + Math.sqrt(Math.max(0, r * r - d * d))); }
  return w;
}
// Loft the outline between x0 and x1 through levels { y, s } (s scales towards the heel and the
// centre line), closing the top and, if asked, the bottom.
export function loft(levels, { x0 = XB, x1 = XT, n = 40, xb = XB, xt = XT, W = HW, bottom = true, top = true, shrink = 1 } = {}) {
  const ring = [];
  for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n; ring.push([x, halfW(x, xb, xt, W) * shrink]); }
  for (let i = n; i >= 0; i--) { const x = x0 + ((x1 - x0) * i) / n; ring.push([x, -halfW(x, xb, xt, W) * shrink]); }
  const R = ring.length, pos = [], idx = [], nrm = [];
  const P = (lv, k) => { const [x, z] = ring[k % R]; return [xb + (x - xb) * lv.s, lv.y, z * lv.s]; };
  levels.forEach((lv) => { for (let k = 0; k < R; k++) pos.push(...P(lv, k)); });
  for (let l = 0; l < levels.length - 1; l++) for (let k = 0; k < R; k++) {
    const a = l * R + k, b = l * R + ((k + 1) % R), c = (l + 1) * R + ((k + 1) % R), d = (l + 1) * R + k;
    idx.push(a, b, c, a, c, d);
  }
  const cap = (lv, up) => {
    const start = pos.length / 3;
    let cx = 0, cz = 0; for (let k = 0; k < R; k++) { const p = P(lv, k); cx += p[0]; cz += p[2]; pos.push(...p); }
    pos.push(cx / R, lv.y, cz / R);
    const c = start + R;
    for (let k = 0; k < R; k++) { const a = start + k, b = start + ((k + 1) % R); if (up) idx.push(c, a, b); else idx.push(c, b, a); }
    return [start, R + 1, up ? 1 : -1];
  };
  const caps = [];
  if (top) caps.push(cap(levels.at(-1), true));
  if (bottom) caps.push(cap(levels[0], false));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.computeVertexNormals();
  const na = g.attributes.normal;
  caps.forEach(([s0, n, up]) => { for (let i = 0; i < n; i++) na.setXYZ(s0 + i, 0, up, 0); });
  na.needsUpdate = true;
  return g;
}
function mesh(g, mat) { const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m; }

// ---------------------------------------------------------------- the household steam iron (3D)
// A generic iron: soleplate with steam holes, a sheathed element cast into it, a steam chamber, a
// bimetal thermostat under the dial, a see-through water tank with a drip valve, spray nozzle,
// buttons, an auto shut-off board in the heel, an anti-scale cartridge and a cord. 1 unit ≈ 4 cm.
export function makeIron(parent, { x = 0, y = 0, z = 0 } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const SP = 0.24;                                   // soleplate thickness: about 1 cm
  const soleMat = M.metal(0xc4c9d1, { roughness: 0.22, transparent: true, opacity: 1 });
  const sole = mesh(loft([{ y: 0, s: 0.985 }, { y: 0.05, s: 1 }, { y: SP, s: 1 }]), soleMat);
  sole.material.side = THREE.DoubleSide;
  g.add(sole);
  // steam holes on the underside
  const holes = [];
  for (let xi = -1.6; xi <= 2.9; xi += 0.42) for (let zi = -1.2; zi <= 1.2; zi += 0.4) {
    if (Math.abs(zi) > halfW(xi) * 0.8 || (xi < -0.6 && Math.abs(zi) < 0.5)) continue;
    holes.push([xi + (Math.abs(zi * 10) % 2) * 0.1, zi]);
  }
  const holeMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(0.075, 14), M.matte(0x0a0b0e, { side: THREE.DoubleSide }), holes.length);
  { const o = new THREE.Object3D(); holes.forEach(([hx, hz], i) => { o.position.set(hx, -0.004, hz); o.rotation.set(Math.PI / 2, 0, 0); o.updateMatrix(); holeMesh.setMatrixAt(i, o.matrix); }); }
  sole.add(holeMesh);
  // the heating element: a sheathed resistance wire bent into a U and cast into the soleplate
  const elMat = new THREE.MeshStandardMaterial({ color: 0x8a5a3a, emissive: 0xff4a10, emissiveIntensity: 0, roughness: 0.4, metalness: 0.4 });
  const elPts = [[-2.4, 0.13, 0.82], [-0.6, 0.13, 0.95], [1.2, 0.13, 0.75], [2.3, 0.13, 0.32], [2.65, 0.13, 0], [2.3, 0.13, -0.32], [1.2, 0.13, -0.75], [-0.6, 0.13, -0.95], [-2.4, 0.13, -0.82]];
  const element = new THREE.Group(); g.add(element);
  element.add(tube(elPts, 0.075, elMat, false, 160));
  [0.82, -0.82].forEach((zz) => { element.add(beam([-2.4, 0.13, zz], [-2.4, 0.55, zz], 0.06, M.metal(0xd0b070))); });
  // steam chamber: a pocket in the top of the soleplate where drips flash to steam, under a cover
  const chamber = new THREE.Group(); g.add(chamber);
  const pocket = mesh(loft([{ y: SP - 0.001, s: 1 }, { y: SP + 0.06, s: 1 }], { x0: 0.1, x1: 2.5, shrink: 0.62 }), M.matte(0x1a2a3a));
  chamber.add(pocket);
  const cover = mesh(loft([{ y: SP + 0.06, s: 1 }, { y: SP + 0.1, s: 1 }], { x0: 0.05, x1: 2.55, shrink: 0.66 }), M.metal(0x9aa2ad, { roughness: 0.35 }));
  chamber.add(cover);
  // thermostat: a bimetal strip and a pair of silver contacts on a ceramic block, under the dial
  const thermo = new THREE.Group(); thermo.position.set(-0.6, SP, 0); g.add(thermo);
  const blk = box(0.9, 0.18, 0.5, M.matte(0xe8e2d0)); blk.position.set(-0.3, 0.09, 0); thermo.add(blk);
  const strip = new THREE.Group(); strip.position.set(-0.7, 0.22, 0); thermo.add(strip);
  const sA = box(1.2, 0.03, 0.22, M.metal(0xd6b25a)); sA.position.set(0.6, 0.0, 0); strip.add(sA);
  const sB = box(1.2, 0.03, 0.22, M.metal(0x9aa0aa)); sB.position.set(0.6, 0.03, 0); strip.add(sB);
  const cLo = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12), M.metal(0xf0f0f0)); cLo.position.set(0.35, 0.36, 0); thermo.add(cLo);
  const spring = box(0.9, 0.025, 0.16, M.metal(0xb7bcc5)); spring.position.set(0.0, 0.42, 0); thermo.add(spring);
  const shaft = beam([0.3, 0.42, 0], [0.3, 1.1, 0], 0.05, M.metal(0xaab0ba)); thermo.add(shaft);
  // body shell (rear) and see-through tank (front), lofted from the same outline
  const LV = [{ y: SP, s: 0.995 }, { y: 0.55, s: 0.96 }, { y: 0.95, s: 0.84 }, { y: 1.3, s: 0.66 }];
  const shellMat = M.plastic(0xe9ecf1, { roughness: 0.35, transparent: true, opacity: 1 });
  const shell = mesh(loft(LV, { x0: XB, x1: 0.5, bottom: false }), shellMat); g.add(shell);
  const tankMat = new THREE.MeshPhysicalMaterial({ color: 0x5fc9d8, roughness: 0.12, transmission: 0.4, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide });
  const tank = new THREE.Group(); g.add(tank);
  const tankShell = new THREE.Mesh(loft(LV, { x0: 0.5, x1: XT, bottom: false }), tankMat); tank.add(tankShell);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x3b9dff, roughness: 0.1, transparent: true, opacity: 0.55, depthWrite: false });
  const waterLv = (k) => [{ y: SP + 0.04, s: 0.96 }, { y: SP + 0.04 + k * 0.85, s: 0.96 - k * 0.2 }];
  let water = new THREE.Mesh(loft(waterLv(0.7), { x0: 0.65, x1: 3.0, shrink: 0.9 }), waterMat); tank.add(water);
  const scale = box(0.2, 0.5, 0.2, M.plastic(0xf6f6f2)); scale.position.set(1.9, 0.62, 0.42); tank.add(scale);
  const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 20), M.plastic(0x2a8fa0)); fill.position.set(1.7, 1.1, 0); fill.rotation.z = -0.55; tank.add(fill);
  const nozzle = new THREE.Group(); nozzle.position.set(2.45, 0.9, 0); tank.add(nozzle);
  const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.22, 14), M.plastic(0x333840)); nz.rotation.z = -Math.PI / 2; nozzle.add(nz);
  // dial on top, steam knob with its drip valve needle in front of it
  const dial = new THREE.Group(); dial.position.set(-0.3, 1.31, 0); g.add(dial);
  const dialDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.12, 40), M.plastic(0x2c3038)); dialDisc.position.y = 0.06; dial.add(dialDisc);
  const pointer = box(0.36, 0.03, 0.06, M.glow(0xffb547)); pointer.position.set(0.18, 0.13, 0); dial.add(pointer);
  const knob = new THREE.Group(); knob.position.set(0.55, 1.31, 0); g.add(knob);
  knob.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.16, 20), M.plastic(0x2a8fa0)), { castShadow: true }));
  const needle = beam([0, -0.05, 0], [0, -(1.31 - SP - 0.1), 0], 0.03, M.metal(0xd8dce2)); knob.add(needle);
  // handle, steam-shot and spray buttons, heating lamp
  const handle = new THREE.Group(); g.add(handle);
  const hMat = M.plastic(0x2c3038, { roughness: 0.5 });
  handle.add(tube([[-2.6, 1.15, 0], [-2.5, 2.35, 0], [-1.9, 2.95, 0], [-0.4, 3.05, 0], [0.85, 2.9, 0], [1.2, 2.3, 0], [0.95, 1.22, 0]], 0.25, hMat, false, 120));
  const bShot = box(0.28, 0.12, 0.2, M.plastic(0xff7a59)); bShot.position.set(0.55, 3.14, 0); bShot.rotation.z = -0.15; handle.add(bShot);
  const bSpray = box(0.24, 0.12, 0.18, M.plastic(0x4aa3ff)); bSpray.position.set(0.95, 3.0, 0); bSpray.rotation.z = -0.55; handle.add(bSpray);
  const lampMat = M.glow(0xff8a3a, { transparent: true, opacity: 1 });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), lampMat); lamp.position.set(-2.3, 1.36, 0); g.add(lamp);
  // auto shut-off board in the heel (a tilt sensor and a timer chip)
  const board3 = new THREE.Group(); board3.position.set(-2.65, 0.7, 0); g.add(board3);
  const pcb = box(0.08, 0.5, 0.8, M.matte(0x1f7a4a)); board3.add(pcb);
  const chip = box(0.06, 0.16, 0.22, M.matte(0x111111)); chip.position.set(0.06, 0.08, 0.12); board3.add(chip);
  const tilt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 10), M.metal(0xc0c4cc)); tilt.position.set(0.07, -0.12, -0.2); board3.add(tilt);
  // cord with its guard
  const cord = new THREE.Group(); g.add(cord);
  const guard = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 16), M.plastic(0x2c3038)); guard.rotation.z = Math.PI / 2; guard.position.set(-3.25, 0.75, 0); cord.add(guard);
  cord.add(tube([[-3.4, 0.75, 0], [-3.9, 0.7, 0.05], [-4.5, 0.3, 0.4], [-5.4, 0.06, 1.1], [-6.2, 0.05, 1.6]], 0.08, M.plastic(0x30343c), false, 80));

  const setWater = (k) => { tank.remove(water); water.geometry.dispose(); water = new THREE.Mesh(loft(waterLv(clamp(k, 0.02, 1)), { x0: 0.65, x1: 3.0, shrink: 0.9 }), waterMat); water.visible = k > 0.02; tank.add(water); };
  const parts = { sole, element, chamber, thermo, strip, shell, tank, dial, knob, handle, board: board3, cord, nozzle, lamp, holes: holeMesh, scale, fill };
  const explode = [
    { obj: element, off: [0, 0.6, 0] }, { obj: chamber, off: [0, 1.25, 0] }, { obj: thermo, off: [0, 1.85, 0] },
    { obj: board3, off: [-1.0, 1.6, 0] }, { obj: shell, off: [-0.5, 3.0, 0] }, { obj: tank, off: [1.2, 3.0, 0] },
    { obj: dial, off: [-0.3, 3.9, 0] }, { obj: knob, off: [0.6, 3.6, 0] }, { obj: handle, off: [0, 4.9, 0] }, { obj: lamp, off: [-0.5, 3.0, 0] },
  ];
  explode.forEach((p) => { p.obj.userData.home = p.obj.position.clone(); });
  let lastLevel = -1;
  return {
    g, SP, parts, holes,
    set({ explode: k = 0, xray = false, T = AMB, on = false, level = 0.7, dial: dk = 0.5, lamp: lampOn = on } = {}) {
      explode.forEach((p) => { p.obj.position.copy(p.obj.userData.home).add(new THREE.Vector3(...p.off).multiplyScalar(smooth(k))); });
      const see = xray || k > 0.05;
      shellMat.opacity = see ? 0.3 : 1; shellMat.depthWrite = !see;
      tankMat.opacity = see ? 0.25 : 0.42;
      soleMat.opacity = xray && k < 0.05 ? 0.45 : 1; soleMat.depthWrite = !(xray && k < 0.05);
      tempColor(T, 20, 260, soleMat.color); soleMat.color.lerp(new THREE.Color(0xc4c9d1), 0.75);
      elMat.emissiveIntensity = on ? 1.6 : clamp((T - 120) / 300, 0, 0.25);
      lampMat.opacity = lampOn ? 1 : 0.15;
      dial.rotation.y = -dk * 4.2;
      const lv = Math.round(clamp(level, 0, 1) * 30) / 30;
      if (lv !== lastLevel) { lastLevel = lv; setWater(lv); }
    },
    bend(lift) { strip.rotation.z = lift; },
  };
}

// An ironing board: a padded top on folding legs. Top at height y (units).
export function makeIroningBoard(parent, { y = 3.2, len = 14, w = 4.2, x = 0 } = {}) {
  const g = new THREE.Group(); g.position.x = x; parent.add(g);
  const top = mesh(loft([{ y: y - 0.16, s: 1 }, { y, s: 1 }], { xb: -len / 2, xt: len / 2, W: w / 2, x0: -len / 2, x1: len / 2 }), M.matte(0x6c7d93));
  g.add(top);
  const legM = M.metal(0x8a919c, { roughness: 0.4 });
  g.add(beam([-len * 0.3, 0, -1.4], [len * 0.15, y - 0.2, 0], 0.07, legM), beam([-len * 0.3, 0, 1.4], [len * 0.15, y - 0.2, 0], 0.07, legM));
  g.add(beam([len * 0.3, 0, -1.4], [-len * 0.15, y - 0.2, 0], 0.07, legM), beam([len * 0.3, 0, 1.4], [-len * 0.15, y - 0.2, 0], 0.07, legM));
  return { g, topY: y };
}

// A cloth on a table: a grid whose height carries creases. setCreases(f[]) gives each column's
// crease factor (1 = fully creased, 0 = flat); colour per column shows dampness and heat.
export function makeCloth(parent, { W = 14, D = 4.6, nx = 120, nz = 24, y = 0, col = 0xf1ede4, seed = 3 } = {}) {
  const geo = new THREE.PlaneGeometry(W, D, nx, nz); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, base = pos.array.slice();
  const colors = new Float32Array(pos.count * 3); geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const tex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 128); x.strokeStyle = 'rgba(0,0,0,.09)'; x.lineWidth = 2; for (let i = 0; i < 128; i += 4) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.stroke(); x.beginPath(); x.moveTo(0, i + 2); x.lineTo(128, i + 2); x.stroke(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(W * 1.2, D * 1.2); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex, vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat); m.position.y = y; m.receiveShadow = true; m.castShadow = true; parent.add(m);
  const rnd = rng(seed);
  // A handful of creases: sharp ridges across the cloth, plus soft wrinkles.
  const creases = Array.from({ length: 7 }, () => ({ x: (rnd() - 0.5) * W * 0.85, a: 0.12 + rnd() * 0.16, tilt: (rnd() - 0.5) * 0.5, wd: 0.12 + rnd() * 0.12 }));
  const base3 = new THREE.Color(col), cTmp = new THREE.Color(), wetC = new THREE.Color(0x8b96a6), hotC = new THREE.Color(0xff9a5a), burnC = new THREE.Color(0x7a4a20);
  const colOf = (x) => clamp(Math.floor(((x + W / 2) / W) * nx), 0, nx);
  return {
    mesh: m, W, D, nx, colOf,
    xOf: (i) => -W / 2 + (i / nx) * W,
    setColor(c) { base3.set(c); },
    set(f, wet = null, hot = null, burn = null) {
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3], z = base[i * 3 + 2], ci = colOf(x), k = f[ci] ?? 1;
        let h = 0;
        for (const c of creases) { const xx = x - c.x - c.tilt * z; h += c.a * Math.exp(-Math.abs(xx) / c.wd); }
        h += 0.05 * Math.sin(x * 2.3 + z * 1.1) * Math.sin(z * 3.1 - x * 0.7);
        pos.array[i * 3 + 1] = 0.07 + h * k;
        cTmp.copy(base3);
        if (wet) cTmp.lerp(wetC, clamp(wet[ci] * 3, 0, 0.55));
        if (hot) cTmp.lerp(hotC, clamp((hot[ci] - 60) / 200, 0, 0.45));
        if (burn) cTmp.lerp(burnC, clamp(burn[ci], 0, 0.85));
        colors[i * 3] = cTmp.r; colors[i * 3 + 1] = cTmp.g; colors[i * 3 + 2] = cTmp.b;
      }
      pos.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeVertexNormals();
    },
  };
}

// Long chain molecules seen close up: nChains rows of beads, joined by hydrogen bonds between
// neighbours. set({ bend, free, bonds, water, hb }) shapes them each frame.
export function makeChains(parent, { n = 5, beads = 22, dx = 0.26, dy = 0.42, color = 0xf1ede4, seed = 5 } = {}) {
  const g = new THREE.Group(); parent.add(g);
  const N = n * beads, rnd = rng(seed);
  const beadM = dots(N, 0.1, color, 10); g.add(beadM);
  const backbone = [];
  for (let j = 0; j < n; j++) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(beads * 3), 3));
    const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 })); g.add(l); backbone.push(l);
  }
  const NB = (n - 1) * Math.floor(beads / 2);
  const hbGeo = new THREE.BufferGeometry(); hbGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NB * 6), 3));
  const hbMat = new THREE.LineDashedMaterial({ color: 0x7fb2ff, dashSize: 0.06, gapSize: 0.05, transparent: true, opacity: 0.95 });
  const hbl = new THREE.LineSegments(hbGeo, hbMat); g.add(hbl);
  const waterM = dots(60, 0.06, 0x6fb6ff, 8); g.add(waterM);
  const keep = Array.from({ length: NB }, () => rnd());
  const wpos = Array.from({ length: 60 }, () => [rnd(), rnd(), rnd()]);
  const P = new Float32Array(N * 3);
  let tt = 0;
  const W0 = (beads - 1) * dx;
  return {
    g, width: W0, height: (n - 1) * dy,
    set({ bend = 1, free = 0, bonds = 1, water = 0, hb = true, dt = 0, colorHex = null }) {
      tt += dt;
      if (colorHex !== null) { const c = new THREE.Color(colorHex); for (let i = 0; i < N; i++) beadM.tint(i, c); backbone.forEach((l) => l.material.color.set(colorHex)); }
      for (let j = 0; j < n; j++) for (let i = 0; i < beads; i++) {
        const x = i * dx - W0 / 2, u = x / (W0 / 2);
        // a crease is a sharp fold in every chain at the middle
        const fold = bend * 0.9 * Math.max(0, 1 - Math.abs(u) * 1.6) ** 1.5;
        const jig = free * 0.07;
        const k = (j * beads + i) * 3;
        P[k] = x + jig * Math.sin(tt * 9 + i * 1.7 + j * 2.3);
        P[k + 1] = j * dy + fold + jig * Math.sin(tt * 11 + i * 2.1 - j);
        P[k + 2] = jig * Math.cos(tt * 8 + i + j * 1.3);
        beadM.place(j * beads + i, P[k], P[k + 1], P[k + 2], 1);
        const a = backbone[j].geometry.attributes.position.array; a[i * 3] = P[k]; a[i * 3 + 1] = P[k + 1]; a[i * 3 + 2] = P[k + 2];
      }
      backbone.forEach((l) => { l.geometry.attributes.position.needsUpdate = true; });
      beadM.done();
      const h = hbGeo.attributes.position.array; let b = 0;
      for (let j = 0; j < n - 1; j++) for (let i = 1; i < beads; i += 2) {
        const on = hb && keep[b] < bonds, k1 = (j * beads + i) * 3, k2 = ((j + 1) * beads + i) * 3;
        const o = b * 6;
        if (on) { h[o] = P[k1]; h[o + 1] = P[k1 + 1] + 0.1; h[o + 2] = P[k1 + 2]; h[o + 3] = P[k2]; h[o + 4] = P[k2 + 1] - 0.1; h[o + 5] = P[k2 + 2]; }
        else for (let q = 0; q < 6; q++) h[o + q] = 0;
        b++;
      }
      hbGeo.attributes.position.needsUpdate = true; hbl.computeLineDistances(); hbl.visible = hb;
      const nw = Math.round(clamp(water, 0, 1) * 60);
      for (let i = 0; i < 60; i++) {
        const [a, c, d] = wpos[i];
        const x = (a - 0.5) * W0, j = Math.floor(c * (n - 1));
        if (i < nw) waterM.place(i, x + 0.05 * Math.sin(tt * 5 + i), j * dy + dy / 2 + 0.25 * bend * Math.max(0, 1 - Math.abs(x / (W0 / 2)) * 1.6) ** 1.5 + 0.06 * Math.sin(tt * 7 + i * 3), (d - 0.5) * 0.3, 1);
        else waterM.place(i, 0, -50, 0, 0.0001);
      }
      waterM.done();
    },
  };
}

// A big bimetal strip with its contacts, for close-ups: clamped at the left, it curls up as it warms
// and pushes a ceramic pin that lifts the upper contact off the lower one. setLift(rad, gap).
export function makeBimetalModel(parent, { L = 4, segs = 24 } = {}) {
  const g = new THREE.Group(); parent.add(g);
  const brass = M.metal(0xd6b25a, { roughness: 0.3 }), invar = M.metal(0x9aa0aa, { roughness: 0.3 });
  const clampB = box(0.7, 0.9, 1.0, M.matte(0xe8e2d0)); clampB.position.set(-0.35, 0, 0); g.add(clampB);
  const segsA = [], segsB = [];
  const sl = L / segs;
  for (let i = 0; i < segs; i++) {
    const a = box(sl * 1.02, 0.09, 0.7, brass), b = box(sl * 1.02, 0.09, 0.7, invar);
    g.add(a, b); segsA.push(a); segsB.push(b);
  }
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 12), M.matte(0xf2efe6)); g.add(pin);
  const post = box(0.4, 2.2, 0.8, M.matte(0xe8e2d0)); post.position.set(L + 1.6, 0.7, 0); g.add(post);
  const upper = box(1.9, 0.06, 0.4, M.metal(0xb7bcc5)); g.add(upper);
  const lower = box(1.9, 0.06, 0.4, M.metal(0xb7bcc5)); lower.position.set(L + 0.6, 1.25, 0); g.add(lower);
  const cU = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16), M.metal(0xf4f4f4)); g.add(cU);
  const cL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16), M.metal(0xf4f4f4)); cL.position.set(L - 0.15, 1.18, 0); g.add(cL);
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), M.glow(0xffb547)); spark.position.set(L - 0.15, 1.27, 0); g.add(spark);
  return {
    g, L,
    // k: curvature in 1/unit; touch: height of the contact gap set by the dial
    set(k, { dialY = 0.6 } = {}) {
      let x = 0, y = 0, a = 0;
      for (let i = 0; i < segs; i++) {
        const mid = a + (k * sl) / 2;
        const cx = x + (Math.cos(mid) * sl) / 2, cy = y + (Math.sin(mid) * sl) / 2;
        const nx = -Math.sin(mid), ny = Math.cos(mid);
        segsA[i].position.set(cx - nx * 0.045, cy - ny * 0.045, 0); segsA[i].rotation.z = mid;
        segsB[i].position.set(cx + nx * 0.045, cy + ny * 0.045, 0); segsB[i].rotation.z = mid;
        x += Math.cos(mid) * sl; y += Math.sin(mid) * sl; a += k * sl;
      }
      // the pin rides on the tip; the upper contact arm rests on the pin once the strip reaches it
      const tipY = y + 0.1, armY = Math.max(dialY, tipY + 0.6);
      pin.position.set(x - 0.15, (tipY + armY) / 2, 0); pin.scale.y = Math.max(0.05, (armY - tipY) / 0.6);
      upper.position.set(L + 0.6, armY + 0.35, 0); cU.position.set(L - 0.15, armY + 0.3, 0);
      const closed = armY + 0.3 <= 1.18 + 0.09;
      cU.position.y = closed ? 1.26 : armY + 0.3; upper.position.y = closed ? 1.31 : armY + 0.35;
      spark.visible = closed;
      return { tipY: y, closed };
    },
  };
}

// ---------------------------------------------------------------- the boiler press (3D)
// Built at 1 unit ≈ 10 cm: a vacuum ironing table (1.2 m long, 90 cm high), a 3-litre boiler on the
// shelf beneath, a hose over a spring arm to a heavy all-metal iron, a pressure gauge, a safety valve,
// a sight glass and a foot pedal for the vacuum fan.
export function makeBoilerPress(parent) {
  const g = new THREE.Group(); parent.add(g);
  const steel = M.metal(0xc9ced6, { roughness: 0.28 }), dark = M.matte(0x2a2e36), frame = M.metal(0x6c737e, { roughness: 0.45 });
  const TOP = 8.6;
  // table top: perforated board with a padded cover
  const tableTop = mesh(loft([{ y: TOP - 0.25, s: 1 }, { y: TOP, s: 1 }], { xb: -6, xt: 6, W: 2, x0: -6, x1: 6 }), M.matte(0x55657a));
  g.add(tableTop);
  const perf = new THREE.InstancedMesh(new THREE.CircleGeometry(0.05, 8), M.matte(0x0c0d10, { side: THREE.DoubleSide }), 220);
  { const o = new THREE.Object3D(); let i = 0; for (let x = -4.5; x <= 4.5 && i < 220; x += 0.45) for (let z = -1.4; z <= 1.4 && i < 220; z += 0.47) { o.position.set(x, TOP + 0.005, z); o.rotation.set(-Math.PI / 2, 0, 0); o.updateMatrix(); perf.setMatrixAt(i++, o.matrix); } perf.count = i; }
  g.add(perf);
  // vacuum box and fan under the top
  const vbox = box(9.5, 1.4, 3.2, M.matte(0x3a414c)); vbox.position.set(0, TOP - 1.0, 0); g.add(vbox);
  const fan = new THREE.Group(); fan.position.set(2.8, TOP - 1.7, 0); g.add(fan);
  const fanHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.9, 28), M.metal(0x7d8590)); fan.add(fanHousing);
  const blades = new THREE.Group(); fan.add(blades);
  for (let i = 0; i < 6; i++) { const b = box(0.75, 0.06, 0.22, M.metal(0xb0b6c0)); b.position.x = 0.4; const p = new THREE.Group(); p.rotation.y = (i / 6) * TAU; p.add(b); blades.add(p); }
  blades.position.y = -0.52;
  // legs, shelf
  [[-5.4, -1.6], [-5.4, 1.6], [4.8, -1.6], [4.8, 1.6]].forEach(([x, z]) => g.add(beam([x, 0, z], [x, TOP - 0.25, z], 0.1, frame)));
  const shelf = box(10.6, 0.15, 3.4, frame); shelf.position.set(-0.3, 2.0, 0); g.add(shelf);
  // the boiler: a stainless cylinder lying on the shelf
  const boiler = new THREE.Group(); boiler.position.set(-2.6, 3.25, 0); g.add(boiler);
  const bodyMat = M.metal(0xd6dbe2, { roughness: 0.22, transparent: true, opacity: 1 });
  const bBody = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 3.6, 40), bodyMat); bBody.rotation.z = Math.PI / 2; bBody.castShadow = true; boiler.add(bBody);
  [-1.8, 1.8].forEach((x) => { const cap = new THREE.Mesh(new THREE.SphereGeometry(1.05, 32, 12, 0, TAU, 0, Math.PI / 2), bodyMat); cap.scale.y = 0.3; cap.rotation.z = x > 0 ? -Math.PI / 2 : Math.PI / 2; cap.position.x = x; boiler.add(cap); });
  const bWaterMat = new THREE.MeshStandardMaterial({ color: 0x3b9dff, transparent: true, opacity: 0.6, roughness: 0.1, depthWrite: false });
  const bWater = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, 3.5, 40, 1, false, Math.PI / 2, Math.PI), bWaterMat); bWater.rotation.z = Math.PI / 2; bWater.visible = false; boiler.add(bWater);
  const heater = new THREE.Group(); boiler.add(heater);
  const hMat = new THREE.MeshStandardMaterial({ color: 0x8a5a3a, emissive: 0xff4a10, emissiveIntensity: 0, roughness: 0.4 });
  heater.add(tube([[1.8, -0.5, 0.3], [-1.2, -0.5, 0.3], [-1.4, -0.5, 0], [-1.2, -0.5, -0.3], [1.8, -0.5, -0.3]], 0.06, hMat, false, 60));
  const tbox = box(0.5, 0.9, 0.9, dark); tbox.position.set(2.1, 0, 0); boiler.add(tbox);
  // fittings on top: gauge, safety valve, pressure switch, steam outlet; sight glass on the end
  const gauge = new THREE.Group(); gauge.position.set(-1.0, 1.55, 0); boiler.add(gauge);
  gauge.add(beam([0, -0.55, 0], [0, -0.1, 0], 0.06, steel));
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.18, 32), M.metal(0x5a616c)); face.rotation.x = Math.PI / 2; gauge.add(face);
  const dialFace = new THREE.Mesh(new THREE.CircleGeometry(0.44, 32), M.matte(0xf4f1e8)); dialFace.position.z = 0.095; gauge.add(dialFace);
  const gNeedle = box(0.36, 0.035, 0.02, M.glow(0xff5a2a)); gNeedle.geometry.translate(0.17, 0, 0); gNeedle.position.z = 0.11; gauge.add(gNeedle);
  const valve = new THREE.Group(); valve.position.set(0.1, 1.05, 0); boiler.add(valve);
  valve.add(beam([0, 0, 0], [0, 0.45, 0], 0.11, M.metal(0xb08c4a)));
  const vCap = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.28, 18), M.metal(0xc9a45a)); vCap.position.y = 0.6; valve.add(vCap);
  const pswitch = box(0.55, 0.45, 0.55, M.matte(0x30343c)); pswitch.position.set(1.05, 1.3, 0); boiler.add(pswitch);
  boiler.add(beam([1.05, 1.0, 0], [1.05, 1.1, 0], 0.07, steel));
  const outlet = beam([-0.1, 1.0, 0.5], [-0.1, 1.5, 0.5], 0.08, steel); boiler.add(outlet);
  const sight = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.2, 14), M.clear(0xcfe8ff, 0.4)); sight.position.set(-2.25, 0.1, 0.55); boiler.add(sight);
  const sightW = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 12), M.glow(0x4aa3ff)); sightW.position.set(-2.25, 0, 0.55); boiler.add(sightW);
  // the hose: from the boiler up the back to a spring arm, then down to the iron
  const ironG = new THREE.Group(); g.add(ironG);
  const ironBody = mesh(loft([{ y: 0, s: 1 }, { y: 0.3, s: 1 }, { y: 0.9, s: 0.9 }, { y: 1.1, s: 0.7 }], { xb: -1.2, xt: 1.4, W: 0.65, x0: -1.2, x1: 1.4 }), M.metal(0xd2d6dd, { roughness: 0.25 }));
  ironG.add(ironBody);
  const ironHandle = tube([[-0.9, 1.0, 0], [-0.8, 1.9, 0], [0.4, 2.05, 0], [0.8, 1.05, 0]], 0.16, M.matte(0xb08a5a), false, 50); ironG.add(ironHandle);
  const trig = box(0.25, 0.1, 0.16, M.plastic(0xff7a59)); trig.position.set(0.2, 1.88, 0); ironG.add(trig);
  ironG.position.set(0, TOP + 0.1, 0.2);
  const arm = beam([-5.6, TOP, -1.8], [-5.6, TOP + 7.5, -1.8], 0.1, frame); g.add(arm);
  const armTop = beam([-5.6, TOP + 7.5, -1.8], [-0.5, TOP + 7.0, -0.6], 0.07, frame); g.add(armTop);
  const hoseMat = M.matte(0x22252b);
  let hose = null;
  const setHose = (ix, iz) => {
    if (hose) { g.remove(hose); hose.geometry.dispose(); }
    hose = tube([[-2.7, 4.75, 0.5], [-3.6, 6.0, -1.2], [-5.4, TOP + 1.0, -1.8], [-4.0, TOP + 6.6, -1.4], [-0.6, TOP + 6.9, -0.6], [ix - 0.2, TOP + 4.0, iz], [ix - 1.0, TOP + 1.5, iz]], 0.08, hoseMat, false, 120);
    g.add(hose);
  };
  setHose(0, 0.2);
  const pedal = box(1.0, 0.12, 0.7, dark); pedal.position.set(3.5, 0.3, 2.2); g.add(pedal);
  g.add(beam([3.5, 0.3, 2.0], [3.0, TOP - 1.7, 1.0], 0.04, M.matte(0x22252b)));
  return {
    g, TOP, ironG, boiler, fan: blades, valve, vCap, gauge, gNeedle, pswitch, sight, sightW, tbox, pedal,
    set({ gauge: gb = 0, heaterOn = false, level = 0.7, xray = false, ironX = 0, ironZ = 0.2, relief = false, fanSpin = 0 } = {}) {
      gNeedle.rotation.z = Math.PI * 1.25 - clamp(gb / 8, 0, 1) * Math.PI * 1.5;
      hMat.emissiveIntensity = heaterOn ? 1.4 : 0;
      bodyMat.opacity = xray ? 0.3 : 1; bodyMat.depthWrite = !xray;
      bWater.visible = xray; bWater.scale.set(1, 1, 1);
      bWater.position.y = -0.98 + level * 0.98; bWater.scale.y = 1; bWater.scale.x = 1;
      sightW.scale.y = clamp(level, 0.05, 1); sightW.position.y = -0.5 + level * 0.5;
      vCap.position.y = relief ? 0.75 : 0.6;
      if (Math.abs(ironG.position.x - ironX) > 0.01 || Math.abs(ironG.position.z - ironZ) > 0.01) { ironG.position.x = ironX; ironG.position.z = ironZ; setHose(ironX, ironZ); }
      blades.rotation.y += fanSpin;
    },
  };
}

// ---------------------------------------------------------------- the charcoal iron (3D)
// A generic Indian box iron at 1 unit ≈ 4 cm: a heavy cast body with a pointed front, a row of air
// holes along each side, a hinged lid with a latch at the back, a wooden handle on two posts, and a
// bed of charcoal inside (seen through a cut-away side).
export function makeCharcoalIron(parent, { x = 0, y = 0 } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, 0); parent.add(g);
  const xb = -2.8, xt = 3.0, W = 1.45;
  const cast = M.metal(0x3d3f44, { roughness: 0.55, metalness: 0.75, transparent: true, opacity: 1, side: THREE.DoubleSide });
  const base = mesh(loft([{ y: 0, s: 1 }, { y: 0.3, s: 1 }], { xb, xt, W, x0: xb, x1: xt }), cast); g.add(base);
  // walls: an open box lofted from the same outline, cut away on the near side for the x-ray view
  const walls = mesh(loft([{ y: 0.3, s: 1 }, { y: 1.75, s: 0.97 }], { xb, xt, W, x0: xb, x1: xt, bottom: false, top: false }), cast); g.add(walls);
  const holes = new THREE.InstancedMesh(new THREE.CircleGeometry(0.11, 12), M.glow(0xff7a2a, { transparent: true, opacity: 0.8, side: THREE.DoubleSide }), 18);
  { const o = new THREE.Object3D(); let i = 0; for (const sgn of [1, -1]) for (let k = 0; k < 9; k++) { const hx = -2.2 + k * 0.55, hw = halfW(hx, xb, xt, W) * 0.985; o.position.set(hx, 0.75, sgn * (hw + 0.01)); o.rotation.set(0, sgn > 0 ? 0 : Math.PI, 0); o.updateMatrix(); holes.setMatrixAt(i++, o.matrix); } }
  g.add(holes);
  const lid = new THREE.Group(); lid.position.set(xt - 0.6, 1.75, 0); g.add(lid);
  const lidM = mesh(loft([{ y: 0, s: 1 }, { y: 0.2, s: 0.98 }], { xb, xt, W, x0: xb, x1: xt }), cast); lidM.position.x = -(xt - 0.6); lid.add(lidM);
  const wood = M.matte(0x7a4a26, { roughness: 0.7 });
  const postA = beam([-2.2 - (xt - 0.6), 0.2, 0], [-2.0 - (xt - 0.6), 1.45, 0], 0.12, cast), postB = beam([1.6 - (xt - 0.6), 0.2, 0], [1.4 - (xt - 0.6), 1.45, 0], 0.12, cast);
  lid.add(postA, postB);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 3.9, 20), wood); handle.rotation.z = Math.PI / 2; handle.position.set(-0.3 - (xt - 0.6), 1.55, 0); handle.castShadow = true; lid.add(handle);
  const latch = box(0.2, 0.5, 0.5, cast); latch.position.set(xb + 0.05, 1.7, 0); g.add(latch);
  const knobTop = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), M.metal(0xb08c4a)); knobTop.position.set(xt - 0.9 - (xt - 0.6), 0.35, 0); lid.add(knobTop);
  // the coals: glowing lumps on a grate
  const coals = dots(70, 0.2, 0xff5a1a, 7); g.add(coals);
  const rnd = rng(11), CP = Array.from({ length: 70 }, () => { const cx = xb + 0.4 + rnd() * (xt - xb - 1.3); const hw = halfW(cx, xb, xt, W) * 0.75; return [cx, 0.5 + rnd() * 0.5, (rnd() * 2 - 1) * hw, 0.6 + rnd() * 0.7, rnd()]; });
  const cHot = new THREE.Color(0xffb03a), cDim = new THREE.Color(0x5a1a0a), cAsh = new THREE.Color(0x777777), cT = new THREE.Color();
  return {
    g, lid, walls, cast, xb, xt,
    set({ glow = 0.5, coal = 1, open = 0, xray = false, tt = 0 } = {}) {
      lid.rotation.z = -open * 1.1;
      cast.opacity = xray ? 0.35 : 1; cast.depthWrite = !xray;
      const n = Math.round(clamp(coal, 0, 1) * 70);
      for (let i = 0; i < 70; i++) {
        const [cx, cy, cz, s, ph] = CP[i];
        if (i >= n) { coals.place(i, 0, -50, 0, 0.0001); continue; }
        const fl = (0.35 + glow) * (0.8 + 0.2 * Math.sin(tt * 3 + ph * 20));
        cT.copy(cDim).lerp(cHot, clamp(fl, 0, 1)); if (ph > 0.75) cT.lerp(cAsh, 0.5);
        coals.tint(i, cT); coals.place(i, cx, cy * Math.max(0.4, coal), cz, s);
      }
      coals.done();
      holes.material.opacity = 0.2 + 0.7 * clamp(glow, 0, 1);
    },
  };
}
export { clamp, smooth, approach, lerp };

// In the tall reel video, a scene may carry its own `tall` view: the stage's portrait framing backs the
// camera off 2.5 times, and the boards stack above the model, so the landscape view rarely fits.
export function tallView(stage, reel) {
  if (!inReel() || stage.camera.aspect >= 0.9 || !stage.home) return;
  const r = reel.find((x) => x.view && x.tall && stage.home.pos === x.view.pos);
  if (r) stage.setView(r.tall.pos, r.tall.target, 0.01);
}
// On a phone the readout covers the top of the stage, so boards move lower (outside the reel).
export function narrowBoards(narrow, list) {
  if (inReel()) return;
  list.forEach(([b, pos]) => {
    if (!b.wide) b.wide = b.mesh.position.clone();
    if (narrow) b.mesh.position.set(...pos); else b.mesh.position.copy(b.wide);
  });
}
