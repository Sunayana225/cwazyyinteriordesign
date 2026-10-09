import type {DrawerConfig,PlanningOptions} from '@/types/closet';

export interface TieDimensions {width:number;depth:number;height:number;}
export const DEFAULT_TIE_DIMENSIONS:TieDimensions={width:2.25,depth:12,height:2};
export function measuredTies(p?:PlanningOptions):TieDimensions|null {
  const d=p?.tieDimensions;
  return d&&[d.width,d.depth,d.height].every(n=>Number.isFinite(n)&&n>=.125)?d:null;
}
/** Whole folded ties in a single layer. A tray uses one uniform orientation;
 * no volume-only estimate, stacking, or sharing of a mixed accessory drawer. */
export function tieTrayCapacity(drawer:Pick<DrawerConfig,'width'|'depth'|'height'>,p?:PlanningOptions):number {
  const item=measuredTies(p);if(!item||![drawer.width,drawer.depth,drawer.height].every(n=>Number.isFinite(n)&&n>0))return 0;
  const width=Math.max(0,drawer.width-.5),depth=Math.max(0,drawer.depth-.5),height=Math.max(0,drawer.height-1);
  if(item.height>height+.000001)return 0;
  return Math.max(Math.floor((width+.000001)/item.width)*Math.floor((depth+.000001)/item.depth),Math.floor((width+.000001)/item.depth)*Math.floor((depth+.000001)/item.width));
}
export function tieAssumptions(p?:PlanningOptions):string {
  const d=measuredTies(p);return d?`Folded ties use a ${d.width} × ${d.depth} × ${d.height} in envelope including item clearance. Only dedicated tie trays count, in one layer with uniform rotation allowed. Each tray excludes 0.25 in at every edge and 1 in below the contents; mixed accessory drawers and divider fit are not counted.`:'Ties are not assessed until you enable and measure folded tie storage.';
}
