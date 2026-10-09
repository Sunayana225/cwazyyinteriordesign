import { it,expect } from 'vitest';
import { DEFAULT_CONFIG } from '@/lib/design';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { renderFloorPlan } from '@/renderer/FloorPlanRenderer';

it('places window strips at the physical room perimeter for every supported wall',()=>{
  for(const [closetType,fixtures] of [
    ['walkin-u',[['back',10,0,20,2],['left',0,34,2,20],['right',178,34,2,20]]],
    ['corridor',[['corridor-a',0,10,2,20],['corridor-b',178,10,2,20]]],
  ] as const){
    const config={...structuredClone(DEFAULT_CONFIG),closetType,roomDimensions:{roomWidth:180,roomDepth:160},planning:{windows:fixtures.map(([wall],i)=>({id:String(i),wall,offset:10,width:20,sill:36,height:36}))}};
    const layout=new ClosetLayoutEngine(config).calculateLayout(),svg=renderFloorPlan(layout,{roomWidth:180,roomDepth:160,unitDepth:24});
    for(const [,x,y,width,height] of fixtures)expect(svg).toContain(`data-opening="window" x="${x}" y="${y}" width="${width}" height="${height}"`);
  }
});

it('provides labeled keyboard targets for in-room objects and omits controls from exports',()=>{
  const config={...structuredClone(DEFAULT_CONFIG),closetType:'walkin-u' as const,roomDimensions:{roomWidth:180,roomDepth:160},planning:{
    windows:[{id:'window',label:'<Garden>',wall:'right' as const,offset:20,width:24,sill:36,height:36}],
    obstacles:[{id:'bench',label:'Bench',x:60,y:90,width:18,depth:18,mobility:'movable' as const}],
    door:{wall:'front' as const,offset:60,width:30,hinge:'left' as const,swing:'in' as const},
  }};
  const layout=new ClosetLayoutEngine(config).calculateLayout();
  const svg=renderFloorPlan(layout,{roomWidth:180,roomDepth:160,unitDepth:24,interactive:true});
  expect(svg).toContain('role="group" aria-label="Closet floor plan"');
  expect(svg).toContain('data-obstacle-id="bench" aria-label="Edit obstacle Bench"');
  expect(svg).toContain('data-window-id="window" aria-label="Edit window &lt;Garden&gt;"');
  expect(svg).toContain('data-door-id="room-door" aria-label="Edit room door"');
  const print=renderFloorPlan(layout,{roomWidth:180,roomDepth:160,unitDepth:24});
  expect(print).not.toContain('tabindex');expect(print).not.toContain('pointer-events');expect(print).not.toContain('role="button"');
});
