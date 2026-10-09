'use client';
import { downloadText } from '@/lib/download';
import { useMemo, useRef, useState } from 'react';
import type { ClosetLayout, UserPreferences } from '@/types/closet';
import { renderSpatial } from '@/renderer/SpatialRenderer';
import { drawerTargets } from '@/lib/drawers';
import { circulation } from '@/lib/roomGeometry';

export function SpatialPreview({layout,preferences,onDrawerClick}:{layout:ClosetLayout;preferences?:UserPreferences;onDrawerClick?:(id:string)=>void}) {
  const [angle,setAngle]=useState(-25),[zoom,setZoom]=useState(100),[labels,setLabels]=useState(true),[islandOnly,setIslandOnly]=useState(false);
  const [elevation,setElevation]=useState(33),[hiddenWalls,setHiddenWalls]=useState<string[]>([]),[dragMode,setDragMode]=useState(false);
  const [downloadError,setDownloadError]=useState('');
  const drag=useRef<{x:number;angle:number;id:number}|null>(null),moved=useRef(false);
  const visibleDrawers=drawerTargets(layout).filter(d=>!hiddenWalls.includes(d.id.split(':')[0])&&(!islandOnly||d.id.startsWith('island-unit:')));
  const island=layout.walls.find(w=>w.wallId==='island-unit'&&w.zones.length);
  const options={angle,elevation,labels,islandOnly:!!island&&islandOnly,hiddenWalls,style:preferences?.stylePreference,woodFinish:preferences?.woodFinish,hardwareFinish:preferences?.hardwareFinish};
  const svg=useMemo(()=>renderSpatial(layout,{angle,elevation,labels,islandOnly:!!island&&islandOnly,hiddenWalls,style:preferences?.stylePreference,woodFinish:preferences?.woodFinish,hardwareFinish:preferences?.hardwareFinish,interactive:!!onDrawerClick}),[layout,angle,elevation,labels,islandOnly,island,hiddenWalls,preferences?.stylePreference,preferences?.woodFinish,preferences?.hardwareFinish,onDrawerClick]);
  const reset=()=>{setAngle(-25);setElevation(33);setZoom(100);setIslandOnly(false);setHiddenWalls([]);setDragMode(false);};
  const openDrawer=(target:EventTarget|null)=>{const id=target instanceof Element?target.closest('[data-spatial-drawer]')?.getAttribute('data-spatial-drawer'):null;if(id&&visibleDrawers.some(d=>d.id===id))onDrawerClick?.(id);};
  const download=()=>{try{downloadText(renderSpatial(layout,options),'closet-spatial-view.svg','image/svg+xml');setDownloadError('');}catch{setDownloadError('The 3D drawing could not be downloaded. Please try again.');}};
  return <section aria-label="3D room preview" className="border border-cream-300 rounded-xl p-3 my-3">
    <h3 className="font-semibold">3D room view</h3>
    {downloadError&&<p role="alert">{downloadError}</p>}
    <p className="text-sm my-2">See the generated cabinets together at their actual proportions. Open room boundaries keep the storage visible. Configured windows and door swings appear here; check obstacles in the floor plan.</p>
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <button className="border rounded px-3 py-2" onClick={()=>setAngle(a=>(a-45)%360)}>Rotate left</button>
      <button className="border rounded px-3 py-2" onClick={()=>setAngle(a=>(a+45)%360)}>Rotate right</button>
      <button className="border rounded px-3 py-2" onClick={reset}>Reset 3D view</button>
      <label>Camera preset <select className="border rounded p-2" value="" onChange={e=>{const camera:Record<string,[number,number]>={front:[0,15],rear:[180,15],left:[90,15],right:[-90,15],overhead:[0,90],perspective:[-25,33]};const next=camera[e.target.value];if(next){setAngle(next[0]);setElevation(next[1]);}}}><option value="">Choose camera</option>{['front','rear','left','right','overhead','perspective'].map(v=><option key={v} value={v}>{v}</option>)}</select></label>
      <button className="border rounded px-3 py-2" onClick={download}>Download 3D SVG</button>
      <label><input type="checkbox" checked={dragMode} onChange={e=>setDragMode(e.target.checked)}/> Drag to rotate</label>
      <label>3D zoom <input type="range" min="75" max="175" step="25" value={zoom} onChange={e=>setZoom(+e.target.value)}/><span>{zoom}%</span></label>
      <label><input type="checkbox" checked={labels} onChange={e=>setLabels(e.target.checked)}/> 3D labels</label>
      {island&&<label><input type="checkbox" checked={islandOnly} onChange={e=>setIslandOnly(e.target.checked)}/> Isolate island</label>}
    </div>
    <details className="my-2 text-sm"><summary>Visible storage walls</summary><div className="flex flex-wrap gap-3">{layout.walls.filter(w=>w.zones.length).map(w=><label key={w.wallId}><input type="checkbox" checked={!hiddenWalls.includes(w.wallId)} onChange={e=>setHiddenWalls(ids=>e.target.checked?ids.filter(id=>id!==w.wallId):[...ids,w.wallId])}/> Show {w.label} in 3D</label>)}</div></details>
    <p className="text-xs my-2">{dragMode?'Drag horizontally to rotate. Turn this off to scroll or select a drawer.':'Scroll normally; enable Drag to rotate for pointer or touch rotation.'} Camera: {angle}° rotation, {elevation}° elevation.</p>
    {/* Keyboard focus allows arrow-key scrolling when the drawing is zoomed. */}
    {/* Events are delegated to keyboard-focusable SVG drawer buttons; rotation also has native button controls. */}
    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
    <div role="region" className="overflow-auto max-h-[38rem] mt-3 border rounded" tabIndex={0} aria-label="Scrollable 3D drawing"><div role="group" aria-label="3D model controls" style={{width:`${zoom}%`,margin:'auto',touchAction:dragMode?'none':'auto'}}
      onPointerDown={e=>{moved.current=false;if(!dragMode||!e.isPrimary||e.button!==0)return;drag.current={x:e.clientX,angle,id:e.pointerId};e.currentTarget.setPointerCapture(e.pointerId);}}
      onPointerMove={e=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;const delta=e.clientX-d.x;if(Math.abs(delta)>4)moved.current=true;setAngle(Math.round(d.angle+delta*.5)%360);}}
      onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;moved.current=true;}}
      onClick={e=>{if(!dragMode&&!moved.current)openDrawer(e.target);}}
      onKeyDown={e=>{if((e.key==='Enter'||e.key===' ')&&(e.target as Element).closest('[data-spatial-drawer]')){e.preventDefault();openDrawer(e.target);}}}
      dangerouslySetInnerHTML={{__html:svg}}/></div>
    {onDrawerClick&&visibleDrawers.length>0&&<details className="my-2 text-sm"><summary>Open a drawer from this view</summary><p>Click a visible drawer face, or choose its exact location below.</p><div className="flex flex-wrap gap-2">{visibleDrawers.map(d=><button className="border rounded px-2 py-1" key={d.id} onClick={()=>onDrawerClick(d.id)}>{d.label}</button>)}</div></details>}
    {island&&<><p className="text-sm mt-2">Freestanding island: {island.width} × {island.unitDepth} in footprint · {island.height} in counter height. Drawers and open shelves face the front of the room.</p><ul className="flex flex-wrap gap-x-5 text-sm" aria-label="Island clearances">{circulation(layout).aisles.map(a=><li key={a.name}>{a.name}: {a.width.toFixed(1)} in{a.width<(layout.planning?.clearanceTarget??36)?' — below clearance target':''}</li>)}</ul></>}
    {layout.closetType==='island'&&!island&&<p role="status" className="text-sm text-amber-800 mt-2">Island omitted: this room cannot fit the island with the configured aisle clearance. Increase room dimensions or reduce storage depth.</p>}
  </section>;
}
