import { useEffect, useMemo, useRef } from 'react';
import type { ClosetConfiguration, ClosetLayout } from '@/types/closet';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { alternativeIssues, obstacleSuggestions, roomSize } from '@/lib/roomGeometry';
import { layoutInputKey } from '@/lib/preview';
import { renderFloorPlan } from '@/renderer/FloorPlanRenderer';

export interface ObstacleProposal {id:string;x:number;y:number;source:string;}
export default function ObstacleMovePreview({config,layout,proposal,onApply,onClose}:{
  config:Partial<ClosetConfiguration>;layout:ClosetLayout;proposal:ObstacleProposal;
  onApply:()=>void;onClose:()=>void;
}) {
  const root=useRef<HTMLElement>(null),object=config.planning?.obstacles?.find(o=>o.id===proposal.id);
  const stale=proposal.source!==layoutInputKey(config,config.zoneOverrides??{});
  const preview=useMemo(()=>!object||stale?null:new ClosetLayoutEngine({...config,planning:{...config.planning,obstacles:config.planning!.obstacles!.map(o=>o.id===proposal.id?{...o,x:proposal.x,y:proposal.y}:o)}} as ClosetConfiguration).calculateLayout(),[config,object,proposal,stale]);
  useEffect(()=>{root.current?.focus();},[]);
  const allowed=!!preview&&obstacleSuggestions(layout,proposal.id).some(p=>p.x===proposal.x&&p.y===proposal.y);
  const issues=preview?alternativeIssues(preview):[];
  const room=preview?roomSize(preview):null;
  return <section ref={root} tabIndex={-1} className="settings-card my-3" aria-label="Obstacle move preview">
    <h3>Obstacle move preview</h3>
    {!preview||!object?<p role="status">The design changed. Close this preview and choose a fresh suggestion.</p>:<>
      <p><strong>{object.label}</strong>: X {object.x} → {proposal.x} in; Y {object.y} → {proposal.y} in.</p>
      <p className="text-sm">Nothing has moved yet. Only apply this position if the object can actually be relocated. Fixed columns must keep their surveyed position.</p>
      <div role="img" aria-label={`Proposed floor plan with ${object.label} at X ${proposal.x}, Y ${proposal.y} inches`} dangerouslySetInnerHTML={{__html:renderFloorPlan(preview,{roomWidth:room!.width,roomDepth:room!.depth,unitDepth:preview.dimensions.depth})}}/>
      <h4>Storage capacity after moving</h4>
      <ul className="text-sm">{preview.capacity?.filter(row=>row.required>0||row.available!==(layout.capacity?.find(c=>c.label===row.label)?.available??0)).map(row=><li key={row.label}>{row.label}: {(layout.capacity?.find(c=>c.label===row.label)?.available??0).toFixed(2)} → {row.available.toFixed(2)} {row.unit}; short by {Math.max(0,row.required-row.available).toFixed(2)}.</li>)}</ul>
      {issues.length?<details open><summary>Room checks after moving</summary>{issues.map(([group,messages])=><p className="text-sm" key={group}>{group}: {messages.join('; ')}</p>)}</details>:<p>No conflicts found by the current room checks.</p>}
      {!allowed&&<p role="status">This position is no longer a clear suggestion. Choose another position.</p>}
    </>}
    <div className="flex flex-wrap gap-3 mt-3"><button type="button" disabled={!allowed||stale} onClick={()=>{if(allowed&&!stale)onApply();}}>Apply obstacle move</button><button type="button" onClick={onClose}>Cancel obstacle move</button></div>
  </section>;
}
