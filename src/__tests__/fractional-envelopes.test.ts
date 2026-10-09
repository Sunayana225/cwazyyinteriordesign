import {it,expect} from 'vitest';
import {DEFAULT_CONFIG,TYPES} from '@/lib/design';
import {ClosetLayoutEngine} from '@/engine/ClosetLayoutEngine';
import {canonicalConfig} from '@/lib/storage';

const cases=TYPES.flatMap(closetType=>[23.875,24,35.875,36,47.875,48,71.875,72,95.875,96,120.125].map(width=>({closetType,width})));
it.each(cases)('preserves fractional envelopes and repeatability: $closetType / $width in',({closetType,width})=>{
  for(const height of [30,30.125,47.875,72.125,83.875,96.125])
  for(const depth of [9,11.875,12,19.875,20,24.125]){
    const c=structuredClone(DEFAULT_CONFIG);c.closetType=closetType;c.dimensions={width,height,depth};c.roomDimensions={roomWidth:width,roomDepth:width+24.125};c.planning={walls:{back:{floorOffset:11.875},left:{floorOffset:5.125}}};
    const input=structuredClone(c),engine=new ClosetLayoutEngine(c),layout=engine.calculateLayout();
    expect(c).toEqual(input);expect(canonicalConfig(c).dimensions).toEqual(input.dimensions);
    expect(engine.calculateLayout()).toEqual(layout);
    for(const wall of layout.walls)for(const z of wall.zones){
      expect([z.x,z.y,z.width,z.height].every(Number.isFinite)).toBe(true);
      expect(z.x).toBeGreaterThanOrEqual(0);expect(z.y).toBeGreaterThanOrEqual(0);expect(z.width).toBeGreaterThan(0);expect(z.height).toBeGreaterThan(0);
      expect(z.x+z.width).toBeLessThanOrEqual(wall.width+.00001);expect(z.y+z.height).toBeLessThanOrEqual(wall.height+.00001);
      for(const d of z.drawers??[]){expect(d.position).toBeGreaterThanOrEqual(z.y-.00001);expect(d.position+d.height).toBeLessThanOrEqual(z.y+z.height+.00001);expect(d.width).toBeGreaterThan(0);expect(d.depth).toBeGreaterThan(0);}
      for(const rod of z.rods??[]){expect(rod.length).toBeGreaterThan(0);expect(rod.length).toBeLessThanOrEqual(z.width);expect(rod.height).toBeLessThanOrEqual(wall.height+.00001);}
    }
    expect(layout.capacity!.every(r=>Number.isFinite(r.available)&&r.available>=0)).toBe(true);
  }
});
