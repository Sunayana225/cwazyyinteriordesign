import type {ClosetConfiguration,ClosetLayout} from '@/types/closet';
import type {PrintSettings} from './printSettings';
import {workspaceReview} from './workspaceReview';
import {surveyState} from './surveyReview';
import {unassessedStorage} from './storageFit';

/** Export checks always use the captured design, including conflicts on walls
 * excluded from the drawing selection. Selecting fewer pages cannot clear them. */
export function exportPreflight(layout:ClosetLayout,config:Partial<ClosetConfiguration>,settings:Pick<PrintSettings,'walls'|'floorPlan'>){
  const survey=surveyState(config),review=workspaceReview('architect',layout,survey);
  const omitted=layout.walls.filter(w=>settings.walls&&!settings.walls.includes(w.wallId)).map(w=>({id:w.wallId,label:w.label,reference:w.elevationRef,windows:layout.planning?.windows?.filter(v=>v.wall===w.wallId).length??0}));
  const scope=[...omitted.map(w=>`${w.label} (${w.reference}) elevation omitted${w.windows?`; ${w.windows} recorded window${w.windows===1?'':'s'} on this wall`:''}.`),...(!settings.floorPlan&&layout.planning?.door?['The configured door is not shown in a floor-plan drawing in this package.']:[])];
  const shortages=review.fit.shortfalls.map(r=>`${r.label}: short by ${(r.required-r.available).toFixed(2)} ${r.unit}.`);
  const surveyNote=survey==='current'?'Survey inputs confirmed for this geometry. This is not construction approval.':survey==='stale'?'Survey confirmation is out of date. Geometry or survey records changed after review.':'Survey inputs have not been confirmed.';
  return {geometry:review.issues,shortages,notices:review.notices,scope,omitted,surveyNote,unassessed:unassessedStorage(config)};
}
