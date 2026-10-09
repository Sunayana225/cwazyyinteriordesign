import type { ClosetLayout, PlanningOptions } from '@/types/closet';
import { overlaps, wallFootprint, storageFootprints, storageObstacleConflicts } from './planning';

export interface Rect {x:number;y:number;width:number;depth:number;}
export const roomSize=(layout:ClosetLayout)=>({width:layout.roomDimensions?.roomWidth??layout.dimensions.width,depth:layout.roomDimensions?.roomDepth??layout.dimensions.depth});
export interface RoomIssue {kind:'window'|'obstacle';id:string;field:string;message:string;}
export function roomIssues(layout:ClosetLayout):RoomIssue[]{
  const issues:RoomIssue[]=[],p=layout.planning??{},room=roomSize(layout);
  (p.windows??[]).forEach((w,i)=>{
    const wall=layout.walls.find(v=>v.wallId===w.wall),title=`Window ${i+1}${w.label?` (${w.label})`:''}`;
    const add=(field:string,message:string)=>issues.push({kind:'window',id:w.id,field,message:`${title}: ${message}`});
    if(!wall)add('wall','the selected wall is not present in this layout.');
    else if(w.offset+w.width>wall.width)add('width',`extends ${(w.offset+w.width-wall.width).toFixed(2)} in beyond the wall.`);
    const ceiling=p.walls?.[w.wall]?.ceilingHeight??layout.dimensions.height;
    if(w.sill+w.height>ceiling)add('height',`extends ${(w.sill+w.height-ceiling).toFixed(2)} in above the ceiling.`);
    (p.windows??[]).slice(0,i).forEach((other,j)=>{if(other.wall===w.wall&&w.offset<other.offset+other.width&&w.offset+w.width>other.offset){add('offset',`wall reservation overlaps Window ${j+1}. Both measurements are retained.`);issues.push({kind:'window',id:other.id,field:'offset',message:`Window ${j+1}: wall reservation overlaps ${title}. Both measurements are retained.`});}});
  });
  (p.obstacles??[]).forEach((o,i)=>{
    if(o.x<0||o.y<0||o.x+o.width>room.width||o.y+o.depth>room.depth)issues.push({kind:'obstacle',id:o.id,field:'position',message:`Obstacle ${i+1} (${o.label}): extends outside the ${room.width} × ${room.depth} in room.`});
    (p.obstacles??[]).slice(0,i).forEach((other,j)=>{if(overlaps(o,other))for(const id of [o.id,other.id])issues.push({kind:'obstacle',id,field:'position',message:`Obstacle ${i+1} (${o.label}) overlaps Obstacle ${j+1} (${other.label}).`});});
  });
  return issues;
}
type Door=NonNullable<PlanningOptions['door']>;
/** Same clockwise wall origins as the floor-plan door drawing. */
export function doorTransform(door:Door,room:{width:number;depth:number}){
  return door.wall==='front'?`translate(0 ${room.depth})`:door.wall==='back'?`translate(${room.width} 0) rotate(180)`:door.wall==='left'?'rotate(90)':`translate(${room.width} ${room.depth}) rotate(-90)`;
}
export function doorLocalRect(rect:Rect,door:Door,room:{width:number;depth:number}):Rect{
  const point=(x:number,y:number)=>{
    const [s,t]=door.wall==='front'?[x,room.depth-y]:door.wall==='back'?[room.width-x,y]:door.wall==='left'?[y,x]:[room.depth-y,room.width-x];
    return {x:(s-door.offset-(door.hinge==='right'?door.width:0))*(door.hinge==='right'?-1:1),y:t*(door.swing==='out'?-1:1)};
  };
  const a=point(rect.x,rect.y),b=point(rect.x+rect.width,rect.y+rect.depth);
  return{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(a.x-b.x),depth:Math.abs(a.y-b.y)};
}
function gap(a:Rect,b:Rect){return Math.hypot(Math.max(0,a.x-b.x-b.width,b.x-a.x-a.width),Math.max(0,a.y-b.y-b.depth,b.y-a.y-a.depth));}
/** Exact distance to a quarter disk: the radial arc and its two straight edges. */
export function sectorDistance(rect:Rect,radius:number):number{
  const lines=Math.min(gap(rect,{x:0,y:0,width:radius,depth:0}),gap(rect,{x:0,y:0,width:0,depth:radius}));
  if(rect.x+rect.width<0||rect.y+rect.depth<0)return lines;
  return Math.min(lines,Math.max(0,Math.hypot(Math.max(0,rect.x),Math.max(0,rect.y))-radius));
}
/** One clearance predicate for both diagnostics and proposed object positions. */
export function doorDistance(rect:Rect,door:Door,room:{width:number;depth:number}):number{
  const local=doorLocalRect(rect,door,room);
  return door.check==='sector'?sectorDistance(local,door.width):gap(local,{x:0,y:0,width:door.width,depth:door.width});
}
function doorEnvelope(door:Door,room:{width:number;depth:number}):Rect{
  const point=(x:number,y:number)=>{
    const s=door.offset+(door.hinge==='right'?door.width-x:x),t=y*(door.swing==='out'?-1:1);
    return door.wall==='front'?{x:s,y:room.depth-t}:door.wall==='back'?{x:room.width-s,y:t}:door.wall==='left'?{x:t,y:s}:{x:room.width-t,y:room.depth-s};
  };
  const a=point(0,0),b=point(door.width,door.width);
  return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(a.x-b.x),depth:Math.abs(a.y-b.y)};
}
export function doorAssessment(layout:ClosetLayout){
  const door=layout.planning?.door,room=roomSize(layout);
  if(!door)return {conflicts:[] as string[],clearance:null as number|null,obstacleClearance:null as number|null,closestPair:null as string|null,outside:false};
  const distance=(r:Rect)=>doorDistance(r,door,room);
  const storage=storageFootprints(layout),objects=[...storage,...(layout.planning?.obstacles??[]).map(o=>({...o,label:o.label||'Unnamed obstacle'}))];
  const closest=objects.map(o=>({label:o.label,distance:distance(o)})).sort((a,b)=>a.distance-b.distance)[0],obstacles=layout.planning?.obstacles??[];
  return {obstacleClearance:obstacles.length?Math.min(...obstacles.map(distance)):null,closestPair:closest?`Door and ${closest.label} (${closest.distance.toFixed(2)} in)`:null,conflicts:Array.from(new Set(objects.filter(o=>distance(o)<=.00001).map(o=>o.label))),clearance:storage.length?Math.min(...storage.map(distance)):null,outside:door.offset+door.width>(['front','back'].includes(door.wall)?room.width:room.depth)};
}
export function circulation(layout:ClosetLayout){
  const room=roomSize(layout),boxes=layout.walls.filter(w=>w.zones.length).map(w=>wallFootprint(w,layout));
  const depth=(...ids:string[])=>Math.max(0,...boxes.filter(b=>ids.includes(b.wallId)).map(b=>b.wallId==='back'?b.depth:b.width));
  const left=depth('left','corridor-a'),right=depth('right','corridor-b'),back=depth('back'),island=boxes.find(b=>b.wallId==='island-unit');
  const aisles=island?[{name:'Left of island',width:island.x-left},{name:'Right of island',width:room.width-right-island.x-island.width},{name:'Behind island',width:island.y-back},{name:'In front of island',width:room.depth-island.y-island.depth}]:[{name:'Between side storage',width:room.width-left-right},{name:'In front of back storage',width:room.depth-back}];
  return {aisles,narrowest:aisles.reduce((a,b)=>a.width<=b.width?a:b)};
}
export function islandRequirement(layout:ClosetLayout){
  const d=(id:Parameters<typeof wallFootprint>[0]['wallId'])=>layout.planning?.walls?.[id]?.depth??layout.dimensions.depth,target=layout.planning?.clearanceTarget??36;
  return {width:2*Math.max(d('left'),d('right'))+36+2*target,depth:d('back')+d('island-unit')+2*target,target};
}
export function obstacleSuggestions(layout:ClosetLayout,id:string):Array<{x:number;y:number}>{
  const o=layout.planning?.obstacles?.find(v=>v.id===id);if(!o||o.mobility!=='movable')return [];
  const room=roomSize(layout),blocked=[...storageFootprints(layout),...(layout.planning?.obstacles??[]).filter(v=>v.id!==id)];
  const door=layout.planning?.door;
  const clear=(r:Rect)=>r.x>=0&&r.y>=0&&r.x+r.width<=room.width&&r.y+r.depth<=room.depth&&!blocked.some(b=>overlaps(r,b))&&(!door||doorDistance(r,door,room)>.00001);
  if(clear(o))return [];
  const envelope=door?doorEnvelope(door,room):null;
  // Stand off the door boundary by one input increment: touching its sweep is a conflict.
  const xs=Array.from(new Set([0,o.x,room.width-o.width,...blocked.flatMap(b=>[b.x-o.width,b.x+b.width]),...(envelope?[envelope.x-o.width-.125,envelope.x+envelope.width+.125]:[])]));
  const ys=Array.from(new Set([0,o.y,room.depth-o.depth,...blocked.flatMap(b=>[b.y-o.depth,b.y+b.depth]),...(envelope?[envelope.y-o.depth-.125,envelope.y+envelope.depth+.125]:[])]));
  return xs.flatMap(x=>ys.map(y=>({x,y}))).filter(p=>clear({...o,...p})).sort((a,b)=>Math.hypot(a.x-o.x,a.y-o.y)-Math.hypot(b.x-o.x,b.y-o.y)).slice(0,3);
}

export function ceilingWarnings(layout:ClosetLayout){return layout.walls.flatMap(w=>{const ceiling=layout.planning?.walls?.[w.wallId]?.ceilingHeight;if(ceiling===undefined)return [];const top=Math.max(0,...w.zones.map(z=>z.y+z.height));return top>ceiling?[`${w.label}: generated storage reaches ${top.toFixed(2)} in, ${(top-ceiling).toFixed(2)} in above the measured ceiling note.`]:[];});}
export function alternativeIssues(layout:ClosetLayout){
  const door=doorAssessment(layout),groups:Record<string,string[]>={aisles:layout.aisleWarnings,storage:storageObstacleConflicts(layout),door:[...door.conflicts,...(door.outside?['Opening extends beyond wall']:[])],room:roomIssues(layout).map(v=>v.message),ceiling:ceilingWarnings(layout)};return Object.entries(groups).filter(([,messages])=>messages.length);
}

