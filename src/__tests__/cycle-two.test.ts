import { it, expect, vi } from 'vitest';
import { doorAssessment, doorLocalRect, sectorDistance, obstacleSuggestions, ceilingWarnings, alternativeIssues } from '@/lib/roomGeometry';
import { DEFAULT_CONFIG } from '@/lib/design';
import { invalidConfigurationField, readBackup, validConfig } from '@/lib/storage';
import { defaultInterior, grid, cellSize, transformInterior, validInteriors } from '@/lib/drawers';
import { resizeCompartment, dividerLock } from '@/lib/drawerConstruction';
import { readShells, roomShell, serializeShells, shellMeasurements } from '@/lib/roomShells';
import { readHousehold, EMPTY_INVENTORY } from '@/lib/inventoryPlanning';
import { readTemplates, serializeTemplates, mutateTemplates } from '@/lib/organizerTemplates';
import { draftStatus, storageError, recoveryReport } from '@/lib/recovery';
import { libraryFilter, duplicateConfigurations } from '@/lib/libraryOrganization';
import { buildPrintDocument } from '@/engine/PDFExporter';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { DEFAULT_PRINT, configurationChanges, materialEstimateCSV, storedPrintSettings } from '@/lib/printSettings';
const drawer={width:24,depth:18,height:6,position:3,purpose:'folded'};
const record={id:'a',name:'Example',savedAt:'2026-09-29',config:DEFAULT_CONFIG};
it('generates malformed optional blocks and identifies them before import',()=>{
 for(const key of ['planning','inventoryPlanning','drawerInteriors','roomDimensions','zoneOverrides','amenities'])for(const value of [null,false,0,'',[],[{}]]){
  const config={...DEFAULT_CONFIG,[key]:value};expect(validConfig(config),`${key}: ${JSON.stringify(value)}`).toBe(false);expect(invalidConfigurationField(config)).toContain(key);expect(()=>readBackup(JSON.stringify({version:1,designs:[{...record,config}]}))).toThrow(key);
 }
});
it('reports exact member, cell, revision and metadata indexes',()=>{
 const member={id:'m',name:'Member',season:'everyday',inventory:structuredClone(EMPTY_INVENTORY)};member.inventory.wardrobe.shirts=-1;
 expect(invalidConfigurationField({...DEFAULT_CONFIG,inventoryPlanning:{members:[member]}})).toBe('inventoryPlanning.members[0].inventory.wardrobe.shirts');
 const plan=defaultInterior(drawer);plan.cells[0].quantity=-1;expect(invalidConfigurationField({...DEFAULT_CONFIG,drawerInteriors:{'back:0:0':plan}})).toContain('cells[0].quantity');
 for(const [patch,path]of [[{id:' '},'id'],[{name:' '},'name'],[{revisions:[{id:'r',savedAt:record.savedAt,config:{...DEFAULT_CONFIG,planning:false}}]},'revisions[0].config.planning']] as const)expect(()=>readBackup(JSON.stringify({version:1,designs:[{...record,...patch}]}))).toThrow(path);
});
it('validates room-shell records and canonicalizes only room fields',()=>{
 const shell={id:'room',name:'Study',shell:roomShell(DEFAULT_CONFIG)},raw=serializeShells([shell]);expect(readShells(raw)).toEqual([shell]);expect(JSON.stringify(shell.shell)).not.toContain('wardrobe');expect(shellMeasurements(shell.shell).get('Cabinet · width')).toMatch(/in$/);
 for(const id of ['', ' ', 'x'.repeat(101)])expect(()=>readShells(serializeShells([{...shell,id}]))).toThrow('id');expect(()=>readShells(serializeShells([shell,shell]))).toThrow('shells[1].id');
});
it('preserves selective household content and rejects invalid categories',()=>{
 const household={members:[{id:'m',name:'衣類 — Garderobe',season:'seasonal',inventory:EMPTY_INVENTORY}],notes:{long:'Measured'}};expect(readHousehold(JSON.stringify({version:1,household}))).toEqual(household);
 expect(()=>readHousehold(JSON.stringify({version:1,household:{members:[{...household.members[0],inventory:{}}]}}))).toThrow('members[0]');
});
it('resizes either adjacent cell using usable inches and respects named locks',()=>{
 const plan={...defaultInterior(drawer),cells:grid(1,2)},a=plan.cells[0].id,b=plan.cells[1].id;
 for(const [selected,neighbor]of [[a,b],[b,a]]){const next=resizeCompartment(plan,drawer,selected,neighbor,'x',7);expect(cellSize(next.cells.find(c=>c.id===selected)!,drawer,next).width).toBeCloseTo(7);expect(validInteriors({'back:0:0':next})).toBe(true);}
 const locked={...plan,lockedDividers:{x:[.5],y:[]},dividerNames:{'x:0.5':'Watch rail'}};expect(dividerLock(locked,a,b)).toBe('Watch rail');expect(resizeCompartment(locked,drawer,a,b,'x',7)).toEqual(locked);expect(transformInterior(locked,'rotate').dividerNames).toEqual({'y:0.5':'Watch rail'});
});
it('round trips template tags and five revisions without accepting a sixth',()=>{
 const template={id:'t',plan:defaultInterior(drawer),tags:['Travel'],revisions:Array.from({length:5},(_,i)=>({id:String(i),savedAt:record.savedAt,plan:defaultInterior(drawer)}))};expect(readTemplates(serializeTemplates([template]))[0].revisions).toHaveLength(5);expect(readTemplates(serializeTemplates([template]))[0].tags).toEqual(['Travel']);expect(()=>readTemplates(serializeTemplates([{...template,revisions:[...template.revisions,{...template.revisions[0],id:'six'}]}]))).toThrow('revisions');
});
it('separates parseable drafts from restorable drafts and classifies storage failures',()=>{
 expect(draftStatus(JSON.stringify({version:1,config:{}}))).toMatchObject({parseable:true,restorable:false});expect(draftStatus(JSON.stringify({version:1,config:DEFAULT_CONFIG}))).toMatchObject({parseable:true,restorable:true});expect(storageError({name:'QuotaExceededError'})).toContain('quota');expect(storageError({name:'SecurityError'})).toContain('denied');
 const values:Record<string,string>={'alveo-draft':'{}','alveo-room-shells':'broken','alveo-organizer-templates':'[]','alveo-preference':'x'},keys=Object.keys(values),report=recoveryReport({length:keys.length,key:i=>keys[i],getItem:k=>values[k]??null});expect(report.shells.readable).toBe(false);expect(report.templates.readable).toBe(true);expect(report.breakdown.preferences.keys).toBe(1);
});
it('filters unfiled designs and identifies equal configurations independently of names',()=>{
 const rows=[record,{...record,id:'b',folder:'Bedroom'}];expect(libraryFilter(rows,{folder:'',from:'',to:'',shortfalls:false,unfiled:true})).toEqual([record]);expect(duplicateConfigurations(rows)[0]).toHaveLength(2);
});
it('prints household totals, escaped notes, organizer differences, and CSV units',()=>{
 const plan=defaultInterior(drawer),config={...DEFAULT_CONFIG,inventoryPlanning:{members:[{id:'m',name:'<Alex>',season:'everyday' as const,inventory:EMPTY_INVENTORY}],reserve:{'wardrobe.shirts':25},notes:{long:'<measured>'}},drawerInteriors:{'back:0:0':plan}},layout=new ClosetLayoutEngine(config).calculateLayout();
 const html=buildPrintDocument([{config,layout,settings:{...DEFAULT_PRINT,household:true,reserveNotes:true,comparison:DEFAULT_CONFIG}}]);expect(html).toContain('Household and season totals');expect(html).toContain('&lt;Alex&gt;');expect(html).toContain('&lt;measured&gt;');expect(html).toContain('<thead>');expect(html).toContain('Season total');expect(configurationChanges(DEFAULT_CONFIG,config).some(r=>r[0]==='Organizer back:0:0')).toBe(true);expect(materialEstimateCSV(layout,config).split('\r\n')[0]).toContain('version=1');expect(materialEstimateCSV(layout,config)).toContain('length_unit=in');expect(storedPrintSettings(JSON.stringify({household:true,reserveNotes:true})).household).toBe(true);
});

