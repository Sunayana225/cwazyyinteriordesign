import {it,expect} from 'vitest';
import {CABINET_STYLES,faceDetails} from '@/lib/cabinetStyle';
import {DEFAULT_CONFIG} from '@/lib/design';
import {ClosetLayoutEngine} from '@/engine/ClosetLayoutEngine';
import {renderSpatial} from '@/renderer/SpatialRenderer';
it('renders five distinct styles with details contained on their fronts',()=>{
 const styles=Object.keys(CABINET_STYLES) as Array<keyof typeof CABINET_STYLES>;
 const layout=new ClosetLayoutEngine(structuredClone(DEFAULT_CONFIG)).calculateLayout();
 const drawings=styles.map(style=>renderSpatial(layout,{style}));
 expect(new Set(drawings).size).toBe(5);
 for(const style of styles)for(const d of faceDetails(style)){
  expect(d.x).toBeGreaterThanOrEqual(0);expect(d.y).toBeGreaterThanOrEqual(0);
  expect(d.x+d.w).toBeLessThanOrEqual(1);expect(d.y+d.h).toBeLessThanOrEqual(1);
 }
 expect(faceDetails('minimal').some(d=>d.metal)).toBe(false);
});
