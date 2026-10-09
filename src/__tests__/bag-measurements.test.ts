import {it,expect} from 'vitest';
import {accessoryShelves} from '@/lib/accessoryShelves';
import {capacityReport,DEFAULT_CONFIG,EMPTY_WARDROBE} from '@/lib/design';
import {remainingInventory} from '@/lib/inventoryBudget';
import {incrementalDemand} from '@/lib/inventoryPlanning';
import {ClosetLayoutEngine} from '@/engine/ClosetLayoutEngine';
import {buildPrintDocument} from '@/engine/PDFExporter';
import {invalidConfigurationField,readBackup,serializeDesigns} from '@/lib/storage';
import type {ClosetZone} from '@/types/closet';

it('allocates whole bags using the measured width including handles and clearance',()=>{
  expect(accessoryShelves(24,93,24,3,false)[0].count).toBe(2);
  expect(accessoryShelves(24,93,24,3,false,14,{width:10.125})[0].count).toBe(1);
  expect(accessoryShelves(24,93,24,3,false,14,{width:20.125}).some(s=>s.purpose==='bags')).toBe(false);
});

it('reserves tall handle openings and fills the remaining height with ordinary shelves',()=>{
  for(const height of [30,50,93,141])for(const count of [0,1,5]){
    const shelves=accessoryShelves(24,height,24,count,true,14,{width:12,height:30});
    for(let i=0;i<shelves.length;i++){
      const s=shelves[i];expect(s.height+s.spacing+1).toBeLessThanOrEqual(height+.00001);
      if(i)expect(s.height).toBeGreaterThanOrEqual(shelves[i-1].height+shelves[i-1].spacing+1-.00001);
      if(s.purpose==='bags')expect(s.spacing).toBeGreaterThanOrEqual(30);
    }
  }
  const shelves=accessoryShelves(24,93,24,1,false,14,{width:12,height:30});
  expect(shelves.filter(s=>s.purpose==='bags')).toHaveLength(1);
  expect(shelves.filter(s=>s.purpose==='folded items')).toHaveLength(3);
  expect(shelves.at(-1)!.height+shelves.at(-1)!.spacing+1).toBeCloseTo(92);
});

it('keeps bags outstanding when no shelf opening fits their handle height',()=>{
  const inventory={wardrobe:{...EMPTY_WARDROBE,bags:3},shoes:{boots:0,heels:0,sneakers:0,flats:0}};
  const shelves=accessoryShelves(24,93,24,3,false);
  const zone:ClosetZone={type:'top-shelves',x:0,y:3,width:24,height:93,shelves};
  const planning={bagDimensions:{width:12,height:30}};
  expect(capacityReport({...inventory,planning},[{zones:[zone]}]).find(r=>r.label==='Bags')?.available).toBe(0);
  expect(remainingInventory(inventory,[zone],planning).wardrobe.bags).toBe(3);
  expect(incrementalDemand('wardrobe.bags',planning)).toBe('12 in shelf width with 30 in clear opening (including handles)');
});

it('widens automatic accessory columns for measured bags and preserves measured assumptions in print',()=>{
  const config={...structuredClone(DEFAULT_CONFIG),wardrobe:{...EMPTY_WARDROBE,bags:3,shirts:10},shoes:{boots:0,heels:0,sneakers:0,flats:0},planning:{bagDimensions:{width:28,height:30}}};
  const layout=new ClosetLayoutEngine(config).calculateLayout();
  const bagZone=layout.zones.find(z=>z.shelves?.some(s=>s.purpose==='bags'))!;
  expect(bagZone.width).toBe(32);
  expect(bagZone.shelves!.filter(s=>s.purpose==='bags').every(s=>s.spacing>=30)).toBe(true);
  expect(buildPrintDocument([{config,layout}])).toContain('Bag envelope: 28 in wide');
  const restored=readBackup(serializeDesigns([{id:'bag',name:'Measured bags',savedAt:'2026-10-09',config}]))[0].config;
  expect(restored.planning?.bagDimensions).toEqual({width:28,height:30});
  for(const value of [0,-1,Infinity,NaN,'3',601])expect(invalidConfigurationField({...config,planning:{bagDimensions:{height:value}}})).toContain('planning.bagDimensions.height');
  expect(invalidConfigurationField({...config,planning:{bagDimensions:{width:1201}}})).toContain('planning.bagDimensions.width');
  expect(invalidConfigurationField({...config,planning:{bagDimensions:{depth:12}}})).toContain('planning.bagDimensions.depth');
});
