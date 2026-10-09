import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '@/lib/design';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { circulation, doorAssessment, doorLocalRect, islandRequirement, obstacleSuggestions, roomIssues, sectorDistance } from '@/lib/roomGeometry';
import { planningIssues, canonicalPlanning, storageFootprints } from '@/lib/planning';
import { readBackup, serializeDesigns } from '@/lib/storage';
import type { ClosetConfiguration } from '@/types/closet';
const config=():ClosetConfiguration=>({...structuredClone(DEFAULT_CONFIG),closetType:'island',roomDimensions:{roomWidth:192,roomDepth:144}});
const layout=(c=config())=>new ClosetLayoutEngine(c).calculateLayout();
describe('room geometry and editing',()=>{
  it('reports numbered out-of-wall, above-ceiling and overlapping windows without dropping them',()=>{
    const c=config();c.planning={windows:[{id:'a',wall:'back',offset:180,width:24,sill:90,height:24},{id:'b',wall:'back',offset:185,width:5,sill:10,height:10}]};
    const l=layout(c),issues=roomIssues(l);expect(issues.some(v=>v.message.includes('Window 1')&&v.message.includes('12.00 in beyond'))).toBe(true);expect(issues.some(v=>v.message.includes('above the ceiling'))).toBe(true);expect(issues.filter(v=>v.message.includes('overlaps Window'))).toHaveLength(2);expect(l.planning?.windows).toHaveLength(2);
  });
  it('reports both overlapping obstacle names and out-of-room positions',()=>{
    const c=config();c.planning={obstacles:[{id:'a',mobility:'movable',label:'Pillar',x:188,y:0,width:12,depth:12},{id:'b',label:'Duct',x:190,y:0,width:6,depth:6}]};
    const issues=roomIssues(layout(c));expect(issues.some(v=>v.message.includes('outside'))).toBe(true);expect(issues.filter(v=>v.message.includes('Pillar')&&v.message.includes('Duct'))).toHaveLength(2);
  });
  it('uses exact quarter-sector distance rather than accepting its outside corner',()=>{
    expect(sectorDistance({x:25,y:25,width:2,depth:2},30)).toBeCloseTo(Math.sqrt(1250)-30);
    expect(sectorDistance({x:0,y:29,width:2,depth:2},30)).toBe(0);
    expect(sectorDistance({x:-5,y:10,width:2,depth:2},30)).toBe(3);
    expect(sectorDistance({x:-5,y:-5,width:2,depth:2},30)).toBeCloseTo(Math.sqrt(18));
  });
  it('maps all door wall origins and hinge directions consistently',()=>{
    for(const wall of ['front','back','left','right'] as const)for(const hinge of ['left','right'] as const){
      const b=doorLocalRect({x:0,y:0,width:100,depth:100},{wall,hinge,offset:10,width:30,swing:'in'},{width:100,depth:100});expect(b.width).toBe(100);expect(b.depth).toBe(100);expect(b.y).toBe(0);expect(b.x).toBe(hinge==='left'?-10:-60);
    }
  });
  it('distinguishes sector versus envelope and rejects an outside door opening',()=>{
    const l=layout();l.walls=[];l.roomDimensions={roomWidth:100,roomDepth:100};l.planning={door:{wall:'front',offset:0,width:30,hinge:'left',swing:'in'},obstacles:[{id:'a',mobility:'movable',label:'Corner',x:25,y:73,width:2,depth:2}]};
    expect(doorAssessment(l).conflicts).toEqual(['Corner']);l.planning.door!.check='sector';expect(doorAssessment(l).conflicts).toEqual([]);l.planning.door!.offset=90;expect(doorAssessment(l).outside).toBe(true);
  });
  it('applies personal clearance targets to generation and island requirements',()=>{
    const c=config();c.planning={clearanceTarget:60};const l=layout(c);expect(l.walls.some(w=>w.wallId==='island-unit')).toBe(false);expect(islandRequirement(l)).toEqual({width:204,depth:168,target:60});expect(l.aisleWarnings.join(' ')).toContain('204');
    const a=circulation(layout());expect(a.aisles).toHaveLength(4);expect(a.narrowest.width).toBeGreaterThanOrEqual(36);
  });
  it('uses the selected door model for suggestions, including square-only conflicts',()=>{
    const l=layout();l.walls=[];l.roomDimensions={roomWidth:100,roomDepth:100};
    l.planning={door:{wall:'front',offset:0,width:30,hinge:'left',swing:'in',check:'envelope'},obstacles:[{id:'a',mobility:'movable',label:'Corner',x:25,y:73,width:2,depth:2}]};
    const positions=obstacleSuggestions(l,'a');expect(positions.length).toBeGreaterThan(0);
    for(const pos of positions){const moved=structuredClone(l);Object.assign(moved.planning!.obstacles![0],pos);expect(doorAssessment(moved).conflicts).toEqual([]);}
    l.planning.door!.check='sector';expect(obstacleSuggestions(l,'a')).toEqual([]);
  });
  it('keeps every suggested placement consistent across door orientations and sweep models',()=>{
    for(const wall of ['front','back','left','right'] as const)for(const hinge of ['left','right'] as const)for(const swing of ['in','out'] as const)for(const check of ['envelope','sector'] as const){
      const l=layout();l.walls=[];l.roomDimensions={roomWidth:100,roomDepth:100};
      l.planning={door:{wall,offset:10,width:30,hinge,swing,check},obstacles:[{id:'a',mobility:'movable',label:'Object',x:-5,y:20,width:10,depth:10}]};
      const positions=obstacleSuggestions(l,'a');expect(positions.length).toBeGreaterThan(0);
      for(const pos of positions){const moved=structuredClone(l);Object.assign(moved.planning!.obstacles![0],pos);expect(doorAssessment(moved).conflicts).toEqual([]);expect(roomIssues(moved)).toEqual([]);}
    }
  });
  it('finds nearby door-edge placements and returns none for an object larger than the room',()=>{
    const l=layout();l.walls=[];l.roomDimensions={roomWidth:100,roomDepth:100};
    l.planning={door:{wall:'front',offset:0,width:30,hinge:'left',swing:'in'},obstacles:[{id:'a',mobility:'movable',label:'Object',x:25,y:73,width:2,depth:2}]};
    expect(obstacleSuggestions(l,'a')).toContainEqual({x:30.125,y:73});
    const nearest=obstacleSuggestions(l,'a')[0];expect(Math.hypot(nearest.x-25,nearest.y-73)).toBe(5.125);
    l.planning.obstacles![0].width=101;expect(obstacleSuggestions(l,'a')).toEqual([]);
  });
  it('baseboard reduces usable drawer depth and floor offsets shift absolute placements',()=>{
    const c=config(),before=layout(c).walls.find(w=>w.wallId==='left')!;c.planning={walls:{left:{baseboard:2,floorOffset:4}}};const after=layout(c).walls.find(w=>w.wallId==='left')!;
    const a=before.zones.flatMap(z=>z.drawers??[])[0],b=after.zones.flatMap(z=>z.drawers??[])[0];expect(b.depth).toBe(a.depth-2);expect(b.position).toBe(a.position+4);expect(after.unitDepth).toBe(before.unitDepth);
  });
  it('suggests positions clear of the generated island and room boundaries',()=>{
    const c=config();c.planning={obstacles:[{id:'a',mobility:'movable',label:'Column',x:94,y:80,width:4,depth:4}]};const l=layout(c),positions=obstacleSuggestions(l,'a');expect(positions.length).toBeGreaterThan(0);const boxes=storageFootprints(l);for(const p of positions)expect(boxes.some(b=>p.x<b.x+b.width&&p.x+4>b.x&&p.y<b.y+b.depth&&p.y+4>b.y)).toBe(false);
  });
  it('retains supported new planning fields through canonicalization and backup restore',()=>{
    const c=config();c.planning={clearanceTarget:42,walls:{back:{ceilingHeight:110,baseboard:2,floorOffset:3}},door:{wall:'front',offset:50,width:30,hinge:'right',swing:'in',check:'sector'},windows:[{id:'a',label:'Garden',wall:'back',offset:0,width:20,sill:20,height:20}]};
    expect(planningIssues(c.planning)).toEqual([]);const restored=readBackup(serializeDesigns([{id:'x',name:'Study',savedAt:'2026-09-29',config:c}]))[0];expect(restored.config.planning).toEqual(canonicalPlanning(c.planning));
  });
  it('names the exact failed planning field and record index in a rejected backup',()=>{
    const c=config();const raw=JSON.stringify({version:1,designs:[{id:'x',name:'Study',savedAt:'2026-09-29',config:{...c,planning:{door:{wall:'front',offset:0,width:'bad',hinge:'left',swing:'in'}}}}]});expect(()=>readBackup(raw)).toThrow('designs[0].config.planning.door.width');
    expect(planningIssues({walls:{back:{floorOffset:50}}})[0]).toContain('planning.walls.back.floorOffset');
  });
});
