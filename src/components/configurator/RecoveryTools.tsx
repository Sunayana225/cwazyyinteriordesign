'use client';
import { useState } from 'react';
import { draftStatus, recoveryReport } from '@/lib/recovery';
import { canonicalConfig, DRAFT_KEY, serializeDesigns, validConfig } from '@/lib/storage';
import { downloadText } from '@/lib/download';
import type { ClosetConfiguration, SavedDesign } from '@/types/closet';
export function RecoveryTools({lastDraftAt,lastNamedAt,config,designs,pendingOperations,onReplaceDraft}:{lastDraftAt:string|null;lastNamedAt:string|null;config:Partial<ClosetConfiguration>;designs:SavedDesign[];pendingOperations:string[];onReplaceDraft:(raw:string,snapshot:Partial<ClosetConfiguration>)=>boolean}){
  const [report,setReport]=useState(''),[error,setError]=useState(''),[backup,setBackup]=useState<string|null>(null),[preview,setPreview]=useState<{raw:string;config:ClosetConfiguration}|null>(null);
  const run=(work:()=>void)=>{try{work();setError('');}catch(e){setError((e as Error).message);}};
  const exportDraft=()=>{if(!validConfig(config))throw new Error('Current configuration is incomplete.');downloadText(serializeDesigns([{id:crypto.randomUUID(),name:'Recovered current draft',savedAt:new Date().toISOString(),config:canonicalConfig(config)}]),'alveo-current-draft.json');};
  return <><section aria-label="Project data and privacy" className="settings-card my-3">
    <h3>Your projects on this device</h3>
    <p>Drafts, saved designs, household profiles, room shells, and organizer templates stay in this browser at this site address. This app does not upload project contents or synchronize them to an account. Another browser, device, or site address has a separate library.</p>
    <p>Anyone using this browser profile can access its projects. Homeowner, designer, and architect modes change the workflow; they do not provide account permissions. Browser storage is not encrypted by this app.</p>
    <p>Clearing site data or ending a private browsing session can remove projects. Download a JSON backup before clearing data. Print and downloaded files contain the sections you choose and can be shared outside the app.</p>
  </section><details className="max-w-7xl mx-auto py-2"><summary>Storage usage and recovery report</summary>
    <p>Last successful draft write: {lastDraftAt?new Date(lastDraftAt).toLocaleString():'Not yet written in this session'}</p><p>Last successful library write: {lastNamedAt?new Date(lastNamedAt).toLocaleString():'Not yet written in this session'}</p>
    <h3>Pending writes in order</h3>{pendingOperations.length?<ol className="list-decimal pl-5">{pendingOperations.map((name,i)=><li key={i}>{name}</li>)}</ol>:<p>No pending writes.</p>}
    <section className="settings-card my-3"><h3>Diagnostic report</h3><p id="diagnostic-scope">Includes storage size estimates, record counts, validation states, application version, build revision when available, and report time. Excludes project names, contacts, household profiles, notes, drawings, and raw stored contents. It cannot restore a project.</p>
    <button onClick={()=>run(()=>setReport(JSON.stringify(recoveryReport(localStorage),null,2)))}>Estimate local storage usage</button>
    <button aria-describedby="diagnostic-scope" onClick={()=>run(()=>{const next=JSON.stringify(recoveryReport(localStorage),null,2);setReport(next);downloadText(next,'alveo-recovery-report.json');})}>Download recovery report</button>
    <button onClick={()=>run(()=>setReport(JSON.stringify(recoveryReport(localStorage),null,2)))}>Show selectable diagnostic report</button>
    {report&&<label className="block">Selectable recovery report<textarea readOnly className="border w-full h-64 p-2" value={report}/></label>}
    </section><section className="settings-card my-3"><h3>Project recovery files</h3>
    <p id="draft-recovery-scope">Current draft: the full active configuration, including survey contacts, household names, notes, and organizers when present. Named designs are excluded.</p>
    <button aria-describedby="draft-recovery-scope" disabled={!validConfig(config)} onClick={()=>run(exportDraft)}>Download current unsaved draft</button>
    <p id="memory-recovery-scope">Memory snapshot: the active draft, all valid designs currently in memory, and pending operation names. It includes project data and may contain unsaved changes. It excludes separately stored room shells and organizer templates.</p>
    <button aria-describedby="memory-recovery-scope" onClick={()=>run(()=>downloadText(JSON.stringify({version:1,generatedAt:new Date().toISOString(),designs:designs.filter(d=>validConfig(d.config)),pendingOperations:pendingOperations.map((operation,i)=>({order:i+1,operation})),draft:validConfig(config)?canonicalConfig(config):null},null,2),'alveo-memory-recovery.json'))}>Download memory recovery snapshot</button>
    <p id="unreadable-recovery-scope">Unreadable draft: an exact copy of the stored text, including any private content, for local recovery before replacement.</p>
    <button aria-describedby="unreadable-recovery-scope" onClick={()=>run(()=>{const raw=localStorage.getItem(DRAFT_KEY);if(raw===null||draftStatus(raw).restorable)throw new Error('There is no unreadable draft to replace.');downloadText(raw,'alveo-unreadable-draft.txt','text/plain');setBackup(raw);setPreview(null);})}>Download unreadable draft before replacement</button>
    {backup!==null&&<button disabled={!validConfig(config)} onClick={()=>run(()=>{if(localStorage.getItem(DRAFT_KEY)!==backup)throw new Error('Stored draft changed; download it again.');if(!validConfig(config))throw new Error('Current configuration is incomplete.');setPreview({raw:backup,config:canonicalConfig(config)});})}>Preview unreadable draft replacement</button>}
    {preview&&<div className="border rounded p-3"><h3>Draft replacement preview</h3><p>The unreadable stored draft will be replaced with the captured {preview.config.closetType??'reach-in'} design: {preview.config.dimensions.width} × {preview.config.dimensions.height} × {preview.config.dimensions.depth} in. Named designs are preserved. Confirm that the raw download completed before replacing.</p><button onClick={()=>{if(onReplaceDraft(preview.raw,preview.config)){setPreview(null);setBackup(null);}}}>Replace reviewed unreadable draft</button><button onClick={()=>setPreview(null)}>Cancel draft replacement</button></div>}
    </section><p role="status">{error}</p>
  </details></>;
}
