import { describe, it, expect } from 'vitest';
import { defaultInterior, grid, splitCell, mergeCells, transformInterior, validInteriors, cellSize, interiorWarnings, interiorSVG, drawerTargets, PRESETS, templateCells, cellOpening, innerSize } from '@/lib/drawers';
import { DEFAULT_CONFIG, ORGANIZER_FOOTPRINTS } from '@/lib/design';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { buildPrintDocument } from '@/engine/PDFExporter';
import { validConfig, serializeDesigns, readDesigns } from '@/lib/storage';
const drawer={width:24,depth:22,height:9,position:3,purpose:'folded'};
describe('Drawer organizer model',()=>{
  it('reserves configured divider thickness before choosing template well counts',()=>{
    for(const thickness of [.125,.5,1])for(const width of [18,24,40])for(const name of ['Socks','Watches','Belts','Underwear']){
      const d={...drawer,width},base={...defaultInterior(d),thickness},preset=PRESETS.find(p=>p.name===name)!;
      const p={...base,cells:templateCells(preset,innerSize(d,base),{vertical:thickness,horizontal:thickness})};
      expect(validInteriors({'back:0:0':p})).toBe(true);
      for(const cell of p.cells){const usable=cellSize(cell,d,p),minimum=ORGANIZER_FOOTPRINTS[preset.category];
        expect(usable.width+1e-8).toBeGreaterThanOrEqual(minimum.minW);
        expect(usable.depth+1e-8).toBeGreaterThanOrEqual(minimum.minD);
      }
    }
  });
  it('keeps an open tray at the full measured interior and draws divider gaps to scale',()=>{
    const p={...defaultInterior(drawer),measured:{width:20,depth:16,height:4},thickness:1};
    expect(cellSize(p.cells[0],drawer,p)).toEqual({width:20,depth:16});
    expect(cellOpening(p.cells[0],drawer,p)).toEqual({x:0,y:0,w:1,h:1});
    expect(interiorSVG(p,drawer)).toContain('No internal dividers');
    p.cells=grid(2,2);
    const a=cellOpening(p.cells[0],drawer,p),b=cellOpening(p.cells[1],drawer,p);
    expect((b.x-a.x-a.w)*20).toBeCloseTo(1);
    expect(interiorSVG(p,drawer)).toContain('data-compartment="cell-0" x="10" y="10" width="180" height="140"');
  });
  it('never creates an unsavable partition through repeated splits or invalid ratios',()=>{
    let p=defaultInterior(drawer);
    expect(splitCell(p,p.cells[0].id,'x',NaN)).toBe(p);
    for(let i=0;i<40;i++){
      p=splitCell(p,p.cells[0].id,'x',.15);
      expect(validInteriors({'back:0:0':p})).toBe(true);
    }
  });
  it('generates complete bounded grids for every supported size and preset',()=>{
    for(let r=1;r<=6;r++)for(let c=1;c<=6;c++){
      let p={...defaultInterior(drawer),cells:grid(r,c)};
      for(let i=0;i<4;i++){p=transformInterior(p,'rotate');expect(validInteriors({'back:0:0':p})).toBe(true);}
      expect(validInteriors({'back:0:0':transformInterior(p,'mirror')})).toBe(true);
    }
    expect(()=>grid(0,2)).toThrow();expect(()=>grid(7,2)).toThrow();
  });
  it('sizes every template against the drawer instead of a fixed row and column count',()=>{
    // Narrow, standard, wide and a shallow jewelry drawer. Templates must stay savable
    // at every size, respect the 36-compartment cap, and never fall below the usable
    // minimum for their category.
    const sizes=[{width:18,depth:14,height:9},{width:24,depth:22,height:9},{width:40,depth:20,height:9},{width:30,depth:18,height:3}];
    for(const box of sizes){
      const d={...drawer,...box};
      for(const preset of PRESETS){
        const base=defaultInterior(d),p={...base,cells:templateCells(preset,innerSize(d,base))};
        expect(validInteriors({'back:0:0':p})).toBe(true);
        expect(validInteriors({'back:0:0':transformInterior(p,'rotate')})).toBe(true);
        expect(p.cells.length).toBeGreaterThan(0);
        expect(p.cells.length).toBeLessThanOrEqual(36);
        const f=ORGANIZER_FOOTPRINTS[preset.category]??ORGANIZER_FOOTPRINTS.General;
        for(const c of p.cells){
          const s=cellSize(c,d,p);
          expect(s.width).toBeGreaterThan(0);expect(s.depth).toBeGreaterThan(0);
          // A band layout drops lanes rather than shrinking them, so only the uniform
          // templates are held to the full per-well minimum.
          if(!['Jewelry','Tech'].includes(preset.name)&&f.w>0)expect(s.width+.01).toBeGreaterThanOrEqual(Math.min(f.minW,innerSize(d,base).width));
        }
      }
    }
  });
  it('gives a wider drawer more wells rather than oversized ones',()=>{
    const socks=PRESETS.find(p=>p.name==='Socks')!;
    const narrow={...drawer,width:18,depth:16},wide={...drawer,width:40,depth:16};
    const base=defaultInterior(drawer);
    const few=templateCells(socks,innerSize(narrow,base)),many=templateCells(socks,innerSize(wide,base));
    expect(many.length).toBeGreaterThan(few.length);
    // Both stay near the 3.5 in sock-well target instead of scaling with the drawer.
    for(const [d,cells] of [[narrow,few],[wide,many]] as const){
      const p={...base,cells:[...cells]};
      for(const c of p.cells)expect(cellSize(c,d,p).width).toBeLessThan(6);
    }
  });
  it('keeps the jewelry template to its measured bands',()=>{
    const jewelry=PRESETS.find(p=>p.name==='Jewelry')!;
    const d={...drawer,width:30,depth:18},base=defaultInterior(d);
    const p={...base,cells:templateCells(jewelry,innerSize(d,base))};
    expect(validInteriors({'back:0:0':p})).toBe(true);
    const labels=p.cells.map(c=>c.label).join(' ');
    for(const band of ['Ring roll','Earrings','Bracelets','Necklaces'])expect(labels).toContain(band);
    // Ring rolls stay near their 1.75 in lane width at any drawer size.
    for(const c of p.cells.filter(c=>c.label.startsWith('Ring roll')))expect(cellSize(c,d,p).width).toBeLessThan(3);
  });
  it('splits and merges without duplicating inventory or losing coverage',()=>{
    let p=defaultInterior(drawer);p.cells[0].quantity=12;
    p=splitCell(p,p.cells[0].id,'x',.35);expect(p.cells.reduce((n,c)=>n+c.quantity,0)).toBe(12);
    expect(validInteriors({'back:0:0':p})).toBe(true);
    const merged=mergeCells(p,p.cells[0].id,p.cells[1].id)!;expect(merged.cells).toHaveLength(1);expect(merged.cells[0].quantity).toBe(12);
    p=splitCell(p,p.cells[1].id,'y',.65);expect(mergeCells(p,p.cells[0].id,p.cells[1].id)).toBeNull();
    expect(validInteriors({'back:0:0':p})).toBe(true);
  });
  it('rotation and reflection preserve a nonuniform partition',()=>{
    const original=splitCell(defaultInterior(drawer),'cell-0','x',.3);
    let p=original;for(let i=0;i<4;i++)p=transformInterior(p,'rotate');
    p.cells.forEach((c,i)=>{expect(c.x).toBeCloseTo(original.cells[i].x);expect(c.w).toBeCloseTo(original.cells[i].w);});
    expect(validInteriors({'back:0:0':transformInterior(original,'mirror')})).toBe(true);
  });
  it('accounts for allowance and thickness, and warns about resized or narrow cells',()=>{
    const p=defaultInterior(drawer);expect(cellSize(p.cells[0],drawer,p).width).toBe(22.5);
    expect(interiorWarnings(p,{...drawer,width:18}).join(' ')).toContain('size changed');
    p.cells=grid(6,6);expect(interiorWarnings(p,{...drawer,width:8}).join(' ')).toContain('narrower');
  });
  it('rejects overlapping, incomplete, oversized and malformed stored plans',()=>{
    const p=defaultInterior(drawer);expect(validInteriors({'back:0:0':p})).toBe(true);
    expect(validInteriors({'bad-key':p})).toBe(false);
    expect(validInteriors({'back:0:0':{...p,cells:[p.cells[0],{...p.cells[0],id:'other'}]}})).toBe(false);
    expect(validInteriors({'back:0:0':{...p,cells:[{...p.cells[0],w:.5}]}})).toBe(false);
    expect(validInteriors({'back:0:0':{...p,thickness:NaN}})).toBe(false);
    expect(validInteriors({'back:0:0':{...p,cells:[null]}})).toBe(false);
  });
  it('persists organizers while keeping legacy configurations valid',()=>{
    const c=structuredClone(DEFAULT_CONFIG);expect(validConfig(c)).toBe(true);c.drawerInteriors={'back:0:0':defaultInterior(drawer)};
    expect(validConfig(c)).toBe(true);
    const restored=readDesigns(serializeDesigns([{id:'one',name:'Test',savedAt:new Date().toISOString(),config:c}]));
    expect(restored[0].config.drawerInteriors).toEqual(c.drawerInteriors);
  });
  it('prints the correct drawer plan and escapes custom text',()=>{
    const c=structuredClone(DEFAULT_CONFIG),layout=new ClosetLayoutEngine(c).calculateLayout(),targets=drawerTargets(layout);
    expect(new Set(targets.map(d=>d.id)).size).toBe(targets.length);
    const p=defaultInterior(targets[0].drawer);p.name='<script>bad</script>';p.cells[0].label='<img src=x>';p.notes='<b>notes</b>';
    c.drawerInteriors={[targets[0].id]:p};
    const html=buildPrintDocument([{config:c,layout}]);expect(html).toContain('Drawer organizer: &lt;script&gt;');expect(html).not.toContain('<img src=x>');expect(html).toContain('&lt;b&gt;notes');
    expect(interiorSVG(p,drawer)).not.toContain('<script>');
  });
});
