import {it,expect} from 'vitest';
import {elevationMeasurements} from '@/lib/elevationMeasurements';
import {ClosetLayoutEngine} from '@/engine/ClosetLayoutEngine';
import {DEFAULT_CONFIG} from '@/lib/design';
it('outlines each component once and keeps absolute and relative datums distinct',()=>{
  const c=structuredClone(DEFAULT_CONFIG);c.planning={walls:{back:{floorOffset:12}}};const wall=new ClosetLayoutEngine(c).calculateLayout().walls[0];for(const z of wall.zones)for(const s of z.shelves??[])s.count=999;
  const before=JSON.stringify(wall),rows=elevationMeasurements(wall);expect(rows).toHaveLength(wall.zones.length);
  rows.forEach((r,i)=>{const z=wall.zones[i];if(z.type==='double-hang'&&z.rods?.length===1)expect(r.type).toBe('single-hang');expect(r.components).toHaveLength((z.shelves?.length??0)+(z.rods?.length??0)+(z.drawers?.length??0));for(const row of r.components){const height=Object.fromEntries(row.values);if(row.kind==='Shelf')expect(height['Datum above finished floor']).toBe(z.y+z.shelves![row.index].height);if(row.kind==='Rod')expect(height['Height above finished floor']).toBe(z.rods![row.index].height);if(row.kind==='Drawer')expect(height['Base above finished floor']).toBe(z.drawers![row.index].position);}});expect(JSON.stringify(wall)).toBe(before);
});
