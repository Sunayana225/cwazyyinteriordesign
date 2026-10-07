import type {ClosetZone} from '@/types/closet';

/** Reclaim only space above the highest rod support or occupied shoe opening.
 * Append the new zones so existing drawer indices and organizer IDs stay stable. */
export function withUpperStorage(zones:ClosetZone[],depth:number,opening=14):ClosetZone[] {
  const additions:ClosetZone[]=[];
  const fitted=zones.map(zone=>{
    const occupiedTop=zone.rods?.length
      ? Math.max(...zone.rods.map(rod=>rod.height))+2.5
      : zone.type==='shoe-shelves'&&zone.shelves?.length
        ? zone.y+Math.max(...zone.shelves.map(shelf=>shelf.height+shelf.spacing+1))
        : null;
    if(occupiedTop===null)return zone;
    const height=zone.y+zone.height-occupiedTop;
    const rows=Math.floor((height-1)/(opening+1));
    if(rows<1)return zone;
    const pitch=(height-1)/rows;
    additions.push({
      type:'top-shelves',x:zone.x,y:occupiedTop,width:zone.width,height,
      contentLabel:'Upper storage for seasonal items',
      shelves:Array.from({length:rows},(_,i)=>({height:i*pitch,depth:Math.min(depth,16),spacing:pitch-1,count:Math.max(0,Math.floor((zone.width-4)/12)),purpose:'seasonal storage'})),
    });
    return {...zone,height:occupiedTop-zone.y};
  });
  return [...fitted,...additions];
}
