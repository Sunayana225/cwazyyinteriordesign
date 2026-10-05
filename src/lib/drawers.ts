import type { ClosetLayout, DrawerConfig } from '@/types/closet';
import { escapeHTML } from './design';

export interface Compartment { id: string; x: number; y: number; w: number; h: number; label: string; category: string; quantity: number; color: string; notes?:string;item?:{width:number;depth:number;height:number;rotate:boolean}; }
export interface DrawerInterior {
  version: 1; name: string; notes: string; material: string; liner: string; thickness: number; clearance: number;
  source: { width: number; depth: number; height: number }; cells: Compartment[];
  measured?:{width:number;depth:number;height:number};identity?:string;
  dividerThickness?:{horizontal:number;vertical:number};
  itemMargin?:number;minimumCellWidth?:number;materialDensity?:number;
  lockedDividers?:{x:number[];y:number[]};
  dividerNames?:Record<string,string>;
}
export interface DrawerTarget { id: string; label: string; drawer: DrawerConfig; identity?:string; }
export const CATEGORIES = ['General', 'Socks', 'Underwear', 'Jewelry', 'Watches', 'Ties', 'Belts', 'Folded clothes', 'Tech'];
export const MATERIALS = ['Bamboo', 'Oak', 'Acrylic', 'Felt'];
export const LINERS = ['None', 'Linen', 'Velvet', 'Cork'];
export const PRESETS = [
  { name:'Open tray', rows:1,cols:1,category:'General' },
  { name:'Socks',rows:3,cols:4,category:'Socks' },
  { name:'Jewelry',rows:3,cols:3,category:'Jewelry' },
  { name:'Watches',rows:2,cols:4,category:'Watches' },
  { name:'Ties',rows:1,cols:5,category:'Ties' },
  { name:'Belts',rows:2,cols:3,category:'Belts' },
  { name:'Folded clothes',rows:1,cols:2,category:'Folded clothes' },
  { name:'Tech',rows:2,cols:2,category:'Tech' },
  { name:'Underwear',rows:2,cols:4,category:'Underwear' },
];
export function drawerKey(wall: string, zone: number, index: number) { return `${wall}:${zone}:${index}`; }
export function drawerTargets(layout: ClosetLayout): DrawerTarget[] {
  return layout.walls.flatMap(w=>w.zones.flatMap((z,zi)=>(z.drawers??[]).map((drawer,di)=>({id:drawerKey(w.wallId,zi,di),identity:`${w.wallId}/${z.type}/${z.x}/${drawer.purpose}/${di}`,label:`${w.label} · drawer ${di+1} (${drawer.purpose})`,drawer}))));
}
export function grid(rows:number, cols:number, category='General'): Compartment[] {
  if (!Number.isInteger(rows)||!Number.isInteger(cols)||rows<1||cols<1||rows>6||cols>6) throw new Error('Choose 1–6 rows and columns.');
  return Array.from({length:rows*cols},(_,i)=>({id:`cell-${i}`,x:(i%cols)/cols,y:Math.floor(i/cols)/rows,w:1/cols,h:1/rows,label:`${category} ${i+1}`,category,quantity:0,color:'#e9dfcf'}));
}
export function defaultInterior(d:DrawerConfig): DrawerInterior {
  return {version:1,name:'Drawer organizer',notes:'',material:'Bamboo',liner:'None',thickness:.25,clearance:.75,source:{width:d.width,depth:d.depth,height:d.height},cells:grid(1,1)};
}
export function innerSize(d:DrawerConfig, p:DrawerInterior) { return p.measured??{width:Math.max(.1,d.width-2*p.clearance),depth:Math.max(.1,d.depth-2*p.clearance),height:Math.max(.1,d.height-1)}; }
export function cellSize(c:Compartment,d:DrawerConfig,p:DrawerInterior) { const s=innerSize(d,p); return {width:Math.max(0,c.w*s.width-(p.dividerThickness?.vertical??p.thickness)),depth:Math.max(0,c.h*s.depth-(p.dividerThickness?.horizontal??p.thickness))}; }
export function splitCell(p:DrawerInterior,id:string,axis:'x'|'y',ratio:number,allocateItems=false): DrawerInterior {
  if(p.cells.length>=36||!Number.isFinite(ratio)||ratio<.15||ratio>.85) return p;
  const c=p.cells.find(c=>c.id===id); if(!c) return p;
  const span=axis==='x'?c.w:c.h;
  if(span*ratio<.00001||span*(1-ratio)<.00001)return p;
  // Item 005: optionally allocate the compartment's items proportionally to the split,
  // preserving the planned total. Default keeps the previous behaviour (remainder is empty).
  const ratioQty=allocateItems?Math.round(c.quantity*ratio):c.quantity;
  const a={...c,quantity:ratioQty}, b={...c,id:crypto.randomUUID(),label:(c.label+' B').slice(0,60),quantity:c.quantity-ratioQty};
  if(axis==='x'){a.w=c.w*ratio;b.x=c.x+a.w;b.w=c.w-a.w;}else{a.h=c.h*ratio;b.y=c.y+a.h;b.h=c.h-a.h;}
  return {...p,cells:p.cells.flatMap(v=>v.id===id?[a,b]:[v])};
}
const close=(a:number,b:number)=>Math.abs(a-b)<.00001;
/** Geometry eligibility is independent of inventory and divider locks. */
export function adjacentAxis(p:DrawerInterior,aId:string,bId:string):'x'|'y'|null {
  const a=p.cells.find(c=>c.id===aId),b=p.cells.find(c=>c.id===bId);if(!a||!b||a===b)return null;
  if(close(a.y,b.y)&&close(a.h,b.h)&&(close(a.x+a.w,b.x)||close(b.x+b.w,a.x)))return 'x';
  if(close(a.x,b.x)&&close(a.w,b.w)&&(close(a.y+a.h,b.y)||close(b.y+b.h,a.y)))return 'y';
  return null;
}
export function mergeIssue(p:DrawerInterior,aId:string,bId:string):string|null {
  const axis=adjacentAxis(p,aId,bId);if(!axis)return 'Choose compartments sharing a complete edge.';
  const a=p.cells.find(c=>c.id===aId)!,b=p.cells.find(c=>c.id===bId)!;
  if(p.lockedDividers?.[axis].some(n=>close(n,Math.max(a[axis],b[axis]))))return 'Unlock the shared divider before merging.';
  if(a.quantity+b.quantity>999)return 'Combined quantity exceeds the 999-item compartment limit. Adjust quantities before merging; resizing is still available.';
  return null;
}
export function mergeCells(p:DrawerInterior,aId:string,bId:string): DrawerInterior|null {
  if(mergeIssue(p,aId,bId))return null;
  const a=p.cells.find(c=>c.id===aId)!,b=p.cells.find(c=>c.id===bId)!,axis=adjacentAxis(p,aId,bId);
  return {...p,cells:p.cells.filter(c=>c.id!==bId).map(c=>c.id===aId?{...a,x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:axis==='x'?a.w+b.w:a.w,h:axis==='y'?a.h+b.h:a.h,quantity:a.quantity+b.quantity}:c)};
}
export function transformInterior(p:DrawerInterior,mode:'rotate'|'mirror'):DrawerInterior {return {...p,dividerNames:p.dividerNames?Object.fromEntries(Object.entries(p.dividerNames).map(([key,name])=>{const [axis,raw]=key.split(':'),n=+raw;return [`${mode==='rotate'?(axis==='x'?'y':'x'):axis}:${Number((mode==='rotate'?(axis==='y'?1-n:n):(axis==='x'?1-n:n)).toFixed(5))}`,name];})):undefined,lockedDividers:p.lockedDividers?(mode==='rotate'?{x:p.lockedDividers.y.map(n=>1-n),y:p.lockedDividers.x}:{x:p.lockedDividers.x.map(n=>1-n),y:p.lockedDividers.y}):undefined,dividerThickness:p.dividerThickness&&mode==='rotate'?{horizontal:p.dividerThickness.vertical,vertical:p.dividerThickness.horizontal}:p.dividerThickness,cells:p.cells.map(c=>mode==='rotate'?{...c,x:Math.max(0,1-c.y-c.h),y:c.x,w:c.h,h:c.w}:{...c,x:Math.max(0,1-c.x-c.w)})};}
export function interiorWarnings(p:DrawerInterior,d:DrawerConfig):string[] {
  const warnings:string[]=[];
  if(p.source.width!==d.width||p.source.depth!==d.depth||p.source.height!==d.height) warnings.push('Drawer size changed. Compartments scale proportionally; review measurements before applying.');
  if(p.cells.some(c=>{const s=cellSize(c,d,p);return s.width<2||s.depth<2;})) warnings.push('Some compartments are narrower than 2 inches. Consider fewer divisions.');
  if(p.minimumCellWidth&&p.cells.some(c=>cellSize(c,d,p).width<p.minimumCellWidth!))warnings.push(`Some compartments violate the ${p.minimumCellWidth}-inch minimum usable width.`);
  if(d.width<=2*p.clearance||d.depth<=2*p.clearance) warnings.push('Edge allowance leaves no usable interior. Reduce the allowance.');
  if(d.height<3) warnings.push('Shallow drawer: confirm item and insert height on site.');
  if(p.measured&&(p.measured.width>d.width||p.measured.depth>d.depth||p.measured.height>d.height))warnings.push('Measured interior exceeds the modeled drawer exterior. Verify both measurements.');
  for(const c of p.cells){const fit=itemFit(c,d,p);if(fit==='does not fit')warnings.push(`${c.label}: item does not fit, including height.`);}
  return warnings;
}
export function validInteriors(value:unknown):boolean {
  if(value===undefined)return true;
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>200)return false;
  const num=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
  const str=(v:unknown,max:number)=>typeof v==='string'&&v.length<=max;
  return Object.entries(value).every(([key,p]:[string,any])=>{
    if(!/^(back|left|right|corridor-a|corridor-b|island-unit):\d+:\d+$/.test(key)||!p||p.version!==1||!str(p.name,80)||!str(p.notes,500)||!MATERIALS.includes(p.material)||!LINERS.includes(p.liner)||!num(p.thickness,.125,1)||!num(p.clearance,0,2)||!p.source||!['width','height','depth'].every(k=>num(p.source[k],.1,100000))||!Array.isArray(p.cells)||p.cells.length<1||p.cells.length>36)return false;
    const cells=p.cells as Compartment[];
    if(p.identity!==undefined&&!str(p.identity,200))return false;
    if(p.dividerNames!==undefined&&(!p.dividerNames||typeof p.dividerNames!=='object'||Array.isArray(p.dividerNames)||Object.keys(p.dividerNames).length>144||Object.entries(p.dividerNames).some(([key,name])=>!/^([xy]):0\.\d+$/.test(key)||!str(name,80))))return false;
    if(p.dividerThickness!==undefined&&(!p.dividerThickness||!num(p.dividerThickness.horizontal,.125,1)||!num(p.dividerThickness.vertical,.125,1)))return false;
    if(p.itemMargin!==undefined&&!num(p.itemMargin,0,6))return false;
    if(p.minimumCellWidth!==undefined&&!num(p.minimumCellWidth,.1,100))return false;
    if(p.materialDensity!==undefined&&!num(p.materialDensity,1,5000))return false;
    if(p.lockedDividers!==undefined&&(!p.lockedDividers||!['x','y'].every(axis=>Array.isArray(p.lockedDividers[axis])&&p.lockedDividers[axis].length<=72&&p.lockedDividers[axis].every((n:unknown)=>num(n,.00001,.99999)))))return false;
    if(p.measured!==undefined&&(!p.measured||!['width','height','depth'].every(k=>num(p.measured[k],.1,600))))return false;
    if(new Set(cells.map(c=>c?.id)).size!==cells.length)return false;
    if(!cells.every(c=>c&&str(c.id,80)&&str(c.label,60)&&CATEGORIES.includes(c.category)&&num(c.quantity,0,999)&&Number.isInteger(c.quantity)&&/^#[0-9a-f]{6}$/i.test(c.color)&&num(c.x,0,1)&&num(c.y,0,1)&&num(c.w,.00001,1)&&num(c.h,.00001,1)&&c.x+c.w<=1.00001&&c.y+c.h<=1.00001))return false;
    if(!cells.every(c=>(c.notes===undefined||str(c.notes,300))&&(c.item===undefined||(c.item&&['width','depth','height'].every(k=>num(c.item![k as 'width'],.1,600))&&typeof c.item.rotate==='boolean'))))return false;
    return close(cells.reduce((a,c)=>a+c.w*c.h,0),1)&&cells.every((a,i)=>cells.slice(i+1).every(b=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)<.00001||Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)<.00001));
  });
}
export function interiorSVG(p:DrawerInterior,d:DrawerConfig,notes=true,materialNotes=true):string {
  const s=innerSize(d,p),height=400*s.depth/s.width;
  const legend=p.cells.flatMap((c,i)=>{const size=cellSize(c,d,p),line=`${i+1}. ${c.label}: ${size.width.toFixed(2)} × ${size.depth.toFixed(2)} in${notes&&c.notes?' · '+c.notes:''}`;return line.match(/.{1,75}(?:\s|$)|.{1,75}/g)??[line];});
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 ${height+50+legend.length*18}" role="img"><title>${escapeHTML(p.name)} compartment plan</title><desc>Top view; drawer front at bottom. ${p.measured?'Measured':'Estimated'} interior ${s.width.toFixed(2)} by ${s.depth.toFixed(2)} inches. Not to scale.</desc>${p.cells.map(c=>`<rect x="${c.x*400}" y="${c.y*height}" width="${c.w*400}" height="${c.h*height}" fill="${c.color}" stroke="${materialColor(p.material)}" stroke-width="2"/><text x="${(c.x+c.w/2)*400}" y="${(c.y+c.h/2)*height}" text-anchor="middle" font-family="Arial" font-size="10" textLength="${Math.max(1,Math.min(c.label.slice(0,18).length*5,c.w*400-8))}" lengthAdjust="spacingAndGlyphs">${escapeHTML(c.label.slice(0,18))}</text>`).join('')}<g font-family="Arial" font-size="9"><text x="4" y="${height+18}">Divider ${p.dividerThickness?`H ${p.dividerThickness.horizontal} / V ${p.dividerThickness.vertical}`:p.thickness} in${materialNotes?` · ${escapeHTML(p.material)} · ${escapeHTML(p.liner)} liner`:''}</text>${legend.map((text,i)=>`<text x="4" y="${height+40+i*18}" textLength="${Math.min(390,text.length*4.5)}" lengthAdjust="spacingAndGlyphs">${escapeHTML(text)}</text>`).join('')}</g></svg>`;
}
export function materialColor(material:string){return ({Bamboo:'#9d8162',Oak:'#705437',Acrylic:'#637e8c',Felt:'#6a6577'} as Record<string,string>)[material]??'#554433';}
export function itemFit(c:Compartment,d:DrawerConfig,p:DrawerInterior):'fits'|'fits rotated'|'does not fit'|'not specified'{
  if(!c.item)return 'not specified';const s=cellSize(c,d,p),i=c.item,m=2*(p.itemMargin??0);
  if(i.height+m>innerSize(d,p).height)return 'does not fit';
  if(i.width+m<=s.width&&i.depth+m<=s.depth)return 'fits';
  return i.rotate&&i.depth+m<=s.width&&i.width+m<=s.depth?'fits rotated':'does not fit';
}
export function spatialNeighbor(cells:Compartment[],id:string,key:string):Compartment|undefined {
  const a=cells.find(c=>c.id===id);if(!a)return;
  const horizontal=key==='ArrowLeft'||key==='ArrowRight',positive=key==='ArrowRight'||key==='ArrowDown';
  const center=(c:Compartment)=>[c.x+c.w/2,c.y+c.h/2],origin=center(a),axis=horizontal?0:1;
  return cells.filter(c=>c!==a&&(center(c)[axis]-origin[axis])*(positive?1:-1)>.00001).sort((a,b)=>{
    const score=(c:Compartment)=>Math.abs(center(c)[axis]-origin[axis])+3*Math.abs(center(c)[1-axis]-origin[1-axis]);return score(a)-score(b);
  })[0];
}
export function moveDivider(p:DrawerInterior,aId:string,bId:string,fraction:number,snap:number,d:DrawerConfig):DrawerInterior {
  const adjacent=adjacentAxis(p,aId,bId),a=p.cells.find(c=>c.id===aId),b=p.cells.find(c=>c.id===bId);if(!adjacent||!a||!b||!Number.isFinite(fraction))return p;
  const horizontal=close(a.y,b.y)&&close(a.h,b.h),axis=horizontal?'x':'y',span=horizontal?'w':'h';
  const first=a[axis]<b[axis]?a:b,second=first===a?b:a,total=first[span]+second[span];
  if(p.lockedDividers?.[axis].some(n=>close(n,second[axis])))return p;
  const physical=horizontal?innerSize(d,p).width:innerSize(d,p).depth;
  let amount=total*fraction;if(snap>0)amount=Math.round(amount*physical/snap)*snap/physical;
  amount=Math.max(.00002,Math.min(total-.00002,amount));if(total<=.00004)return p;
  return {...p,cells:p.cells.map(c=>c===first?{...c,[span]:amount}:c===second?{...c,[axis]:first[axis]+amount,[span]:total-amount}:c)};
}
export function resolveOrganizers(plans:Record<string,DrawerInterior>,targets:DrawerTarget[]):Record<string,DrawerInterior>{
  const result:Record<string,DrawerInterior>={};
  for(const [key,p] of Object.entries(plans)){
    let target=p.identity?targets.find(t=>t.identity===p.identity):targets.find(t=>t.id===key);
    if(target&&result[target.id])target=undefined;
    // Keep unmatched records separate when a new drawer occupies their old slot.
    let id=target?.id??key;
    if(!target&&(targets.some(t=>t.id===id)||result[id])){let n=0;do{id=`${key.split(':')[0]}:99999:${n++}`;}while(result[id]||plans[id]||targets.some(t=>t.id===id));}
    result[id]={...p,identity:p.identity??target?.identity};
  }
  return result;
}



