import { GENERATOR_CAPABILITIES, MEASUREMENT_MINIMUMS } from './measurementPolicy';
import type { ClosetLayout, ClosetWall, PlanningOptions } from '@/types/closet';
export const WALL_IDS:ClosetWall['wallId'][]=['back','left','right','corridor-a','corridor-b','island-unit'];
export const MAX_DIMENSION=GENERATOR_CAPABILITIES.roomSpan,MAX_HEIGHT=GENERATOR_CAPABILITIES.ceilingHeight,MAX_CABINET_DEPTH=GENERATOR_CAPABILITIES.cabinetDepth,MAX_INVENTORY=10000;
const num=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export function planningIssues(value:unknown):string[] {
  if(value===undefined)return [];
  if(!record(value))return ['planning: expected an object'];
  const errors:string[]=[];
  if(value.upperStorage!==undefined&&typeof value.upperStorage!=='boolean')errors.push('planning.upperStorage: expected a boolean');
  const number=(o:Record<string,unknown>,key:string,min:number,max:number,path:string,optional=false)=>{if(!(optional&&o[key]===undefined)&&!num(o[key],min,max))errors.push(`${path}.${key}: expected a number from ${min} to ${max}`);};
  const choice=(o:Record<string,unknown>,key:string,values:readonly string[],path:string,optional=false)=>{if(!(optional&&o[key]===undefined)&&!values.includes(o[key] as string))errors.push(`${path}.${key}: expected ${values.join(', ')}`);};
  number(value,'accessoryShelfOpening',8,36,'planning',true);
  for(const key of ['supportSpan','clearanceTarget'])number(value,key,key==='supportSpan'?12:18,key==='supportSpan'?48:72,'planning',true);
  for(const key of ['garmentLengths','shoeHeights','walls','door']){
    const block=value[key];if(block===undefined)continue;const path=`planning.${key}`;
    if(!record(block)){errors.push(`${path}: expected an object`);continue;}
    if(key==='garmentLengths'){number(block,'long',24,100,path);number(block,'short',12,60,path);}
    if(key==='shoeHeights')for(const field of ['boots','heels','sneakers','flats'])number(block,field,2,36,path);
    if(key==='door'){choice(block,'wall',['front','back','left','right'],path);choice(block,'hinge',['left','right'],path);choice(block,'swing',['in','out'],path);choice(block,'check',['envelope','sector'],path,true);number(block,'offset',0,MAX_DIMENSION,path);number(block,'width',18,72,path);}
    if(key==='walls')for(const [id,wall]of Object.entries(block)){
      if(!WALL_IDS.includes(id as ClosetWall['wallId'])||!record(wall)){errors.push(`${path}.${id}: expected a supported wall object`);continue;}
      number(wall,'depth',MEASUREMENT_MINIMUMS.depth,MAX_CABINET_DEPTH,`${path}.${id}`,true);number(wall,'ceilingHeight',MEASUREMENT_MINIMUMS.height,MAX_HEIGHT,`${path}.${id}`,true);number(wall,'baseboard',0,6,`${path}.${id}`,true);number(wall,'floorOffset',0,12,`${path}.${id}`,true);
      choice(wall,'priority',['default','hanging','shoes','folded','accessories'],`${path}.${id}`,true);
    }
  }
  for(const key of ['windows','obstacles']){
    const list=value[key];if(list===undefined)continue;
    if(!Array.isArray(list)||list.length>20){errors.push(`planning.${key}: expected up to 20 objects`);continue;}
    const ids=new Set<string>();
    list.forEach((entry,index)=>{
      const path=`planning.${key}[${index}]`;
      if(!record(entry)){errors.push(`${path}: expected an object`);return;}
      if(typeof entry.id!=='string'||!entry.id.trim()||entry.id.length>80||ids.has(entry.id))errors.push(`${path}.id: expected a nonblank unique ID of at most 80 characters`);
      if(typeof entry.id==='string')ids.add(entry.id);
      if((key==='obstacles'||entry.label!==undefined)&&(typeof entry.label!=='string'||entry.label.length>80))errors.push(`${path}.label: expected text of at most 80 characters`);
      if(key==='windows'){
        choice(entry,'wall',WALL_IDS.filter(id=>id!=='island-unit'),path);number(entry,'offset',0,MAX_DIMENSION,path);number(entry,'width',1,MAX_DIMENSION,path);number(entry,'sill',0,MAX_HEIGHT,path);number(entry,'height',1,MAX_HEIGHT,path);
      }else{number(entry,'x',0,MAX_DIMENSION,path);number(entry,'y',0,MAX_DIMENSION,path);number(entry,'width',1,MAX_DIMENSION,path);number(entry,'depth',1,MAX_DIMENSION,path);choice(entry,'mobility',['fixed','movable'],path,true);}
    });
  }
  return errors;
}
export function validPlanning(value:unknown):value is PlanningOptions|undefined {return planningIssues(value).length===0;}
export interface Footprint {x:number;y:number;width:number;depth:number;wallId:ClosetWall['wallId'];}
export function wallFootprint(w:ClosetWall,layout:Pick<ClosetLayout,'roomDimensions'|'dimensions'|'walls'>):Footprint {
  const rw=layout.roomDimensions?.roomWidth??layout.dimensions.width,rd=layout.roomDimensions?.roomDepth??rw*.75;
  const back=layout.walls.find(v=>v.wallId==='back')?.unitDepth??0;
  switch(w.wallId){
    case 'left':return{x:0,y:back,width:w.unitDepth,depth:w.width,wallId:w.wallId};
    case 'right':return{x:rw-w.unitDepth,y:back,width:w.unitDepth,depth:w.width,wallId:w.wallId};
    case 'corridor-a':return{x:0,y:0,width:w.unitDepth,depth:w.width,wallId:w.wallId};
    case 'corridor-b':return{x:rw-w.unitDepth,y:0,width:w.unitDepth,depth:w.width,wallId:w.wallId};
    case 'island-unit':return{x:(rw-w.width)/2,y:back+(rd-back-w.unitDepth)/2,width:w.width,depth:w.unitDepth,wallId:w.wallId};
    default:return{x:0,y:0,width:w.width,depth:w.unitDepth,wallId:w.wallId};
  }
}
export const overlaps=(a:{x:number;y:number;width:number;depth:number},b:{x:number;y:number;width:number;depth:number})=>a.x<b.width+b.x&&a.x+a.width>b.x&&a.y<b.y+b.depth&&a.y+a.depth>b.y;
export function storageFootprints(layout:ClosetLayout){
  return layout.walls.flatMap(w=>{const box=wallFootprint(w,layout),vertical=['left','right','corridor-a','corridor-b'].includes(w.wallId);return w.zones.map(z=>({...box,...(vertical?{y:box.y+z.x,depth:z.width}:{x:box.x+z.x,width:z.width}),label:w.label}));});
}
export function storageObstacleConflicts(layout:ClosetLayout):string[]{
  const storage=storageFootprints(layout);
  return (layout.planning?.obstacles??[]).filter(o=>storage.some(b=>overlaps(b,o))).map(o=>o.label);
}
export function freeSpans(width:number,excluded:Array<[number,number]>):Array<[number,number]>{
  const spans=excluded.map(([a,b])=>[Math.max(0,a),Math.min(width,b)] as [number,number]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
  const free:Array<[number,number]>=[];let end=0;
  for(const [a,b]of spans){if(a>end)free.push([end,a]);end=Math.max(end,b);}if(end<width)free.push([end,width]);return free;
}
export function canonicalPlanning(p:PlanningOptions):PlanningOptions{
  const next:PlanningOptions={};
  if(p.upperStorage!==undefined)next.upperStorage=p.upperStorage;
  if(p.garmentLengths)next.garmentLengths={long:p.garmentLengths.long,short:p.garmentLengths.short};
  if(p.shoeHeights)next.shoeHeights={boots:p.shoeHeights.boots,heels:p.shoeHeights.heels,sneakers:p.shoeHeights.sneakers,flats:p.shoeHeights.flats};
  if(p.accessoryShelfOpening!==undefined)next.accessoryShelfOpening=p.accessoryShelfOpening;
  if(p.supportSpan!==undefined)next.supportSpan=p.supportSpan;
  if(p.clearanceTarget!==undefined)next.clearanceTarget=p.clearanceTarget;
  if(p.walls)next.walls=Object.fromEntries(Object.entries(p.walls).map(([id,v])=>[id,{depth:v?.depth,priority:v?.priority,ceilingHeight:v?.ceilingHeight,baseboard:v?.baseboard,floorOffset:v?.floorOffset}]));
  if(p.door){const {wall,offset,width,hinge,swing,check}=p.door;next.door={wall,offset,width,hinge,swing,check};}
  if(p.windows)next.windows=p.windows.map(({id,label,wall,offset,width,sill,height})=>({id,label,wall,offset,width,sill,height}));
  if(p.obstacles)next.obstacles=p.obstacles.map(({id,label,x,y,width,depth,mobility})=>({id,label,x,y,width,depth,...(mobility?{mobility}:{})}));
  return next;
}
