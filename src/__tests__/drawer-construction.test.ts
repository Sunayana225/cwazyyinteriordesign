import { it, expect } from 'vitest';
import { defaultInterior, grid, cellSize, itemFit, validInteriors, moveDivider } from '@/lib/drawers';
import { dividerPositions, fitDetails, organizerChanges, organizerWeight, rectangleSelection, redistributeDividers } from '@/lib/drawerConstruction';
import { readTemplates, serializeTemplates } from '@/lib/organizerTemplates';
const drawer={width:24,depth:18,height:6,position:3,purpose:'folded'};
it('uses independent physical divider dimensions and item margins when checking fit',()=>{
  const p=defaultInterior(drawer);p.measured={width:10,depth:8,height:5};p.dividerThickness={horizontal:.5,vertical:1};p.itemMargin=0;
  expect(cellSize(p.cells[0],drawer,p)).toEqual({width:9,depth:7.5});
  p.cells[0].item={width:7,depth:8,height:4,rotate:false};expect(itemFit(p.cells[0],drawer,p)).toBe('does not fit');expect(fitDetails(p.cells[0],drawer,p).rotationHelps).toBe(true);
  p.cells[0].item.rotate=true;expect(itemFit(p.cells[0],drawer,p)).toBe('fits rotated');p.itemMargin=1;expect(fitDetails(p.cells[0],drawer,p).rotationHelps).toBe(false);expect(itemFit(p.cells[0],drawer,p)).toBe('does not fit');
});
it('redistributes selected lines between locks while preserving coverage and metadata',()=>{
  let p=defaultInterior(drawer);p.cells=grid(2,4);p=moveDivider(p,p.cells[0].id,p.cells[1].id,.3,0,drawer);p.lockedDividers={x:[.5],y:[]};
  const before=structuredClone(p);p=redistributeDividers(p,'x',dividerPositions(p,'x'));expect(validInteriors({'back:0:0':p})).toBe(true);expect(dividerPositions(p,'x')).toContain(.5);expect(p.cells.map(c=>c.label)).toEqual(before.cells.map(c=>c.label));
  expect(moveDivider(p,p.cells[1].id,p.cells[2].id,.7,0,drawer)).toEqual(p);
});
it('estimates internal divider weight from explicit density and geometry',()=>{
  const p=defaultInterior(drawer);expect(organizerWeight(p,drawer)).toBeNull();p.materialDensity=650;expect(organizerWeight(p,drawer)).toBe(0);p.cells=grid(2,2);expect(organizerWeight(p,drawer)).toBeGreaterThan(0);
});
it('selects rectangular cell ranges and summarizes unapplied edits',()=>{
  const p=defaultInterior(drawer);p.cells=grid(3,3);expect(rectangleSelection(p.cells,'cell-0','cell-4')).toEqual(['cell-0','cell-1','cell-3','cell-4']);expect(organizerChanges(p,{...p,name:'Travel'})).toContain('name: changed');
});
it('migrates legacy templates and rejects duplicate IDs and unsafe files',()=>{
  const p=defaultInterior(drawer),legacy=readTemplates(JSON.stringify([p]));expect(legacy[0].id).toBe('legacy-0');expect(readTemplates(serializeTemplates(legacy))).toEqual(legacy);expect(()=>readTemplates(serializeTemplates([legacy[0],legacy[0]]))).toThrow('templates[1]');expect(()=>readTemplates(JSON.stringify({version:2,templates:[]}))).toThrow('supported');
});


it('reports removed optional construction settings in change summaries',()=>{
  const before={...defaultInterior(drawer),itemMargin:1};
  expect(organizerChanges(before,defaultInterior(drawer))).toContain('itemMargin: changed');
});
