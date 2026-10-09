import type {ClosetLayout,ClosetWall,WallReservation} from '@/types/closet';
import {TOE_KICK} from './design';

/** Disjoint intervals retain every cause of an overlap, without counting any
 * length twice. Only the portion inside the measured wall is reserved. */
export function wallReservations(width:number,input:Array<{start:number;end:number;source:WallReservation['sources'][number]}>):WallReservation[]{
  if(!Number.isFinite(width)||width<=0)return [];
  const ranges=input.filter(r=>Number.isFinite(r.start)&&Number.isFinite(r.end))
    .map(r=>({...r,start:Math.max(0,r.start),end:Math.min(width,r.end)})).filter(r=>r.end>r.start);
  const cuts=[...new Set(ranges.flatMap(r=>[r.start,r.end]))].sort((a,b)=>a-b);
  const result:WallReservation[]=[];
  for(let i=1;i<cuts.length;i++){
    const start=cuts[i-1],end=cuts[i];
    const sources=[...new Map(ranges.filter(r=>r.start<end&&r.end>start).map(r=>[`${r.source.kind}:${r.source.id}`,r.source])).values()];
    if(sources.length)result.push({start,end,sources});
  }
  return result;
}

/** Cabinet top already includes its wall ceiling constraint. Usable storage
 * excludes both the raised base and the toe kick. */
export function wallStorageHeight(layout:ClosetLayout,id:ClosetWall['wallId'],offset?:number):number {
  const wall=layout.walls.find(w=>w.wallId===id);
  if(!wall)return 0;
  return Math.max(0,wall.height-(offset??layout.planning?.walls?.[id]?.floorOffset??0)-TOE_KICK);
}
