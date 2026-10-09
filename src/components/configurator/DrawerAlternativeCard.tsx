'use client';
import dynamic from 'next/dynamic';
import {useMemo,useState} from 'react';
import type {ClosetConfiguration,ClosetLayout} from '@/types/closet';
import type {DrawerAlternative} from '@/lib/layoutAlternatives';
import {organizerImpact} from '@/lib/organizerImpact';
import {storageFit} from '@/lib/storageFit';
const AlternativeElevationPreview=dynamic(()=>import('./AlternativeElevationPreview'));

export default function DrawerAlternativeCard({alternative:a,current,config,onChange}:{alternative:DrawerAlternative;current:ClosetLayout;config:Partial<ClosetConfiguration>;onChange?:(patch:Partial<ClosetConfiguration>)=>void}){
  const [show,setShow]=useState(false),[review,setReview]=useState<{plans:typeof config.drawerInteriors;current:ClosetLayout;proposed:ClosetLayout}|null>(null);
  const impact=useMemo(()=>organizerImpact(config.drawerInteriors,current,a.layout),[config.drawerInteriors,current,a.layout]);
  const reviewed=review?.plans===config.drawerInteriors&&review?.current===current&&review?.proposed===a.layout;
  return <section className="border rounded p-3 my-2" aria-label={`${a.preference} layout option`}>
    <h4>{a.preference}: {a.layout.totalStorage.drawerCount} drawers; {a.layout.totalStorage.hangingRods.toFixed(2)} ft rods</h4><p className="text-sm">{storageFit(a.layout.capacity).shortfalls.length} capacity shortfalls · weighted unmet demand {(a.score*100).toFixed(1)}%</p>
    {a.equivalentPreferences.length>1&&<p className="text-xs">Same geometry for: {a.equivalentPreferences.join(', ')}.</p>}
    <h5 className="text-sm mt-2">Capacity changes before applying</h5>{a.changes.length?<ul className="text-xs list-disc pl-5">{a.changes.map(change=><li key={change.label} className={change.delta<0?'text-amber-900':''}>{change.label}: {change.delta>0?'gains':'loses'} {Math.abs(change.delta).toFixed(2)} {change.unit}</li>)}</ul>:<p className="text-xs">No measured capacity change from the current layout.</p>}
    <button className="underline my-2" aria-expanded={show} onClick={()=>setShow(!show)}>{show?'Hide':'Compare'} {a.preference} elevations</button>
    {show&&config.userInfo&&<AlternativeElevationPreview current={current} proposed={a.layout} preferences={config.userInfo}/>}
    {impact.changes.length>0&&<div className="border rounded p-3 my-2"><h5 className="font-semibold">Organizer changes to review</h5><ul className="text-sm">{impact.changes.map(change=><li key={change.id}><strong>{change.name||'Unnamed organizer'}</strong>: {change.kind==='unassigned'?'no matching drawer; retained for reassignment.':`${change.before.width} × ${change.before.depth} × ${change.before.height} → ${change.after!.width} × ${change.after!.depth} × ${change.after!.height} in. Check compartment and item fit.`}</li>)}</ul><label className="block text-sm mt-2"><input type="checkbox" checked={reviewed} onChange={e=>setReview(e.target.checked?{plans:config.drawerInteriors,current,proposed:a.layout}:null)}/> I reviewed the organizer changes for {a.preference}</label></div>}
    <button className="border rounded px-3 py-2 mt-2" disabled={!onChange||(impact.changes.length>0&&!reviewed)} onClick={()=>{if(impact.changes.length&&!reviewed)return;onChange?.({userInfo:{...config.userInfo!,drawerPreference:a.preference},...(config.drawerInteriors?{drawerInteriors:impact.plans}:{})});}}>Use {a.preference} alternative</button>
  </section>;
}
