import type { PlanningOptions, ShoeCollection } from '@/types/closet';
import { GENERATOR_CAPABILITIES } from './measurementPolicy';

export const HANGER_SPACING = {longDresses:2.5,shortJackets:1.8,suits:1.8,shirts:1.8,pants:1.8};
export const SHOE_WIDTH_DEFAULTS = {boots:7,heels:4,sneakers:5,flats:4};
const SHOE_LENGTH_DEFAULTS:ShoeCollection = {boots:12,heels:12,sneakers:12,flats:12};
function shoeMeasurements(defaults:ShoeCollection,values:Partial<ShoeCollection>|undefined,max:number):ShoeCollection {
  return Object.fromEntries(Object.entries(defaults).map(([key,fallback])=>{
    const value=values?.[key as keyof ShoeCollection];
    return [key,typeof value==='number'&&Number.isFinite(value)&&value>=.125&&value<=max?value:fallback];
  })) as unknown as ShoeCollection;
}
export const shoePairWidths=(p?:PlanningOptions)=>shoeMeasurements(SHOE_WIDTH_DEFAULTS,p?.shoePairWidths,GENERATOR_CAPABILITIES.roomSpan);
export const shoeLengths=(p?:PlanningOptions)=>shoeMeasurements(SHOE_LENGTH_DEFAULTS,p?.shoeLengths,GENERATOR_CAPABILITIES.cabinetDepth);
export function shoeAssumptions(p?:PlanningOptions):string {
  const widths=shoePairWidths(p),lengths=shoeLengths(p);
  return `Shoe measurements: ${Object.keys(widths).map(key=>`${key} pair width ${widths[key as keyof ShoeCollection]} in, length ${lengths[key as keyof ShoeCollection]} in`).join('; ')}. Pair width includes both shoes and side clearance. Length includes front-to-back clearance; a pair counts only when its shelf is deep enough. Defaults are estimates.`;
}
export type HangingCategory = keyof typeof HANGER_SPACING;
export const HANGER_LABELS:Record<HangingCategory,string> = {
  longDresses:'Long dresses',shortJackets:'Short jackets',suits:'Suit pieces',shirts:'Shirts',pants:'Pants',
};
/** Old projects retain the original estimates. Overrides describe occupied rod width
 * per hanger; suits still need two hangers. Invalid external values never divide by zero. */
export function hangerSpacing(planning?:PlanningOptions):Record<HangingCategory,number> {
  return Object.fromEntries(Object.entries(HANGER_SPACING).map(([key,fallback])=>{
    const value=planning?.hangerSpacing?.[key as HangingCategory];
    return [key,typeof value==='number'&&Number.isFinite(value)&&value>=.125&&value<=GENERATOR_CAPABILITIES.roomSpan?value:fallback];
  })) as Record<HangingCategory,number>;
}
export function hangerAssumptions(planning?:PlanningOptions):string {
  const spacing=hangerSpacing(planning);
  return `Hanger spacing per piece: ${Object.entries(spacing).map(([key,value])=>`${HANGER_LABELS[key as HangingCategory]} ${value} in`).join('; ')}. Suits use two pieces. Measure occupied rod width with the garments on their hangers; defaults are estimates.`;
}
