'use client';
import type {ClosetConfiguration,ClosetLayout} from '@/types/closet';
import type {PrintSettings} from '@/lib/printSettings';
import {exportPreflight} from '@/lib/exportPreflight';

export function ExportPreflight({layout,config,settings,onIncludeAll}:{layout:ClosetLayout;config:Partial<ClosetConfiguration>;settings:PrintSettings;onIncludeAll:()=>void}){
  const report=exportPreflight(layout,config,settings);
  return <section aria-label="Export checks" className="settings-card my-3">
    <h3>Review before sharing</h3><p className="text-sm">{report.geometry.length} modeled room conflicts · {report.shortages.length} storage shortages · {report.omitted.length} omitted elevations</p>
    <p className="text-sm my-2">{report.surveyNote}</p>
    {report.unassessed&&<p className="text-sm">{report.unassessed}</p>}
    {([['Room conflicts',report.geometry],['Storage shortages',report.shortages],['Package omissions',report.scope],['Other layout notices',report.notices]] as const).map(([label,items])=>items.length>0&&<details key={label} open={label==='Package omissions'}><summary>{label} ({items.length})</summary><ul className="list-disc pl-5 text-sm">{items.map((text,i)=><li key={i}>{text}</li>)}</ul></details>)}
    {!!report.omitted.length&&<button type="button" className="underline my-2" onClick={onIncludeAll}>Include all elevations</button>}
    <p className="text-xs mt-2">These checks use the captured design. You can export unresolved issues for discussion; the package cover will retain them. Reopen print options after editing the design to capture the changes.</p>
  </section>;
}
