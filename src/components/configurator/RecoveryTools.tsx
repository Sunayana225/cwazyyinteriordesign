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
  return <details className="max-w-7xl mx-auto px-6 py-2"><summary>Storage usage and recovery report</summary>
    <p>Last successful draft write: {lastDraftAt?new Date(lastDraftAt).toLocaleString():'Not yet written in this session'}</p><p>Last successful library write: {lastNamedAt?new Date(lastNamedAt).toLocaleString():'Not yet written in this session'}</p>
    <h3>Pending writes in order</h3>{pendingOperations.length?<ol className="list-decimal pl-5">{pendingOperations.map((name,i)=><li key={i}>{name}</li>)}</ol>:<p>No pending writes.</p>}
    <button onClick={()=>run(()=>setReport(JSON.stringify(recoveryReport(localStorage),null,2)))}>Estimate local storage usage</button>
    <button onClick={()=>run(()=>{const next=JSON.stringify(recoveryReport(localStorage),null,2);setReport(next);downloadText(next,'alveo-recovery-report.json');})}>Download recovery report</button>
    <button onClick={()=>run(()=>setReport(JSON.stringify(recoveryReport(localStorage),null,2)))}>Show selectable diagnostic report</button>
    {report&&<label className="block">Selectable recovery report<textarea readOnly className="border w-full h-64 p-2" value={report}/></label>}
    <button disabled={!validConfig(config)} onClick={()=>run(exportDraft)}>Download current unsaved draft</button>
    <button onClick={()=>run(()=>downloadText(JSON.stringify({version:1,generatedAt:new Date().toISOString(),designs:designs.filter(d=>validConfig(d.config)),pendingOperations:pendingOperations.map((operation,i)=>({order:i+1,operation})),draft:validConfig(config)?canonicalConfig(config):null},null,2),'alveo-memory-recovery.json'))}>Download memory recovery snapshot</button>
    <button onClick={()=>run(()=>{const raw=localStorage.getItem(DRAFT_KEY);if(raw===null||draftStatus(raw).restorable)throw new Error('There is no unreadable draft to replace.');downloadText(raw,'alveo-unreadable-draft.txt','text/plain');setBackup(raw);setPreview(null);})}>Download unreadable draft before replacement</button>
    {backup!==null&&<button disabled={!validConfig(config)} onClick={()=>run(()=>{if(localStorage.getItem(DRAFT_KEY)!==backup)throw new Error('Stored draft changed; download it again.');if(!validConfig(config))throw new Error('Current configuration is incomplete.');setPreview({raw:backup,config:canonicalConfig(config)});})}>Preview unreadable draft replacement</button>}
    {preview&&<div className="border rounded p-3"><h3>Draft replacement preview</h3><p>The unreadable stored draft will be replaced with the captured {preview.config.closetType??'reach-in'} design: {preview.config.dimensions.width} × {preview.config.dimensions.height} × {preview.config.dimensions.depth} in. Named designs are preserved. Confirm that the raw download completed before replacing.</p><button onClick={()=>{if(onReplaceDraft(preview.raw,preview.config)){setPreview(null);setBackup(null);}}}>Replace reviewed unreadable draft</button><button onClick={()=>setPreview(null)}>Cancel draft replacement</button></div>}
    <p role="status">{error}</p>
  </details>;
}
