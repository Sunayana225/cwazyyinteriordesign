import {it,expect} from 'vitest';
import {DEFAULT_CONFIG} from '@/lib/design';
import {combinedInventory,EMPTY_INVENTORY} from '@/lib/inventoryPlanning';
import {householdDemand} from '@/lib/householdDemand';
import {ClosetLayoutEngine} from '@/engine/ClosetLayoutEngine';
import {buildPrintDocument} from '@/engine/PDFExporter';
import {DEFAULT_PRINT} from '@/lib/printSettings';

function example(){
  const c=structuredClone(DEFAULT_CONFIG),daily=structuredClone(EMPTY_INVENTORY),seasonal=structuredClone(EMPTY_INVENTORY);
  daily.wardrobe.shirts=1;daily.wardrobe.suits=2;daily.wardrobe.tShirts=10;seasonal.wardrobe.shirts=1;seasonal.wardrobe.sweaters=5;seasonal.shoes.boots=2;
  c.inventoryPlanning={members:[{id:'a',name:'Asha',season:'everyday',inventory:daily},{id:'b',name:'Winter',season:'seasonal',inventory:seasonal}],reserve:{'wardrobe.shirts':10}};
  Object.assign(c,combinedInventory(c.inventoryPlanning.members!));c.planning={hangerSpacing:{shirts:3,suits:4}};return c;
}

it('reconciles person and season demand with active demand and applies reserve only once',()=>{
  const c=example(),before=structuredClone(c),report=householdDemand(c),layout=new ClosetLayoutEngine(c).calculateLayout();
  expect(report.matches).toBe(true);expect(report.differences).toEqual([]);
  const short=report.rows.find(r=>r.label.startsWith('Short'))!;
  expect(short).toMatchObject({everyday:19,seasonal:3,current:22,reserve:3,total:25});
  expect(report.rows.find(r=>r.label==='Folded storage')).toMatchObject({everyday:1,seasonal:1,current:2,reserve:0});
  for(const row of report.rows){expect(row.everyday+row.seasonal).toBeCloseTo(row.current);expect(report.members.reduce((n,m)=>n+m.rows.find(r=>r.label===row.label)!.required,0)).toBeCloseTo(row.current);expect(row.total).toBeCloseTo(layout.capacity!.find(r=>r.label===row.label)!.required);}
  expect(c).toEqual(before);
});

it('distinguishes draft profile totals even if combined hanging demand happens to match',()=>{
  const c=example();c.planning={hangerSpacing:{shirts:2,pants:2}};c.wardrobe.shirts--;c.wardrobe.pants++;
  const report=householdDemand(c);expect(report.matches).toBe(false);expect(report.differences.map(d=>d.key)).toEqual(expect.arrayContaining(['wardrobe.shirts','wardrobe.pants']));
  c.wardrobe.jewelry=true;expect(householdDemand(c).differences.some(d=>d.key==='wardrobe.jewelry')).toBe(true);
  expect(householdDemand({}).members).toEqual([]);expect(householdDemand({}).matches).toBe(false);
});

it('exports the same seasonal demand with household privacy setting and escaped names',()=>{
  const c=example();c.inventoryPlanning!.members![0].name='<script>unsafe</script>';const layout=new ClosetLayoutEngine(c).calculateLayout();
  const visible=buildPrintDocument([{config:c,layout,settings:{...DEFAULT_PRINT,household:true}}]);expect(visible).toContain('Demand by household and season');expect(visible).toContain('Everyday profiles');expect(visible).toContain('25.00');expect(visible).toContain('&lt;script&gt;unsafe&lt;/script&gt;');expect(visible).not.toContain('<script>unsafe');
  const hidden=buildPrintDocument([{config:c,layout,settings:{...DEFAULT_PRINT,household:false}}]);expect(hidden).not.toContain('Demand by household and season');expect(hidden).not.toContain('unsafe');
});
