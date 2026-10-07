import {expect,it} from 'vitest';
import {shoeShelves} from '@/lib/shoePlanning';
import {accessoryShelves} from '@/lib/accessoryShelves';
import {selectColumns} from '@/lib/columnSelection';
import {ClosetLayoutEngine} from '@/engine/ClosetLayoutEngine';
import {DEFAULT_CONFIG,TYPES} from '@/lib/design';

it('shares scarce shoe height across all categories when a row of each fits',()=>{
 const inventory={boots:100,heels:100,sneakers:100,flats:100};
 const rows=shoeShelves(inventory,59,24);
 expect(new Set(rows.map(s=>s.purpose))).toEqual(new Set(Object.keys(inventory)));
 expect(rows[0].purpose).toBe('boots');
 expect(rows.at(-1)!.height+rows.at(-1)!.spacing+1).toBeLessThanOrEqual(58);
 expect(shoeShelves(inventory,59,24)).toEqual(rows);
});
it('uses smaller openings when a tall boot opening would crowd out the other categories',()=>{
 const rows=shoeShelves({boots:100,heels:100,sneakers:100,flats:100},30,24);
 expect(new Set(rows.map(s=>s.purpose))).toEqual(new Set(['heels','sneakers','flats']));
});
it('honors custom shoe clearances without claiming more rows than fit',()=>{
 const inventory={boots:3,heels:4,sneakers:12,flats:4};
 const clearances={boots:30,heels:12,sneakers:14,flats:8};
 for(const height of [30,59,84,96,144,600])for(const width of [12,18,24,29,48]){
  const shelves=shoeShelves(inventory,height,width,clearances);
  shelves.forEach((s,i)=>{
   expect(s.spacing).toBe(clearances[s.purpose as keyof typeof clearances]);
   expect(s.height+s.spacing+1).toBeLessThanOrEqual(height-1+.00001);
   if(i)expect(s.height).toBeGreaterThanOrEqual(shelves[i-1].height+shelves[i-1].spacing+1-.00001);
  });
 }
});
it('never claims a bag or folded stack fits below its opening-width requirement',()=>{
 expect(accessoryShelves(12,93,24,10,false).every(s=>s.count===0)).toBe(true);
 expect(accessoryShelves(14,93,24,1,false).find(s=>s.purpose==='bags')?.count).toBe(1);
 expect(accessoryShelves(14,93,24,0,false).every(s=>s.count===0)).toBe(true);
 expect(accessoryShelves(16,93,24,0,false).every(s=>s.count===1)).toBe(true);
});
it('chooses a feasible subset using explicit priority scores with stable tie breaks',()=>{
 const candidates=[{type:'long',minimum:24,score:1,demand:10},{type:'short',minimum:24,score:2,demand:20},{type:'shoes',minimum:12,score:1,demand:5}];
 expect(selectColumns(candidates,36)).toEqual(['short','shoes']);
 expect(selectColumns(candidates.map(c=>({...c,score:c.type==='long'?5:c.score})),36)).toEqual(['long','shoes']);
 expect(selectColumns(candidates,60)).toEqual(['long','short','shoes']);
 expect(selectColumns(candidates,11)).toEqual([]);
});
it('keeps generated hanging and drawer zones above minimum widths across shapes and fractional spans',()=>{
 for(const type of TYPES)for(const width of [36,47.875,48,59.875,60,71.875,96]){
  const c=structuredClone(DEFAULT_CONFIG);c.closetType=type;c.dimensions.width=width;c.roomDimensions={roomWidth:width,roomDepth:width+24};
  const l=new ClosetLayoutEngine(c).calculateLayout();
  for(const wall of l.walls)for(const z of wall.zones){
   if(z.rods?.length)expect(z.width).toBeGreaterThanOrEqual(24-.000001);
   if(z.drawers?.length)expect(z.width).toBeGreaterThanOrEqual(15-.000001);
   expect(z.x+z.width).toBeLessThanOrEqual(wall.width+.000001);
  }
 }
});
it('explains omitted automatic columns and reports their inventory shortfall',()=>{
 const c=structuredClone(DEFAULT_CONFIG);c.dimensions.width=36;
 const l=new ClosetLayoutEngine(c).calculateLayout();
 expect(l.inputWarnings?.some(w=>w.includes('preserve minimum column widths'))).toBe(true);
 expect(l.capacity?.some(row=>row.required>row.available)).toBe(true);
});
it('preserves manually chosen column types when automatic priorities change',()=>{
 const c=structuredClone(DEFAULT_CONFIG);c.dimensions.width=36;c.zoneOverrides={columns:{back:[{id:'mine',type:'long-hang',width:36}]}};
 c.userInfo.priorityItems=['shoes'];const l=new ClosetLayoutEngine(c).calculateLayout();
 expect(l.zones.find(z=>z.type==='long-hang')?.width).toBe(36);
 expect(l.zones.some(z=>z.type==='shoe-shelves')).toBe(false);
});