it('uses both corridor depths and groups alternative-layout conflicts',()=>{
 const config={...DEFAULT_CONFIG,closetType:'corridor' as const,roomDimensions:{roomWidth:72,roomDepth:144},planning:{walls:{'corridor-a':{depth:18},'corridor-b':{depth:30,ceilingHeight:60}}}},layout=new ClosetLayoutEngine(config).calculateLayout();expect(layout.aisleWarnings.join(' ')).toContain('84');expect(layout.aisleWarnings.join(' ')).toContain('personal target');expect(ceilingWarnings(layout).length).toBeGreaterThan(0);expect(alternativeIssues(layout).map(([key])=>key)).toContain('ceiling');
});
it('reports separate obstacle clearance and screens suggested positions against the inward sweep',()=>{
 const layout=new ClosetLayoutEngine({...DEFAULT_CONFIG,closetType:'walkin-u',roomDimensions:{roomWidth:120,roomDepth:120}}).calculateLayout();layout.walls=[];layout.planning={door:{wall:'front',offset:0,width:30,hinge:'left',swing:'in',check:'sector'},obstacles:[{id:'a',label:'Column',x:118,y:118,width:12,depth:12}]};const assessment=doorAssessment(layout);expect(assessment.clearance).toBeNull();expect(assessment.obstacleClearance).not.toBeNull();expect(assessment.closestPair).toContain('Column');const positions=obstacleSuggestions(layout,'a');expect(positions.length).toBeGreaterThan(0);for(const pos of positions)expect(sectorDistance(doorLocalRect({...pos,width:12,depth:12},layout.planning.door!,{width:120,depth:120}),30)).toBeGreaterThan(0);
});

it('suggests a clear position when only the inward door sweep blocks an obstacle',()=>{
 const layout=new ClosetLayoutEngine(DEFAULT_CONFIG).calculateLayout();layout.walls=[];layout.roomDimensions={roomWidth:120,roomDepth:120};layout.planning={door:{wall:'front',offset:0,width:30,hinge:'left',swing:'in',check:'sector'},obstacles:[{id:'a',label:'Column',x:10,y:100,width:10,depth:10}]};expect(doorAssessment(layout).conflicts).toContain('Column');expect(obstacleSuggestions(layout,'a').length).toBeGreaterThan(0);
});

it('returns the same canonical template shape that subsequent locked reads compare',async()=>{
 let raw:string|null=null;vi.stubGlobal('navigator',{locks:{request:async(_key:string,work:()=>unknown)=>work()}});vi.stubGlobal('localStorage',{getItem:()=>raw,setItem:(_key:string,value:string)=>{raw=value;}});
 try{const saved=await mutateTemplates(()=>[{id:'t',plan:defaultInterior(drawer)}]);expect(JSON.stringify(saved)).toBe(JSON.stringify(readTemplates(raw)));}finally{vi.unstubAllGlobals();}
});
