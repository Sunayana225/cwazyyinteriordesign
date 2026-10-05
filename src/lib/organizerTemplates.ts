import { validInteriors } from './drawers';
import type { DrawerInterior } from './drawers';
import { DEFAULT_CONFIG } from './design';
import { canonicalConfig } from './storage';
export const TEMPLATE_KEY='alveo-organizer-templates';
export interface OrganizerTemplate {id:string;plan:DrawerInterior;tags?:string[];revisions?:Array<{id:string;savedAt:string;plan:DrawerInterior}>;}
const canonical=(plan:DrawerInterior)=>canonicalConfig({...DEFAULT_CONFIG,drawerInteriors:{'back:0:0':plan}}).drawerInteriors!['back:0:0'];
export function readTemplates(raw:string|null):OrganizerTemplate[]{
  if(raw===null)return [];
  if(new TextEncoder().encode(raw).length>1024*1024)throw new Error('Template file exceeds 1 MB.');
  const parsed=JSON.parse(raw),entries=Array.isArray(parsed)?parsed.map((plan,i)=>({id:`legacy-${i}`,plan})):parsed?.version===1?parsed.templates:null;
  if(!Array.isArray(entries)||entries.length>20)throw new Error('Expected up to 20 organizer templates in a supported file.');
  const ids=new Set<string>();
  return entries.map((v,i)=>{
    if(!v||typeof v.id!=='string'||!v.id||v.id.length>100||ids.has(v.id)||!validInteriors({'back:0:0':v.plan})||!v.plan.name.trim())throw new Error(`Invalid template at templates[${i}]. Existing data was preserved.`);
    if(v.tags!==undefined&&(!Array.isArray(v.tags)||v.tags.length>12||v.tags.some((t:unknown)=>typeof t!=='string'||t.length>40)))throw new Error(`Invalid template tags at templates[${i}].tags.`);
    if(v.revisions!==undefined&&(!Array.isArray(v.revisions)||v.revisions.length>5||new Set(v.revisions.map((r:any)=>r?.id)).size!==v.revisions.length||v.revisions.some((r:any)=>!r||typeof r.id!=='string'||!r.id||r.id.length>100||typeof r.savedAt!=='string'||!Number.isFinite(Date.parse(r.savedAt))||!validInteriors({'back:0:0':r.plan}))))throw new Error(`Invalid template history at templates[${i}].revisions.`);
    ids.add(v.id);return {id:v.id,plan:canonical(v.plan),...(v.tags?{tags:[...v.tags]}:{}),...(v.revisions?{revisions:v.revisions.map((r:any)=>({id:r.id,savedAt:r.savedAt,plan:canonical(r.plan)}))}:{})};
  });
}
export const serializeTemplates=(entries:OrganizerTemplate[])=>JSON.stringify({version:1,templates:entries});
export async function mutateTemplates(change:(current:OrganizerTemplate[])=>OrganizerTemplate[]):Promise<OrganizerTemplate[]>{
  if(!navigator.locks)throw new Error('Template changes require browser storage locks. Download templates before switching browsers.');
  return navigator.locks.request(TEMPLATE_KEY,()=>{
    const current=readTemplates(localStorage.getItem(TEMPLATE_KEY)),next=change(current);
    const raw=serializeTemplates(next),validated=readTemplates(raw);localStorage.setItem(TEMPLATE_KEY,raw);return validated;
  });
}
