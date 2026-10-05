import { expect,it } from 'vitest';
import { DEFAULT_CONFIG,TYPES } from '@/lib/design';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';

it('keeps high and empty inventory layouts finite and inside their walls',()=>{
  let seed=1193;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<250;i++){
    const c=structuredClone(DEFAULT_CONFIG);c.closetType=TYPES[i%TYPES.length];
    c.dimensions={width:36+Math.floor(random()*400),height:84+Math.floor(random()*140),depth:18+Math.floor(random()*31)};
    c.roomDimensions={roomWidth:c.dimensions.width,roomDepth:48+Math.floor(random()*300)};
    for(const k of Object.keys(c.wardrobe) as Array<keyof typeof c.wardrobe>)if(k!=='jewelry')c.wardrobe[k]=i%5===0?0:Math.floor(random()*300);
    for(const k of Object.keys(c.shoes) as Array<keyof typeof c.shoes>)c.shoes[k]=i%5===0?0:Math.floor(random()*100);
    c.userInfo.drawerPreference=(['many-small','few-large','mixed'] as const)[i%3];
    c.userInfo.priorityItems=i%2?['accessories']:['folded','shoes'];
    c.zoneOverrides={drawerPosition:(['bottom','middle','top'] as const)[i%3]};
    const layout=new ClosetLayoutEngine(c).calculateLayout();
    expect(Number.isFinite(layout.utilizationScore)).toBe(true);
    for(const row of layout.capacity??[])expect(Number.isFinite(row.required)&&Number.isFinite(row.available)&&row.available>=0).toBe(true);
    for(const wall of layout.walls)for(const zone of wall.zones){
      expect(zone.x).toBeGreaterThanOrEqual(0);expect(zone.y).toBeGreaterThanOrEqual(0);
      expect(zone.width).toBeGreaterThan(0);expect(zone.height).toBeGreaterThan(0);
      expect(zone.x+zone.width).toBeLessThanOrEqual(wall.width+.001);expect(zone.y+zone.height).toBeLessThanOrEqual(wall.height+.001);
      for(const d of zone.drawers??[]){expect(d.width).toBeGreaterThan(0);expect(d.depth).toBeGreaterThan(0);expect(d.width).toBeLessThanOrEqual(zone.width);expect(d.position+d.height).toBeLessThanOrEqual(wall.height+.001);}
    }
  }
});
