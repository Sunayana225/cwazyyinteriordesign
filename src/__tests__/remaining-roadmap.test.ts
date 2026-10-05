import { expect, it } from 'vitest';
import { DEFAULT_CONFIG, TYPES } from '@/lib/design';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { canonicalConfig, readBackup, serializeDesigns } from '@/lib/storage';
import { EMPTY_INVENTORY, combinedInventory, exportInventoryCSV, readInventoryCSV, reserveInventory, validInventoryPlanning } from '@/lib/inventoryPlanning';
import { analyzeBackup, localStorageUsage } from '@/lib/recovery';
import { designMetrics, libraryFilter } from '@/lib/libraryOrganization';
import { configurationChanges, DEFAULT_PRINT, materialEstimateCSV, organizerPageWarnings, storedPrintSettings } from '@/lib/printSettings';
import { defaultInterior, drawerTargets, grid } from '@/lib/drawers';
import { buildPrintDocument } from '@/engine/PDFExporter';
import type { SavedDesign } from '@/types/closet';
const design=():SavedDesign=>({id:'a',name:'Study',savedAt:'2026-09-01T00:00:00Z',config:structuredClone(DEFAULT_CONFIG)});
it('round trips every inventory category and rejects unsafe, missing and repeated CSV rows',()=>{
  const inventory={wardrobe:DEFAULT_CONFIG.wardrobe,shoes:DEFAULT_CONFIG.shoes},csv=exportInventoryCSV(inventory);expect(readInventoryCSV(csv)).toEqual(inventory);
  for(const raw of [csv+'wardrobe.shirts,2\n',csv.replace(/wardrobe.shirts,\d+/,'wardrobe.shirts,=1+1'),'category,count\nwardrobe.shirts,2',csv.replace('wardrobe.jewelry,1','wardrobe.jewelry,2')]){if(raw!==csv)expect(()=>readInventoryCSV(raw)).toThrow();}
});
it('combines household inventories without losing jewelry and applies reserve only to generated demand',()=>{
  const one={...structuredClone(EMPTY_INVENTORY),wardrobe:{...EMPTY_INVENTORY.wardrobe,shirts:10,jewelry:true}},member={id:'a',name:'Alex',season:'everyday' as const,inventory:one};
  const total=combinedInventory([member,{...member,id:'b'}]);expect(total.wardrobe.shirts).toBe(20);expect(total.wardrobe.jewelry).toBe(true);
  expect(reserveInventory(one,{'wardrobe.shirts':25}).wardrobe.shirts).toBe(13);expect(one.wardrobe.shirts).toBe(10);
  const c={...structuredClone(DEFAULT_CONFIG),...one,inventoryPlanning:{reserve:{'wardrobe.shirts':100}}};expect(new ClosetLayoutEngine(c).calculateLayout().capacity?.find(r=>r.label.startsWith('Short'))?.required).toBe(36);
});
it('validates and persists new inventory options and bounded revision history',()=>{
  const d=design();d.config.inventoryPlanning={notes:{long:'Measured coat'},reserve:{'wardrobe.shirts':20},target:structuredClone(EMPTY_INVENTORY)};d.folder='Bedroom';d.pinnedOrder=3;d.revisions=[{id:'r1',savedAt:d.savedAt,config:structuredClone(DEFAULT_CONFIG)}];
  const restored=readBackup(serializeDesigns([d]))[0];expect(restored.folder).toBe('Bedroom');expect(restored.revisions?.[0].config).toEqual(canonicalConfig(DEFAULT_CONFIG));expect(validInventoryPlanning(restored.config.inventoryPlanning)).toBe(true);
  expect(validInventoryPlanning({reserve:{'wardrobe.shirts':101}})).toBe(false);expect(()=>readBackup(serializeDesigns([{...d,revisions:Array.from({length:11},(_,i)=>({...d.revisions![0],id:String(i)}))}]))).toThrow('revisions');
});
it('filters modified dates and folders and keeps favorites ahead in stable order',()=>{
  const a=design(),b={...design(),id:'b',folder:'Bedroom',modifiedAt:'2026-09-29T00:00:00Z',pinnedOrder:2},c={...b,id:'c',pinnedOrder:1};
  expect(libraryFilter([a,b,c],{folder:'Bedroom',from:'2026-09-20',to:'2026-09-30',shortfalls:false}).map(d=>d.id)).toEqual(['c','b']);expect(designMetrics(a).total).toBeGreaterThan(0);
});
it('recovers valid records without accepting invalid records or repeated identities',()=>{
  const good=design(),bad={...design(),id:'b',config:{...DEFAULT_CONFIG,dimensions:{...DEFAULT_CONFIG.dimensions,width:'bad'}}};
  const analysis=analyzeBackup(JSON.stringify({version:1,designs:[good,bad,good]}));expect(analysis.valid).toHaveLength(1);expect(analysis.invalid.map(v=>v.index)).toEqual([1,2]);expect(analysis.invalid[0].error).toContain('dimensions.width');
});
it('estimates only application storage and ignores unrelated keys',()=>{
  const map=new Map([['alveo-draft','abc'],['unrelated','secret']]);expect(localStorageUsage({length:2,key:i=>Array.from(map.keys())[i],getItem:k=>map.get(k)??null})).toEqual({keys:1,bytes:28});
});
it('exports room schedules, revision changes and formula-safe material CSV from a snapshot',()=>{
  const c=structuredClone(DEFAULT_CONFIG);c.planning={obstacles:[{id:'a',label:'<Column>',x:0,y:0,width:1,depth:1}]};const l=new ClosetLayoutEngine(c).calculateLayout(),t=drawerTargets(l)[0],p=defaultInterior(t.drawer);p.name='=danger';p.cells=grid(6,6);p.cells.forEach(cell=>cell.notes='A long compartment note '.repeat(10));c.drawerInteriors={[t.id]:p};
  const ref=structuredClone(c);ref.wardrobe.shirts=1;const settings={...DEFAULT_PRINT,roomSchedule:true,comparison:ref};const html=buildPrintDocument([{layout:l,config:c,settings}]);expect(html).toContain('&lt;Column&gt;');expect(html).toContain('wardrobe.shirts');expect(materialEstimateCSV(l,c)).toContain('"\'=danger"');expect(organizerPageWarnings(c,settings)).toHaveLength(1);expect(configurationChanges(ref,c).some(r=>r[0]==='wardrobe.shirts')).toBe(true);
  expect(storedPrintSettings(JSON.stringify({...settings,paper:'Letter',comparisonName:'Private',walls:['back']}))).not.toHaveProperty('comparison');
});
it.each(TYPES)('has a deterministic geometry fixture for %s',type=>{
  const c={...structuredClone(DEFAULT_CONFIG),closetType:type,roomDimensions:{roomWidth:192,roomDepth:144}},l=new ClosetLayoutEngine(c).calculateLayout();
  const summary=l.walls.map(w=>({id:w.wallId,width:w.width,depth:w.unitDepth,zones:w.zones.map(z=>({type:z.type,x:z.x,width:z.width,drawers:z.drawers?.length??0,rods:z.rods?.length??0}))}));expect(summary).toMatchSnapshot();
});


it('canonicalizes independent divider settings without retaining foreign nested fields',()=>{
  const c=structuredClone(DEFAULT_CONFIG),t=drawerTargets(new ClosetLayoutEngine(c).calculateLayout())[0];
  const p=defaultInterior(t.drawer);p.dividerThickness=Object.assign({horizontal:.25,vertical:.5},{foreign:'discard'});p.lockedDividers=Object.assign({x:[.5],y:[]},{foreign:'discard'});c.drawerInteriors={[t.id]:p};
  const saved=canonicalConfig(c).drawerInteriors![t.id];expect(saved.dividerThickness).toEqual({horizontal:.25,vertical:.5});expect(saved.lockedDividers).toEqual({x:[.5],y:[]});
});

it('filters imported modified timestamps by UTC calendar date',()=>{
  const d={...design(),modifiedAt:'2026-09-29T01:00:00+05:30'};
  expect(libraryFilter([d],{folder:'',from:'2026-09-28',to:'2026-09-28',shortfalls:false})).toHaveLength(1);
});
