import type { Compartment, DrawerInterior } from './drawers';
import { cellSize, innerSize, moveDivider, adjacentAxis } from './drawers';
import type { DrawerConfig } from '@/types/closet';
import { dividerEstimate } from './printSettings';

export function fitDetails(cell:Compartment,drawer:DrawerConfig,plan:DrawerInterior){
  if(!cell.item)return {failed:[] as string[],rotationHelps:false};
  const s=cellSize(cell,drawer,plan),i=cell.item,m=2*(plan.itemMargin??0),failed:string[]=[];
  if(i.width+m>s.width)failed.push('width');if(i.depth+m>s.depth)failed.push('depth');if(i.height+m>innerSize(drawer,plan).height)failed.push('height');
  return {failed,rotationHelps:failed.length>0&&i.depth+m<=s.width&&i.width+m<=s.depth&&i.height+m<=innerSize(drawer,plan).height};
}
const same=(a:number,b:number)=>Math.abs(a-b)<.00001;
export function dividerPositions(p:DrawerInterior,axis:'x'|'y'){
  return Array.from(new Set(p.cells.flatMap(c=>[c[axis],c[axis]+c[axis==='x'?'w':'h']]).filter(n=>n>.00001&&n<.99999).map(n=>+n.toFixed(5)))).sort((a,b)=>a-b);
}
/**
 * Item 009: distribute the selected dividers so the resulting compartments have equal usable
 * size, deducting the directional divider thickness once per compartment. Since the deduction
 * is uniform per compartment, equal usable sizes map to equal fractional spacing; passing the
 * physical span makes that guarantee explicit and testable.
 */
export function redistributeDividersEqualUsable(p:DrawerInterior,axis:'x'|'y',selected:number[],physical:number):DrawerInterior{
  const points=[0,...dividerPositions(p,axis),1],locked=p.lockedDividers?.[axis]??[],movable=(n:number)=>selected.some(v=>same(v,n))&&!locked.some(v=>same(v,n));
  const anchors=points.filter(n=>n===0||n===1||!movable(n)),mapping=new Map<number,number>();
  const thickness=(axis==='x'?p.dividerThickness?.vertical:p.dividerThickness?.horizontal)??p.thickness;
  for(let i=0;i<anchors.length-1;i++){
    const a=anchors[i],b=anchors[i+1],inside=points.filter(n=>n>a&&n<b);
    if(!inside.length)continue;
    const spanPx=(b-a)*physical,cells=inside.length+1,usable=(spanPx-cells*thickness)/cells,step=physical>0?(usable+thickness)/physical:(b-a)/cells;
    let position=a;inside.forEach(n=>{position+=step;mapping.set(n,position);});
  }
  const mapped=(n:number)=>mapping.get(+n.toFixed(5))??n,span=axis==='x'?'w':'h';
  return {...p,cells:p.cells.map(c=>({...c,[axis]:mapped(c[axis]),[span]:mapped(c[axis]+c[span])-mapped(c[axis])}))};
}
export function redistributeDividers(p:DrawerInterior,axis:'x'|'y',selected:number[]):DrawerInterior{
  return redistributeDividersEqualUsable(p,axis,selected,1);
}
/** Item 006: drop orphaned divider names and locks after geometry changes, keeping survivors. */
export function pruneOrphanDividers(p:DrawerInterior):DrawerInterior{
  if(!p.dividerNames&&!p.lockedDividers)return p;
  const sets={x:new Set(dividerPositions(p,'x')),y:new Set(dividerPositions(p,'y'))};
  let changed=false;const next={...p};
  if(p.dividerNames){
    const kept:Record<string,string>={};
    for(const [key,name]of Object.entries(p.dividerNames)){const [axis,raw]=key.split(':');if(sets[axis as 'x'|'y']?.has(+raw))kept[key]=name;else changed=true;}
    if(Object.keys(kept).length)next.dividerNames=kept;else delete next.dividerNames;
  }
  if(p.lockedDividers){
    const x=p.lockedDividers.x.filter(n=>sets.x.has(+n.toFixed(5))),y=p.lockedDividers.y.filter(n=>sets.y.has(+n.toFixed(5)));
    if(x.length!==p.lockedDividers.x.length||y.length!==p.lockedDividers.y.length)changed=true;
    if(x.length||y.length)next.lockedDividers={x,y};else delete next.lockedDividers;
  }
  return changed?next:p;
}
/** Item 008: usable-size range for the selected compartment across its shared divider. */
export function achievableUsable(plan:DrawerInterior,drawer:DrawerConfig,aId:string,bId:string,axis:'x'|'y'):{min:number;max:number;feasible:boolean}|null{
  const a=plan.cells.find(c=>c.id===aId),b=plan.cells.find(c=>c.id===bId);
  if(!a||!b||!adjacentAxis(plan,aId,bId))return null;
  const horizontal=same(a.y,b.y)&&same(a.h,b.h);if(horizontal!==(axis==='x'))return null;
  const physical=innerSize(drawer,plan)[axis==='x'?'width':'depth'];
  const thickness=(axis==='x'?plan.dividerThickness?.vertical:plan.dividerThickness?.horizontal)??plan.thickness;
  const span=axis==='x'?a.w+b.w:a.h+b.h,combined=span*physical-2*thickness,minimum=plan.minimumCellWidth??.01;
  if(combined<2*minimum)return {min:0,max:Math.max(0,combined),feasible:false};
  return {min:minimum,max:combined-minimum,feasible:true};
}
/** Item 003: point selection, multi-selection, merge neighbor and anchor at surviving compartments. */
export function reconcileSelection(cells:Compartment[],selected:string,multi:Set<string>,mergeWith:string,anchor:string|null){
  const ids=new Set(cells.map(c=>c.id)),fallback=cells[0]?.id??selected;
  return {selected:ids.has(selected)?selected:fallback,multi:new Set([...multi].filter(id=>ids.has(id))),mergeWith:ids.has(mergeWith)?mergeWith:'',anchor:anchor&&ids.has(anchor)?anchor:fallback};
}
/** Item 004: spread a populated arrangement's item total across replacement compartments. */
export function redistributeInventory(before:DrawerInterior,cells:Compartment[]):Compartment[]{
  const total=before.cells.reduce((n,c)=>n+c.quantity,0);
  if(total<=0||!cells.length)return cells;
  const base=Math.floor(total/cells.length),extra=total%cells.length;
  return cells.map((c,i)=>({...c,quantity:Math.min(999,base+(i<extra?1:0))}));
}
export function organizerWeight(plan:DrawerInterior,drawer:DrawerConfig):number|null{
  if(!plan.materialDensity)return null;
  const estimate=dividerEstimate(plan,drawer),height=innerSize(drawer,plan).height;
  const cubicInches=estimate.segments.reduce((n,s)=>n+s.length*height*(s.axis==='x'?(plan.dividerThickness?.vertical??plan.thickness):(plan.dividerThickness?.horizontal??plan.thickness)),0);
  return cubicInches*.000016387064*plan.materialDensity;
}
export function organizerChanges(before:DrawerInterior,after:DrawerInterior):string[]{
  const result:string[]=[];
  if(before.cells.length!==after.cells.length)result.push(`Compartments: ${before.cells.length} → ${after.cells.length}`);
  const added=after.cells.filter(c=>!before.cells.some(b=>b.id===c.id)).length,removed=before.cells.filter(c=>!after.cells.some(a=>a.id===c.id)).length;
  if(added||removed)result.push(`${added} compartments added; ${removed} removed`);
  const modified=after.cells.filter(c=>{const b=before.cells.find(v=>v.id===c.id);return b&&JSON.stringify(b)!==JSON.stringify(c);}).length;
  if(modified)result.push(`${modified} compartments changed`);
  for(const key of Array.from(new Set([...Object.keys(before),...Object.keys(after)])) as Array<keyof DrawerInterior>)if(key!=='cells'&&JSON.stringify(before[key])!==JSON.stringify(after[key]))result.push(`${key}: changed`);
  return result.length?result:['No unapplied changes'];
}
export function cellMetadata(c:Compartment){const {label,category,quantity,color,notes,item}=c;return {label,category,quantity,color,notes,item};}
export function rectangleSelection(cells:Compartment[],from:string,to:string):string[]{
  const a=cells.find(c=>c.id===from),b=cells.find(c=>c.id===to);if(!a||!b)return [];
  const x0=Math.min(a.x+a.w/2,b.x+b.w/2),x1=Math.max(a.x+a.w/2,b.x+b.w/2),y0=Math.min(a.y+a.h/2,b.y+b.h/2),y1=Math.max(a.y+a.h/2,b.y+b.h/2);
  return cells.filter(c=>c.x+c.w/2>=x0-.00001&&c.x+c.w/2<=x1+.00001&&c.y+c.h/2>=y0-.00001&&c.y+c.h/2<=y1+.00001).map(c=>c.id);
}

