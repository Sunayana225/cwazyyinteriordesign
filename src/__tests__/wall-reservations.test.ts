import {it,expect} from 'vitest';
import {wallReservations,wallStorageHeight} from '@/lib/wallReservations';
import {freeSpans} from '@/lib/planning';
import {ClosetLayoutEngine} from '@/engine/ClosetLayoutEngine';
import {DEFAULT_CONFIG} from '@/lib/design';
import {buildPrintDocument} from '@/engine/PDFExporter';
import {DEFAULT_PRINT} from '@/lib/printSettings';

it('clips and splits overlapping reservations while counting their union once',()=>{
  const window={kind:'window' as const,id:'w',label:'Bay window'},obstacle={kind:'obstacle' as const,id:'o',label:'Column'};
  const result=wallReservations(96,[{start:-4,end:24,source:window},{start:12,end:36,source:obstacle},{start:90,end:110,source:window},{start:120,end:130,source:obstacle}]);
  expect(result.map(r=>[r.start,r.end,r.sources.map(s=>s.id)])).toEqual([[0,12,['w']],[12,24,['w','o']],[24,36,['o']],[90,96,['w']]]);
  expect(result.reduce((n,r)=>n+r.end-r.start,0)).toBe(42);
  expect(freeSpans(96,result.map(r=>[r.start,r.end]))).toEqual([[36,90]]);
});

it('explains the exact intervals excluded from generated geometry and escapes exported labels',()=>{
  const config=structuredClone(DEFAULT_CONFIG);config.planning={windows:[{id:'w',wall:'back',offset:24,width:24,sill:30,height:24,label:'<img onerror=evil>'}],obstacles:[{id:'o',label:'Column',x:36,y:0,width:24,depth:12}]};
  const layout=new ClosetLayoutEngine(config).calculateLayout(),wall=layout.walls[0];
  expect(wall.reservations?.map(r=>[r.start,r.end,r.sources.length])).toEqual([[24,36,1],[36,48,2],[48,60,1]]);
  for(const zone of wall.zones)expect(zone.x+zone.width<=24||zone.x>=60).toBe(true);
  const print=buildPrintDocument([{config,layout,settings:{...DEFAULT_PRINT,roomSchedule:true}}]);
  expect(print).toContain('Reserved wall spans');expect(print).toContain('36.00–48.00');
  expect(print).toContain('&lt;img onerror=evil&gt;');expect(print).not.toContain('<img onerror=evil>');
});

it('uses side-wall local coordinates and excludes windows below a raised base',()=>{
  const config=structuredClone(DEFAULT_CONFIG);config.closetType='walkin-l';config.roomDimensions={roomWidth:144,roomDepth:120};
  config.planning={walls:{left:{floorOffset:12}},windows:[{id:'low',wall:'left',offset:0,width:24,sill:0,height:12}],obstacles:[{id:'column',label:'Side column',x:0,y:48,width:12,depth:12}]};
  const side=new ClosetLayoutEngine(config).calculateLayout().walls.find(w=>w.wallId==='left')!;
  expect(side.reservations?.map(r=>[r.start,r.end,r.sources.map(s=>s.id)])).toEqual([[24,36,['column']]]);
});

it('previews offsets against the actual constrained cabinet top and toe kick',()=>{
  const config=structuredClone(DEFAULT_CONFIG);config.dimensions={width:96,height:120,depth:24,cabinetHeight:84};config.planning={walls:{back:{ceilingHeight:72,floorOffset:4}}};
  const layout=new ClosetLayoutEngine(config).calculateLayout();
  expect(wallStorageHeight(layout,'back')).toBe(65);
  expect(wallStorageHeight(layout,'back',10)).toBe(59);
  expect(wallStorageHeight(layout,'left',10)).toBe(0);
  expect(wallStorageHeight(layout,'back',100)).toBe(0);
});
