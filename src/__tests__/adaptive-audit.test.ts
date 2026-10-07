import {it,expect} from 'vitest';
import {shoeColumnWidth,shoeShelves} from '@/lib/shoePlanning';
import {SHOE_SPACING,DEFAULT_CONFIG} from '@/lib/design';
import {normalizeColumns,resolveColumns,validColumns} from '@/lib/layoutColumns';
import {validConfig,invalidConfigurationField} from '@/lib/storage';
import {ClosetLayoutEngine} from '@/engine/ClosetLayoutEngine';
it('allocates shoe width using height and shoe clearance, not just pair count',()=>{
 const shoes={boots:0,heels:0,sneakers:20,flats:0};
 const short=shoeColumnWidth(shoes,45,120),tall=shoeColumnWidth(shoes,93,120);
 expect(short).toBe(29);expect(tall).toBe(24);
 const deeperClearance=shoeColumnWidth(shoes,45,120,{...SHOE_SPACING,sneakers:14});
 expect(deeperClearance).toBeGreaterThan(short);
 expect(shoeShelves(shoes,45,short).reduce((n,s)=>n+s.count,0)).toBeGreaterThanOrEqual(20);
 expect(shoeShelves(shoes,45,short-.125).reduce((n,s)=>n+s.count,0)).toBeLessThan(20);
});
it('does not claim a shoe pair fits in a column narrower than its footprint',()=>{
 expect(shoeShelves({boots:3,heels:0,sneakers:0,flats:0},93,8)).toEqual([]);
});
it('retains partial shoe storage on side walls when the full inventory cannot fit',()=>{
 const c=structuredClone(DEFAULT_CONFIG);c.closetType='walkin-l';
 c.roomDimensions={roomWidth:120,roomDepth:120};c.wardrobe.bags=0;c.wardrobe.belts=0;
 c.shoes={boots:10000,heels:10000,sneakers:10000,flats:10000};
 const layout=new ClosetLayoutEngine(c).calculateLayout();
 const side=layout.walls.find(w=>w.wallId==='left')!;
 const shoes=side.zones.find(z=>z.type==='shoe-shelves');
 expect(shoes).toBeDefined();expect(shoes!.width).toBe(72);
 expect(shoes!.shelves!.length).toBeGreaterThan(0);
 expect(side.zones.every(z=>z.x+z.width<=side.width)).toBe(true);
 expect(layout.capacity!.some(r=>r.unit==='pairs'&&r.required>r.available)).toBe(true);
});
it('keeps edited columns within supported widths when saving large designs',()=>{
 const columns={back:[{id:'wide',type:'top-shelves' as const,width:900}]};
 expect(validColumns(columns)).toBe(true);
 expect(validConfig({...structuredClone(DEFAULT_CONFIG),zoneOverrides:{columns}})).toBe(true);
 expect(validColumns({back:[{...columns.back[0],width:1201}]})).toBe(false);
});
it('never squeezes a manually chosen column below its minimum',()=>{
 const columns=[{id:'hang',type:'long-hang' as const,width:24}];
 expect(normalizeColumns(columns,18)).toEqual([]);
 expect(normalizeColumns(columns,NaN)).toEqual([]);
 expect(resolveColumns(columns,{width:18})).toEqual([]);
 const c=structuredClone(DEFAULT_CONFIG);c.zoneOverrides={columns:{back:columns}};
 c.planning={windows:[{id:'window',wall:'back',offset:0,width:78,sill:0,height:50}]};
 const l=new ClosetLayoutEngine(c).calculateLayout();
 expect(l.walls[0].zones).toEqual([]);expect(l.inputWarnings?.join(' ')).toContain('minimum widths');
});
it('reports the actual field for invalid custom cabinet height imports',()=>{
 const c=structuredClone(DEFAULT_CONFIG);c.dimensions.cabinetHeight=-10;
 expect(validConfig(c)).toBe(false);expect(invalidConfigurationField(c)).toBe('dimensions.cabinetHeight');
});
