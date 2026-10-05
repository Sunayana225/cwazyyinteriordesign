import type { ClosetConfiguration } from '@/types/closet';
import { DEFAULT_CONFIG } from './design';
import { canonicalConfig, invalidConfigurationField, validConfig } from './storage';
export const ROOM_SHELL_KEY='alveo-room-shells';
export type Shell=Pick<ClosetConfiguration,'closetType'|'dimensions'|'roomDimensions'|'planning'>;
export interface SavedShell {id:string;name:string;shell:Shell;}
export function roomShell(config:Partial<ClosetConfiguration>):Shell{
  const c=canonicalConfig({...DEFAULT_CONFIG,...config});
  return {closetType:c.closetType,dimensions:c.dimensions,roomDimensions:c.roomDimensions,planning:c.planning};
}
export function readShells(raw:string|null):SavedShell[]{
  if(raw===null)return [];
  if(new TextEncoder().encode(raw).length>1024*1024)throw new Error('Room-shell data exceeds 1 MB.');
  const data=JSON.parse(raw),entries=Array.isArray(data)?data:data?.version===1?data.shells:null;
  if(!Array.isArray(entries)||entries.length>20)throw new Error('Expected up to 20 room shells in a supported file.');
  const ids=new Set<string>();
  return entries.map((v,i)=>{
    const fail=(field:string):never=>{throw new Error(`Invalid room shell at shells[${i}].${field}. Existing data was preserved.`);};
    if(!v||typeof v!=='object'||Array.isArray(v))fail('record');
    if(typeof v.id!=='string'||!v.id.trim()||v.id.length>100||ids.has(v.id))fail('id');
    if(typeof v.name!=='string'||!v.name.trim()||v.name.length>80)fail('name');
    if(!v.shell||typeof v.shell!=='object'||Array.isArray(v.shell)||!v.shell.dimensions)fail('shell');
    const candidate={...DEFAULT_CONFIG,closetType:v.shell.closetType,dimensions:v.shell.dimensions,roomDimensions:v.shell.roomDimensions,planning:v.shell.planning};
    if(!validConfig(candidate))fail('shell.'+invalidConfigurationField(candidate));
    ids.add(v.id);return {id:v.id,name:v.name,shell:roomShell(candidate)};
  });
}
export const serializeShells=(shells:SavedShell[])=>JSON.stringify({version:1,shells});
export async function mutateShells(change:(current:SavedShell[])=>SavedShell[]):Promise<SavedShell[]>{
  if(!navigator.locks)throw new Error('Room-shell changes require browser storage locks. Existing data was preserved.');
  return navigator.locks.request(ROOM_SHELL_KEY,()=>{
    const next=change(readShells(localStorage.getItem(ROOM_SHELL_KEY))),raw=serializeShells(next),validated=readShells(raw);
    localStorage.setItem(ROOM_SHELL_KEY,raw);return validated;
  });
}
export function shellMeasurements(shell:Shell):Map<string,string>{
  const rows=new Map<string,string>(),names:Record<string,string>={closetType:'Closet shape',dimensions:'Cabinet',roomDimensions:'Room',roomWidth:'width',roomDepth:'depth',planning:'Planning',clearanceTarget:'aisle target',supportSpan:'support span',ceilingHeight:'ceiling height',floorOffset:'floor offset',baseboard:'baseboard allowance',garmentLengths:'garment lengths',shoeHeights:'shoe heights'};
  const visit=(value:unknown,path:string[])=>{
    if(value===undefined)return;
    if(value&&typeof value==='object'){Object.entries(value).forEach(([key,v])=>visit(v,[...path,/^\d+$/.test(key)?`#${+key+1}`:names[key]??key]));return;}
    rows.set(path.join(' · '),typeof value==='number'?`${value} in`:typeof value==='boolean'?(value?'Yes':'No'):String(value));
  };visit(shell,[]);return rows;
}
