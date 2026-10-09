import type { ClosetConfiguration } from '@/types/closet';
import { surveyGeometry, surveyState } from './surveyReview';

export interface SurveyChange { field:string; before:string; after:string; }
const number=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
const text=(value:unknown):value is string=>typeof value==='string'&&value.length<=100;
const tuple=(value:unknown,checks:((v:unknown)=>boolean)[]):value is unknown[]=>Array.isArray(value)&&value.length===checks.length&&checks.every((check,i)=>check(value[i]));
const optional=(value:unknown)=>value===null||number(value);
const inches=(value:unknown)=>value===null?'Inherited':`${value} in`;

/** Read the original version-one snapshot, including its ID-independent object lists.
 * A moved object is shown as removed/added geometry, never paired by array order. */
function fields(raw:string):Map<string,string> {
  const s=JSON.parse(raw),rows=new Map<string,string>();
  if(!s||s.version!==1||!text(s.shape)||!(s.dimensions===null||tuple(s.dimensions,[number,number,number,optional]))||
    !(s.room===null||tuple(s.room,[number,number]))||!Array.isArray(s.walls)||s.walls.length>7||
    !s.walls.every((w:unknown)=>tuple(w,[text,optional,optional,number,number])))throw new Error('Unsupported survey');
  rows.set('Closet shape',s.shape);
  ['Wall width','Room ceiling height','Cabinet depth','Requested cabinet height'].forEach((name,i)=>rows.set(name,inches(s.dimensions?.[i]??null)));
  ['Room width','Room depth'].forEach((name,i)=>rows.set(name,inches(s.room?.[i]??null)));
  for(const [wall,...values] of s.walls as [string,...unknown[]][]) {
    ['cabinet depth','ceiling height','baseboard allowance','floor offset'].forEach((name,i)=>{
      if(values[i]!==null&&(i<2||values[i]!==0))rows.set(`${wall} wall · ${name}`,inches(values[i]));
    });
  }
  for(const [key,checks,names] of [
    ['windows',[text,number,number,number,number],['wall','offset','width','sill','height']],
    ['obstacles',[number,number,number,number],['x','y','width','depth']],
  ] as const) {
    if(!Array.isArray(s[key])||s[key].length>20)throw new Error('Unsupported objects');
    const values=s[key].map((entry:unknown)=>{
      if(typeof entry!=='string')throw new Error('Unsupported object');
      const values:unknown=JSON.parse(entry);
      if(!tuple(values,[...checks]))throw new Error('Unsupported object');
      return values.map((v,i)=>`${names[i]} ${typeof v==='number'?inches(v):v}`).join(', ');
    }).sort();
    // Keep duplicate geometries: two identical reservations are still two objects.
    rows.set(key==='windows'?'Window geometry':'Obstacle geometry',values.join('; ')||'None');
  }
  if(s.door!==null&&!tuple(s.door,[text,number,number,text,text]))throw new Error('Unsupported door');
  ['wall','offset','width','hinge','swing'].forEach((name,i)=>rows.set(`Door ${name}`,s.door===null?'No door':typeof s.door[i]==='number'?inches(s.door[i]):s.door[i]));
  return rows;
}

export function surveyChanges(config:Partial<ClosetConfiguration>):SurveyChange[]|null {
  if(surveyState(config)!=='stale')return [];
  try {
    const before=fields(config.surveyConfirmation!.geometry),after=fields(surveyGeometry(config));
    for(const [field,key] of [['Survey author','author'],['Survey date','date']] as const){
      before.set(field,config.surveyConfirmation?.record?.[key]?.trim()||'Not recorded');
      after.set(field,config.surveyRecord?.[key]?.trim()||'Not recorded');
    }
    return [...new Set([...before.keys(),...after.keys()])].flatMap(field=>{
      const a=before.get(field)??'Inherited',b=after.get(field)??'Inherited';
      return a===b?[]:[{field,before:a,after:b}];
    });
  } catch { return null; } // Imported older/malformed metadata must not crash the room editor.
}
