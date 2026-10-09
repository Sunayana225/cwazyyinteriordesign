'use client';
import {useState} from 'react';
import type {ClosetLayout} from '@/types/closet';
import {elevationMeasurements} from '@/lib/elevationMeasurements';
export default function ElevationMeasurements({layout,onZone}:{layout:ClosetLayout;onZone?:(wall:string,index:number)=>void}){
  const [selected,setSelected]=useState<string>(layout.walls[0]?.wallId??''),[unit,setUnit]=useState('in');
  const wall=layout.walls.find(w=>w.wallId===selected)??layout.walls[0];if(!wall)return <p>No elevation is available.</p>;
  const zones=elevationMeasurements(wall),components=zones.flatMap(z=>z.components),counts=(kind:string)=>components.filter(c=>c.kind===kind).length;
  const measurements=(values:Array<[string,number]>)=><dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 text-sm">{values.map(([label,value])=><div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd className="whitespace-nowrap">{(value*(unit==='cm'?2.54:1)).toFixed(2)} {unit}</dd></div>)}</dl>;
  return <section aria-label="Elevation component measurements" className="settings-card my-3"><h3>Read the elevation measurements</h3><p className="text-sm my-2">Dimensions come from the current model. All vertical datums use the finished floor, including raised cabinet bases. Drawer values describe boxes; shelf spacing is the model spacing. These are planning dimensions, not fabrication cut sizes.</p>
    <div className="flex flex-wrap gap-4 my-3"><label>Elevation to inspect<select className="block border rounded p-2" value={wall.wallId} onChange={e=>setSelected(e.target.value)}>{layout.walls.map(w=><option key={w.wallId} value={w.wallId}>{w.label} ({w.elevationRef})</option>)}</select></label><label>Measurement display units<select className="block border rounded p-2" value={unit} onChange={e=>setUnit(e.target.value)}><option value="in">Inches</option><option value="cm">Centimetres</option></select></label></div>
    {measurements([['Wall width',wall.width],['Cabinet top above finished floor',wall.height],['Cabinet depth',wall.unitDepth]])}
    <p role="status" className="my-2 text-sm">{zones.length} zones · {counts('Shelf')} shelf boards · {counts('Rod')} rods · {counts('Drawer')} drawer boxes</p>
    {!zones.length&&<p>No storage components are generated on this wall. Review its reserved spans and fit notices.</p>}
    {zones.map(z=><details key={wall.wallId+':'+z.index} className="border rounded p-3 my-2"><summary>Zone {z.index+1}: {z.type.replace(/-/g,' ')} — {z.components.length} {z.components.length===1?'component':'components'}</summary><p className="text-sm my-2">{z.label}</p>{measurements(z.values)}{onZone&&<button className="underline my-2" onClick={()=>onZone(wall.wallId,z.index)}>Highlight zone {z.index+1} in drawing</button>}<ol className="space-y-3 mt-3">{z.components.map(c=><li key={c.kind+c.index}><h4 className="font-semibold text-sm">{c.kind} {c.index+1} · {c.purpose}</h4>{measurements(c.values)}</li>)}</ol></details>)}
  </section>;
}
