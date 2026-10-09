import { hangerSpacing, shoePairWidths, type HangingCategory } from './fitMeasurements';
import type { PlanningOptions, WardrobeItems, ShoeCollection } from '@/types/closet';
import { EMPTY_WARDROBE, FOLDED_PER_DRAWER, SHOE_PAIR_WIDTH } from './design';
export interface Inventory {wardrobe:WardrobeItems;shoes:ShoeCollection;}
export interface InventoryPlanning {
  members?:Array<{id:string;name:string;season:'everyday'|'seasonal';inventory:Inventory}>;
  reserve?:Record<string,number>;
  target?:Inventory;
  notes?:{long?:string;short?:string;shoes?:string};
}
export const EMPTY_INVENTORY:Inventory={wardrobe:{...EMPTY_WARDROBE},shoes:{boots:0,heels:0,sneakers:0,flats:0}};
export const INVENTORY_KEYS=Object.entries(EMPTY_INVENTORY).flatMap(([group,values])=>Object.keys(values).map(key=>`${group}.${key}`));
export const inventoryValue=(v:Inventory,key:string):number=>{const [group,field]=key.split('.');return Number((v[group as keyof Inventory] as unknown as Record<string,unknown>)[field]);};
export function setInventoryValue(v:Inventory,key:string,count:number):Inventory{const [group,field]=key.split('.');return {...v,[group]:{...v[group as keyof Inventory],[field]:field==='jewelry'?!!count:count}};}
export function validInventory(v:unknown):v is Inventory{
  if(!v||typeof v!=='object')return false;const input=v as Inventory;
  return INVENTORY_KEYS.every(key=>{const [group,field]=key.split('.'),value=input[group as keyof Inventory]?.[field as never];return field==='jewelry'?typeof value==='boolean':typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<=10000;});
}
export function validInventoryPlanning(p:unknown):p is InventoryPlanning|undefined{
  if(p===undefined)return true;if(!p||typeof p!=='object'||Array.isArray(p))return false;const v=p as InventoryPlanning;
  return (v.members===undefined||(Array.isArray(v.members)&&v.members.length<=10&&new Set(v.members.map(m=>m?.id)).size===v.members.length&&v.members.every(m=>m&&typeof m.id==='string'&&m.id.length>0&&m.id.length<=100&&typeof m.name==='string'&&m.name.length<=80&&['everyday','seasonal'].includes(m.season)&&validInventory(m.inventory))))&&
    (v.reserve===undefined||(!!v.reserve&&typeof v.reserve==='object'&&!Array.isArray(v.reserve)&&Object.entries(v.reserve).every(([key,n])=>INVENTORY_KEYS.includes(key)&&typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100)))&&
    (v.target===undefined||validInventory(v.target))&&(v.notes===undefined||(!!v.notes&&typeof v.notes==='object'&&!Array.isArray(v.notes)&&Object.entries(v.notes).every(([key,s])=>['long','short','shoes'].includes(key)&&(s===undefined||(typeof s==='string'&&s.length<=500)))));
}
export function canonicalInventory(v:Inventory):Inventory{return INVENTORY_KEYS.reduce((next,key)=>setInventoryValue(next,key,inventoryValue(v,key)),structuredClone(EMPTY_INVENTORY));}
export function canonicalInventoryPlanning(p:InventoryPlanning):InventoryPlanning{return {members:p.members?.map(({id,name,season,inventory})=>({id,name,season,inventory:canonicalInventory(inventory)})),reserve:p.reserve?Object.fromEntries(Object.entries(p.reserve)):undefined,target:p.target?canonicalInventory(p.target):undefined,notes:p.notes?{long:p.notes.long,short:p.notes.short,shoes:p.notes.shoes}:undefined};}
export function combinedInventory(members:NonNullable<InventoryPlanning['members']>):Inventory{return members.reduce((total,m)=>INVENTORY_KEYS.reduce((v,key)=>setInventoryValue(v,key,key.endsWith('.jewelry')?Math.max(inventoryValue(v,key),inventoryValue(m.inventory,key)):inventoryValue(v,key)+inventoryValue(m.inventory,key)),total),structuredClone(EMPTY_INVENTORY));}
export function reserveInventory(v:Inventory,reserve:Record<string,number>={}):Inventory{return INVENTORY_KEYS.reduce((next,key)=>setInventoryValue(next,key,key.endsWith('.jewelry')?inventoryValue(v,key):Math.ceil(inventoryValue(v,key)*(1+(reserve[key]??0)/100))),structuredClone(v));}
export function exportInventoryCSV(v:Inventory):string{return 'category,count\r\n'+INVENTORY_KEYS.map(key=>`${key},${inventoryValue(v,key)}`).join('\r\n')+'\r\n';}
export function readInventoryCSV(raw:string):Inventory{
  if(new TextEncoder().encode(raw).length>65536)throw new Error('Inventory CSV exceeds 64 KB.');
  const lines=raw.replace(/^\uFEFF/,'').trim().split(/\r?\n/);if(lines.shift()?.trim()!=='category,count')throw new Error('Expected CSV header category,count.');
  let v=structuredClone(EMPTY_INVENTORY);const seen=new Set<string>();
  lines.forEach((line,i)=>{const parts=line.split(','),key=parts[0]?.trim(),text=parts[1]?.trim(),n=Number(text);if(parts.length!==2||!INVENTORY_KEYS.includes(key)||seen.has(key)||!text||!Number.isInteger(n)||n<0||n>(key.endsWith('.jewelry')?1:10000))throw new Error(`Invalid inventory CSV row ${i+2}. Use each supported category once with a whole count.`);seen.add(key);v=setInventoryValue(v,key,n);});
  if(seen.size!==INVENTORY_KEYS.length)throw new Error('Inventory CSV must include every category. Download the CSV template first.');return v;
}
export function incrementalDemand(key:string,planning?:PlanningOptions){const field=key.split('.')[1],spacing=hangerSpacing(planning);if(Object.prototype.hasOwnProperty.call(spacing,field))return `${spacing[field as HangingCategory]*(field==='suits'?2:1)} in hanging rod`;if(field in FOLDED_PER_DRAWER)return `${(1/FOLDED_PER_DRAWER[field as keyof typeof FOLDED_PER_DRAWER]).toFixed(3)} standard drawer equivalents`;if(field in SHOE_PAIR_WIDTH)return `${shoePairWidths(planning)[field as keyof ShoeCollection]} in shelf width plus shoe-height clearance`;return '1 accessory allocation (jewelry is a yes/no request)';}


