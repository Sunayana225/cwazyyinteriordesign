import {it,expect} from 'vitest';
import {DEFAULT_CONFIG,EMPTY_WARDROBE,TYPES,capacityReport} from '@/lib/design';
import {DEFAULT_TIE_DIMENSIONS,tieTrayCapacity} from '@/lib/tieStorage';
import {ClosetLayoutEngine} from '@/engine/ClosetLayoutEngine';
import {remainingInventory} from '@/lib/inventoryBudget';
import {canonicalConfig,validConfig,invalidConfigurationField} from '@/lib/storage';
import {unassessedStorage} from '@/lib/storageFit';
import {householdDemand} from '@/lib/householdDemand';

it('fits only whole folded ties with usable edge and height allowances',()=>{
  const p={tieDimensions:DEFAULT_TIE_DIMENSIONS},drawer={width:20,depth:18,height:3};
  expect(tieTrayCapacity(drawer,p)).toBe(8);expect(tieTrayCapacity({...drawer,height:2.875},p)).toBe(0);
  expect(tieTrayCapacity({width:12.5,depth:5,height:3},p)).toBe(2); // fits after uniform rotation
  for(const field of ['width','depth','height'])for(const n of [NaN,Infinity,0,-1])expect(tieTrayCapacity({...drawer,[field]:n},p)).toBe(0);
  expect(tieTrayCapacity(drawer,{tieDimensions:{width:30,depth:30,height:2}})).toBe(0);
});

it('keeps legacy tie requests unassessed until measured storage is enabled',()=>{
  const c=structuredClone(DEFAULT_CONFIG);c.wardrobe.ties=30;
  expect(unassessedStorage(c)).toContain('Ties');expect(new ClosetLayoutEngine(c).calculateLayout().capacity?.some(r=>r.label==='Ties')).toBe(false);
  c.planning={tieDimensions:DEFAULT_TIE_DIMENSIONS};const layout=new ClosetLayoutEngine(c).calculateLayout();
  expect(unassessedStorage(c)).not.toContain('Ties');expect(layout.capacity?.find(r=>r.label==='Ties')).toMatchObject({required:30,available:32});
  const all=layout.walls.flatMap(w=>w.zones);expect(remainingInventory({wardrobe:c.wardrobe,shoes:c.shoes},all,c.planning).wardrobe.ties).toBe(0);
  expect(capacityReport(c,[{zones:[{type:'drawers',x:0,y:0,width:24,height:9,drawers:[{width:20,depth:18,height:9,position:0,purpose:'belts & ties'}]}]}]).find(r=>r.label==='Ties')!.available).toBe(0);
});

it.each(TYPES)('keeps measured trays inside the fractional envelope and counts them once: %s',closetType=>{
  const c=structuredClone(DEFAULT_CONFIG);c.closetType=closetType;c.roomDimensions={roomWidth:180,roomDepth:144};c.wardrobe={...EMPTY_WARDROBE,ties:85};c.shoes={boots:0,heels:0,sneakers:0,flats:0};c.planning={tieDimensions:{width:3.125,depth:14.125,height:2.125},walls:{back:{floorOffset:11.875,ceilingHeight:60.125}}};
  const layout=new ClosetLayoutEngine(c).calculateLayout(),row=layout.capacity!.find(r=>r.label==='Ties')!;let capacity=0;
  for(const wall of layout.walls)for(const z of wall.zones)for(const d of z.drawers??[]){expect(d.position+d.height).toBeLessThanOrEqual(wall.height+.000001);if(d.purpose==='ties')capacity+=tieTrayCapacity(d,c.planning);}
  expect(row.available).toBe(capacity);expect(remainingInventory({wardrobe:c.wardrobe,shoes:c.shoes},layout.walls.flatMap(w=>w.zones),c.planning).wardrobe.ties).toBe(Math.max(0,85-capacity));
});

it('retains measured requests in backup and uses reserve demand consistently',()=>{
  const c=structuredClone(DEFAULT_CONFIG);c.wardrobe.ties=10;c.planning={tieDimensions:{width:3.125,depth:12.125,height:2.125}};c.inventoryPlanning={reserve:{'wardrobe.ties':25}};
  expect(validConfig(c)).toBe(true);expect(canonicalConfig(c).planning?.tieDimensions).toEqual(c.planning.tieDimensions);
  expect(new ClosetLayoutEngine(c).calculateLayout().capacity!.find(r=>r.label==='Ties')!.required).toBe(13);expect(householdDemand(c).rows.find(r=>r.label==='Ties')!.reserve).toBe(3);
  for(const value of [NaN,Infinity,0,-1]){const bad={...c,planning:{tieDimensions:{...DEFAULT_TIE_DIMENSIONS,width:value}}};expect(validConfig(bad)).toBe(false);expect(invalidConfigurationField(bad)).toContain('planning.tieDimensions.width');}
});

it('does not invent capacity for oversized ties or allocate satisfied ties again on later walls',()=>{
  const c=structuredClone(DEFAULT_CONFIG);c.closetType='walkin-u';c.roomDimensions={roomWidth:180,roomDepth:144};c.wardrobe={...EMPTY_WARDROBE,ties:8};c.shoes={boots:0,heels:0,sneakers:0,flats:0};c.planning={tieDimensions:DEFAULT_TIE_DIMENSIONS};
  const layout=new ClosetLayoutEngine(c).calculateLayout();expect(layout.walls[0].zones.flatMap(z=>z.drawers??[]).some(d=>d.purpose==='ties')).toBe(true);expect(layout.walls.slice(1).flatMap(w=>w.zones).flatMap(z=>z.drawers??[]).some(d=>d.purpose==='ties')).toBe(false);
  c.planning.tieDimensions={width:200,depth:100,height:20};const impossible=new ClosetLayoutEngine(c).calculateLayout();expect(impossible.capacity!.find(r=>r.label==='Ties')!.available).toBe(0);expect(impossible.layoutWarnings.some(w=>w.message==='Ties shortfall')).toBe(true);
});
