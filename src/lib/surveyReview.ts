import type { ClosetConfiguration } from '@/types/closet';

export interface SurveyRecord {author?:string;date?:string;}
export interface SurveyConfirmation { version:1; geometry:string; confirmedAt:string; record?:SurveyRecord; }
export function surveyRecordIssue(value:unknown):string|null {
  if(value===undefined)return null;
  if(!value||typeof value!=='object'||Array.isArray(value))return 'surveyRecord';
  const v=value as SurveyRecord;
  if(v.author!==undefined&&(typeof v.author!=='string'||v.author.length>120))return 'surveyRecord.author';
  if(v.date!==undefined&&(typeof v.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v.date)||Number(v.date.slice(0,4))<1||!Number.isFinite(Date.parse(v.date+'T00:00:00.000Z'))||new Date(v.date+'T00:00:00.000Z').toISOString().slice(0,10)!==v.date))return 'surveyRecord.date';
  return null;
}
const recordKey=(record?:SurveyRecord)=>JSON.stringify([record?.author?.trim()??'',record?.date??'']);
const ordered=(rows:unknown[])=>rows.map(row=>JSON.stringify(row)).sort();
/** Only physical survey inputs belong here: changing a finish, role, object label,
 * inventory quantity, or object order does not change the measured room. */
export function surveyGeometry(config:Partial<ClosetConfiguration>):string {
  const p=config.planning??{},d=config.dimensions;
  return JSON.stringify({
    version:1,shape:config.closetType??'reach-in',dimensions:d?[d.width,d.height,d.depth,d.cabinetHeight??null]:null,
    room:config.roomDimensions?[config.roomDimensions.roomWidth,config.roomDimensions.roomDepth]:null,
    walls:Object.entries(p.walls??{}).filter(([,w])=>w?.depth!==undefined||w?.ceilingHeight!==undefined||!!w?.baseboard||!!w?.floorOffset).sort(([a],[b])=>a.localeCompare(b)).map(([id,w])=>[id,w?.depth??null,w?.ceilingHeight??null,w?.baseboard??0,w?.floorOffset??0]),
    windows:ordered((p.windows??[]).map(w=>[w.wall,w.offset,w.width,w.sill,w.height])),
    obstacles:ordered((p.obstacles??[]).map(o=>[o.x,o.y,o.width,o.depth])),
    door:p.door?[p.door.wall,p.door.offset,p.door.width,p.door.hinge,p.door.swing]:null,
  });
}
export function validSurveyConfirmation(value:unknown):value is SurveyConfirmation|undefined {
  if(value===undefined)return true;
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const v=value as SurveyConfirmation;
  return !surveyRecordIssue(v.record)&&v.version===1&&typeof v.geometry==='string'&&v.geometry.length>0&&v.geometry.length<=32768&&
    typeof v.confirmedAt==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v.confirmedAt)&&Number.isFinite(Date.parse(v.confirmedAt))&&new Date(v.confirmedAt).toISOString()===v.confirmedAt;
}
export function surveyState(config:Partial<ClosetConfiguration>):'unconfirmed'|'current'|'stale' {
  const review=config.surveyConfirmation;
  return !review||!validSurveyConfirmation(review)||surveyRecordIssue(config.surveyRecord)?'unconfirmed':review.geometry===surveyGeometry(config)&&recordKey(review.record)===recordKey(config.surveyRecord)?'current':'stale';
}
export function confirmSurvey(config:Partial<ClosetConfiguration>,now=new Date()):SurveyConfirmation {
  return {version:1,geometry:surveyGeometry(config),confirmedAt:now.toISOString(),...(config.surveyRecord?{record:{...config.surveyRecord}}:{})};
}
