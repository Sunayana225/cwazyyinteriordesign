import type { ClosetConfiguration } from '@/types/closet';
import { surveyChanges } from '@/lib/surveyChanges';

export default function SurveyChanges({config}:{config:Partial<ClosetConfiguration>}) {
  const changes=surveyChanges(config);
  if(!changes?.length)return <p>The previous measurement details are unavailable. Recheck the full room survey.</p>;
  return <details open><summary>Measurements changed since confirmation ({changes.length})</summary>
    <ul className="space-y-2 my-2 text-sm" aria-label="Changed survey measurements">{changes.map(change=><li key={change.field}>
      <strong>{change.field}</strong><span className="block break-words">Confirmed: {change.before}</span><span className="block break-words">Current: {change.after}</span>
    </li>)}</ul>
    <p className="text-xs">Object lists compare geometry, not names or order. Reconfirm only after checking the changed measurements.</p>
  </details>;
}
