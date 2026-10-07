import type {ClosetZone} from '@/types/closet';

/** Stacked zones share one horizontal dimension, regardless of their contents. */
export function dimensionColumns(zones:ClosetZone[]):Array<{x:number;width:number}> {
  const unique=new Map<string,{x:number;width:number}>();
  for(const {x,width} of zones)unique.set(`${x.toFixed(4)}:${width.toFixed(4)}`,{x,width});
  return [...unique.values()].sort((a,b)=>a.x-b.x);
}

/** A vertical chain must describe one column. Combining unrelated columns
 * produces overlapping dimensions that cannot be read as a chain. */
export function rightHeightChain(zones:ClosetZone[],height:number):Array<{bottom:number;top:number}> {
  const column=dimensionColumns(zones).sort((a,b)=>(b.x+b.width)-(a.x+a.width))[0];
  if(!column)return [];
  return zones.filter(z=>Math.abs(z.x-column.x)<.0001&&Math.abs(z.width-column.width)<.0001)
    .map(z=>({bottom:Math.max(0,z.y),top:Math.min(height,z.y+z.height)}))
    .filter(z=>z.top>z.bottom).sort((a,b)=>a.bottom-b.bottom);
}
