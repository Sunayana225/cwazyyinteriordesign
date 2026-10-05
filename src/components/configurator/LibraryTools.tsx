'use client';
import { useState } from 'react';
import type { ClosetConfiguration, SavedDesign } from '@/types/closet';
import { BACKUP_MAX_BYTES, readBackup, designRevision, serializeDesigns } from '@/lib/storage';
import { analyzeBackup } from '@/lib/recovery';
import { downloadText } from '@/lib/download';
import { designDetails } from '@/lib/designLibrary';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';

export interface LibraryActions {
  metadataBatch?:(changes:Array<{before:SavedDesign;folder?:string;tags?:string[]}>)=>Promise<boolean>;
  moveFavorite?:(id:string,direction:-1|1)=>Promise<boolean>;
  importDesigns:(items:SavedDesign[])=>Promise<boolean>;
  tag:(id:string,tags:string[])=>Promise<boolean>;
  replace:(id:string,expected:string,note?:string)=>Promise<boolean>;
  organize?:(ids:string[],folder:string)=>Promise<boolean>;
  pin?:(id:string)=>Promise<boolean>;
  restoreRevision?:(id:string,revisionId:string)=>Promise<boolean>;
  removeMany?:(expected:SavedDesign[])=>Promise<boolean>;
}
export function DesignComparison({designs}:{designs:SavedDesign[]}) {
  return <div className="overflow-auto" role="region" tabIndex={0} aria-label="Design comparison"><table className="text-sm w-full border-collapse"><caption>Design comparison</caption><thead><tr><th scope="col">Detail</th>{designs.map(d=><th scope="col" key={d.id}>{d.name}</th>)}</tr></thead><tbody>
    <tr><th scope="row">Configuration</th>{designs.map(d=><td key={d.id} className="border p-2">{designDetails(d)}</td>)}</tr>
    {(['wardrobe','shoes'] as const).map(group=><tr key={group}><th scope="row">{group}</th>{designs.map(d=><td key={d.id} className="border p-2">{Object.entries(d.config[group]??{}).map(([k,v])=>`${k}: ${v}`).join(', ')}</td>)}</tr>)}
    <tr><th scope="row">Capacity / unmet demand</th>{designs.map(d=>{
      try { const layout=new ClosetLayoutEngine(d.config as ClosetConfiguration).calculateLayout();return <td key={d.id} className="border p-2">{layout.capacity?.map(c=>`${c.label}: ${c.available} available, ${Math.max(0,c.required-c.available)} unmet ${c.unit}`).join('; ')} · {layout.totalStorage.drawerCount} drawers</td>; }
      catch { return <td key={d.id}>Configuration unavailable</td>; }
    })}</tr>
  </tbody></table></div>;
}
export function LibraryTools({designs,selected,config,actions}:{designs:SavedDesign[];selected:Set<string>;config:Partial<ClosetConfiguration>;actions:LibraryActions}) {
  const [incoming,setIncoming]=useState<SavedDesign[]>([]),[skip,setSkip]=useState(new Set<string>());
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[compare,setCompare]=useState(false);
  const [replacement,setReplacement]=useState<SavedDesign|null>(null);
  const [recovery,setRecovery]=useState<ReturnType<typeof analyzeBackup>|null>(null),[libraryLimit,setLibraryLimit]=useState(200);
  const selectedDesigns=designs.filter(d=>selected.has(d.id));
  const [revisionNote,setRevisionNote]=useState('');
  const run=async(action:()=>Promise<boolean>)=>{setBusy(true);try{setMessage(await action()?'Saved to this device.':'Could not persist changes. Check storage status; download any memory-only designs.');}catch(e){setMessage(e instanceof Error?e.message:'Could not complete the action.');}finally{setBusy(false);}};
  return <details className="border rounded p-3 my-3"><summary>Restore, compare, tags, and updates</summary>
    <label className="block">Warn above library size<input className="border rounded p-2 w-full" type="number" min={1} max={2000} value={libraryLimit} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=1&&n<=2000)setLibraryLimit(n);}}/></label>
    <label className="block my-3">Restore JSON backup (5 MB / 200 designs maximum)<input className="block max-w-full" type="file" accept="application/json,.json" disabled={busy} onChange={async e=>{
      const file=e.target.files?.[0];e.target.value='';if(!file)return;
      setIncoming([]);setSkip(new Set());setRecovery(null);let raw='';
      try { if(file.size>BACKUP_MAX_BYTES)throw new Error('Backup exceeds the 5 MB limit.');raw=await file.text();const items=readBackup(raw);setIncoming(items);setMessage(`${items.length} valid designs. Review the import below; existing designs will be preserved.`); }
      catch(error){setMessage(error instanceof Error?error.message:'Invalid backup.');if(raw)try{setRecovery(analyzeBackup(raw));}catch{}}
    }}/></label>
    {recovery&&<div><h3>Partial backup recovery preview</h3><p>{recovery.valid.length} recoverable designs; {recovery.invalid.length} rejected records.</p><ul>{recovery.valid.map(d=><li key={d.id}>{d.name}</li>)}{recovery.invalid.map(v=><li key={v.index}>Record {v.index+1}: {v.error}</li>)}</ul><button disabled={!recovery.valid.length} onClick={()=>downloadText(serializeDesigns(recovery.valid),'alveo-recovered-designs.json')}>Download recoverable designs separately</button><button disabled={!recovery.valid.length} onClick={()=>{setIncoming(recovery.valid);setRecovery(null);}}>Review recoverable designs for import</button><button onClick={()=>setRecovery(null)}>Cancel partial recovery</button></div>}
    {incoming.length>0&&designs.length+incoming.filter(d=>!skip.has(d.id)).length>libraryLimit&&<p role="alert">This restore would increase the library to {designs.length+incoming.filter(d=>!skip.has(d.id)).length} designs, above your {libraryLimit}-design warning threshold. Review the selection before merging.</p>}
    {incoming.length>0&&<fieldset disabled={busy} className="border p-2"><legend>Import preview</legend>{incoming.map(d=>{
      const collision=designs.some(s=>s.id===d.id||s.name.toLowerCase()===d.name.toLowerCase());
      return <label className="block text-sm my-2" key={d.id}>{d.name} — {collision?'Existing ID or name; keep both creates a new ID':'New design'}<select className="border ml-2" aria-label={`Import ${d.name}`} value={skip.has(d.id)?'skip':'keep'} onChange={e=>setSkip(current=>{const next=new Set(current);e.target.value==='skip'?next.add(d.id):next.delete(d.id);return next;})}><option value="keep">Keep both / import</option><option value="skip">Skip</option></select></label>;
    })}<button disabled={incoming.length===skip.size} onClick={()=>{const items=incoming.filter(d=>!skip.has(d.id));setIncoming([]);void run(()=>actions.importDesigns(items));}}>Merge {incoming.length-skip.size} designs</button><button className="ml-3" onClick={()=>setIncoming([])}>Cancel import</button></fieldset>}
    <p className="text-sm my-2">Select two designs to compare, or one to edit tags or replace its configuration.</p>
    <button disabled={selectedDesigns.length!==2} onClick={()=>setCompare(v=>!v)}>Compare selected designs</button>
    {compare&&selectedDesigns.length===2&&<DesignComparison designs={selectedDesigns}/>}
    {selectedDesigns.length===1&&<div className="my-3 space-y-2"><label className="block">Project tags (comma separated)<input key={selectedDesigns[0].id+JSON.stringify(selectedDesigns[0].tags)} className="border p-2 w-full" defaultValue={selectedDesigns[0].tags?.join(', ')??''} maxLength={480} onBlur={e=>{if(e.target.value!==(selectedDesigns[0].tags?.join(', ')??''))void run(()=>actions.tag(selectedDesigns[0].id,e.target.value.split(',')));}}/></label><button disabled={busy} onClick={()=>setReplacement(structuredClone(selectedDesigns[0]))}>Preview replacement with current design</button></div>}
    {replacement&&<div className="border p-2"><p>Replace “{replacement.name}” with the current configuration? The name and creation date stay the same.</p><DesignComparison designs={[replacement,{...replacement,id:'current-preview',name:'Current configuration',config}]}/><label className="block">Note for prior revision<input className="border p-2 w-full" maxLength={200} value={revisionNote} onChange={e=>setRevisionNote(e.target.value)}/></label><button disabled={busy} onClick={()=>{const expected=designRevision(replacement);void run(()=>actions.replace(replacement.id,expected,revisionNote));setReplacement(null);}}>Replace saved configuration</button><button className="ml-3" onClick={()=>setReplacement(null)}>Cancel replacement</button></div>}
    <p role="status" className="text-sm my-2">{message}</p>
  </details>;
}
