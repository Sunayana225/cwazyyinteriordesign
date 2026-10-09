import type {ClosetWall} from '@/types/closet';
import {WALL_IDS} from './planning';

export const DRAWING_STATUSES={concept:'Concept',coordination:'Coordination','client-review':'Client review'} as const;
export interface DrawingRecord {revision?:string;status?:keyof typeof DRAWING_STATUSES;wallReferences?:Partial<Record<ClosetWall['wallId'],string>>;}
export function drawingRecordIssue(value:unknown):string|null {
  if(value===undefined)return null;
  if(!value||typeof value!=='object'||Array.isArray(value))return 'drawingRecord';
  const v=value as DrawingRecord;
  if(v.revision!==undefined&&(typeof v.revision!=='string'||v.revision.length>40))return 'drawingRecord.revision';
  if(v.status!==undefined&&!Object.prototype.hasOwnProperty.call(DRAWING_STATUSES,v.status))return 'drawingRecord.status';
  if(v.wallReferences!==undefined){
    if(!v.wallReferences||typeof v.wallReferences!=='object'||Array.isArray(v.wallReferences))return 'drawingRecord.wallReferences';
    for(const [id,ref] of Object.entries(v.wallReferences))if(!WALL_IDS.includes(id as ClosetWall['wallId'])||typeof ref!=='string'||ref.length>24)return `drawingRecord.wallReferences.${id}`;
  }
  return null;
}
export function canonicalDrawingRecord(record:DrawingRecord):DrawingRecord {
  return {...(record.revision!==undefined?{revision:record.revision}:{}),...(record.status!==undefined?{status:record.status}:{}),...(record.wallReferences?{wallReferences:Object.fromEntries(WALL_IDS.filter(id=>record.wallReferences?.[id]!==undefined).map(id=>[id,record.wallReferences![id]]))}:{})};
}
export function drawingRecordLabel(record?:DrawingRecord):string {
  return `${DRAWING_STATUSES[record?.status??'concept']} · Revision ${record?.revision?.trim()||'not assigned'}`;
}
