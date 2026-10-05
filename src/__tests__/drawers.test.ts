import { describe, it, expect } from 'vitest';
import { defaultInterior, grid, splitCell, mergeCells, transformInterior, validInteriors, cellSize, interiorWarnings, interiorSVG, drawerTargets, PRESETS } from '@/lib/drawers';
import { DEFAULT_CONFIG } from '@/lib/design';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { buildPrintDocument } from '@/engine/PDFExporter';
import { validConfig, serializeDesigns, readDesigns } from '@/lib/storage';
const drawer={width:24,depth:22,height:9,position:3,purpose:'folded'};
describe('Drawer organizer model',()=>{
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
    for(const p of PRESETS)expect(grid(p.rows,p.cols,p.category)).toHaveLength(p.rows*p.cols);
    expect(()=>grid(0,2)).toThrow();expect(()=>grid(7,2)).toThrow();
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
    const p=defaultInterior(drawer);expect(cellSize(p.cells[0],drawer,p).width).toBe(22.25);
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
