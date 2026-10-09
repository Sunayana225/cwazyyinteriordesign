'use client';
import {useMemo,useRef,useState} from 'react';
import type {ClosetLayout,UserPreferences} from '@/types/closet';
import {ClosetSVGRenderer} from '@/renderer/ClosetSVGRenderer';
import {wallElevation} from '@/lib/wallElevation';
import {DrawingCanvas,type CanvasView} from './DrawingCanvas';

export default function AlternativeElevationPreview({current,proposed,preferences}:{current:ClosetLayout;proposed:ClosetLayout;preferences:UserPreferences}){
  const [selected,setSelected]=useState(current.walls[0]?.wallId??proposed.walls[0]?.wallId),views=useRef(new Map<string,CanvasView>());
  const walls=Array.from(new Map([...current.walls,...proposed.walls].map(w=>[w.wallId,w])).values());
  const drawings=useMemo(()=>([['Current elevation',current],['Proposed elevation',proposed]] as const).map(([label,layout])=>{
    const wall=layout.walls.find(w=>w.wallId===selected);
    return {label,svg:wall?new ClosetSVGRenderer(wallElevation(layout,wall),{showDimensions:true,showLabels:true,style:preferences.stylePreference,woodFinish:preferences.woodFinish,hardwareFinish:preferences.hardwareFinish,accentColor:preferences.accentColor}).renderElevation():null};
  }),[current,proposed,selected,preferences]);
  return <section aria-label="Alternative elevation comparison" className="my-3"><label className="block">Comparison wall<select className="border rounded p-2 w-full" value={selected} onChange={e=>setSelected(e.target.value as typeof selected)}>{walls.map(w=><option value={w.wallId} key={w.wallId}>{w.label}</option>)}</select></label>
    <p className="text-xs my-2">Inspect the same wall before and after. Dimensions are in inches; each view has independent zoom and enlargement controls.</p>
    <div className="grid gap-4 xl:grid-cols-2">{drawings.map(({label,svg})=><section key={label} aria-label={label} className="min-w-0"><h5 className="font-semibold">{label}</h5>{svg?<DrawingCanvas key={`${label}-${selected}`} svg={svg} views={views.current} viewKey={`${label}-${selected}`}/>:<p>This wall is absent from this layout.</p>}</section>)}</div>
  </section>;
}