export function dividerLock(plan:DrawerInterior,aId:string,bId:string){
  const a=plan.cells.find(c=>c.id===aId),b=plan.cells.find(c=>c.id===bId);if(!a||!b||!adjacentAxis(plan,aId,bId))return null;
  const axis=Math.abs(a.y-b.y)<.00001&&Math.abs(a.h-b.h)<.00001?'x':'y',n=Math.max(a[axis],b[axis]);
  return plan.lockedDividers?.[axis].some(v=>Math.abs(v-n)<.00001)?(plan.dividerNames?.[`${axis}:${+n.toFixed(5)}`]||`${axis} divider at ${(n*100).toFixed(2)}%`):null;
}
export function resizeCompartment(plan:DrawerInterior,drawer:DrawerConfig,id:string,neighbor:string,axis:'x'|'y',usable:number){
  const a=plan.cells.find(c=>c.id===id),b=plan.cells.find(c=>c.id===neighbor);if(!a||!b||!adjacentAxis(plan,id,neighbor)||!Number.isFinite(usable)||usable<=0)return plan;
  const horizontal=Math.abs(a.y-b.y)<.00001&&Math.abs(a.h-b.h)<.00001;if(horizontal!==(axis==='x'))return plan;
  const span=axis==='x'?'w':'h',physical=innerSize(drawer,plan)[axis==='x'?'width':'depth'],thickness=axis==='x'?(plan.dividerThickness?.vertical??plan.thickness):(plan.dividerThickness?.horizontal??plan.thickness),fraction=(usable+thickness)/physical/(a[span]+b[span]);
  if(fraction<=0||fraction>=1)return plan;return moveDivider(plan,id,neighbor,a[axis]<b[axis]?fraction:1-fraction,0,drawer);
}
