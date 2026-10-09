import { describe, it, expect } from 'vitest';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { DEFAULT_CONFIG } from '@/lib/design';
import { validConfig, invalidConfigurationField } from '@/lib/storage';
import {
  COLUMN_MIN_WIDTH, COLUMN_TYPES, COLUMN_SNAP, MAX_COLUMNS, columnsFromWall, normalizeColumns,
  moveColumn, resizeColumn, retypeColumn, addColumn, removeColumn, resolveColumns,
  droppedTypes, columnsIssue, validColumns,
} from '@/lib/layoutColumns';
import type { LayoutColumn } from '@/types/closet';

const wall=()=>new ClosetLayoutEngine(structuredClone(DEFAULT_CONFIG)).calculateLayout().walls[0];
const sum=(c:LayoutColumn[])=>c.reduce((n,x)=>n+x.width,0);
const fits=(c:LayoutColumn[],w:number)=>{
  expect(sum(c)).toBeCloseTo(w,3);
  for(const col of c)expect(col.width+.001).toBeGreaterThanOrEqual(COLUMN_MIN_WIDTH[col.type]);
};

describe('Layout column overrides',()=>{
  it('imports a generated wall as editable columns that cover it exactly',()=>{
    const w=wall(),cols=columnsFromWall(w);
    expect(cols.length).toBeGreaterThan(0);
    expect(new Set(cols.map(c=>c.id)).size).toBe(cols.length);
    for(const c of cols)expect(COLUMN_TYPES).toContain(c.type);
    expect(sum(cols)).toBeCloseTo(w.zones.length?w.width:0,0);
  });
  it('collapses stacked zones in one column into a single element',()=>{
    // A drawer bank under a hang rod shares an x span and must import as one column,
    // not two, or the canvas would show a phantom element.
    const w=wall(),cols=columnsFromWall(w);
    expect(cols.length).toBeLessThanOrEqual(w.zones.length);
  });
  it('normalizes any edit back to a full, buildable wall',()=>{
    const cols=columnsFromWall(wall());
    for(const width of [48,72,96,120,240]){
      const out=normalizeColumns(cols,width);
      if(out.length)fits(out,width);
      expect(out.length).toBeLessThanOrEqual(MAX_COLUMNS);
    }
  });
  it('drops columns a narrow wall cannot seat rather than building them too small',()=>{
    const many:LayoutColumn[]=Array.from({length:6},(_,i)=>({id:`c${i}`,type:'long-hang' as const,width:24}));
    const out=normalizeColumns(many,60);
    expect(out.length).toBeLessThan(many.length);
    fits(out,60);
  });
  it('reorders elements without changing total width',()=>{
    const cols=normalizeColumns(columnsFromWall(wall()),120);
    const moved=moveColumn(cols,cols[cols.length-1].id,0);
    expect(moved[0].id).toBe(cols[cols.length-1].id);
    expect(sum(moved)).toBeCloseTo(sum(cols),3);
    expect(moveColumn(cols,'missing',0)).toBe(cols);
  });
  it('resizes against the neighbour so the wall stays full and nothing drops below minimum',()=>{
    const cols=normalizeColumns([{id:'a',type:'long-hang',width:40},{id:'b',type:'short-hang',width:40}],80);
    for(const target of [-50,0,24,36,60,500]){
      const out=resizeColumn(cols,'a',target,80);
      fits(out,80);
      expect(out).toHaveLength(2);
    }
  });
  it('changes an element type and widens it to that type minimum',()=>{
    const cols=normalizeColumns([{id:'a',type:'shoe-shelves',width:12},{id:'b',type:'short-hang',width:60}],72);
    const out=retypeColumn(cols,'a','long-hang',72);
    expect(out.find(c=>c.id==='a')!.type).toBe('long-hang');
    fits(out,72);
    // An unknown type is refused rather than corrupting the wall.
    expect(retypeColumn(cols,'a','nonsense' as never,72)).toBe(cols);
  });
  it('adds and deletes elements, refusing an add the wall cannot fit',()=>{
    const cols=normalizeColumns([{id:'a',type:'long-hang',width:60}],60);
    const added=addColumn(cols,'drawers',1,60);
    expect(added).toHaveLength(2);fits(added,60);
    // 24 + 15 > 36, so this one must be refused outright.
    expect(addColumn(normalizeColumns([{id:'a',type:'long-hang',width:36}],36),'drawers',1,36)).toHaveLength(1);
    const removed=removeColumn(added,added[0].id,60);
    expect(removed).toHaveLength(1);fits(removed,60);
    // The last column is never removed — a wall with no elements is not a design.
    expect(removeColumn(removed,removed[0].id,60)).toHaveLength(1);
  });
  it('re-fits stored columns when the wall width changes underneath them',()=>{
    const stored=normalizeColumns(columnsFromWall(wall()),120);
    expect(resolveColumns(undefined,{width:96})).toBeNull();
    expect(resolveColumns([],{width:96})).toBeNull();
    const out=resolveColumns(stored,{width:96})!;
    fits(out,96);
  });
  it('snaps a dragged edge to a buildable increment without breaking the wall',()=>{
    const cols=normalizeColumns([{id:'a',type:'long-hang',width:40},{id:'b',type:'short-hang',width:40}],80);
    // A messy drag value lands on the snap grid, and the pair still covers the wall.
    const out=resizeColumn(cols,'a',33.37,80,COLUMN_SNAP);
    expect(out[0].width).toBeCloseTo(33.25,5);
    fits(out,80);
    // Snapping never pushes a column under its minimum, even aiming below it.
    const floored=resizeColumn(cols,'a',1,80,COLUMN_SNAP);
    expect(floored[0].width).toBeGreaterThanOrEqual(COLUMN_MIN_WIDTH['long-hang']);
    fits(floored,80);
    // Opting out keeps the exact value.
    expect(resizeColumn(cols,'a',33.37,80,0)[0].width).toBeCloseTo(33.37,5);
  });
  it('reports storage the generated wall had that an arrangement drops',()=>{
    const generated:LayoutColumn[]=[{id:'a',type:'long-hang',width:30},{id:'b',type:'drawers',width:20}];
    expect(droppedTypes(generated,generated)).toEqual([]);
    expect(droppedTypes(generated,[{id:'a',type:'long-hang',width:50}])).toEqual(['drawers']);
    // Reordering or resizing is not a loss; only a missing type counts.
    expect(droppedTypes(generated,[{id:'b',type:'drawers',width:20},{id:'a',type:'long-hang',width:30}])).toEqual([]);
  });
  it('rejects malformed overrides with the offending field path',()=>{    expect(columnsIssue(undefined)).toBeNull();
    expect(validColumns({back:[{id:'a',type:'long-hang',width:30}]})).toBe(true);
    expect(columnsIssue([])).toBe('zoneOverrides.columns');
    expect(columnsIssue({nowhere:[{id:'a',type:'long-hang',width:30}]})).toBe('zoneOverrides.columns.nowhere');
    expect(columnsIssue({back:[]})).toBe('zoneOverrides.columns.back');
    expect(columnsIssue({back:[{id:'a',type:'bogus',width:30}]})).toBe('zoneOverrides.columns.back[0].type');
    expect(columnsIssue({back:[{id:'a',type:'long-hang',width:0}]})).toBe('zoneOverrides.columns.back[0].width');
    expect(columnsIssue({back:[{id:'a',type:'long-hang',width:30},{id:'a',type:'drawers',width:20}]})).toBe('zoneOverrides.columns.back[1].id');
  });
  it('round-trips through configuration validation',()=>{
    const c={...structuredClone(DEFAULT_CONFIG),zoneOverrides:{columns:{back:columnsFromWall(wall())}}};
    expect(validConfig(c)).toBe(true);
    const bad={...structuredClone(DEFAULT_CONFIG),zoneOverrides:{columns:{back:[{id:'a',type:'bogus',width:10}]}}};
    expect(validConfig(bad)).toBe(false);
    expect(invalidConfigurationField(bad)).toBe('zoneOverrides.columns.back[0].type');
  });
});
