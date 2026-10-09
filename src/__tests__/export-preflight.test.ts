import {it,expect} from 'vitest';
import {DEFAULT_CONFIG} from '@/lib/design';
import {ClosetLayoutEngine} from '@/engine/ClosetLayoutEngine';
import {exportPreflight} from '@/lib/exportPreflight';
import {confirmSurvey} from '@/lib/surveyReview';
import {buildPrintDocument} from '@/engine/PDFExporter';
import {DEFAULT_PRINT} from '@/lib/printSettings';

function example(){const c=structuredClone(DEFAULT_CONFIG);c.closetType='walkin-u';c.roomDimensions={roomWidth:180,roomDepth:144};c.planning={door:{wall:'front',offset:170,width:30,hinge:'left',swing:'in'},windows:[{id:'w',wall:'left',offset:100,width:30,sill:40,height:24,label:'<script>window</script>'}]};return c;}
it('retains whole-room conflicts when elevations are excluded and explains omitted openings',()=>{
  const c=example(),layout=new ClosetLayoutEngine(c).calculateLayout(),all=exportPreflight(layout,c,DEFAULT_PRINT),part=exportPreflight(layout,c,{walls:['back'],floorPlan:false});
  expect(part.geometry).toEqual(all.geometry);expect(part.geometry.some(s=>s.includes('Door extends'))).toBe(true);expect(part.omitted.map(w=>w.id)).toEqual(['left','right']);expect(part.scope.join(' ')).toContain('1 recorded window');expect(part.scope.join(' ')).toContain('configured door');expect(all.omitted).toEqual([]);
});
it('keeps survey review separate from room conflicts and capacity shortages',()=>{
  const c=example();c.surveyConfirmation=confirmSurvey(c);const layout=new ClosetLayoutEngine(c).calculateLayout();expect(exportPreflight(layout,c,DEFAULT_PRINT).surveyNote).toContain('confirmed for this geometry');expect(exportPreflight(layout,c,DEFAULT_PRINT).geometry.length).toBeGreaterThan(0);
  c.dimensions.height+=1;expect(exportPreflight(layout,c,DEFAULT_PRINT).surveyNote).toContain('out of date');
  const small=structuredClone(DEFAULT_CONFIG),shortages=exportPreflight(new ClosetLayoutEngine(small).calculateLayout(),small,DEFAULT_PRINT);expect(shortages.shortages.length).toBeGreaterThan(0);expect(shortages.unassessed).toContain('Jewelry');
});
it('prints unresolved checks and omissions before specifications without dropping or executing labels',()=>{
  const c=example(),layout=new ClosetLayoutEngine(c).calculateLayout();const html=buildPrintDocument([{layout,config:c,settings:{...DEFAULT_PRINT,walls:['back'],floorPlan:false}}]);
  expect(html.indexOf('Review before sharing')).toBeLessThan(html.indexOf('Space specifications'));expect(html).toContain('Door extends beyond its wall');expect(html).toContain('LEFT WALL (EL-B) elevation omitted');expect(html).toContain('&lt;script&gt;window&lt;/script&gt;');expect(html).not.toContain('<script>window');expect(html).not.toContain('<h2>LEFT WALL (EL-B)</h2>');
});
