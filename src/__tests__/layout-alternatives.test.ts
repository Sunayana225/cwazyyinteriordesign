import { describe, it, expect } from 'vitest';
import { compareDrawerLayouts, shortfallScore } from '@/lib/layoutAlternatives';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { DEFAULT_CONFIG, EMPTY_WARDROBE } from '@/lib/design';

describe('drawer alternative comparison',()=>{
  it('ranks by category-relative shortages with explicit priority weighting',()=>{
    const layout=new ClosetLayoutEngine(DEFAULT_CONFIG).calculateLayout();
    layout.capacity=[{label:'Long hanging',required:100,available:0,unit:'inches of rod'},{label:'sneakers',required:2,available:2,unit:'pairs'}];
    expect(shortfallScore(layout,[])).toBe(.5);
    expect(shortfallScore(layout,['hanging'])).toBeCloseTo(2/3);
    expect(shortfallScore(layout,['shoes'])).toBeCloseTo(1/3);
    layout.capacity[0]={...layout.capacity[0],required:10000};
    expect(shortfallScore(layout,[])).toBe(.5);
  });
  it('groups identical geometry instead of claiming three different choices',()=>{
    const c=structuredClone(DEFAULT_CONFIG);c.wardrobe={...EMPTY_WARDROBE,shirts:5};c.shoes={boots:0,heels:0,sneakers:0,flats:0};
    const result=compareDrawerLayouts(c,new ClosetLayoutEngine(c).calculateLayout());
    expect(result.rejected).toEqual([]);expect(result.alternatives).toHaveLength(1);
    expect(result.alternatives[0].equivalentPreferences).toHaveLength(3);
  });
  it('shows exact gains and losses and never mutates the current design',()=>{
    const c=structuredClone(DEFAULT_CONFIG),before=structuredClone(c),layout=new ClosetLayoutEngine(c).calculateLayout();
    const result=compareDrawerLayouts(c,layout);
    expect(result.alternatives.length).toBeGreaterThan(1);
    expect(result.alternatives.map(a=>a.score)).toEqual([...result.alternatives.map(a=>a.score)].sort((a,b)=>a-b));
    for(const a of result.alternatives)for(const change of a.changes)expect(change.delta).toBeCloseTo(a.layout.capacity!.find(r=>r.label===change.label)!.available-layout.capacity!.find(r=>r.label===change.label)!.available);
    expect(c).toEqual(before);
  });
  it('does not promote an option with an unresolved room conflict',()=>{
    const c=structuredClone(DEFAULT_CONFIG);c.planning={windows:[{id:'outside',wall:'back',offset:90,width:24,sill:36,height:36}]};
    const result=compareDrawerLayouts(c,new ClosetLayoutEngine(c).calculateLayout());
    expect(result.alternatives).toEqual([]);expect(result.rejected).toHaveLength(3);
  });
});