/** Field path for a rejected organizer. Geometry failures identify the cell pair. */
export function interiorIssue(value:unknown):string{
  const p=value as Record<string,any>;if(!p||typeof p!=='object'||Array.isArray(p))return 'record';
  const num=(n:unknown,min:number,max:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
  const text=(v:unknown,max:number)=>typeof v==='string'&&v.length<=max;
  if(p.version!==1)return 'version';
  if(p.dividerNames!==undefined&&(!p.dividerNames||typeof p.dividerNames!=='object'||Array.isArray(p.dividerNames)||Object.entries(p.dividerNames).some(([key,name])=>!/^([xy]):0\.\d+$/.test(key)||!text(name,80))))return 'dividerNames';
  for(const [key,max] of [['name',80],['notes',500],['identity',200]] as const)if(!(key==='identity'&&p[key]===undefined)&&!text(p[key],max))return key;
  if(!MATERIALS.includes(p.material))return 'material';if(!LINERS.includes(p.liner))return 'liner';
  for(const [key,min,max]of [['thickness',.125,1],['clearance',0,2],['itemMargin',0,6],['minimumCellWidth',.1,100],['materialDensity',1,5000]] as const)if(!(['itemMargin','minimumCellWidth','materialDensity'].includes(key)&&p[key]===undefined)&&!num(p[key],min,max))return key;
  for(const key of ['source','measured']){if(key==='measured'&&p[key]===undefined)continue;if(!p[key]||typeof p[key]!=='object')return key;for(const field of ['width','depth','height'])if(!num(p[key][field],.1,key==='source'?100000:600))return key+'.'+field;}
  if(p.dividerThickness!==undefined)for(const axis of ['horizontal','vertical'])if(!num(p.dividerThickness?.[axis],.125,1))return 'dividerThickness.'+axis;
  if(p.lockedDividers!==undefined)for(const axis of ['x','y']){const list=p.lockedDividers?.[axis];if(!Array.isArray(list)||list.length>72)return 'lockedDividers.'+axis;const index=list.findIndex(n=>!num(n,.00001,.99999));if(index>=0)return `lockedDividers.${axis}[${index}]`;}
  if(!Array.isArray(p.cells)||!p.cells.length||p.cells.length>36)return 'cells';const ids=new Set<string>();
  for(let i=0;i<p.cells.length;i++){const c=p.cells[i],path=`cells[${i}]`;if(!c||typeof c!=='object')return path;
    if(!text(c.id,80)||ids.has(c.id))return path+'.id';ids.add(c.id);
    if(!text(c.label,60))return path+'.label';if(!CATEGORIES.includes(c.category))return path+'.category';if(!num(c.quantity,0,999)||!Number.isInteger(c.quantity))return path+'.quantity';if(typeof c.color!=='string'||!/^#[0-9a-f]{6}$/i.test(c.color))return path+'.color';
    for(const key of ['x','y','w','h'])if(!num(c[key],(key==='w'||key==='h') ? .00001 : 0,1))return path+'.'+key;
    if(c.x+c.w>1.00001||c.y+c.h>1.00001)return path+'.bounds';
    if(c.notes!==undefined&&!text(c.notes,300))return path+'.notes';
    if(c.item!==undefined){if(!c.item)return path+'.item';for(const key of ['width','depth','height'])if(!num(c.item[key],.1,600))return path+'.item.'+key;if(typeof c.item.rotate!=='boolean')return path+'.item.rotate';}
    for(let j=0;j<i;j++){const b=p.cells[j];if(Math.min(c.x+c.w,b.x+b.w)-Math.max(c.x,b.x)>=.00001&&Math.min(c.y+c.h,b.y+b.h)-Math.max(c.y,b.y)>=.00001)return `${path}.geometry (overlaps cells[${j}])`;}
  }
  return 'cells.coverage';
}
