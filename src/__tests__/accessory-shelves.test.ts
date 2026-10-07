import {it,expect} from 'vitest';
import {accessoryShelves} from '@/lib/accessoryShelves';
import {ClosetLayoutEngine} from '@/engine/ClosetLayoutEngine';
import {DEFAULT_CONFIG} from '@/lib/design';
import {spatialParts} from '@/renderer/SpatialRenderer';
import {canonicalConfig} from '@/lib/storage';
it('uses remaining accessory height without overlapping boards or compressing openings',()=>{
 for(const height of [84,93,141,597])for(const opening of [8,14,24,36]){
 const shelves=accessoryShelves(24,height,24,3,true,opening);
 const rows=shelves.filter(s=>s.purpose!=='belts');
 for(let i=0;i<shelves.length;i++){
 const s=shelves[i];expect(s.height+s.spacing+1).toBeLessThanOrEqual(height+.0001);
 if(i)expect(s.height).toBeGreaterThanOrEqual(shelves[i-1].height+shelves[i-1].spacing+1-.0001);
 }
 for(const s of rows)expect(s.spacing).toBeGreaterThanOrEqual(opening-.0001);
 const last=rows.at(-1)!;expect(last.height+last.spacing+1).toBeCloseTo(height-1); // Reserve the top panel.
 }
});
it('adds useful reserve shelves after covering the bags and creates one 3D board per shelf',()=>{
 const c=structuredClone(DEFAULT_CONFIG);const l=new ClosetLayoutEngine(c).calculateLayout();
 const accessory=l.zones.find(z=>z.type==='top-shelves'&&z.shelves?.some(s=>s.purpose==='bags'))!;
 expect(accessory.shelves!.some(s=>s.purpose==='folded items')).toBe(true);
 expect(accessory.shelves!.length).toBeGreaterThan(3);
 const generated=l.walls.flatMap(w=>w.zones).flatMap(z=>z.shelves??[]).length;
 expect(spatialParts(l).filter(p=>p.kind==='shelf')).toHaveLength(generated);
});
it('editable larger openings reduce board count and persist in saved configuration',()=>{
 const c=structuredClone(DEFAULT_CONFIG);c.planning={accessoryShelfOpening:24};
 expect(canonicalConfig(c).planning?.accessoryShelfOpening).toBe(24);
 expect(accessoryShelves(24,93,24,3,true,24).length).toBeLessThan(accessoryShelves(24,93,24,3,true,14).length);
});
