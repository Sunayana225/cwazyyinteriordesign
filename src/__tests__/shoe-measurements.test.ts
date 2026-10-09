import {it,expect} from 'vitest';
import {shoeShelves,shoeColumnWidth} from '@/lib/shoePlanning';
import {capacityReport,DEFAULT_CONFIG,EMPTY_WARDROBE} from '@/lib/design';
import {remainingInventory} from '@/lib/inventoryBudget';
import {incrementalDemand} from '@/lib/inventoryPlanning';
import {ClosetLayoutEngine} from '@/engine/ClosetLayoutEngine';
import {invalidConfigurationField,readBackup,serializeDesigns} from '@/lib/storage';
import {buildPrintDocument} from '@/engine/PDFExporter';
import type {ClosetZone} from '@/types/closet';
const shoes={boots:0,heels:0,sneakers:8,flats:0};

it('uses whole measured pair widths and chooses the narrowest feasible column',()=>{
  expect(shoeShelves(shoes,20,24)[0].count).toBe(4);
  expect(shoeShelves(shoes,20,24,undefined,{pairWidths:{sneakers:8}})[0].count).toBe(2);
  expect(shoeShelves(shoes,20,24,undefined,{pairWidths:{sneakers:20.125}})).toEqual([]);
  expect(shoeColumnWidth(shoes,20,100,undefined,24,{pairWidths:{sneakers:8}})).toBe(68);
  expect(shoeColumnWidth(shoes,20,100)).toBe(44);
  expect(incrementalDemand('shoes.sneakers',{shoePairWidths:{sneakers:8.125}})).toContain('8.125 in shelf width');
});

it('deepens boards to the measured shoe length and leaves unsuitable pairs outstanding',()=>{
  const fit={lengths:{sneakers:15},usableDepth:18};
  const shelves=shoeShelves({...shoes,flats:4},40,24,undefined,fit);
  expect(shelves.filter(s=>s.purpose==='sneakers').every(s=>s.depth===15)).toBe(true);
  const shallow=shoeShelves({...shoes,flats:4},40,24,undefined,{...fit,usableDepth:14.875});
  expect(shallow.some(s=>s.purpose==='sneakers')).toBe(false);
  expect(shallow.some(s=>s.purpose==='flats')).toBe(true);
  expect(shoeColumnWidth(shoes,40,100,undefined,24,{...fit,usableDepth:14})).toBe(24);
  const zones:ClosetZone[]=[{type:'shoe-shelves',x:0,y:3,width:24,height:40,shelves:shallow}];
  const inventory={wardrobe:{...EMPTY_WARDROBE},shoes:{...shoes,flats:4}};
  expect(remainingInventory(inventory,zones,{shoeLengths:fit.lengths}).shoes).toEqual(shoes);
  expect(capacityReport({...inventory,planning:{shoeLengths:{flats:13}}},[{zones}]).find(r=>r.label==='flats')?.available).toBe(0);
});

it('accounts for each wall baseboard before allocating long shoes',()=>{
  const config={...structuredClone(DEFAULT_CONFIG),closetType:'corridor' as const,roomDimensions:{roomWidth:160,roomDepth:96},wardrobe:{...EMPTY_WARDROBE},shoes,planning:{shoeLengths:{sneakers:18},walls:{'corridor-a':{depth:18,baseboard:1,priority:'shoes' as const},'corridor-b':{depth:20,priority:'shoes' as const}}}};
  const layout=new ClosetLayoutEngine(config).calculateLayout();
  expect(layout.walls[0].zones.flatMap(z=>z.shelves??[]).filter(s=>s.purpose==='sneakers')).toHaveLength(0);
  expect(layout.walls[1].zones.flatMap(z=>z.shelves??[]).some(s=>s.purpose==='sneakers'&&s.depth===18)).toBe(true);
  expect(layout.capacity?.find(r=>r.label==='sneakers')?.available).toBeGreaterThanOrEqual(8);
  expect(layout.inputWarnings?.some(w=>w.includes('usable cabinet depth is 17 in'))).toBe(true);
  expect(buildPrintDocument([{config,layout}])).toContain('sneakers pair width 5 in, length 18 in');
});

it('preserves fractional shoe measurements and rejects malformed overrides',()=>{
  const config={...structuredClone(DEFAULT_CONFIG),planning:{shoePairWidths:{sneakers:8.125},shoeLengths:{boots:14.625}}};
  expect(readBackup(serializeDesigns([{id:'shoe',name:'Measured shoes',savedAt:'2026-10-09',config}]))[0].config.planning).toEqual(config.planning);
  for(const value of [0,-1,NaN,Infinity,'12',1201])expect(invalidConfigurationField({...config,planning:{shoePairWidths:{boots:value}}})).toContain('planning.shoePairWidths.boots');
  for(const value of [0,-1,NaN,Infinity,'12',121])expect(invalidConfigurationField({...config,planning:{shoeLengths:{boots:value}}})).toContain('planning.shoeLengths.boots');
  expect(invalidConfigurationField({...config,planning:{shoeLengths:{sandals:12}}})).toContain('planning.shoeLengths.sandals');
});
