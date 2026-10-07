'use client';
import { useEffect, useRef, useState } from 'react';
import type { ClosetConfiguration, ClosetLayout } from '@/types/closet';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { freeSpans, storageObstacleConflicts } from '@/lib/planning';
import { doorAssessment, roomIssues, alternativeIssues } from '@/lib/roomGeometry';
import { FOLDED_PER_DRAWER, SHOE_PAIR_WIDTH } from '@/lib/design';
import { storageFit } from '@/lib/storageFit';

export function LayoutInsights({layout,config,onChange,onZone}:{layout:ClosetLayout;config:Partial<ClosetConfiguration>;onChange?:(c:Partial<ClosetConfiguration>)=>void;onZone?:(wall:string,index:number)=>void}){
  const last=useRef(layout),[previous,setPrevious]=useState<ClosetLayout|null>(null),[alternatives,setAlternatives]=useState<Array<{preference:'mixed'|'many-small'|'few-large';layout:ClosetLayout}>>([]);
  const [rejected,setRejected]=useState<Array<{preference:string;issues:Array<[string,string[]]>}>>([]);
  const [compared,setCompared]=useState(false);
  const fit=storageFit(layout.capacity);
  const capacity=[...(layout.capacity??[])].sort((a,b)=>Number(b.required>b.available+.01)-Number(a.required>a.available+.01));
  const upper=layout.walls.flatMap(w=>w.zones).filter(z=>z.contentLabel==='Upper storage for seasonal items');
  const upperBoards=upper.reduce((n,z)=>n+(z.shelves?.length??0),0);
  useEffect(()=>{if(last.current!==layout){setPrevious(last.current);last.current=layout;setAlternatives([]);setRejected([]);setCompared(false);}},[layout]);
  return <details id="studio-fit-tools" className="border rounded p-3 my-3"><summary>Capacity assumptions, allocation, and alternatives</summary>
    <p className="text-sm my-2">Long hanging uses 2.5 inches per item; short hanging uses 1.8 inches, with suits counted twice. Folded capacity is scaled to a 9-inch drawer: {Object.entries(FOLDED_PER_DRAWER).map(([k,v])=>`${v} ${k}`).join(', ')}. Shoe widths per pair: {Object.entries(SHOE_PAIR_WIDTH).map(([k,v])=>`${k} ${v} in`).join(', ')}. Whole shelf capacities round down; required shelf counts round up. Shelf support-span assumption: {config.planning?.supportSpan??32} inches.</p>
    <section className="my-4 rounded-lg border border-sage-200 bg-cream-50 p-4" aria-label="Storage fit summary">
      <h3 className="font-semibold">{fit.total?`${fit.covered} of ${fit.total} storage needs covered`:'Add inventory to assess storage fit'}</h3>
      <p className="text-sm my-2">Hanging widths follow your clothing quantities and the number of rods that fit around drawers. Shoe widths account for the shelf heights you set. Edited column widths take precedence.</p>
      <p className="text-sm">{upperBoards?`${upperBoards} upper storage shelves added above hanging or shoes. These are extra seasonal spaces and do not count as drawer capacity.`:config.planning?.upperStorage===false?'Upper storage is off. Enable it in Fit assumptions to use spare height.':'No additional upper shelf meets the current minimum opening.'}</p>
      <div className="overflow-x-auto mt-3" role="region" aria-label="Capacity details" tabIndex={0}>
        <table className="hidden sm:table w-full text-sm text-left"><caption className="sr-only">Inventory requirements and available storage capacity</caption><thead><tr className="border-b"><th scope="col" className="py-2 pr-3">Storage</th><th scope="col" className="py-2 pr-3">Required</th><th scope="col" className="py-2 pr-3">Available</th><th scope="col" className="py-2">Fit</th></tr></thead>
          <tbody>{capacity.map(c=>{
            const missing=Math.max(0,c.required-c.available);
            return <tr key={c.label} className="border-b border-sage-100"><th scope="row" className="py-3 pr-3 font-medium">{c.label}<span className="block text-xs font-normal text-gray-600">{c.unit}</span></th><td className="py-3 pr-3 tabular-nums">{c.required.toFixed(2)}</td><td className="py-3 pr-3 tabular-nums">{c.available.toFixed(2)}</td><td className="py-3">{c.required===0?'No demand':missing>.01?<span className="text-amber-900">Needs {missing.toFixed(2)} more</span>:<span className="text-green-800">Covered</span>}</td></tr>;
          })}</tbody></table>
        <ul className="space-y-3 sm:hidden">{capacity.map(c=><li key={c.label} className="border-b border-sage-100 pb-3 text-sm"><h4 className="font-medium">{c.label}</h4><p className="text-xs text-gray-600">{c.unit}</p><p className="mt-1">{c.required.toFixed(2)} required · {c.available.toFixed(2)} available</p><p className="font-medium">{c.required===0?'No demand':c.required>c.available+.01?`Needs ${(c.required-c.available).toFixed(2)} more`:'Covered'}</p></li>)}</ul>
      </div>
    </section>
    {previous&&<div className="my-2"><h3>Change from previous layout</h3><p>Drawers: {layout.totalStorage.drawerCount-previous.totalStorage.drawerCount>=0?'+':''}{layout.totalStorage.drawerCount-previous.totalStorage.drawerCount}; rods: {(layout.totalStorage.hangingRods-previous.totalStorage.hangingRods).toFixed(2)} ft.</p>{layout.capacity?.map(c=><p className="text-xs" key={c.label}>{c.label} available change: {(c.available-(previous.capacity?.find(p=>p.label===c.label)?.available??0)).toFixed(2)} {c.unit}</p>)}</div>}
    <h3 className="mt-3">Wall and zone outline</h3>{layout.walls.map(w=>{const free=freeSpans(w.width,w.zones.map(z=>[z.x,z.x+z.width]));return <div key={w.wallId} className="my-2"><h4>{w.label} — {w.width} in wide, {w.unitDepth} in deep</h4><p className="text-xs">Unallocated width: {free.reduce((n,[a,b])=>n+b-a,0).toFixed(2)} in. Reserved openings/obstacles and spans under 12 in remain unused.</p><ol className="list-decimal pl-5 text-sm">{w.zones.map((z,i)=><li key={i}>{onZone&&<button className="underline" onClick={()=>onZone(w.wallId,i)}>Show {w.label} zone {i+1}</button>} {z.type}: starts {z.x.toFixed(2)} in from left, {z.width.toFixed(2)} in wide × {z.height.toFixed(2)} in high. {z.contentLabel||'General storage allocation'}. {z.type==='long-hang'?'Allocated for long garments.':z.type==='double-hang'?'Allocated for short garments and suit pieces.':z.type==='drawers'?'Allocated for folded items, jewelry, or accessory demand.':z.type==='shoe-shelves'?'Allocated for shoe counts and clearance.':'Allocated for bags, belts, folded items, or remaining upper storage.'}</li>)}</ol></div>;})}
    <button className="border rounded px-3 py-2" onClick={()=>{setCompared(true);const options=(['many-small','few-large','mixed'] as const).map(preference=>({preference,layout:new ClosetLayoutEngine({...config as ClosetConfiguration,userInfo:{...config.userInfo!,drawerPreference:preference}}).calculateLayout()}));setAlternatives(options.filter(a=>!alternativeIssues(a.layout).length));setRejected(options.map(a=>({preference:a.preference,issues:alternativeIssues(a.layout)})).filter(a=>a.issues.length));}}>Compare feasible drawer layouts</button>
    {compared&&<p role="status" className="text-sm my-2">{alternatives.length ? `${alternatives.length} drawer layout options meet the current room, door, aisle, and obstacle checks. Review capacity shortfalls before choosing.` : 'No drawer layout options meet the current room, door, aisle, and obstacle checks. Adjust the room dimensions, cabinet depths, or obstacle positions and compare again.'}</p>}
    {rejected.map(r=><details key={r.preference} className="border rounded p-2"><summary>Why {r.preference} was excluded</summary>{r.issues.map(([group,messages])=><div key={group}><h4>{group}</h4><ul>{messages.map((message,i)=><li key={i}>{message}</li>)}</ul></div>)}</details>)}
    {alternatives.length>0&&<div className="my-2">{alternatives.map(a=><div className="border p-2" key={a.preference}><p>{a.preference}: {a.layout.totalStorage.drawerCount} drawers; {a.layout.totalStorage.hangingRods} ft rods; {a.layout.capacity?.filter(c=>c.required>c.available).length??0} capacity shortfalls.</p><p className="text-xs">Folded capacity delta: {((a.layout.capacity?.find(c=>c.label==='Folded storage')?.available??0)-(layout.capacity?.find(c=>c.label==='Folded storage')?.available??0)).toFixed(2)} standard drawers</p><button disabled={!onChange} onClick={()=>onChange?.({userInfo:{...config.userInfo!,drawerPreference:a.preference}})}>Use {a.preference} alternative</button></div>)}</div>}
  </details>;
}




