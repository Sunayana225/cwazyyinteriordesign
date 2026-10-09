import type { ClosetLayout, UserRole } from '@/types/closet';
import type { StudioTool } from './userRoles';
import { roomIssues, ceilingWarnings, doorAssessment } from './roomGeometry';
import { storageObstacleConflicts } from './planning';
import { storageFit } from './storageFit';

/** Derive guidance from the current model every time; opening a tool is not
 * evidence that a survey, fit issue, or client review has been completed. */
export function workspaceReview(role: UserRole, layout: ClosetLayout, survey:'unconfirmed'|'current'|'stale'='unconfirmed') {
  const p = layout.planning ?? {}, door = doorAssessment(layout);
  const issues = [...new Set([...layout.aisleWarnings, ...ceilingWarnings(layout), ...roomIssues(layout).map(i => i.message),
    ...storageObstacleConflicts(layout).map(label => `Storage intersects ${label}.`),
    ...door.conflicts.map(label => `Door clearance intersects ${label}.`), ...(door.outside ? ['Door extends beyond its wall.'] : [])])];
  const fit = storageFit(layout.capacity);
  const objects = (p.windows?.length ?? 0) + (p.obstacles?.length ?? 0) + (p.door ? 1 : 0);
  const notices = [...new Set([...(layout.inputWarnings ?? []), ...layout.layoutWarnings.filter(w => w.severity === 'caution').map(w => w.message)])];
  let next: { action: StudioTool; title: string; detail: string };
  if (issues.length) next = { action: 'room', title: 'Resolve room conflicts', detail: issues[0] };
  else if (fit.shortfalls.length) next = { action: 'fit', title: 'Review storage shortages', detail: `${fit.shortfalls.length} storage categories need more capacity. Review allocation before adding more items.` };
  else if (notices.length) next = { action: 'fit', title: 'Review layout notices', detail: notices[0] };
  else if (!fit.total) next = { action: 'inventory', title: 'Add your storage needs', detail: 'There is no measured storage demand yet. Add the wardrobe before assessing capacity.' };
  else if (survey!=='current') next = { action: 'room', title: survey==='stale'?'Recheck the changed room':'Confirm the room survey', detail: survey==='stale'?'Room geometry or the survey record changed after confirmation. Recheck the recorded survey before sharing.':'Check measurements and fixed features, then explicitly confirm the room survey below.' };
  else if (role === 'architect') next = { action: 'print', title: 'Review coordination package', detail: 'No conflicts detected by these model checks. Review dimensions and assumptions with the project team.' };
  else if (role === 'designer') next = { action: 'print', title: 'Prepare the client review', detail: 'Review the material direction and drawings with your client. This does not record client approval.' };
  else next = { action: 'library', title: 'Save a design option', detail: 'The listed storage categories fit the current assumptions. Save this option to compare with another arrangement.' };
  return { issues, fit, objects, notices, next };
}
