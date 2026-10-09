'use client';
import { downloadText } from '@/lib/download';
import { LibraryOrganization } from './LibraryOrganization';
import { designMetrics, libraryFilter } from '@/lib/libraryOrganization';

import { useEffect, useRef, useState, useMemo } from 'react';
import type { SavedDesign } from '@/types/closet';
import { designDetails, findDesigns, type DesignSort } from '@/lib/designLibrary';
import { canonicalConfig, validConfig, serializeDesigns } from '@/lib/storage';
import { DesignComparison, LibraryTools, type LibraryActions } from './LibraryTools';
import type { ClosetConfiguration } from '@/types/closet';
export function SavedDesignDialog({ designs, close, remove, rename, open, duplicate, exportSelected, busy, libraryActions, config }: {
  designs: SavedDesign[]; close: () => void; remove: (id: string) => void;
  rename?: (id: string, name: string) => void; open?: (id: string) => void;
  duplicate?: (id: string) => Promise<boolean>;
  exportSelected: (ids: Set<string>) => void; busy: boolean;
  libraryActions?:LibraryActions;config?:Partial<ClosetConfiguration>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [ids, setIds] = useState(new Set<string>());
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<DesignSort>('newest');
  const [message, setMessage] = useState('');
  const [copying, setCopying] = useState(false);
  const [filters,setFilters]=useState({folder:'',from:'',to:'',shortfalls:false,unfiled:false,organizers:''}),[opening,setOpening]=useState<SavedDesign|null>(null);
  const metrics=useMemo(()=>new Map(designs.map(d=>[d.id,designMetrics(d)])),[designs]);
  const renameInput=useRef<HTMLInputElement>(null);
  const renameButtons=useRef(new Map<string,HTMLButtonElement>());
  const finishRename=(id:string)=>{setEditing(null);requestAnimationFrame(()=>renameButtons.current.get(id)?.focus());};
  useEffect(()=>{if(editing)renameInput.current?.focus();},[editing]);
  const previous = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previous.current ??= document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => { requestAnimationFrame(() => previous.current?.focus()); };
  }, []);
  const validIds = new Set(designs.filter(d => ids.has(d.id)).map(d => d.id));
  const visible = libraryFilter(findDesigns(designs, query, sort),filters);
  const hiddenSelected = designs.filter(d => validIds.has(d.id) && !visible.some(v => v.id === d.id)).length;
  const download = (items: SavedDesign[]) => {
    try {
      downloadText(serializeDesigns(items), `alveo-designs-${new Date().toISOString().slice(0, 10)}.json`);
      setMessage(`Backup download requested for ${items.length} designs. Use Restore JSON backup to restore this file.`);
    } catch { setMessage('The backup could not be downloaded. Please try again.'); }
  };
  return <dialog ref={dialog} onCancel={close} onClose={close} aria-labelledby="saved-title" className="settings-dialog library-settings-dialog rounded-2xl p-6 max-h-[90vh] overflow-auto backdrop:bg-black/40">
    <header className="settings-dialog-header flex justify-between gap-4"><h2 id="saved-title" className="text-xl font-serif">Saved designs</h2><button onClick={close} aria-label="Close saved designs">Close</button></header>
    <p className="my-3 text-sm">Open, copy, rename, or select designs to print. JSON backups preserve settings and drawer organizers.</p>

    {opening&&<div><h3>Review opening over current edits</h3><DesignComparison designs={[{...opening,id:"active-preview",name:"Current edits",config:config??{}},opening]}/><button onClick={()=>{open?.(opening.id);close();}}>Open reviewed design</button><button onClick={()=>setOpening(null)}>Keep current edits</button></div>}
    <div className="flex flex-wrap gap-2 my-3">
      <label className="flex-1 min-w-0">Search saved designs<input type="search" value={query} onChange={e => setQuery(e.target.value)} className="block border rounded p-2 w-full" /></label>
      <label>Sort saved designs<select value={sort} onChange={e => setSort(e.target.value as DesignSort)} className="block border rounded p-2"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name</option></select></label>
    </div>
    <details className="border rounded p-2"><summary>Folder, date, and capacity filters</summary><label className="block">Project folder filter<select className="border rounded p-2 w-full" value={filters.folder} onChange={e=>setFilters({...filters,folder:e.target.value,unfiled:false})}><option value="">All folders</option>{Array.from(new Set(designs.map(d=>d.folder).filter(Boolean))).map(v=><option key={v}>{v}</option>)}</select></label><label className="block">Modified on or after (UTC)<input type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})}/></label><label className="block">Modified on or before (UTC)<input type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})}/></label><label className="block"><input type="checkbox" checked={filters.shortfalls} onChange={e=>setFilters({...filters,shortfalls:e.target.checked})}/> Only unresolved capacity shortfalls</label><label className="block"><input type="checkbox" checked={filters.unfiled} onChange={e=>setFilters({...filters,unfiled:e.target.checked,folder:''})}/> Only unfiled designs</label><label className="block">Organizer coverage filter<select className="border p-2 w-full" value={filters.organizers} onChange={e=>setFilters({...filters,organizers:e.target.value})}><option value="">All organizer states</option><option value="uncustomized">Drawers missing a custom organizer</option><option value="retained">Retained organizers without a drawer</option></select></label><button onClick={()=>setFilters({folder:"",from:"",to:"",shortfalls:false,unfiled:false,organizers:''})}>Reset library filters</button></details>
    <p role="status" className="text-sm">{visible.length} of {designs.length} designs · {validIds.size} selected{hiddenSelected ? ` (${hiddenSelected} hidden by search)` : ''}</p>
    <div className="flex flex-wrap gap-3 my-2 text-sm"><button disabled={!visible.length} onClick={() => setIds(current => new Set([...current, ...visible.map(d => d.id)]))}>Select visible</button><button disabled={!validIds.size} onClick={() => setIds(new Set())}>Clear selection</button></div>
    {!designs.length && <p className="settings-empty">No saved designs yet. Close this window and choose Save to keep your current design.</p>}
    {!!designs.length && !visible.length && <div className="my-4"><p className="settings-empty">No designs match your search or filters.</p><button onClick={() => {setQuery('');setFilters({folder:"",from:"",to:"",shortfalls:false,unfiled:false,organizers:''});}}>Clear search and filters</button></div>}
    {visible.map(d => <div key={d.id} className="settings-object-card saved-design-card">
      <label className="flex gap-2 items-center"><input type="checkbox" checked={ids.has(d.id)} onChange={e => setIds(current => { const next = new Set(current); e.target.checked ? next.add(d.id) : next.delete(d.id); return next; })} /><span>{d.name}</span></label>
      <p className="text-xs">{d.revisions?.length??0} saved revisions</p><p className="text-xs mt-1">{new Date(d.savedAt).toLocaleDateString()}</p>
      {d.modifiedAt&&<p className="text-xs">Modified {new Date(d.modifiedAt).toLocaleString()}</p>}
      {!!d.tags?.length&&<p className="text-xs">Tags: {d.tags.join(', ')}</p>}
      <p className="text-xs mt-1 break-words">{designDetails(d)}</p><p className="text-xs">Project: {d.folder||"Unfiled"} · Organizer coverage: {metrics.get(d.id)?.customized} customized / {metrics.get(d.id)?.total} drawers</p>
      {editing === d.id ? <form onSubmit={e => { e.preventDefault(); if (name.trim()) { rename?.(d.id, name); finishRename(d.id); } }} className="flex gap-2 mt-2">
        <input ref={renameInput} aria-label="Design name" maxLength={120} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finishRename(d.id); } }} className="border p-2 min-w-0" />
        <button type="submit">Save name</button><button type="button" onClick={() => finishRename(d.id)}>Cancel</button></form> :
        <div className="flex flex-wrap gap-4 mt-2 text-sm"><button onClick={() => { if(config&&validConfig(config)&&!designs.some(v=>JSON.stringify(canonicalConfig(v.config as ClosetConfiguration))===JSON.stringify(canonicalConfig(config))))setOpening(d);else{open?.(d.id);close();} }}>Open</button><button ref={el=>{if(el)renameButtons.current.set(d.id,el);else renameButtons.current.delete(d.id);}} onClick={() => { setName(d.name); setEditing(d.id); }}>Rename</button>{duplicate && <button disabled={copying} onClick={async () => {
          setCopying(true);
          try { const saved = await duplicate(d.id); setMessage(saved ? 'Copy saved to this device.' : 'Copy could not be saved to this device. Any in-memory copy can be downloaded as a backup before closing.'); }
          catch { setMessage('Could not create a copy. Please try again.'); }
          finally { setCopying(false); }
        }}>Duplicate</button>}{libraryActions?.pin&&<button onClick={()=>void libraryActions.pin!(d.id)}>{d.pinnedOrder===undefined?"Pin favorite":"Unpin favorite"}</button>}{d.pinnedOrder!==undefined&&libraryActions?.moveFavorite&&<><button onClick={()=>void libraryActions.moveFavorite!(d.id,-1)}>Move favorite up</button><button onClick={()=>void libraryActions.moveFavorite!(d.id,1)}>Move favorite down</button></>}<button onClick={() => remove(d.id)}>Delete</button></div>}
    </div>)}
    <section className="settings-card"><h3>Library tools & organization</h3>
    {libraryActions&&<LibraryTools designs={designs} selected={validIds} config={config??{}} actions={libraryActions}/>}
    {libraryActions&&<LibraryOrganization designs={designs} selected={validIds} actions={libraryActions}/>}
    </section>
    <div className="flex flex-wrap gap-3 mt-4"><button disabled={!designs.length} onClick={() => download(designs)}>Download all JSON</button><button disabled={!validIds.size} onClick={() => download(designs.filter(d => validIds.has(d.id)))}>Download selected JSON</button></div>
    <p role="status" className="text-sm my-2">{message}</p>
    <footer className="settings-dialog-footer"><button onClick={close}>Close</button><button disabled={!validIds.size || busy} onClick={() => exportSelected(validIds)} className="bg-charcoal-600 text-white px-4 py-2 rounded disabled:opacity-50">{busy ? 'Preparing…' : `Export ${validIds.size} designs`}</button></footer>
  </dialog>;
}


