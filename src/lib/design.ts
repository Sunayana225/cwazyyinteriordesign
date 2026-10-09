import type { ClosetConfiguration, ClosetLayout, ClosetWall, WardrobeItems, DrawerConfig } from '@/types/closet';
import { MAX_DIMENSION, MAX_HEIGHT, MAX_CABINET_DEPTH } from './planning';
import { MEASUREMENT_MINIMUMS } from './measurementPolicy';
import { hangerSpacing } from './fitMeasurements';
import type { PlanningOptions } from '@/types/closet';

/** Floors are what the generator can still draw something sensible for, not a
 * recommendation. Small spaces are real closets — a 24 in linen press, a 60 in
 * kids' or under-stair closet, a 14 in coat press — so the engine degrades the
 * elements it offers instead of refusing the measurement. See ELEMENT_FIT. */
export const LIMITS = { width: MEASUREMENT_MINIMUMS.width, height: MEASUREMENT_MINIMUMS.height, depthMin: MEASUREMENT_MINIMUMS.depth, depthMax: MAX_CABINET_DEPTH, roomDepth: MEASUREMENT_MINIMUMS.roomDepth, widthMax:MAX_DIMENSION,heightMax:MAX_HEIGHT,roomDepthMax:MAX_DIMENSION };
/** Smallest clear height and cabinet depth each element physically needs, in inches.
 * Depth is the constraint most often missed: a garment on a hanger needs roughly
 * 20 in front-to-back, so a shallow cabinet gets shelves and drawers, never a rod. */
export const ELEMENT_FIT = {
  'long-hang':    { height: 68, depth: 20 },
  'short-hang':   { height: 30, depth: 20 },
  'shoe-shelves': { height: 20, depth: 12 },
  'drawers':      { height: 12, depth: 12 },
  'top-shelves':  { height: 15, depth: 9  },
} as const;
export type FittedElement = keyof typeof ELEMENT_FIT;
/** Non-usable base gap below the lowest element, in inches. Shared so the engine and
 * the layout canvas compute the same clear height. */
export const TOE_KICK = 3;
/** Whether an element can physically be built in a cabinet of this height and depth. */
export function elementFits(element:FittedElement,height:number,depth:number){
  const need=ELEMENT_FIT[element];
  return height>=need.height&&depth>=need.depth;
}
export function dimensionRange(field:string){return (field==='height'||field==='cabinetHeight')?{min:LIMITS.height,max:LIMITS.heightMax}:field==='depth'?{min:LIMITS.depthMin,max:LIMITS.depthMax}:field==='roomDepth'?{min:LIMITS.roomDepth,max:LIMITS.roomDepthMax}:{min:LIMITS.width,max:LIMITS.widthMax};}
export const SHOE_SPACING = { boots: 25, heels: 8, sneakers: 8, flats: 6 };
export const SHOE_PAIR_WIDTH = { boots: 7, heels: 4, sneakers: 5, flats: 4 };
export const FOLDED_PER_DRAWER = { tShirts: 10, sweaters: 5, jeans: 6, underwear: 20 };
/** Reference box dimensions for the existing category estimates, in inches.
 * This is an approximate packing volume, not proof that a specific folded item fits. */
export const FOLDED_REFERENCE = { width:20, depth:18, height:9, edgeClearance:.25, bottomAllowance:1 } as const;
const finitePositive=(n:number)=>Number.isFinite(n)&&n>0?n:0;
export function foldedDrawerCapacity(drawer:Pick<DrawerConfig,'width'|'depth'|'height'>):number {
  const usable=(n:number,loss:number)=>Math.max(0,finitePositive(n)-loss);
  const volume=usable(drawer.width,2*FOLDED_REFERENCE.edgeClearance)*usable(drawer.depth,2*FOLDED_REFERENCE.edgeClearance)*usable(drawer.height,FOLDED_REFERENCE.bottomAllowance);
  const reference=(FOLDED_REFERENCE.width-2*FOLDED_REFERENCE.edgeClearance)*(FOLDED_REFERENCE.depth-2*FOLDED_REFERENCE.edgeClearance)*(FOLDED_REFERENCE.height-FOLDED_REFERENCE.bottomAllowance);
  return Number.isFinite(volume)?volume/reference:0;
}
/** Usable well footprint per drawer category, in inches. `w`/`d` are the size to aim
 * for, `minW`/`minD` the smallest well still worth building. A `0` target means the
 * well spans that axis completely (a full-depth lane). Templates divide a measured
 * drawer interior against these instead of a fixed row/column count. */
