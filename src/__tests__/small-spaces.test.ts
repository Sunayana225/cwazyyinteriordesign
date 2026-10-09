import { describe, it, expect } from 'vitest';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { DEFAULT_CONFIG, LIMITS, ELEMENT_FIT, TOE_KICK, dimensionErrors, elementFits } from '@/lib/design';
import { validConfig } from '@/lib/storage';
import { fittedColumnTypes } from '@/lib/layoutColumns';
import type { ClosetConfiguration } from '@/types/closet';

/** Real small closets that the 36/84/18 floors used to reject outright. */
const SMALL = [
  { name: '24 in linen press',      width: 24, height: 84, depth: 14 },
  { name: '12 in narrow reach-in',  width: 12, height: 84, depth: 12 },
  { name: "60 in kids' closet",     width: 48, height: 60, depth: 20 },
  { name: '30 in under-stair',      width: 30, height: 36, depth: 16 },
  { name: '14 in coat press',       width: 60, height: 84, depth: 14 },
  { name: '9 in shallow wardrobe',  width: 48, height: 84, depth: 9  },
  { name: 'smallest supported',     width: LIMITS.width, height: LIMITS.height, depth: LIMITS.depthMin },
];
const build=(width:number,height:number,depth:number,extra:Partial<ClosetConfiguration>={})=>{
  const c={...structuredClone(DEFAULT_CONFIG),closetType:'reach-in' as const,dimensions:{width,height,depth},...extra};
  return {config:c,layout:new ClosetLayoutEngine(c).calculateLayout()};
};

describe('Small-space support',()=>{
  it('accepts every small closet the old floors rejected',()=>{
    for(const {name,width,height,depth} of SMALL){
      const {config}=build(width,height,depth);
      expect(dimensionErrors(config),name).toEqual([]);
      expect(validConfig(config),name).toBe(true);
    }
  });
  it('never returns an empty elevation for a supported wall',()=>{
    for(const {name,width,height,depth} of SMALL){
      const {layout}=build(width,height,depth);
      for(const wall of layout.walls){
        if(wall.width<LIMITS.width)continue;
        expect(wall.zones.length,`${name} / ${wall.wallId}`).toBeGreaterThan(0);
      }
    }
  });
  it('keeps every zone inside its wall with finite, positive geometry',()=>{
    for(const {name,width,height,depth} of SMALL){
      const {layout}=build(width,height,depth);
      for(const wall of layout.walls)for(const zone of wall.zones){
        const where=`${name} / ${wall.wallId} / ${zone.type}`;
        for(const value of [zone.x,zone.y,zone.width,zone.height])expect(Number.isFinite(value),where).toBe(true);
        expect(zone.width,where).toBeGreaterThan(0);
        expect(zone.height,where).toBeGreaterThan(0);
        expect(zone.x,where).toBeGreaterThanOrEqual(-.001);
        expect(zone.x+zone.width,where).toBeLessThanOrEqual(wall.width+.001);
        expect(zone.y+zone.height,where).toBeLessThanOrEqual(wall.height+.001);
      }
    }
  });
  it('never puts a rod in a cabinet too shallow or too short to hang a garment',()=>{
    for(const {name,width,height,depth} of SMALL){
      const {layout}=build(width,height,depth);
      const clear=height-TOE_KICK;
      for(const wall of layout.walls)for(const zone of wall.zones){
        if(!zone.rods?.length)continue;
        const element=zone.type==='long-hang'?'long-hang':'short-hang';
        expect(elementFits(element,clear,depth),`${name} / ${zone.type} has rods`).toBe(true);
        // A rod also needs real depth to hang from, not a token value.
        for(const rod of zone.rods){
          expect(rod.depth,`${name} / rod depth`).toBeGreaterThan(0);
          expect(rod.length,`${name} / rod length`).toBeGreaterThan(0);
        }
      }
    }
  });
  it('explains in warnings why an element was dropped',()=>{
    // 9 in deep cannot hang anything; the layout must say so rather than silently omit.
    const {layout}=build(48,84,9);
    expect(layout.inputWarnings?.join(' ')).toMatch(/depth/i);
    expect(layout.walls.flatMap(w=>w.zones).some(z=>z.rods?.length)).toBe(false);
  });
  it('produces no negative drawer stack in a short cabinet',()=>{
    // calcDrawerStackHeight reserved 32 in for hanging above, which went negative here.
    for(const height of [30,34,36,40,48]){
      const {layout}=build(48,height,20,{wardrobe:{...DEFAULT_CONFIG.wardrobe,tShirts:40,sweaters:20}});
      for(const wall of layout.walls)for(const zone of wall.zones){
        expect(zone.height,`height ${height} / ${zone.type}`).toBeGreaterThan(0);
        for(const drawer of zone.drawers??[])expect(drawer.height,`height ${height} drawer`).toBeGreaterThan(0);
      }
    }
  });
  it('offers the canvas only elements the cabinet can take',()=>{
    // A shallow wall drops hanging; a tall deep wall keeps everything.
    expect(fittedColumnTypes({height:84,unitDepth:9})).not.toContain('long-hang');
    expect(fittedColumnTypes({height:84,unitDepth:9})).not.toContain('short-hang');
    expect(fittedColumnTypes({height:84,unitDepth:9})).toContain('top-shelves');
    expect(fittedColumnTypes({height:40,unitDepth:24})).not.toContain('long-hang');
    expect(fittedColumnTypes({height:40,unitDepth:24})).toContain('short-hang');
    expect(fittedColumnTypes({height:84,unitDepth:24})).toEqual(expect.arrayContaining(['long-hang','short-hang','drawers','shoe-shelves','top-shelves']));
    // Nothing fits a cabinet below every element minimum, and that is reported honestly.
    expect(fittedColumnTypes({height:10,unitDepth:4})).toEqual([]);
  });
  it('still rejects measurements below the supported floor',()=>{
    for(const [field,dims] of [
      ['width',{width:LIMITS.width-1,height:84,depth:18}],
      ['height',{width:48,height:LIMITS.height-1,depth:18}],
      ['depth',{width:48,height:84,depth:LIMITS.depthMin-1}],
    ] as const){
      const {config}=build(dims.width,dims.height,dims.depth);
      expect(dimensionErrors(config).join(' ').toLowerCase(),field).toContain(field==='depth'?'depth':field);
    }
  });
  it('documents the element fit table it enforces',()=>{
    // Every element the canvas can place must have a fit rule, or the gate silently passes.
    for(const element of ['long-hang','short-hang','drawers','shoe-shelves','top-shelves'] as const){
      expect(ELEMENT_FIT[element].height).toBeGreaterThan(0);
      expect(ELEMENT_FIT[element].depth).toBeGreaterThanOrEqual(LIMITS.depthMin);
    }
  });
});
