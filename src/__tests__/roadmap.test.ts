import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG, formatInches, escapeHTML, dimensionErrors } from '@/lib/design';
import { canonicalConfig, readBackup, readDesigns, serializeDesigns, BACKUP_MAX_BYTES, validConfig } from '@/lib/storage';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { defaultInterior, drawerTargets, grid, innerSize, itemFit, moveDivider, resolveOrganizers, spatialNeighbor, splitCell, transformInterior, validInteriors, interiorSVG } from '@/lib/drawers';
import { renderFloorPlan } from '@/renderer/FloorPlanRenderer';
import { LatestJob, layoutInputKey, namespaceSVG } from '@/lib/preview';
import { DEFAULT_PRINT, dividerEstimate, printSections } from '@/lib/printSettings';
import { buildPrintDocument } from '@/engine/PDFExporter';
import { freeSpans, validPlanning, storageObstacleConflicts } from '@/lib/planning';
import type { SavedDesign } from '@/types/closet';
const config=()=>structuredClone(DEFAULT_CONFIG);
const saved=():SavedDesign=>({id:'a',name:'Study',savedAt:'2026-09-25T00:00:00Z',config:config()});
const drawer={width:24,depth:22,height:9,position:3,purpose:'folded'};

it('detects an obstacle inside an island and labels the floor-plan conflict',()=>{
  const c=config();c.closetType='island';c.roomDimensions={roomWidth:192,roomDepth:144};
  c.planning={obstacles:[{id:'column',label:'Center column',x:94,y:80,width:4,depth:4}]};
  const layout=new ClosetLayoutEngine(c).calculateLayout();
  expect(storageObstacleConflicts(layout)).toContain('Center column');
  expect(renderFloorPlan(layout,{roomWidth:192,roomDepth:144,unitDepth:24})).toContain('Storage intersects obstacle: Center column');
});

