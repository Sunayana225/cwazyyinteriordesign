import { describe,it,expect } from 'vitest';
import { DEFAULT_CONFIG } from '@/lib/design';
import { confirmSurvey } from '@/lib/surveyReview';
import { surveyChanges } from '@/lib/surveyChanges';

describe('survey change explanations',()=>{
  it('names exact changed fields without counting unchanged wall defaults',()=>{
    const c=structuredClone(DEFAULT_CONFIG);c.surveyConfirmation=confirmSurvey(c);
    c.dimensions.width+=.125;c.planning={walls:{back:{ceilingHeight:108}}};
    expect(surveyChanges(c)).toEqual([
      {field:'Wall width',before:`${DEFAULT_CONFIG.dimensions.width} in`,after:`${c.dimensions.width} in`},
      {field:'back wall · ceiling height',before:'Inherited',after:'108 in'},
    ]);
    c.surveyConfirmation=confirmSurvey(c);expect(surveyChanges(c)).toEqual([]);
  });
  it('does not mistake renamed or reordered objects for moved ones',()=>{
    const c=structuredClone(DEFAULT_CONFIG);c.planning={obstacles:[{id:'a',label:'A',x:4,y:5,width:10,depth:12},{id:'b',label:'B',x:20,y:5,width:10,depth:12}]};
    c.surveyConfirmation=confirmSurvey(c);c.planning.obstacles!.reverse();c.planning.obstacles![0].label='Renamed';
    expect(surveyChanges(c)).toEqual([]);
    c.planning.obstacles![0].x=24;
    expect(surveyChanges(c)).toEqual([{field:'Obstacle geometry',before:'x 20 in, y 5 in, width 10 in, depth 12 in; x 4 in, y 5 in, width 10 in, depth 12 in',after:'x 24 in, y 5 in, width 10 in, depth 12 in; x 4 in, y 5 in, width 10 in, depth 12 in'}]);
  });
  it('reports removals and duplicate window geometry without hiding changes',()=>{
    const c=structuredClone(DEFAULT_CONFIG);c.planning={walls:{back:{floorOffset:3}},windows:[{id:'a',wall:'back',offset:0,width:20,sill:30,height:24},{id:'b',wall:'back',offset:0,width:20,sill:30,height:24}]};
    c.surveyConfirmation=confirmSurvey(c);c.planning.windows!.pop();c.planning.walls={};
    const changes=surveyChanges(c)!;
    expect(changes.map(c=>c.field)).toEqual(['back wall · floor offset','Window geometry']);
    expect(changes[1].before.split(';')).toHaveLength(2);expect(changes[1].after.split(';')).toHaveLength(1);
  });
  it('reports door and room changes but ignores the clearance-analysis setting',()=>{
    const c=structuredClone(DEFAULT_CONFIG);c.planning={door:{wall:'front',offset:0,width:30,hinge:'left',swing:'in'}};
    c.surveyConfirmation=confirmSurvey(c);c.planning.door!.check='sector';expect(surveyChanges(c)).toEqual([]);
    c.planning.door!.hinge='right';c.roomDimensions={roomWidth:120,roomDepth:144};
    expect(surveyChanges(c)?.map(c=>c.field)).toEqual(['Room width','Room depth','Door hinge']);
  });
  it('falls back safely when imported confirmation details cannot be read',()=>{
    const c=structuredClone(DEFAULT_CONFIG);
    for(const geometry of ['broken','null','{}',JSON.stringify({version:1,shape:'reach-in',dimensions:null,room:null,walls:[],windows:[{}],obstacles:[],door:null})]){
      c.surveyConfirmation={...confirmSurvey(c),geometry};expect(surveyChanges(c)).toBeNull();
    }
  });
});
