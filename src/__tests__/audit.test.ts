import { describe, it, expect } from 'vitest';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { ClosetSVGRenderer } from '@/renderer/ClosetSVGRenderer';
import { buildPrintDocument } from '@/engine/PDFExporter';
import { DEFAULT_CONFIG, TYPES, capacityReport, dimensionErrors, formatInches, hangingDemand } from '@/lib/design';
import { nextDesignName, readDesigns, serializeDesigns, validConfig } from '@/lib/storage';
import type { ClosetConfiguration, DrawerPosition } from '@/types/closet';
const config = () => structuredClone(DEFAULT_CONFIG);
const calc = (c: ClosetConfiguration) => new ClosetLayoutEngine(c).calculateLayout();

describe('Audit geometry', () => {
  for (const type of TYPES) it(type + ' stays inside all wall bounds across dimensions and drawer positions', () => {
    for (const width of [36, 48, 96, 180, 336]) for (const height of [84, 96, 156]) for (const depth of [18, 24, 48]) for (const position of ['bottom', 'middle', 'top'] as DrawerPosition[]) {
      const c = config(); c.closetType = type; c.dimensions = { width, height, depth };
      c.roomDimensions = { roomWidth: width, roomDepth: width }; c.zoneOverrides = { drawerPosition: position };
      for (const wall of calc(c).walls) {
        for (const z of wall.zones) {
          expect(z.x).toBeGreaterThanOrEqual(0); expect(z.y).toBeGreaterThanOrEqual(0);
          expect(z.width).toBeGreaterThan(0); expect(z.height).toBeGreaterThan(0);
          expect(z.x + z.width).toBeLessThanOrEqual(wall.width + .001);
          expect(z.y + z.height).toBeLessThanOrEqual(wall.height + .001);
          for (const d of z.drawers ?? []) { expect(d.position).toBeGreaterThanOrEqual(z.y); expect(d.position+d.height).toBeLessThanOrEqual(z.y+z.height+.001); }
          for (const r of z.rods ?? []) { expect(r.height).toBeGreaterThanOrEqual(z.y); expect(r.height).toBeLessThanOrEqual(z.y+z.height); }
          for (const other of wall.zones) if (other !== z) {
            const overlapX = Math.min(z.x+z.width,other.x+other.width)-Math.max(z.x,other.x);
            const overlapY = Math.min(z.y+z.height,other.y+other.height)-Math.max(z.y,other.y);
            expect(overlapX > .001 && overlapY > .001).toBe(false);
          }
        }
      }
    }
  });
  it('omits infeasible islands and reserves clearance for feasible ones', () => {
    const c=config(); c.closetType='island'; c.roomDimensions={roomWidth:120,roomDepth:96};
    expect(calc(c).walls.some(w=>w.wallId==='island-unit')).toBe(false);
    c.roomDimensions={roomWidth:180,roomDepth:144};
    const island=calc(c).walls.find(w=>w.wallId==='island-unit')!;
    expect(island.width).toBeGreaterThanOrEqual(36);
    expect((180-48-island.width)/2).toBeGreaterThanOrEqual(36);
  });
  it('uses drawer preferences and positions on side walls', () => {
    const c=config(); c.closetType='walkin-u'; c.roomDimensions={roomWidth:120,roomDepth:120};
    const heights=[];
    for(const preference of ['many-small','few-large','mixed'] as const) { c.userInfo.drawerPreference=preference; heights.push(calc(c).walls.flatMap(w=>w.zones).flatMap(z=>z.drawers??[]).find(d=>d.purpose==='folded')!.height); }
    expect(new Set(heights).size).toBe(3);
    c.zoneOverrides={drawerPosition:'top'};
    expect(calc(c).walls.find(w=>w.wallId==='left')!.zones.find(z=>z.type==='drawers')!.y).toBeGreaterThan(3);
  });
  it('allocates capacity for bags and belts and physical shelf supports', () => {
    const c=config(); c.userInfo.priorityItems=['accessories']; c.dimensions.width=180;
    const layout=calc(c), rows=capacityReport(c,layout.walls);
    expect(rows.find(r=>r.label==='Bags')!.available).toBeGreaterThan(0);
    expect(rows.find(r=>r.label==='Belts')!.available).toBeGreaterThan(0);
    for(const z of layout.zones) if(z.shelves && z.width>32) expect(z.supports!.length).toBeGreaterThan(0);
  });
});
describe('Audit inputs and storage', () => {
  it('validates dimensions and preserves fractional unit formatting', () => {
    const c=config(); expect(dimensionErrors(c)).toEqual([]); c.dimensions.height=60;
    expect(dimensionErrors(c)[0]).toContain('84'); expect(formatInches(95.875)).toBe('7\'-11.875"'); expect(formatInches(95.99)).toBe('8\'-0"');
  });
  it('normalizes nonfinite and negative inventory with warnings', () => {
    const c=config(); c.wardrobe.shirts=NaN; c.shoes.boots=-4; c.dimensions.height=Infinity;
    const l=calc(c); expect(l.inputWarnings!.length).toBeGreaterThanOrEqual(3); expect(Number.isFinite(l.utilizationScore)).toBe(true);
  });
  it('counts two short-hang pieces per suit', () => {
    const c=config(); c.wardrobe.suits=4; const before=hangingDemand(c.wardrobe); c.wardrobe.suits=0;
    expect(before.short-hangingDemand(c.wardrobe).short).toBeCloseTo(14.4); expect(before.long).toBe(hangingDemand(c.wardrobe).long);
  });
  it('rejects corrupt nested records and preserves legacy data', () => {
    const design={id:'abc',name:'Design 1',savedAt:new Date().toISOString(),config:config()};
    expect(readDesigns(JSON.stringify([design]))).toEqual([design]); expect(readDesigns(serializeDesigns([design]))).toEqual([design]);
    expect(()=>readDesigns(JSON.stringify([{...design, config:{}}]))).toThrow();
    expect(validConfig({...config(), shoes:{boots:-1}})).toBe(false);
    expect(nextDesignName([design,{...design,id:'c',name:'Design 3'}])).toBe('Design 2');
  });
});
describe('Audit exported documents', () => {
  it('keeps gallery markup identical across server and client render order',()=>{
    const layout=calc(config());
    const options={showDimensions:false,showLabels:false,style:'modern' as const,woodFinish:'white' as const,idPrefix:'gallery-minimal'};
    const first=new ClosetSVGRenderer(layout,options).renderElevation();
    new ClosetSVGRenderer(layout,{...options,idPrefix:undefined}).renderElevation();
    expect(new ClosetSVGRenderer(layout,options).renderElevation()).toBe(first);
  });
  it('escapes design names and includes all walls, floor plan, capacity, warnings and effective room size', () => {
    const c=config(); c.closetType='walkin-u'; c.roomDimensions={roomWidth:132,roomDepth:108};
    const l=calc(c); const html=buildPrintDocument([{config:c,layout:l,fileName:'<img src=x onerror=alert(1)>'}]);
    expect(html).not.toContain('<img src=x'); expect(html).toContain('&lt;img');
    for(const wall of l.walls) expect(html).toContain(wall.elevationRef);
    expect(html).toContain('132 in'); expect(html).toContain('Floor plan'); expect(html).toContain('Shortfall'); expect(html).toContain('Not to scale');
  });
  it('renders hardware and accent colors and respects label controls', () => {
    const l=calc(config());
    const svg=new ClosetSVGRenderer(l,{showDimensions:false,showLabels:false,style:'modern',woodFinish:'white',hardwareFinish:'gold',accentColor:'#e8f0e8'}).renderElevation();
    expect(svg).toContain('#a77b16'); expect(svg).toContain('#e8f0e8'); expect(svg).toContain('<title>'); expect(svg).not.toMatch(/NaN|Infinity/);
    expect(svg).not.toContain('>SHELF</text>');
  });
  it('isolates paint definitions between drawings in a multi-design document', () => {
    const l=calc(config());
    const render=()=>new ClosetSVGRenderer(l,{showDimensions:true,showLabels:true,style:'modern',woodFinish:'white'}).renderElevation();
    const first=render(), second=render();
    const ids=Array.from((first+second).matchAll(/id="([^"]+)"/g), m=>m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for(const svg of [first,second]) for(const m of svg.matchAll(/url\(#([^)]+)\)/g)) expect(svg).toContain(`id="${m[1]}"`);
  });
});