describe('Roadmap storage and migration',()=>{
  it('migrates legacy arrays and version 1 without accepting future schemas',()=>{
    expect(readDesigns(JSON.stringify([saved()]))).toEqual(readDesigns(serializeDesigns([saved()])));
    expect(()=>readDesigns(JSON.stringify({version:2,designs:[saved()]}))).toThrow('unsupported');
  });
  it('rejects oversized backup bytes, record counts, malformed metadata and duplicate IDs',()=>{
    expect(()=>readBackup(' '.repeat(BACKUP_MAX_BYTES+1))).toThrow('5 MB');
    expect(()=>readBackup(JSON.stringify(Array.from({length:201},(_,i)=>({...saved(),id:String(i)}))))).toThrow('200-design');
    expect(()=>readBackup(JSON.stringify([saved(),saved()]))).toThrow('duplicate');
    expect(()=>readBackup(JSON.stringify([{...saved(),tags:[42]}]))).toThrow('metadata');
  });
  it('canonicalizes nested configurations and organizer fields without losing supported content',()=>{
    const c=config();const p=defaultInterior(drawer);p.measured={width:20,depth:18,height:6};p.cells[0].item={width:2,depth:3,height:1,rotate:true};c.drawerInteriors={'back:0:0':p};c.planning={supportSpan:24};
    const polluted=JSON.parse(JSON.stringify(c));polluted.unknown='remove';polluted.userInfo.secret='remove';polluted.drawerInteriors['back:0:0'].cells[0].item.secret='remove';polluted.planning.secret='remove';
    expect(canonicalConfig(polluted)).toEqual(c);
  });
  it('validates new measured, item-fit and room planning data',()=>{
    const c=config();c.planning={door:{wall:'front',width:30,offset:0,hinge:'right',swing:'in'}};
    expect(validConfig(c)).toBe(true);c.planning.door!.width=NaN;expect(validConfig(c)).toBe(false);
    expect(validPlanning({obstacles:[{id:'x',label:'Column',x:0,y:0,width:-1,depth:12}]})).toBe(false);
  });
});
describe('Drawer refinements',()=>{
  it('keeps organizer identity when zone array order changes and retains duplicate orphan records',()=>{
    const layout=new ClosetLayoutEngine(config()).calculateLayout(),targets=drawerTargets(layout),target=targets[0];
    const plan={...defaultInterior(target.drawer),identity:target.identity};
    layout.walls[0].zones.reverse();const reordered=drawerTargets(layout),destination=reordered.find(t=>t.identity===target.identity)!;
    const resolved=resolveOrganizers({[target.id]:plan,'left:99:99':structuredClone(plan)},reordered);
    expect(resolved[destination.id].identity).toBe(target.identity);expect(Object.keys(resolved)).toHaveLength(2);
  });
  it('uses measured interiors and checks rotated items including height',()=>{
    const p=defaultInterior(drawer);p.measured={width:6,depth:10,height:4};const c=p.cells[0];c.item={width:8,depth:4,height:3,rotate:true};
    expect(innerSize(drawer,p).width).toBe(6);expect(itemFit(c,drawer,p)).toBe('fits rotated');c.item.rotate=false;expect(itemFit(c,drawer,p)).toBe('does not fit');c.item.rotate=true;c.item.height=5;expect(itemFit(c,drawer,p)).toBe('does not fit');
  });
  it('moves an adjacent divider with physical snapping while preserving partition coverage',()=>{
    const p={...defaultInterior(drawer),cells:grid(1,2)};const next=moveDivider(p,p.cells[0].id,p.cells[1].id,.38,.5,drawer);
    expect(validInteriors({'back:0:0':next})).toBe(true);expect((next.cells[0].w*innerSize(drawer,next).width)% .5).toBeCloseTo(0);
  });
  it('finds neighbors by spatial position rather than cell-array order',()=>{
    const cells=grid(2,2).reverse();expect(spatialNeighbor(cells,'cell-0','ArrowDown')?.id).toBe('cell-2');expect(spatialNeighbor(cells,'cell-0','ArrowLeft')).toBeUndefined();
  });
  it('preserves bounds, non-overlap and full coverage across 1000 generated edits',()=>{
    let seed=4201,p=defaultInterior(drawer);const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<1000;i++){if(i%40===0)p={...p,cells:grid(1+Math.floor(random()*5),1+Math.floor(random()*5))};const c=p.cells[Math.floor(random()*p.cells.length)];p=i%3===0?splitCell(p,c.id,random()<.5?'x':'y',.2+random()*.6):transformInterior(p,i%2?'rotate':'mirror');expect(validInteriors({'back:0:0':p})).toBe(true);}
  });
  it('exports escaped compartment notes, dimensions and thickness and estimates unique divider lengths',()=>{
    const p={...defaultInterior(drawer),cells:grid(2,2)};p.cells[0].notes='<unsafe>';const svg=interiorSVG(p,drawer);
    expect(svg).toContain('&lt;unsafe&gt;');expect(svg).toContain('Divider 0.25 in');expect(interiorSVG(p,drawer,false)).not.toContain('unsafe');
    const estimate=dividerEstimate(p,drawer);expect(estimate.segments).toHaveLength(2);expect(estimate.totalLength).toBeCloseTo(43);
  });
});
describe('Layout and floor-plan refinements',()=>{
  it('honors drawer preference for island stacks',()=>{
    const c=config();c.closetType='island';c.roomDimensions={roomWidth:192,roomDepth:160};c.userInfo.drawerPreference='many-small';const small=new ClosetLayoutEngine(c).calculateLayout().walls.find(w=>w.wallId==='island-unit')!;c.userInfo.drawerPreference='few-large';const large=new ClosetLayoutEngine(c).calculateLayout().walls.find(w=>w.wallId==='island-unit')!;
    expect(small.zones[0].drawers!.filter(d=>d.purpose!=='jewelry').every(d=>d.height===6)).toBe(true);expect(large.zones[0].drawers!.some(d=>d.height===12)).toBe(true);
  });
  it('preserves fractions and omits storage for empty wall zones',()=>{
    const c=config();c.closetType='walkin-u';c.roomDimensions={roomWidth:120.125,roomDepth:48};c.dimensions.depth=48;const layout=new ClosetLayoutEngine(c).calculateLayout(),svg=renderFloorPlan(layout,{...c.roomDimensions,unitDepth:48,interactive:true});
    expect(svg).toContain(escapeHTML(formatInches(120.125)));expect(svg).not.toContain('data-wall-id="left"');
  });
  it('reports overlaps without negative clear aisle claims',()=>{
    const c=config();c.closetType='corridor';c.roomDimensions={roomWidth:36,roomDepth:120};const layout=new ClosetLayoutEngine(c).calculateLayout(),svg=renderFloorPlan(layout,{...c.roomDimensions,unitDepth:24});expect(svg).toContain('STORAGE OVERLAP');expect(svg).not.toContain('-12&quot; clear');
  });
  it('enforces supported maxima and reports corrected dimensions and counts',()=>{
    const c=config();c.dimensions={width:10000,height:1000,depth:24};c.wardrobe.shirts=1000000;const l=new ClosetLayoutEngine(c).calculateLayout();expect(l.dimensions).toEqual({width:600,height:240,depth:24});expect(l.inputWarnings?.join(' ')).toContain('10000');expect(dimensionErrors(c)).toHaveLength(2);
  });
  it('reserves window/obstacle spans and uses per-wall depths and priorities',()=>{
    const c=config();c.closetType='walkin-u';c.roomDimensions={roomWidth:180,roomDepth:144};c.planning={walls:{left:{depth:18,priority:'shoes'}},windows:[{id:'w',wall:'back',offset:30,width:24,sill:30,height:40}],obstacles:[{id:'o',label:'Column',x:100,y:0,width:12,depth:24}],supportSpan:24};const l=new ClosetLayoutEngine(c).calculateLayout(),back=l.walls[0];
    expect(back.zones.every(z=>z.x+z.width<=30||z.x>=54)).toBe(true);expect(back.zones.every(z=>z.x+z.width<=100||z.x>=112)).toBe(true);expect(l.walls[1].unitDepth).toBe(18);expect(l.walls[1].zones.some(z=>z.type==='shoe-shelves')).toBe(true);
  });
  it('merges overlapping exclusions and renders configured door conflicts',()=>{
    expect(freeSpans(100,[[10,30],[20,40],[-10,5]])).toEqual([[5,10],[40,100]]);
    const c=config();c.closetType='corridor';c.roomDimensions={roomWidth:100,roomDepth:120};c.planning={door:{wall:'front',offset:0,width:30,hinge:'right',swing:'in'}};const l=new ClosetLayoutEngine(c).calculateLayout();expect(renderFloorPlan(l,{...c.roomDimensions,unitDepth:24})).toContain('Door swing clearance may intersect');
  });
});
describe('Preview and print refinements',()=>{
  it('excludes visual-only changes from layout calculation dependencies',()=>{const a=config(),b=config();b.userInfo.woodFinish='white';b.userInfo.hardwareFinish='gold';expect(layoutInputKey(a,{})).toBe(layoutInputKey(b,{}));b.userInfo.drawerPreference='few-large';expect(layoutInputKey(a,{})).not.toBe(layoutInputKey(b,{}));});
  it('namespaces SVG definitions and references without changing drawer data IDs',()=>{const svg='<svg><defs><pattern id="wood"/></defs><rect data-drawer-id="back:0:0" fill="url(#wood)"/></svg>';expect(namespaceSVG(svg,'normal')).toContain('url(#normal-wood)');expect(namespaceSVG(svg,'normal')).toContain('data-drawer-id="back:0:0"');expect(namespaceSVG(svg,'large')).not.toContain('id="wood"');});
  it('discards late asynchronous results after a newer result or cancellation',async()=>{const task=new LatestJob(),committed:number[]=[];let resolve!:(n:number)=>void;const old=task.run(()=>new Promise<number>(r=>resolve=r),v=>committed.push(v),()=>{});await task.run(()=>2,v=>committed.push(v),()=>{});resolve(1);await old;expect(committed).toEqual([2]);const canceled=task.run(()=>3,v=>committed.push(v),()=>{});task.cancel();await canceled;expect(committed).toEqual([2]);});
  it('filters print walls and includes revision, paper options, material estimates and exact section preview',()=>{
    const c=config();c.closetType='island';c.roomDimensions={roomWidth:192,roomDepth:144};const l=new ClosetLayoutEngine(c).calculateLayout(),t=drawerTargets(l)[0];c.drawerInteriors={[t.id]:defaultInterior(t.drawer)};const settings={...DEFAULT_PRINT,walls:['back'],materials:true,paper:'Letter' as const,orientation:'landscape' as const,project:'<Study>',contact:'Designer'};
    const html=buildPrintDocument([{layout:l,config:c,settings}]);expect(html).toContain('Letter landscape');expect(html).toContain('&lt;Study&gt;');expect(html).not.toContain('LEFT WALL (EL-B)');expect(html).toContain('Estimated organizer materials');expect(html).toContain('print-revision');expect(printSections(l,c,settings)).toHaveLength(6);
  });
});
