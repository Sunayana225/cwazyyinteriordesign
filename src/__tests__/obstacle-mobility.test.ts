import { it,expect } from 'vitest';
import { DEFAULT_CONFIG } from '@/lib/design';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { obstacleSuggestions,roomIssues } from '@/lib/roomGeometry';
import { readBackup,serializeDesigns,invalidConfigurationField } from '@/lib/storage';
import { confirmSurvey,surveyState } from '@/lib/surveyReview';
import { renderFloorPlan } from '@/renderer/FloorPlanRenderer';
import { buildPrintDocument } from '@/engine/PDFExporter';
import { DEFAULT_PRINT } from '@/lib/printSettings';

it('treats legacy and explicit fixed objects as immovable while retaining conflict reports',()=>{
  const layout=new ClosetLayoutEngine(DEFAULT_CONFIG).calculateLayout();layout.walls=[];
  layout.planning={obstacles:[{id:'a',label:'Column',x:100,y:10,width:12,depth:12}]};
  expect(obstacleSuggestions(layout,'a')).toEqual([]);expect(roomIssues(layout).length).toBeGreaterThan(0);
  layout.planning.obstacles![0].mobility='fixed';expect(obstacleSuggestions(layout,'a')).toEqual([]);
  layout.planning.obstacles![0].mobility='movable';expect(obstacleSuggestions(layout,'a').length).toBeGreaterThan(0);
});

it('round trips placement classifications and rejects unsupported classification values',()=>{
  const config=structuredClone(DEFAULT_CONFIG);config.planning={obstacles:[{id:'a',label:'Bench',x:20,y:10,width:12,depth:12,mobility:'movable'},{id:'b',label:'Column',x:50,y:0,width:12,depth:12}]};
  const restored=readBackup(serializeDesigns([{id:'a',name:'Room',savedAt:'2026-10-09',config}]))[0].config;
  expect(restored.planning).toEqual(config.planning);
  expect(invalidConfigurationField({...config,planning:{obstacles:[{...config.planning.obstacles![0],mobility:'automatic'}]}})).toBe('planning.obstacles[0].mobility: expected fixed, movable');
});

it('changes survey confirmation only when the furniture geometry actually changes',()=>{
  const config=structuredClone(DEFAULT_CONFIG);config.planning={obstacles:[{id:'a',label:'Bench',x:20,y:10,width:12,depth:12}]};config.surveyConfirmation=confirmSurvey(config);
  config.planning.obstacles![0].mobility='movable';expect(surveyState(config)).toBe('current');
  config.planning.obstacles![0].x=24;expect(surveyState(config)).toBe('stale');
});

it('retains the structural distinction in drawings and printed room schedules',()=>{
  const config=structuredClone(DEFAULT_CONFIG);config.closetType='walkin-single';config.roomDimensions={roomWidth:120,roomDepth:120};
  config.planning={obstacles:[{id:'a',label:'<Bench>',x:40,y:50,width:12,depth:12,mobility:'movable'},{id:'b',label:'Column',x:80,y:80,width:12,depth:12}]};
  const layout=new ClosetLayoutEngine(config).calculateLayout(),svg=renderFloorPlan(layout,{roomWidth:120,roomDepth:120,unitDepth:24});
  expect(svg).toContain('&lt;Bench&gt; · Movable furniture');expect(svg).toContain('Column · Fixed structural object');
  const print=buildPrintDocument([{layout,config,settings:{...DEFAULT_PRINT,roomSchedule:true}}]);
  expect(print).toContain('&lt;Bench&gt; (movable furniture)');expect(print).toContain('Column (fixed structure)');
});