export function inventoryIssue(value:unknown):string|null{
  if(!value||typeof value!=='object'||Array.isArray(value))return 'inventory';
  const v=value as Record<string,any>;
  for(const key of INVENTORY_KEYS){const [group,field]=key.split('.'),n=v[group]?.[field];if(field==='jewelry'?typeof n!=='boolean':typeof n!=='number'||!Number.isInteger(n)||n<0||n>10000)return key;}
  return null;
}
export function inventoryPlanningIssue(value:unknown):string{
  if(!value||typeof value!=='object'||Array.isArray(value))return 'inventoryPlanning';
  const p=value as Record<string,any>,ids=new Set<string>();
  if(p.members!==undefined){if(!Array.isArray(p.members)||p.members.length>10)return 'inventoryPlanning.members';
    for(let i=0;i<p.members.length;i++){const m=p.members[i],path=`inventoryPlanning.members[${i}]`;if(!m||typeof m!=='object')return path;
      if(typeof m.id!=='string'||!m.id||m.id.length>100||ids.has(m.id))return path+'.id';ids.add(m.id);
      if(typeof m.name!=='string'||m.name.length>80)return path+'.name';if(!['everyday','seasonal'].includes(m.season))return path+'.season';
      const issue=inventoryIssue(m.inventory);if(issue)return path+'.inventory.'+issue;
    }
  }
  if(p.target!==undefined){const issue=inventoryIssue(p.target);if(issue)return 'inventoryPlanning.target.'+issue;}
  if(p.reserve!==undefined){if(!p.reserve||typeof p.reserve!=='object'||Array.isArray(p.reserve))return 'inventoryPlanning.reserve';for(const [key,n]of Object.entries(p.reserve))if(!INVENTORY_KEYS.includes(key)||typeof n!=='number'||!Number.isFinite(n)||n<0||n>100)return `inventoryPlanning.reserve[${JSON.stringify(key)}]`;}
  if(p.notes!==undefined){if(!p.notes||typeof p.notes!=='object'||Array.isArray(p.notes))return 'inventoryPlanning.notes';for(const [key,n]of Object.entries(p.notes))if(!['long','short','shoes'].includes(key)||(n!==undefined&&(typeof n!=='string'||n.length>500)))return 'inventoryPlanning.notes.'+key;}
  return 'inventoryPlanning';
}

export const inventoryLabel=(key:string)=>({longDresses:'Long dresses',shortJackets:'Short jackets',tShirts:'T-shirts',shirts:'Shirts & blouses'}[key.split('.')[1]]??key.split('.')[1].replace(/^./,c=>c.toUpperCase()));
export function readHousehold(raw:string):Pick<InventoryPlanning,'members'|'notes'>{
  if(new TextEncoder().encode(raw).length>1024*1024)throw new Error('Household file exceeds 1 MB.');const data=JSON.parse(raw);
  if(data?.version!==1||!data.household||!validInventoryPlanning(data.household))throw new Error('Invalid household file: '+inventoryPlanningIssue(data?.household));
  const canonical=canonicalInventoryPlanning(data.household);return {members:canonical.members??[],notes:canonical.notes};
}
