'use client';
import {useMemo} from 'react';
import type {ClosetConfiguration} from '@/types/closet';
import {ClosetLayoutEngine} from '@/engine/ClosetLayoutEngine';
import {applyRoomShell,type Shell} from '@/lib/roomShells';
import {alternativeIssues,roomSize} from '@/lib/roomGeometry';
import {renderFloorPlan} from '@/renderer/FloorPlanRenderer';
import {drawerTargets,resolveOrganizers} from '@/lib/drawers';

export default function RoomShellPreview({config,shell}:{config:Partial<ClosetConfiguration>;shell:Shell}){
  const result=useMemo(()=>{
    const current=new ClosetLayoutEngine(config as ClosetConfiguration).calculateLayout();
    const proposed=new ClosetLayoutEngine({...config,...applyRoomShell(config,shell)} as ClosetConfiguration).calculateLayout();
    const plans=config.drawerInteriors??{},targets=drawerTargets(proposed),matched=resolveOrganizers(plans,targets);
    return {current,proposed,issues:alternativeIssues(proposed),retained:Object.keys(matched).filter(id=>!targets.some(target=>target.id===id)).length};
  },[config,shell]);
  return <section aria-label="Room shell geometry preview" className="border rounded p-3 my-3"><h4 className="font-semibold">Layout before applying</h4>
    <p className="text-sm">Your inventory and fit measurements are used in both layouts. No room changes have been applied.</p>
    <div className="grid gap-3 lg:grid-cols-2">{([['Current room',result.current],['Proposed room',result.proposed]] as const).map(([label,layout])=>{
      const room=roomSize(layout);
      return <figure key={label}><figcaption className="text-sm font-semibold">{label}</figcaption><div role="img" aria-label={`${label} floor plan`} dangerouslySetInnerHTML={{__html:renderFloorPlan(layout,{roomWidth:room.width,roomDepth:room.depth,unitDepth:layout.dimensions.depth})}}/></figure>;
    })}</div>
    <h5 className="font-semibold mt-3">Storage impact</h5><ul className="text-sm">{result.proposed.capacity?.filter(r=>r.required>0||r.available!==(result.current.capacity?.find(c=>c.label===r.label)?.available??0)).map(r=><li key={r.label}>{r.label}: {(result.current.capacity?.find(c=>c.label===r.label)?.available??0).toFixed(2)} → {r.available.toFixed(2)} {r.unit}; short by {Math.max(0,r.required-r.available).toFixed(2)}.</li>)}</ul>
    <p className="text-sm">{result.retained} organizer plans may need reassignment after applying this room.</p>
    {result.issues.length?<details open><summary>Proposed room conflicts</summary>{result.issues.map(([group,messages])=><p key={group} className="text-sm">{group}: {messages.join('; ')}</p>)}</details>:<p className="text-sm">No conflicts detected by the current room checks.</p>}
  </section>;
}
