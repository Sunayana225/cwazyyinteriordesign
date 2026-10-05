'use client';
import { useEffect, useRef, useState } from 'react';
import type { ClosetConfiguration, ClosetLayout } from '@/types/closet';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { freeSpans, storageObstacleConflicts } from '@/lib/planning';
import { doorAssessment, roomIssues, alternativeIssues } from '@/lib/roomGeometry';
import { FOLDED_PER_DRAWER, SHOE_PAIR_WIDTH } from '@/lib/design';

export function LayoutInsights({layout,config,onChange,onZone}:{layout:ClosetLayout;config:Partial<ClosetConfiguration>;onChange?:(c:Partial<ClosetConfiguration>)=>void;onZone?:(wall:string,index:number)=>void}){
  const last=useRef(layout),[previous,setPrevious]=useState<ClosetLayout|null>(null),[alternatives,setAlternatives]=useState<Array<{preference:'mixed'|'many-small'|'few-large';layout:ClosetLayout}>>([]);
  const [rejected,setRejected]=useState<Array<{preference:string;issues:Array<[string,string[]]>}>>([]);
  const [compared,setCompared]=useState(false);
  useEffect(()=>{if(last.current!==layout){setPrevious(last.current);last.current=layout;setAlternatives([]);setRejected([]);setCompared(false);}},[layout]);
  return <details className="border rounded p-3 my-3"><summary>Capacity assumptions, allocation, and alternatives</summary>
    <p className="text-sm my-2">Long hanging uses 2.5 inches per item; short hanging uses 1.8 inches, with suits counted twice. Folded capacity is scaled to a 9-inch drawer: {Object.entries(FOLDED_PER_DRAWER).map(([k,v])=>`${v} ${k}`).join(', ')}. Shoe widths per pair: {Object.entries(SHOE_PAIR_WIDTH).map(([k,v])=>`${k} ${v} in`).join(', ')}. Whole shelf capacities round down; required shelf counts round up. Shelf support-span assumption: {config.planning?.supportSpan??32} inches.</p>
    <ul className="text-sm">{layout.capacity?.map(c=><li key={c.label}>{c.label}: {c.required.toFixed(2)} required / {c.available.toFixed(2)} available {c.unit}; {Math.max(0,c.required-c.available).toFixed(2)} unmet.</li>)}</ul>
    {previous&&<div className="my-2"><h3>Change from previous layout</h3><p>Drawers: {layout.totalStorage.drawerCount-previous.totalStorage.drawerCount>=0?'+':''}{layout.totalStorage.drawerCount-previous.totalStorage.drawerCount}; rods: {(layout.totalStorage.hangingRods-previous.totalStorage.hangingRods).toFixed(2)} ft.</p>{layout.capacity?.map(c=><p className="text-xs" key={c.label}>{c.label} available change: {(c.available-(previous.capacity?.find(p=>p.label===c.label)?.available??0)).toFixed(2)} {c.unit}</p>)}</div>}
    <h3 className="mt-3">Wall and zone outline</h3>{layout.walls.map(w=>{const free=freeSpans(w.width,w.zones.map(z=>[z.x,z.x+z.width]));return <div key={w.wallId} className="my-2"><h4>{w.label} — {w.width} in wide, {w.unitDepth} in deep</h4><p className="text-xs">Unallocated width: {free.reduce((n,[a,b])=>n+b-a,0).toFixed(2)} in. Reserved openings/obstacles and spans under 12 in remain unused.</p><ol className="list-decimal pl-5 text-sm">{w.zones.map((z,i)=><li key={i}>{onZone&&<button className="underline" onClick={()=>onZone(w.wallId,i)}>Show {w.label} zone {i+1}</button>} {z.type}: starts {z.x.toFixed(2)} in from left, {z.width.toFixed(2)} in wide × {z.height.toFixed(2)} in high. {z.contentLabel||'General storage allocation'}. {z.type==='long-hang'?'Allocated for long garments.':z.type==='double-hang'?'Allocated for short garments and suit pieces.':z.type==='drawers'?'Allocated for folded items, jewelry, or accessory demand.':z.type==='shoe-shelves'?'Allocated for shoe counts and clearance.':'Allocated for bags, belts, folded items, or remaining upper storage.'}</li>)}</ol></div>;})}
    <button className="border rounded px-3 py-2" onClick={()=>{setCompared(true);const options=(['many-small','few-large','mixed'] as const).map(preference=>({preference,layout:new ClosetLayoutEngine({...config as ClosetConfiguration,userInfo:{...config.userInfo!,drawerPreference:preference}}).calculateLayout()}));setAlternatives(options.filter(a=>!alternativeIssues(a.layout).length));setRejected(options.map(a=>({preference:a.preference,issues:alternativeIssues(a.layout)})).filter(a=>a.issues.length));}}>Compare feasible drawer layouts</button>
    {compared&&<p role="status" className="text-sm my-2">{alternatives.length ? `${alternatives.length} drawer layout options meet the current room, door, aisle, and obstacle checks. Review capacity shortfalls before choosing.` : 'No drawer layout options meet the current room, door, aisle, and obstacle checks. Adjust the room dimensions, cabinet depths, or obstacle positions and compare again.'}</p>}
    {rejected.map(r=><details key={r.preference} className="border rounded p-2"><summary>Why {r.preference} was excluded</summary>{r.issues.map(([group,messages])=><div key={group}><h4>{group}</h4><ul>{messages.map((message,i)=><li key={i}>{message}</li>)}</ul></div>)}</details>)}
    {alternatives.length>0&&<div className="my-2">{alternatives.map(a=><div className="border p-2" key={a.preference}><p>{a.preference}: {a.layout.totalStorage.drawerCount} drawers; {a.layout.totalStorage.hangingRods} ft rods; {a.layout.capacity?.filter(c=>c.required>c.available).length??0} capacity shortfalls.</p><p className="text-xs">Folded capacity delta: {((a.layout.capacity?.find(c=>c.label==='Folded storage')?.available??0)-(layout.capacity?.find(c=>c.label==='Folded storage')?.available??0)).toFixed(2)} standard drawers</p><button disabled={!onChange} onClick={()=>onChange?.({userInfo:{...config.userInfo!,drawerPreference:a.preference}})}>Use {a.preference} alternative</button></div>)}</div>}
  </details>;
}




