import type { PlanningOptions } from '@/types/closet';
import { GENERATOR_CAPABILITIES } from './measurementPolicy';

export const HANGER_SPACING = {longDresses:2.5,shortJackets:1.8,suits:1.8,shirts:1.8,pants:1.8};
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
