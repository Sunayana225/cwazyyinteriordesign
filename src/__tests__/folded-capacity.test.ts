import { describe, it, expect } from 'vitest';
import { capacityReport, DEFAULT_CONFIG, EMPTY_WARDROBE, FOLDED_REFERENCE, foldedDrawerCapacity } from '@/lib/design';
import { remainingInventory } from '@/lib/inventoryBudget';
import type { ClosetZone } from '@/types/closet';

describe('folded drawer capacity',()=>{
  it('calibrates one reference drawer and scales each usable dimension',()=>{
    expect(foldedDrawerCapacity(FOLDED_REFERENCE)).toBe(1);
    for(const field of ['width','depth','height'] as const){
      let previous=0;
      for(const fraction of [.25,.5,1,1.5,2]){
        const value=foldedDrawerCapacity({...FOLDED_REFERENCE,[field]:FOLDED_REFERENCE[field]*fraction});
        expect(value).toBeGreaterThanOrEqual(previous);previous=value;
      }
      expect(foldedDrawerCapacity({...FOLDED_REFERENCE,[field]:FOLDED_REFERENCE[field]/2})).toBeLessThan(.5);
    }
  });
  it('treats invalid or fully consumed interiors as zero capacity',()=>{
    for(const field of ['width','depth','height'] as const)for(const value of [NaN,Infinity,-Infinity,-1,0,.1])expect(foldedDrawerCapacity({...FOLDED_REFERENCE,[field]:value})).toBe(0);
  });
  it('uses the same reduced capacity in the report and remaining inventory',()=>{
    const inventory={wardrobe:{...EMPTY_WARDROBE,tShirts:20},shoes:{...DEFAULT_CONFIG.shoes}};
    const zone:ClosetZone={type:'drawers',x:0,y:3,width:24,height:30,drawers:[{width:10,depth:18,height:9,position:3,purpose:'folded'}]};
    const capacity=capacityReport(inventory,[{zones:[zone]}]).find(r=>r.label==='Folded storage')!.available;
    expect(capacity).toBeCloseTo(9.5/19.5);
    expect(remainingInventory(inventory,[zone]).wardrobe.tShirts).toBe(20-Math.floor(capacity*10));
    expect(inventory.wardrobe.tShirts).toBe(20);
  });
  it('never lets nonfinite rods or shelf counts poison the capacity table',()=>{
    const z:ClosetZone={type:'long-hang',x:0,y:3,width:24,height:90,rods:[{height:70,length:NaN,depth:22,purpose:'long'}],shelves:[{height:0,spacing:10,count:Infinity,depth:12,purpose:'sneakers'}]};
    expect(capacityReport(DEFAULT_CONFIG,[{zones:[z]}]).every(r=>Number.isFinite(r.available)&&r.available===0)).toBe(true);
  });
});
