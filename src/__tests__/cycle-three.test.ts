import { expect, it } from 'vitest';
import { cellSize, defaultInterior, grid, innerSize, mergeCells, moveDivider, splitCell, validInteriors } from '@/lib/drawers';
import type { DrawerInterior } from '@/lib/drawers';
import { achievableUsable, dividerLock, dividerPositions, pruneOrphanDividers, reconcileSelection, redistributeDividersEqualUsable, redistributeInventory, resizeCompartment } from '@/lib/drawerConstruction';
const drawer={width:24,depth:18,height:6,position:3,purpose:'folded'};
it.each(['x','y'] as const)('resizes high-count neighbors along %s without losing inventory',axis=>{
 const p={...defaultInterior(drawer),cells:grid(axis==='x'?1:2,axis==='x'?2:1).map(c=>({...c,quantity:600}))};
 const [a,b]=p.cells;
 for(const pair of [[a,b],[b,a]]){
  const next=moveDivider(p,pair[0].id,pair[1].id,.3,0,drawer);
  expect(next).not.toBe(p);expect(validInteriors({'back:0:0':next})).toBe(true);
  expect(next.cells.map(c=>c.quantity)).toEqual([600,600]);
  const resized=resizeCompartment(p,drawer,pair[0].id,pair[1].id,axis,5);
  expect(cellSize(resized.cells.find(c=>c.id===pair[0].id)!,drawer,resized)[axis==='x'?'width':'depth']).toBeCloseTo(5);
 }
 expect(mergeCells(p,a.id,b.id)).toBeNull();
 const locked={...p,lockedDividers:{x:axis==='x'?[.5]:[],y:axis==='y'?[.5]:[]},dividerNames:{[`${axis}:0.5`]:'Protected divider'}};
 expect(dividerLock(locked,a.id,b.id)).toBe('Protected divider');
 expect(moveDivider(locked,a.id,b.id,.3,0,drawer)).toBe(locked);
});
it.each(['x','y'] as const)('refuses to merge across a locked %s divider',axis=>{
 const p={...defaultInterior(drawer),cells:grid(axis==='x'?1:2,axis==='x'?2:1),lockedDividers:{x:axis==='x'?[.5]:[],y:axis==='y'?[.5]:[]}};
 expect(mergeCells(p,p.cells[0].id,p.cells[1].id)).toBeNull();
});
it('item 005: allocates split quantities proportionally while preserving the total',()=>{
 const p={...defaultInterior(drawer),cells:grid(1,1).map(c=>({...c,quantity:12}))};
 const split=splitCell(p,p.cells[0].id,'x',.25,true);
 expect(split.cells).toHaveLength(2);
 expect(split.cells.reduce((n,c)=>n+c.quantity,0)).toBe(12);
 expect(split.cells.map(c=>c.quantity)).toEqual([3,9]);
 const legacy=splitCell(p,p.cells[0].id,'x',.25);
 expect(legacy.cells.map(c=>c.quantity)).toEqual([12,0]);
});
it('item 006: prunes orphaned divider names and locks but preserves survivors',()=>{
 const p={...defaultInterior(drawer),cells:grid(1,2)};
 const pruned=pruneOrphanDividers({...p,lockedDividers:{x:[.5,.8],y:[]},dividerNames:{'x:0.5':'Keep','x:0.8':'Orphan'}});
 expect(pruned.lockedDividers).toEqual({x:[.5],y:[]});
 expect(pruned.dividerNames).toEqual({'x:0.5':'Keep'});
 expect(validInteriors({'back:0:0':pruned})).toBe(true);
 const gone=pruneOrphanDividers({...p,lockedDividers:{x:[.3],y:[]},dividerNames:{'x:0.3':'Stale'}});
 expect(gone.dividerNames).toBeUndefined();expect(gone.lockedDividers).toBeUndefined();
});
it('item 008: reports the achievable usable range for a shared divider',()=>{
 const p={...defaultInterior(drawer),cells:grid(1,2)};
 const W=innerSize(drawer,p).width,t=p.thickness,range=achievableUsable(p,drawer,p.cells[0].id,p.cells[1].id,'x')!;
 expect(range.min).toBeCloseTo(.01);expect(range.max).toBeCloseTo(W-2*t-.01);expect(range.feasible).toBe(true);
 const bounded={...p,minimumCellWidth:3},boundedRange=achievableUsable(bounded,drawer,bounded.cells[0].id,bounded.cells[1].id,'x')!;
 expect(boundedRange.min).toBe(3);expect(boundedRange.max).toBeCloseTo(W-2*t-3);
 expect(achievableUsable(p,drawer,p.cells[0].id,p.cells[1].id,'y')).toBeNull();
 expect(achievableUsable(p,drawer,p.cells[0].id,p.cells[0].id,'x')).toBeNull();
});
it('item 009: distributes dividers to equal usable size including directional thickness',()=>{
 let p:DrawerInterior={...defaultInterior(drawer),cells:grid(1,3),dividerThickness:{horizontal:.25,vertical:.5}};
 p=moveDivider(p,p.cells[0].id,p.cells[1].id,.2,0,drawer);
 const W=innerSize(drawer,p).width;
 p=redistributeDividersEqualUsable(p,'x',dividerPositions(p,'x'),W);
 const usable=p.cells.map(c=>cellSize(c,drawer,p).width);
 expect(Math.max(...usable)-Math.min(...usable)).toBeLessThan(.0001);
 expect(validInteriors({'back:0:0':p})).toBe(true);
});
it('item 004: redistributes a populated total across replacement compartments',()=>{
 const before={...defaultInterior(drawer),cells:grid(1,1).map(c=>({...c,quantity:7}))};
 const cells=grid(2,2).map(c=>({...c,quantity:0}));
 const redistributed=redistributeInventory(before,cells);
 expect(redistributed.reduce((n,c)=>n+c.quantity,0)).toBe(7);
 expect(redistributed.map(c=>c.quantity)).toEqual([2,2,2,1]);
 const empty={...before,cells:before.cells.map(c=>({...c,quantity:0}))};
 expect(redistributeInventory(empty,cells)).toBe(cells);
});
it('item 003: reconciles stale selection, multi-selection and merge neighbor',()=>{
 const cells=grid(1,3);
 const r=reconcileSelection(cells,'gone',new Set(['cell-0','gone','cell-2']),'gone','gone');
 expect(r.selected).toBe('cell-0');expect([...r.multi]).toEqual(['cell-0','cell-2']);expect(r.mergeWith).toBe('');expect(r.anchor).toBe('cell-0');
 const keep=reconcileSelection(cells,'cell-2',new Set(['cell-1']),'cell-0','cell-1');
 expect(keep.selected).toBe('cell-2');expect([...keep.multi]).toEqual(['cell-1']);expect(keep.mergeWith).toBe('cell-0');expect(keep.anchor).toBe('cell-1');
});
