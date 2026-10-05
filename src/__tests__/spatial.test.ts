import { expect, it } from 'vitest';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { DEFAULT_CONFIG } from '@/lib/design';
import { spatialParts, renderSpatial, spatialOpenings } from '@/renderer/SpatialRenderer';
import { renderFloorPlan } from '@/renderer/FloorPlanRenderer';
import { wallFootprint } from '@/lib/planning';
import type { ClosetType } from '@/types/closet';
const types:ClosetType[]=['reach-in','wardrobe-wall','walkin-single','walkin-l','walkin-u','corridor','island'];
it.each(types)('preserves generated footprints and finite projection for %s',closetType=>{
 const layout=new ClosetLayoutEngine({...DEFAULT_CONFIG,closetType,roomDimensions:{roomWidth:192,roomDepth:180}}).calculateLayout();
 const parts=spatialParts(layout);
 expect(new Set(parts.map(p=>p.wallId))).toEqual(new Set(layout.walls.filter(w=>w.zones.length).map(w=>w.wallId)));
 for(const part of parts){const wall=layout.walls.find(w=>w.wallId===part.wallId)!,b=wallFootprint(wall,layout);
  for(const [x,y,z] of part.corners){expect(x).toBeGreaterThanOrEqual(b.x-1);expect(x).toBeLessThanOrEqual(b.x+b.width+1);expect(y).toBeGreaterThanOrEqual(b.y-1);expect(y).toBeLessThanOrEqual(b.y+b.depth+1);expect(z).toBeGreaterThanOrEqual(0);}
 }
 for(const angle of [-25,65,155,245]){const svg=renderSpatial(layout,{angle});expect(svg).not.toMatch(/NaN|Infinity/);expect(svg).toContain('3D closet spatial view');}
});
it('keeps the island counter freestanding and at modeled height',()=>{
 const layout=new ClosetLayoutEngine({...DEFAULT_CONFIG,closetType:'island',roomDimensions:{roomWidth:192,roomDepth:180}}).calculateLayout();
 const island=layout.walls.find(w=>w.wallId==='island-unit')!,box=wallFootprint(island,layout);
 const top=spatialParts(layout).find(p=>p.kind==='countertop')!;
 expect(Math.max(...top.corners.map(p=>p[2]))).toBe(36);expect(Math.min(...top.corners.map(p=>p[0]))).toBe(box.x);expect(box.x).toBeGreaterThan(24);expect(box.y).toBeGreaterThan(24);
 const svg=renderSpatial(layout,{islandOnly:true});expect(svg).toContain('data-spatial-wall="island-unit"');expect(svg).not.toContain('data-spatial-wall="back"');
 const plan=renderFloorPlan(layout,{roomWidth:192,roomDepth:180,unitDepth:24});for(const label of ['Behind island:','In front:','Left:','Right:'])expect(plan).toContain(label);
});
it('does not invent an island in a room too small for it',()=>{
 const layout=new ClosetLayoutEngine({...DEFAULT_CONFIG,closetType:'island',roomDimensions:{roomWidth:96,roomDepth:96}}).calculateLayout();
 expect(spatialParts(layout).some(p=>p.wallId==='island-unit')).toBe(false);
});

it.each(['front','back','left','right'] as const)('places %s door swings with correct hinge, direction and radius',wall=>{
 for(const hinge of ['left','right'] as const)for(const swing of ['in','out'] as const){
  const layout=new ClosetLayoutEngine({...DEFAULT_CONFIG,closetType:'walkin-u',roomDimensions:{roomWidth:180,roomDepth:160},planning:{door:{wall,hinge,swing,offset:40,width:30}}}).calculateLayout();
  const door=spatialOpenings(layout)[0],pivot=door.points[0];
  const expected=40+(hinge==='right'?30:0);
  expect(pivot).toEqual(wall==='front'?[expected,160,0]:wall==='back'?[180-expected,0,0]:wall==='left'?[0,expected,0]:[180,160-expected,0]);
  for(const point of door.points.slice(1,-1))expect(Math.hypot(point[0]-pivot[0],point[1]-pivot[1])).toBeCloseTo(30);
  const open=door.points[door.points.length-2],inward=wall==='front'?160-open[1]:wall==='back'?open[1]:wall==='left'?open[0]:180-open[0];
  expect(inward).toBeCloseTo(swing==='in'?30:-30);
 }
});
it('preserves window sill and height, hides only requested walls, and exports camera metadata',()=>{
 const layout=new ClosetLayoutEngine({...DEFAULT_CONFIG,closetType:'island',roomDimensions:{roomWidth:192,roomDepth:180},planning:{windows:[{id:'window',label:'<test>',wall:'left',offset:30,width:24,sill:42,height:30}]}}).calculateLayout();
 const window=spatialOpenings(layout)[0];expect(Math.min(...window.points.map(p=>p[2]))).toBe(42);expect(Math.max(...window.points.map(p=>p[2]))).toBe(72);expect(window.points.every(p=>p[0]===0)).toBe(true);
 const svg=renderSpatial(layout,{hiddenWalls:['left'],woodFinish:'dark',hardwareFinish:'gold',angle:90,elevation:90});expect(svg).not.toContain('data-spatial-wall="left"');expect(svg).toContain('data-spatial-wall="island-unit"');expect(svg).toContain('data-opening="window"');expect(svg).toContain('&lt;test&gt;');expect(svg).not.toContain('tabindex');expect(svg).toContain('coordinateUnits');expect(svg).toContain('#a77b16');expect(svg).toContain('#89654a');
 expect(renderSpatial(layout,{interactive:true})).toContain('data-spatial-drawer="island-unit:0:0"');
});
