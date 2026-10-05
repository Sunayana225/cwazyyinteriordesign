import type { ClosetConfiguration, ClosetLayout } from '@/types/closet';
import { drawerTargets, resolveOrganizers, innerSize } from './drawers';
import type { DrawerInterior } from './drawers';
import type { DrawerConfig } from '@/types/closet';
import { isWalkIn } from './design';
export interface PrintSettings {walls?:string[];organizers:boolean;notes:boolean;floorPlan:boolean;materials:boolean;project:string;contact:string;paper:'A4'|'Letter';orientation:'portrait'|'landscape';editableJSON:boolean;roomSchedule?:boolean;materialsCSV?:boolean;household?:boolean;reserveNotes?:boolean;comparison?:Partial<ClosetConfiguration>;comparisonName?:string;}
export const DEFAULT_PRINT:PrintSettings={organizers:true,notes:true,floorPlan:true,materials:false,project:'',contact:'',paper:'A4',orientation:'portrait',editableJSON:false,roomSchedule:false,materialsCSV:false,household:false,reserveNotes:false};
export function printSections(layout:ClosetLayout,config:Partial<ClosetConfiguration>,s:PrintSettings):string[]{
  const sections=['Design specifications, inventory and capacity'];
  if(s.floorPlan&&isWalkIn(layout.closetType))sections.push('Floor plan');
  for(const w of layout.walls)if(!s.walls||s.walls.includes(w.wallId))sections.push(w.label+' elevation');
  if(s.organizers){const targets=drawerTargets(layout),plans=resolveOrganizers(config.drawerInteriors??{},targets);for(const t of targets)if(plans[t.id])sections.push(plans[t.id].name+' organizer plan',plans[t.id].name+' compartment schedule');}
  if(s.materials)sections.push('Estimated organizer materials');
  if(s.roomSchedule)sections.push('Room openings and obstacle schedule');
  if(s.household)sections.push('Household and season totals');
  if(s.reserveNotes)sections.push('Reserve percentages and inventory notes');
  if(s.comparison)sections.push('Changes from '+(s.comparisonName??'reference design'));
  return sections;
}
export function storedPrintSettings(raw:string|null):PrintSettings{
  if(!raw)return {...DEFAULT_PRINT};const value=JSON.parse(raw);
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid print preferences');
  const result={...DEFAULT_PRINT};
  for(const key of ['organizers','notes','floorPlan','materials','editableJSON','roomSchedule','materialsCSV','household','reserveNotes'] as const)if(typeof value[key]==='boolean')result[key]=value[key];
  if(value.paper==='A4'||value.paper==='Letter')result.paper=value.paper;
  if(value.orientation==='portrait'||value.orientation==='landscape')result.orientation=value.orientation;
  if(typeof value.project==='string')result.project=value.project.slice(0,120);if(typeof value.contact==='string')result.contact=value.contact.slice(0,200);
  return result;
}
export function configurationChanges(before:Partial<ClosetConfiguration>,after:Partial<ClosetConfiguration>){
  const rows:Array<[string,string,string]>=[];
  for(const key of ['closetType','dimensions','roomDimensions','wardrobe','shoes','planning','inventoryPlanning'] as const){
    const a=before[key],b=after[key];if(JSON.stringify(a)===JSON.stringify(b))continue;
    if(a&&b&&typeof a==='object'&&typeof b==='object')for(const field of new Set([...Object.keys(a),...Object.keys(b)])){const av=(a as Record<string,unknown>)[field],bv=(b as Record<string,unknown>)[field];if(JSON.stringify(av)!==JSON.stringify(bv))rows.push([`${key}.${field}`,JSON.stringify(av)??'None',JSON.stringify(bv)??'None']);}
    else rows.push([key,JSON.stringify(a)??'None',JSON.stringify(b)??'None']);
  }
  for(const id of new Set([...Object.keys(before.drawerInteriors??{}),...Object.keys(after.drawerInteriors??{})])){
    const a=before.drawerInteriors?.[id],b=after.drawerInteriors?.[id];if(JSON.stringify(a)===JSON.stringify(b))continue;
    const summary=(p:DrawerInterior|undefined)=>p?`${p.name}: ${p.cells.length} compartments; ${p.cells.reduce((n,c)=>n+c.quantity,0)} planned items; ${p.material}; ${p.thickness} in dividers`:'No organizer';
    rows.push([`Organizer ${id}`,summary(a),summary(b)]);
    for(const field of new Set([...Object.keys(a??{}),...Object.keys(b??{})])){if(field==='cells')continue;const av=a?.[field as keyof DrawerInterior],bv=b?.[field as keyof DrawerInterior];if(JSON.stringify(av)!==JSON.stringify(bv))rows.push([`Organizer ${id} · ${field}`,typeof av==='string'?av:JSON.stringify(av)??'None',typeof bv==='string'?bv:JSON.stringify(bv)??'None']);}
    for(const cell of new Set([...(a?.cells.map(c=>c.id)??[]),...(b?.cells.map(c=>c.id)??[])])){const ac=a?.cells.find(c=>c.id===cell),bc=b?.cells.find(c=>c.id===cell);if(JSON.stringify(ac)!==JSON.stringify(bc)){const describe=(c:typeof ac)=>c?`${c.label}: ${c.category}, ${c.quantity} items; position ${c.x.toFixed(3)}, ${c.y.toFixed(3)}; size ${c.w.toFixed(3)} × ${c.h.toFixed(3)} (fraction of interior)`:'None';rows.push([`Compartment ${cell}`,describe(ac),describe(bc)]);for(const field of ['notes','color','item'] as const){if(JSON.stringify(ac?.[field])!==JSON.stringify(bc?.[field]))rows.push([`Compartment ${cell} · ${field}`,JSON.stringify(ac?.[field])??'None',JSON.stringify(bc?.[field])??'None']);}}}
  }
  return rows;
}
const csv=(v:string)=>'"'+(/^[=+\-@\t\r]/.test(v)?"'":'')+v.replace(/"/g,'""')+'"';
export function materialEstimateCSV(layout:ClosetLayout,config:Partial<ClosetConfiguration>){
  const targets=drawerTargets(layout),plans=resolveOrganizers(config.drawerInteriors??{},targets),rows=[['alveo_material_estimate','version=1','length_unit=in','area_unit=sq_ft'],['drawer_id','organizer','material','horizontal_thickness_in','vertical_thickness_in','divider_length_in','liner_area_sq_ft','basis']];
  for(const t of targets){const p=plans[t.id];if(!p)continue;const e=dividerEstimate(p,t.drawer);rows.push([t.id,p.name,p.material,String(p.dividerThickness?.horizontal??p.thickness),String(p.dividerThickness?.vertical??p.thickness),e.totalLength.toFixed(2),e.linerArea.toFixed(2),'Estimate only; excludes joints, kerf, waste and hardware']);}
  return rows.map(row=>row.map(csv).join(',')).join('\r\n');
}
export function organizerPageWarnings(config:Partial<ClosetConfiguration>,settings:PrintSettings){
  if(!settings.organizers)return [];
  const linesPerPage=settings.orientation==='landscape'?30:48;
  return Object.values(config.drawerInteriors??{}).filter(p=>p.cells.reduce((n,c)=>n+Math.max(1,Math.ceil((c.label.length+c.category.length+(settings.notes?(c.notes?.length??0):0)+30)/55)),0)>linesPerPage).map(p=>`${p.name}: long compartment legend/schedule may continue onto multiple pages. Review the page-break preview.`);
}
export function dividerEstimate(p:DrawerInterior,d:DrawerConfig){
  const size=innerSize(d,p),lines=new Map<string,{axis:string;position:number;spans:Array<[number,number]>}>();
  for(const c of p.cells)for(const [axis,position,start,end]of [['x',c.x,c.y,c.y+c.h],['x',c.x+c.w,c.y,c.y+c.h],['y',c.y,c.x,c.x+c.w],['y',c.y+c.h,c.x,c.x+c.w]] as const){
    if(position<.00001||position>1-.00001)continue;const key=axis+position.toFixed(5),line=lines.get(key)??{axis,position,spans:[]};line.spans.push([start,end]);lines.set(key,line);
  }
  const segments:Array<{axis:string;position:number;length:number}>=[];
  for(const line of lines.values()){let start=-1,end=-1;for(const [a,b]of line.spans.sort((a,b)=>a[0]-b[0])){if(a>end+.00001){if(end>=0)segments.push({axis:line.axis,position:line.position,length:(end-start)*(line.axis==='x'?size.depth:size.width)});start=a;end=b;}else end=Math.max(end,b);}if(end>=0)segments.push({axis:line.axis,position:line.position,length:(end-start)*(line.axis==='x'?size.depth:size.width)});}
  return {segments,totalLength:segments.reduce((n,s)=>n+s.length,0),linerArea:size.width*size.depth/144};
}
