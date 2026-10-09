'use client';
import type {ClosetWall} from '@/types/closet';
import {DRAWING_STATUSES,type DrawingRecord} from '@/lib/drawingRecord';

export default function DrawingRecordEditor({record,walls,onChange}:{record?:DrawingRecord;walls:ClosetWall[];onChange?:(record:DrawingRecord)=>void}){
  const field='border rounded p-2 w-full',references=record?.wallReferences??{};
  const refs=walls.map(w=>references[w.wallId]?.trim()||w.elevationRef);
  const duplicates=[...new Set(refs.filter((ref,i)=>refs.indexOf(ref)!==i))];
  return <fieldset className="grid gap-3 my-3 sm:grid-cols-2"><legend className="font-semibold">Project drawing record</legend>
    <label>Drawing revision<input className={field} maxLength={40} placeholder="e.g. P02" value={record?.revision??''} disabled={!onChange} onChange={e=>onChange?.({...record,revision:e.target.value})}/></label>
    <label>Drawing status<select className={field} value={record?.status??'concept'} disabled={!onChange} onChange={e=>onChange?.({...record,status:e.target.value as DrawingRecord['status']})}>{Object.entries(DRAWING_STATUSES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    {walls.map(w=><label key={w.wallId}>{w.label} drawing reference<input className={field} maxLength={24} value={references[w.wallId]??''} placeholder="Automatic elevation reference" disabled={!onChange} onChange={e=>onChange?.({...record,wallReferences:{...references,[w.wallId]:e.target.value}})}/></label>)}
    <p className="text-sm sm:col-span-2">Revision and drawing status belong to this design and are included in its backup and print package. They do not certify construction approval. Blank references use the automatic wall reference. References for temporarily absent walls are retained.</p>
    {!!duplicates.length&&<p role="status" className="text-amber-900 text-sm sm:col-span-2">Repeated drawing references: {duplicates.join(', ')}. Use distinct references to avoid coordination ambiguity.</p>}
  </fieldset>;
}
