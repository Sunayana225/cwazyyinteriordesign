import {it,expect} from 'vitest';
import {DEFAULT_CONFIG} from '@/lib/design';
import {ClosetLayoutEngine} from '@/engine/ClosetLayoutEngine';
import {searchWidthAlternatives} from '@/lib/widthAlternatives';
import {COLUMN_MIN_WIDTH} from '@/lib/layoutColumns';
import {alternativeIssues} from '@/lib/roomGeometry';

it('returns distinct feasible width changes within wall bounds without changing the original project',async()=>{
  const config=structuredClone(DEFAULT_CONFIG),before=structuredClone(config),current=new ClosetLayoutEngine(config).calculateLayout();
  const result=await searchWidthAlternatives(config,current,{maxEvaluations:12,budgetMs:1000});
  expect(result.alternatives.length).toBeGreaterThan(0);expect(result.examined).toBeLessThanOrEqual(12);
  expect(new Set(result.alternatives.map(a=>JSON.stringify(a.layout.walls))).size).toBe(result.alternatives.length);
  for(const option of result.alternatives){
    expect(alternativeIssues(option.layout)).toEqual([]);
    for(const [id,columns] of Object.entries(option.patch!.zoneOverrides!.columns!)){
      const wall=current.walls.find(w=>w.wallId===id)!;expect(columns!.reduce((n,c)=>n+c.width,0)).toBeCloseTo(wall.width);
      for(const c of columns!)expect(c.width).toBeGreaterThanOrEqual(COLUMN_MIN_WIDTH[c.type]);
    }
  }
  expect(result.alternatives.map(a=>a.score)).toEqual([...result.alternatives.map(a=>a.score)].sort((a,b)=>a-b));expect(config).toEqual(before);
});

it('preserves manually edited walls and refuses to bridge a reserved span',async()=>{
  const config=structuredClone(DEFAULT_CONFIG);config.zoneOverrides={columns:{back:[{id:'fixed',type:'long-hang',width:96}]}};
  const manual=await searchWidthAlternatives(config,new ClosetLayoutEngine(config).calculateLayout());expect(manual.examined).toBe(0);expect(manual.skipped.join(' ')).toContain('manually edited');
  delete config.zoneOverrides;config.planning={windows:[{id:'w',wall:'back',offset:24,width:12,sill:30,height:24}]};
  const reserved=await searchWidthAlternatives(config,new ClosetLayoutEngine(config).calculateLayout());expect(reserved.examined).toBe(0);expect(reserved.skipped.join(' ')).toContain('reservations');
});

it('keeps the best examined choices at limits and generates stable recipe IDs',async()=>{
  const current=new ClosetLayoutEngine(DEFAULT_CONFIG).calculateLayout();
  const one=await searchWidthAlternatives(DEFAULT_CONFIG,current,{maxEvaluations:3,budgetMs:1000});
  const again=await searchWidthAlternatives(DEFAULT_CONFIG,current,{maxEvaluations:3,budgetMs:1000});
  expect(one.stopped).toBe('evaluation limit');expect(one.alternatives.length).toBeGreaterThan(0);expect(one.alternatives.map(a=>a.id)).toEqual(again.alternatives.map(a=>a.id));
  const timeout=await searchWidthAlternatives(DEFAULT_CONFIG,current,{budgetMs:0});expect(timeout.examined).toBe(0);expect(timeout.stopped).toBe('time limit');
});

it('cancels between generations and rejects candidates with unresolved room conflicts',async()=>{
  const current=new ClosetLayoutEngine(DEFAULT_CONFIG).calculateLayout(),controller=new AbortController();
  const pending=searchWidthAlternatives(DEFAULT_CONFIG,current,{signal:controller.signal,maxEvaluations:60,budgetMs:1000});controller.abort();
  const cancelled=await pending;expect(cancelled.stopped).toBe('cancelled');expect(cancelled.examined).toBeLessThanOrEqual(1);
  const config=structuredClone(DEFAULT_CONFIG);config.planning={door:{wall:'back',offset:90,width:30,hinge:'left',swing:'in'}};
  const rejected=await searchWidthAlternatives(config,new ClosetLayoutEngine(config).calculateLayout(),{maxEvaluations:3,budgetMs:1000});expect(rejected.rejected).toBeGreaterThan(0);expect(rejected.alternatives).toEqual([]);
});
