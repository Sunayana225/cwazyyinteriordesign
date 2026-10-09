'use client';
import dynamic from 'next/dynamic';
import type { ClosetLayout, UserRole, UserPreferences, ClosetConfiguration } from '@/types/closet';
import type { StudioTool } from '@/lib/userRoles';
import { workspaceReview } from '@/lib/workspaceReview';
import { WOOD_OPTIONS, STYLE_OPTIONS } from '@/lib/design';
import { confirmSurvey, surveyState } from '@/lib/surveyReview';
import { unassessedStorage } from '@/lib/storageFit';
const SurveyRecordEditor=dynamic(()=>import('./SurveyRecordEditor'));
const SurveyChanges=dynamic(()=>import('./SurveyChanges'));
const DrawingRecordEditor=dynamic(()=>import('./DrawingRecordEditor'));

/** These are measured model checks, not a certification of the survey or installation. */
export function WorkspaceReview({role,layout,preferences,config,onChange,onAction}:{role:UserRole;layout:ClosetLayout;preferences?:UserPreferences;config:Partial<ClosetConfiguration>;onChange?:(change:Partial<ClosetConfiguration>)=>void;onAction:(tool:StudioTool)=>void}) {
  if(role==='browsing')return null;
  const p=layout.planning??{};
  const survey=surveyState(config);
  const {issues,fit,objects,notices,next}=workspaceReview(role,layout,survey);
  const technical=role==='architect'||role==='renter';
  const heading=role==='architect'?'Architect coordination review':role==='renter'?'Existing-room review':role==='designer'?'Client presentation review':'Your storage review';
  return <section className="studio-role-review" aria-label={heading}>
    <div className="studio-role-review-heading"><h3>{heading}</h3><span>Live model checks</span></div>
    <details><summary>Drawing references, revision, and status</summary><DrawingRecordEditor record={config.drawingRecord} walls={layout.walls} onChange={onChange?drawingRecord=>onChange({drawingRecord}):undefined}/></details>
    <div className="studio-role-next"><div><span>Suggested next step</span><h4>{next.title}</h4><p>{next.detail}</p></div><button type="button" onClick={()=>onAction(next.action)}>Open {next.action==='room'?'room checks':next.action==='fit'?'storage fit':next.action==='inventory'?'household planner':next.action==='print'?'print options':'saved designs'}</button></div>
    {role==='designer'&&preferences&&<div className="studio-role-palette"><p><strong>Current material direction</strong><br/>{STYLE_OPTIONS.find(s=>s.id===preferences.stylePreference)?.name} · {WOOD_OPTIONS.find(w=>w.id===preferences.woodFinish)?.name} · Hardware: {preferences.hardwareFinish??'automatic for selected style'}</p><button type="button" onClick={()=>onAction('style')}>Refine finishes</button><button type="button" onClick={()=>onAction('library')}>Compare saved options</button></div>}
    <div className="studio-role-metrics">
      {technical?<button type="button" onClick={()=>onAction('room')}><strong>{objects}</strong><span>Room objects recorded</span></button>:<button type="button" onClick={()=>onAction('inventory')}><strong>{fit.covered} / {fit.total}</strong><span>Requested categories covered</span></button>}
      <button type="button" onClick={()=>onAction('room')}><strong>{issues.length}</strong><span>Modeled room conflicts</span></button>
      <button type="button" onClick={()=>onAction('fit')}><strong>{fit.shortfalls.length}</strong><span>Storage categories short</span></button>
    </div>
    {unassessedStorage(config)&&<p className="text-sm my-2 text-amber-900">{unassessedStorage(config)}</p>}
    {fit.shortfalls.length>0&&<details><summary>See what needs more space</summary><ul>{fit.shortfalls.map(row=><li key={row.label}><strong>{row.label}</strong>: needs {Number(row.required.toFixed(2))}, provides {Number(row.available.toFixed(2))} {row.unit} — short by {Number((row.required-row.available).toFixed(2))}.</li>)}</ul><button className="studio-role-link" type="button" onClick={()=>onAction('fit')}>Review allocation and alternatives</button></details>}
    {notices.length>0&&<details><summary>Review {notices.length} layout {notices.length===1?'notice':'notices'}</summary><ul>{notices.map(notice=><li key={notice}>{notice}</li>)}</ul></details>}
    {issues.length>0&&<details><summary>Review {issues.length} room {issues.length===1?'conflict':'conflicts'}</summary><ul>{issues.map(issue=><li key={issue}>{issue}</li>)}</ul></details>}
    <div className="studio-role-survey" aria-label="Room survey review">
      <h4>Room survey</h4><p role="status">{survey==='current'?`Confirmed for this geometry on ${new Date(config.surveyConfirmation!.confirmedAt).toLocaleDateString()}.`:survey==='stale'?'Room changed since confirmation, or the survey record was edited. Review the changes and confirm again.':'Not confirmed. Check measurements and record every relevant fixed feature.'}</p>
      {survey==='stale'&&<SurveyChanges config={config}/>}
      <details open={role==='architect'?true:undefined}><summary>Survey author and date</summary><SurveyRecordEditor record={config.surveyRecord} onChange={onChange?surveyRecord=>onChange({surveyRecord}):undefined}/></details>
      {objects===0&&survey!=='current'&&<p>No doors, windows, or obstacles recorded yet. If there are none affecting the cabinetry, you can confirm that after reviewing the room.</p>}
      <p>This records your review of the survey inputs; it does not clear model conflicts or approve installation.</p>
      {survey==='current'?<button className="studio-role-link" disabled={!onChange} type="button" onClick={()=>onChange?.({surveyConfirmation:undefined})}>Clear survey confirmation</button>:<button className="studio-role-link" disabled={!onChange} type="button" onClick={()=>onChange?.({surveyConfirmation:confirmSurvey(config)})}>I checked the measurements and fixed features</button>}
    </div>
    {role==='architect'&&<details><summary>Wall dimensions and offsets</summary>
      <div className="studio-role-table" role="region" aria-label="Wall dimension schedule" tabIndex={0}>
        <table><caption>Modeled cabinet dimensions · inches</caption><thead><tr><th scope="col">Wall</th><th scope="col">Width</th><th scope="col">Height</th><th scope="col">Usable depth</th><th scope="col">Floor offset</th></tr></thead>
          <tbody>{layout.walls.map(w=><tr key={w.wallId}><th scope="row">{w.label}</th><td>{w.width.toFixed(2)}</td><td>{w.height.toFixed(2)}</td><td>{Math.max(0,w.unitDepth-(p.walls?.[w.wallId]?.baseboard??0)).toFixed(2)}</td><td>{(p.walls?.[w.wallId]?.floorOffset??0).toFixed(2)}</td></tr>)}</tbody>
        </table>
      </div>
      <p>Dimensions describe the current model. Verify the site survey and construction details separately.</p>
    </details>}
  </section>;
}
