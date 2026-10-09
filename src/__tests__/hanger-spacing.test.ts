import {it,expect} from 'vitest';
import {DEFAULT_CONFIG,EMPTY_WARDROBE,hangingDemand} from '@/lib/design';
import {hangerSpacing} from '@/lib/fitMeasurements';
import {remainingInventory} from '@/lib/inventoryBudget';
import {incrementalDemand} from '@/lib/inventoryPlanning';
import {ClosetLayoutEngine} from '@/engine/ClosetLayoutEngine';
import {readBackup,serializeDesigns,invalidConfigurationField} from '@/lib/storage';
import {buildPrintDocument} from '@/engine/PDFExporter';
import type {ClosetZone} from '@/types/closet';

it('measures each garment category independently while reserving two suit pieces',()=>{
  const wardrobe={...EMPTY_WARDROBE,longDresses:2,shirts:3,shortJackets:4,pants:5,suits:6};
  expect(hangingDemand(wardrobe,{hangerSpacing:{longDresses:4,shirts:1,shortJackets:3,pants:2,suits:5}})).toEqual({long:8,short:85});
  expect(hangingDemand(wardrobe).long).toBe(5);
  expect(hangerSpacing({hangerSpacing:{shirts:3}}).pants).toBe(1.8);
  expect(incrementalDemand('wardrobe.suits',{hangerSpacing:{suits:5}})).toBe('10 in hanging rod');
});

it('spends multiwall rod capacity using the same measured hanger widths',()=>{
  const inventory={wardrobe:{...EMPTY_WARDROBE,suits:3},shoes:DEFAULT_CONFIG.shoes};
  const zones:ClosetZone[]=[{type:'double-hang',x:0,y:0,width:16,height:80,rods:[{height:60,length:12,depth:12,purpose:'short hang'}]}];
  const first=remainingInventory(inventory,zones,{hangerSpacing:{suits:4}});
  expect(first.wardrobe.suits).toBe(2);
  expect(remainingInventory(first,zones,{hangerSpacing:{suits:4}}).wardrobe.suits).toBe(1);
  expect(inventory.wardrobe.suits).toBe(3);
});

it('changes allocated rod widths when measured garment bulk changes',()=>{
  const config={...structuredClone(DEFAULT_CONFIG),dimensions:{width:144,height:96,depth:24},wardrobe:{...EMPTY_WARDROBE,longDresses:20,shirts:30},shoes:{boots:0,heels:0,sneakers:0,flats:0}};
  const before=new ClosetLayoutEngine(config).calculateLayout();
  const after=new ClosetLayoutEngine({...config,planning:{hangerSpacing:{longDresses:6}}}).calculateLayout();
  expect(after.zones.find(z=>z.type==='long-hang')!.width).toBeGreaterThan(before.zones.find(z=>z.type==='long-hang')!.width);
});

it('uses measured demand in every closet shape and in printed assumptions',()=>{
  for(const closetType of ['reach-in','wardrobe-wall','walkin-single','walkin-l','walkin-u','corridor','island'] as const){
    const config={...structuredClone(DEFAULT_CONFIG),closetType,roomDimensions:{roomWidth:192,roomDepth:160},planning:{hangerSpacing:{longDresses:4,shirts:3,suits:5}}};
    const layout=new ClosetLayoutEngine(config).calculateLayout();
    expect(layout.capacity?.find(r=>r.label==='Long hanging')?.required).toBe(12);
    expect(layout.capacity?.find(r=>r.label.startsWith('Short hanging'))?.required).toBeCloseTo(66.2);
    expect(JSON.stringify(layout)).not.toMatch(/NaN|Infinity/);
    const print=buildPrintDocument([{layout,config}]);expect(print).toContain('Shirts 3 in');expect(print).toContain('Suit pieces 5 in');
  }
});

it('preserves fractional measurements in backups and rejects invalid overrides precisely',()=>{
  const config={...structuredClone(DEFAULT_CONFIG),planning:{hangerSpacing:{shirts:2.125,suits:4}}};
  expect(readBackup(serializeDesigns([{id:'a',name:'Measured',savedAt:'2026-10-09',config}]))[0].config.planning).toEqual(config.planning);
  for(const shirts of [0,-1,Infinity,NaN,'3',1201])expect(invalidConfigurationField({...config,planning:{hangerSpacing:{shirts}}})).toContain('planning.hangerSpacing.shirts');
  expect(invalidConfigurationField({...config,planning:{hangerSpacing:{coats:3}}})).toContain('planning.hangerSpacing.coats');
  expect(hangerSpacing({hangerSpacing:{shirts:NaN}}).shirts).toBe(1.8);
});
