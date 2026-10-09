import {applicationBuild} from './buildInfo';
import { BACKUP_MAX_BYTES, BACKUP_MAX_RECORDS, migrateSavedData, readBackup, readDesigns, SAVED_KEY, DRAFT_KEY } from './storage';
import { validConfig, invalidConfigurationField } from './storage';
import { readShells, ROOM_SHELL_KEY } from './roomShells';
import { readTemplates, TEMPLATE_KEY } from './organizerTemplates';
import type { SavedDesign } from '@/types/closet';
export function analyzeBackup(raw:string){
  if(new TextEncoder().encode(raw).length>BACKUP_MAX_BYTES)throw new Error('Backup exceeds the 5 MB limit.');
  const entries=migrateSavedData(JSON.parse(raw));if(entries.length>BACKUP_MAX_RECORDS)throw new Error('Backup exceeds the 200-design limit.');
  const valid:SavedDesign[]=[],invalid:Array<{index:number;error:string}>=[],ids=new Set<string>();
  entries.forEach((entry,index)=>{try{const design=readBackup(JSON.stringify({version:1,designs:[entry]}))[0];if(ids.has(design.id))throw new Error('Duplicate design ID in this backup.');ids.add(design.id);valid.push(design);}catch(e){invalid.push({index,error:(e as Error).message});}});
  return {valid,invalid,total:entries.length};
}
export function localStorageUsage(storage:Pick<Storage,'length'|'key'|'getItem'>){
  let bytes=0,keys=0;for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key?.startsWith('alveo-')){bytes+=2*(key.length+(storage.getItem(key)?.length??0));keys++;}}
  return {bytes,keys};
}
export function storageBreakdown(storage:Pick<Storage,'length'|'key'|'getItem'>){
  const groups:Record<string,{keys:number;bytes:number}>={drafts:{keys:0,bytes:0},designs:{keys:0,bytes:0},templates:{keys:0,bytes:0},shells:{keys:0,bytes:0},preferences:{keys:0,bytes:0}};
  for(let i=0;i<storage.length;i++){const key=storage.key(i);if(!key?.startsWith('alveo-'))continue;const group=key===DRAFT_KEY?'drafts':key===SAVED_KEY?'designs':key===TEMPLATE_KEY?'templates':key===ROOM_SHELL_KEY?'shells':'preferences';groups[group].keys++;groups[group].bytes+=2*(key.length+(storage.getItem(key)?.length??0));}return groups;
}
export function draftStatus(raw:string|null){
  const status:{present:boolean;parseable:boolean;restorable:boolean;error?:string}={present:raw!==null,parseable:false,restorable:false};
  if(raw===null)return status;
  try{const d=JSON.parse(raw);status.parseable=true;status.restorable=d?.version===1&&validConfig(d.config);if(!status.restorable)status.error=d?.version!==1?'Unsupported draft version':'config.'+invalidConfigurationField(d.config);}catch(e){status.error=(e as Error).message;}return status;
}
export function recoveryReport(storage:Pick<Storage,'length'|'key'|'getItem'>){
  // Parser exceptions may quote the source, and validator paths may contain
  // user-defined identifiers. Neither belongs in a shareable diagnostic report.
  const health=(key:string,read:(raw:string|null)=>unknown[])=>{try{return {readable:true,records:read(storage.getItem(key)).length};}catch{return {readable:false,error:'Stored data could not be validated. Inspect it locally with recovery tools.'};}};
  const {present,parseable,restorable}=draftStatus(storage.getItem(DRAFT_KEY));
  const draft={present,parseable,restorable,...(present&&!restorable?{error:parseable?'Stored draft uses an unsupported version or invalid configuration.':'Stored draft is not valid JSON.'}:{})};
  return {version:2,application:applicationBuild,generatedAt:new Date().toISOString(),usage:localStorageUsage(storage),breakdown:storageBreakdown(storage),named:health(SAVED_KEY,readDesigns),templates:health(TEMPLATE_KEY,readTemplates),shells:health(ROOM_SHELL_KEY,readShells),draft};
}
export function storageError(error:unknown){
  const name=error&&typeof error==='object'&&'name' in error?String(error.name):'';
  return name==='QuotaExceededError'?'Browser storage quota was exceeded. Download a backup and free space.':name==='SecurityError'||name==='NotAllowedError'?'The browser denied storage access. Check site storage permissions.':'Browser storage is unavailable or full.';
}