export const ORGANIZER_FOOTPRINTS: Record<string,{w:number;d:number;minW:number;minD:number}> = {
  Socks:            { w: 3.5,  d: 3.5,  minW: 3,    minD: 3 },
  Underwear:        { w: 5.5,  d: 4,    minW: 4.5,  minD: 3.5 },
  Watches:          { w: 4.25, d: 4.25, minW: 3.75, minD: 3.75 },
  Belts:            { w: 4.5,  d: 4.5,  minW: 4,    minD: 4 },
  'Folded clothes': { w: 11,   d: 12,   minW: 9,    minD: 8 },
  Ties:             { w: 2.25, d: 0,    minW: 2,    minD: 0 },
  Jewelry:          { w: 2,    d: 2,    minW: 1.5,  minD: 1.5 },
  Tech:             { w: 3,    d: 3,    minW: 2.5,  minD: 2.5 },
  General:          { w: 0,    d: 0,    minW: 2,    minD: 2 },
};
/** Band widths (inches) for the measured specialty layouts. Bands hold real
 * proportions at any drawer width; narrow drawers drop whole bands rather than
 * squeezing one below its minimum. */
export const ORGANIZER_BANDS = { ringLane: 1.75, earringWell: 2, braceletBay: 4, necklaceLane: 3.5, deviceBay: 7, cableWell: 3, chargerBay: 4.5 };
/** `validInteriors` and `splitCell` both cap an organizer at 36 compartments. */
export const MAX_COMPARTMENTS = 36;
export const HARDWARE = { chrome: '#707070', brass: '#95651e', black: '#242424', gold: '#a77b16' };
export const STYLES = ['minimal', 'modern', 'glam', 'rustic', 'luxury'] as const;
export const FINISHES = ['white', 'light', 'medium', 'dark'] as const;
export const WOOD_OPTIONS = [
  { id: 'white', name: 'White Painted', color: '#ffffff', description: 'Clean painted finish' },
  { id: 'light', name: 'Light Oak', color: '#f5f1eb', description: 'Natural light wood' },
  { id: 'medium', name: 'Walnut', color: '#d4c2a8', description: 'Warm medium wood' },
  { id: 'dark', name: 'Dark Espresso', color: '#8d6e63', description: 'Deep wood tone' },
];
export const STYLE_OPTIONS = [
  { id: 'minimal', name: 'Minimal', desc: 'Flat fronts, recessed edge grips', icon: '⬜' },
  { id: 'modern', name: 'Modern', desc: 'Slab fronts, long linear pulls', icon: '🔳' },
  { id: 'glam', name: 'Glam', desc: 'Double borders, paired square pulls', icon: '✨' },
  { id: 'rustic', name: 'Rustic', desc: 'Wide framed fronts, compact pulls', icon: '🌿' },
  { id: 'luxury', name: 'Luxury', desc: 'Fluted fronts, slender pulls', icon: '👑' },
].map(s => ({ ...s, description: s.desc, swatch: 'bg-cream-50 border-cream-200' }));
export const TYPES = ['reach-in', 'wardrobe-wall', 'walkin-single', 'walkin-l', 'walkin-u', 'island', 'corridor'] as const;
export const EMPTY_WARDROBE: WardrobeItems = { longDresses: 0, shortJackets: 0, suits: 0, shirts: 0, pants: 0, tShirts: 0, sweaters: 0, jeans: 0, underwear: 0, bags: 0, belts: 0, jewelry: false, ties: 0 };
export const DEFAULT_CONFIG: ClosetConfiguration = {
  closetType: 'reach-in', dimensions: { width: 96, height: 96, depth: 24 },
  wardrobe: { ...EMPTY_WARDROBE, longDresses: 3, shortJackets: 4, suits: 2, shirts: 10, pants: 5, tShirts: 15, sweaters: 6, jeans: 4, underwear: 10, bags: 3, belts: 2, jewelry: true },
  shoes: { sneakers: 5, heels: 4, boots: 2, flats: 3 },
  userInfo: { userType: 'homeowner', stylePreference: 'modern', woodFinish: 'medium', drawerPreference: 'mixed', priorityItems: ['hanging'] },
};
export const isWalkIn = (type?: string) => !!type && type !== 'reach-in' && type !== 'wardrobe-wall';
export function formatInches(n: number) {
  const rounded = Math.round(n * 8) / 8;
  return `${Math.floor(rounded / 12)}'-${Number((rounded % 12).toFixed(3))}"`;
}
export function dimensionErrors(c: Partial<ClosetConfiguration>): string[] {
  const d = c.dimensions;
  const finite = (n: unknown, min: number, max = Number.MAX_SAFE_INTEGER) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
  const errors: string[] = [];
  if (!finite(isWalkIn(c.closetType) ? c.roomDimensions?.roomWidth : d?.width, LIMITS.width,LIMITS.widthMax)) errors.push(`Width must be between ${LIMITS.width} and ${LIMITS.widthMax} inches.`);
  if (!finite(d?.height, LIMITS.height,LIMITS.heightMax)) errors.push(`Height must be between ${LIMITS.height} and ${LIMITS.heightMax} inches.`);
  if (!finite(d?.depth, LIMITS.depthMin, LIMITS.depthMax)) errors.push(`Cabinet depth must be between ${LIMITS.depthMin} and ${LIMITS.depthMax} inches.`);
  if (isWalkIn(c.closetType) && !finite(c.roomDimensions?.roomDepth, LIMITS.roomDepth,LIMITS.roomDepthMax)) errors.push(`Room depth must be between ${LIMITS.roomDepth} and ${LIMITS.roomDepthMax} inches.`);
  if (d?.cabinetHeight !== undefined && (!finite(d.cabinetHeight, LIMITS.height, LIMITS.heightMax) || d.cabinetHeight > d.height)) errors.push('Cabinet height must be within the supported height range and no higher than the ceiling.');
  return errors;
}
export function hangingDemand(w: WardrobeItems, planning?:PlanningOptions) {
  const spacing=hangerSpacing(planning);
  // Preserve the arithmetic of existing projects when every short hanger is equal.
  const equal=spacing.shirts===spacing.shortJackets&&spacing.shirts===spacing.pants&&spacing.shirts===spacing.suits;
  return { long: w.longDresses * spacing.longDresses, short: equal?(w.shirts+w.shortJackets+w.pants+w.suits*2)*spacing.shirts:w.shirts*spacing.shirts+w.shortJackets*spacing.shortJackets+w.pants*spacing.pants+w.suits*2*spacing.suits };
}
export function foldedDemand(w: WardrobeItems) {
  return Object.entries(FOLDED_PER_DRAWER).reduce((n, [key, count]) => n + w[key as keyof typeof FOLDED_PER_DRAWER] / count, 0);
}
export interface CapacityRow { label: string; required: number; available: number; unit: string; }
export function capacityReport(c: Pick<ClosetConfiguration, 'wardrobe' | 'shoes' | 'planning'>, walls: Pick<ClosetWall, 'zones'>[]): CapacityRow[] {
  const zones = walls.flatMap(w => w.zones);
  const demand = hangingDemand(c.wardrobe,c.planning);
  const rodCapacity = (long: boolean) => zones.filter(z => (z.type === 'long-hang') === long).flatMap(z => z.rods ?? []).reduce((n,r) => n + finitePositive(r.length), 0);
  const drawers = zones.flatMap(z => z.drawers ?? []);
  const shelves = zones.flatMap(z => z.shelves ?? []);
  return [
    { label: 'Long hanging', required: demand.long, available: rodCapacity(true), unit: 'inches of rod' },
    { label: 'Short hanging (suits count twice)', required: demand.short, available: rodCapacity(false), unit: 'inches of rod' },
    { label: 'Folded storage', required: foldedDemand(c.wardrobe), available: drawers.filter(d => d.purpose === 'folded').reduce((n,d) => n + foldedDrawerCapacity(d), 0), unit: 'standard drawer equivalents' },
    ...Object.keys(SHOE_SPACING).map(key => ({ label: key, required: c.shoes[key as keyof typeof SHOE_SPACING], available: shelves.filter(s => s.purpose === key).reduce((n,s) => n+Math.floor(finitePositive(s.count)),0), unit: 'pairs' })),
    { label: 'Bags', required: c.wardrobe.bags, available: shelves.filter(s => s.purpose === 'bags').reduce((n,s) => n+Math.floor(finitePositive(s.count)),0), unit: 'bags' },
    { label: 'Belts', required: c.wardrobe.belts, available: shelves.filter(s => s.purpose === 'belts').reduce((n,s) => n+Math.floor(finitePositive(s.count)),0), unit: 'belts' },
  ];
}
export function escapeHTML(value: unknown): string {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
