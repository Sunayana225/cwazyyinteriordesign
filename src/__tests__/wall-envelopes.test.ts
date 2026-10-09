import { describe, it, expect } from 'vitest';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { DEFAULT_CONFIG, TYPES } from '@/lib/design';
import { wallElevation } from '@/lib/wallElevation';
import { ceilingWarnings } from '@/lib/roomGeometry';
import { buildPrintDocument } from '@/engine/PDFExporter';

describe('measured wall envelopes',()=>{
  it.each(TYPES)('keeps every component below its own ceiling in %s',closetType=>{
    const c=structuredClone(DEFAULT_CONFIG);c.closetType=closetType;c.roomDimensions={roomWidth:180,roomDepth:144};
    c.planning={walls:{back:{ceilingHeight:60,floorOffset:12},left:{ceilingHeight:72,floorOffset:4},right:{ceilingHeight:48},'corridor-a':{ceilingHeight:60,floorOffset:12},'corridor-b':{ceilingHeight:48},'island-unit':{ceilingHeight:30}}};
    const engine=new ClosetLayoutEngine(c),layout=engine.calculateLayout();
    for(const wall of layout.walls){
      const ceiling=c.planning.walls![wall.wallId]!.ceilingHeight!;
      expect(wall.height).toBeLessThanOrEqual(ceiling);
      for(const z of wall.zones){
        expect(z.y).toBeGreaterThanOrEqual(c.planning.walls![wall.wallId]?.floorOffset??0);
        expect(z.y+z.height).toBeLessThanOrEqual(ceiling+.0001);
        for(const r of z.rods??[])expect(r.height).toBeLessThanOrEqual(ceiling);
        for(const d of z.drawers??[])expect(d.position+d.height).toBeLessThanOrEqual(ceiling);
        for(const s of z.shelves??[])expect(z.y+s.height+s.spacing+1).toBeLessThanOrEqual(ceiling+.0001);
      }
    }
    expect(ceilingWarnings(layout)).toEqual([]);expect(engine.calculateLayout()).toEqual(layout);
  });
  it('uses finished-floor window heights even when the cabinet is raised',()=>{
    const c=structuredClone(DEFAULT_CONFIG);c.planning={walls:{back:{floorOffset:12}},windows:[{id:'high',wall:'back',offset:24,width:24,sill:90,height:6}]};
    const high=new ClosetLayoutEngine(c).calculateLayout();
    expect(high.zones.every(z=>z.x+z.width<=24||z.x>=48)).toBe(true);
    c.planning.windows![0]={id:'low',wall:'back',offset:24,width:24,sill:0,height:12};
    const low=new ClosetLayoutEngine(c).calculateLayout();
    expect(low.zones.some(z=>z.x<48&&z.x+z.width>24)).toBe(true);
  });
  it('does not extend a short corridor beyond the measured room',()=>{
    const c=structuredClone(DEFAULT_CONFIG);c.closetType='corridor';c.roomDimensions={roomWidth:120,roomDepth:30};
    const layout=new ClosetLayoutEngine(c).calculateLayout();
    expect(layout.walls.map(w=>w.width)).toEqual([30,30]);
    for(const w of layout.walls)for(const z of w.zones)expect(z.x+z.width).toBeLessThanOrEqual(30);
  });
  it('preserves independent ceiling and custom cabinet datums in preview and print',()=>{
    const c=structuredClone(DEFAULT_CONFIG);c.dimensions.height=120;c.dimensions.cabinetHeight=84;c.planning={walls:{back:{ceilingHeight:108}}};
    const layout=new ClosetLayoutEngine(c).calculateLayout(),wall=wallElevation(layout,layout.walls[0]);
    expect(wall.dimensions).toMatchObject({height:108,cabinetHeight:84});
    const print=buildPrintDocument([{layout,config:c}]);
    expect(print.includes(`9'-0" ceiling`)).toBe(true);
    expect(print).toContain('reference drawer');
    c.planning.walls!.back!.ceilingHeight=72;
    const lower=new ClosetLayoutEngine(c).calculateLayout();
    expect(wallElevation(lower,lower.walls[0]).dimensions).toMatchObject({height:72,cabinetHeight:72});
  });
});
