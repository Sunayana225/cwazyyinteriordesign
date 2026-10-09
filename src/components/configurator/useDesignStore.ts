'use client';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_CONFIG } from '@/lib/design';
import { DRAFT_KEY, SAVED_KEY, nextDesignName, readDesigns, serializeDesigns, validConfig, canonicalConfig, designRevision } from '@/lib/storage';
import { downloadText } from '@/lib/download';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { drawerTargets, resolveOrganizers } from '@/lib/drawers';
import type { ClosetConfiguration, SavedDesign, UserRole } from '@/types/closet';
import { getPreset } from '@/lib/presets';
import { storageError, draftStatus } from '@/lib/recovery';
import { copyDesign } from '@/lib/designLibrary';
import { isUserRole } from '@/lib/userRoles';
function restoredConfig(config:ClosetConfiguration){const c=canonicalConfig(config);if(c.drawerInteriors)c.drawerInteriors=resolveOrganizers(c.drawerInteriors,drawerTargets(new ClosetLayoutEngine(c).calculateLayout()));return c;}

export function useDesignStore() {
  const [config, setConfig] = useState<Partial<ClosetConfiguration>>(structuredClone(DEFAULT_CONFIG));
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const [deleted, setDeleted] = useState<SavedDesign | null>(null);
  const [openedId, setOpenedId] = useState<string|null>(null);
  const [openedSnapshot, setOpenedSnapshot] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [namedHealth, setNamedHealth] = useState('Loading');
  const [draftHealth, setDraftHealth] = useState('Loading');
  const [lastDraftAt,setLastDraftAt]=useState<string|null>(null);
  const [lastNamedAt,setLastNamedAt]=useState<string|null>(null);
  const flushDraft = useRef(()=>{});
  const lastRaw = useRef<string | null>(null);
  const storageValid = useRef(true);
  const sourcePreset = useRef<string | null>(null);
  const draftWritable = useRef(true);
  const draftRaw=useRef<string|null>(null);
  const chosenRole=useRef<UserRole|null>(null);
  const pending = useRef<Array<((current: SavedDesign[]) => SavedDesign[]) & {operation?:string}>>([]);
  useEffect(() => {
    try { lastRaw.current = localStorage.getItem(SAVED_KEY); setSavedDesigns(readDesigns(lastRaw.current)); setNamedHealth('Saved'); }
    catch (error) { storageValid.current = false; setNamedHealth('Unreadable — recover raw data'); setNotice(String(error)); }
    try {
      sourcePreset.current = new URLSearchParams(window.location.search).get('preset');
      const preset = getPreset(sourcePreset.current);
      const raw = localStorage.getItem(DRAFT_KEY);
      draftRaw.current=raw;
      const draft = raw ? JSON.parse(raw) : null;
      if (preset && !(draft?.sourcePreset === sourcePreset.current && draft?.version === 1 && validConfig(draft.config))) {
        const role=validConfig(draft?.config)?draft.config.userInfo.userType:preset.userInfo.userType;
        setConfig({...preset,userInfo:{...preset.userInfo,userType:role}});
      }
      else if (draft?.version === 1 && validConfig(draft.config)) setConfig(restoredConfig(draft.config));
      else {
        if (raw) { draftWritable.current = false; setNotice('The draft could not be restored. It has been kept in storage. Save a named design before leaving.'); }
        try {
          const mode = sessionStorage.getItem('userType');
          if (isUserRole(mode)) setConfig(c => ({ ...c, userInfo: { ...DEFAULT_CONFIG.userInfo, userType: mode } }));
        } catch { /* Session preferences must not disable working draft storage. */ }
      }
    } catch { draftWritable.current = false; setNotice('Draft storage is unavailable. Changes remain in this tab until you leave.'); }
    // A fresh homepage choice changes the workspace, never the restored design.
    // Consume it once so a stale session choice cannot undo later role changes.
    try {
      const role=sessionStorage.getItem('alveo-pending-role');
      if(isUserRole(role))chosenRole.current=role;
      sessionStorage.removeItem('alveo-pending-role');
    } catch { /* A saved draft remains usable when session storage is unavailable. */ }
    // The URL carries an explicit choice when session storage is blocked. Remove
    // this one-shot parameter so a later reload cannot undo an in-editor change.
    const url=new URL(window.location.href),requestedRole=url.searchParams.get('mode');
    if(isUserRole(requestedRole))chosenRole.current=requestedRole;
    if(url.searchParams.has('mode')){
      url.searchParams.delete('mode');
      window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
    }
    // Retain the consumed choice through React's development effect replay, which
    // otherwise restores the old draft a second time and loses the selection.
    const role=chosenRole.current;
    if(role)setConfig(c=>({...c,userInfo:{...DEFAULT_CONFIG.userInfo,...c.userInfo,userType:role}}));
    setDraftHealth(draftWritable.current ? 'Saved' : 'Paused — original draft preserved'); setReady(true);
    const changed = (e: StorageEvent) => {
      if (e.storageArea && e.storageArea !== localStorage) return;
      if (e.key === SAVED_KEY || e.key === null) {
        try { setSavedDesigns(pending.current.reduce((items,apply)=>apply(items),readDesigns(e.newValue))); lastRaw.current = e.newValue; storageValid.current = true;setNamedHealth(pending.current.length?'Memory only':'Saved'); setNotice('Saved designs updated from another tab.'); }
        catch { storageValid.current = false;setNamedHealth('Unreadable — recover raw data'); setNotice('Another tab changed saved data to an unsupported format. Reload before saving.'); }
      }
      if (e.key === DRAFT_KEY || e.key === null) { draftWritable.current = false; setDraftHealth('Paused — another tab changed the draft'); setNotice('Another tab changed or cleared the draft. This tab will not overwrite it; save your work as a named design.'); }
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, []);
  useEffect(() => {
    if (!ready || !draftWritable.current) return;
    setDraftHealth('Saving…');
    const flush = () => {
      if (!draftWritable.current) return;
      try {
        if(localStorage.getItem(DRAFT_KEY)!==draftRaw.current){draftWritable.current=false;setDraftHealth('Paused — draft changed outside this editor');setNotice('The stored draft changed outside this editor. It has been preserved; save this tab as a named design.');return;}
        const savedAt=new Date().toISOString();const raw=JSON.stringify({ version: 1, sourcePreset: sourcePreset.current, savedAt, config });localStorage.setItem(DRAFT_KEY,raw);draftRaw.current=raw;setDraftHealth('Saved');setLastDraftAt(savedAt);
      }
      catch(error) { setDraftHealth('Memory only'); setNotice('Draft could not be saved to this device. '+storageError(error)+' Keep this tab open.'); }
    };
    flushDraft.current = flush;
    const timer = setTimeout(flush, 150);
    const hidden = () => { if(document.visibilityState==='hidden') flush(); };
    window.addEventListener('pagehide',flush); document.addEventListener('visibilitychange',hidden);
    return ()=>{clearTimeout(timer);window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',hidden);};
  }, [config, ready]);
  useEffect(()=>()=>flushDraft.current(),[]);
  const mutate = async (change: ((current: SavedDesign[]) => SavedDesign[]) & {operation?:string}, operation='Saved-design change'): Promise<boolean> => {
    change.operation=operation;
    const commit = () => {
    if (!storageValid.current) { setNotice('Saved data could not be read. Existing data was not overwritten.'); return false; }
    let current: SavedDesign[];
    try { current=readDesigns(localStorage.getItem(SAVED_KEY)); }
    catch { storageValid.current=false;setNotice('Saved data could not be read. Existing data was not overwritten.');return false; }
    let next:SavedDesign[],applying=operation;
    try { const replayed=pending.current.reduce((items,apply)=>{applying=apply.operation??"Pending change";return apply(items);},current);applying=operation;next=change(replayed); }
    catch(error) { setNotice(`${applying}: ${error instanceof Error?error.message:'Could not apply saved changes.'}`);return false; }
    try {
      const raw = serializeDesigns(next);
      localStorage.setItem(SAVED_KEY, raw); lastRaw.current = raw;
      pending.current=[]; setPendingCount(0); setNamedHealth('Saved');setLastNamedAt(new Date().toISOString());
      setSavedDesigns(next); setNotice('Saved to this device.'); return true;
    } catch(error) { if(operation!=='Retry pending changes')pending.current.push(change);setPendingCount(pending.current.length);setNamedHealth('Memory only');setSavedDesigns(next); setNotice(storageError(error)+' Pending write batch: '+pending.current.map(v=>v.operation).join(', ')+'. Changes are only in memory and will be lost when this tab closes.'); return false; }
    };
    if (navigator.locks) {
      try { return await navigator.locks.request('alveo-saved-designs', commit); }
      catch { let next:SavedDesign[];try{next=change(savedDesigns);}catch(error){setNotice(error instanceof Error?error.message:'Could not apply change.');return false;}if(operation!=='Retry pending changes')pending.current.push(change);setPendingCount(pending.current.length);setSavedDesigns(next);setNamedHealth('Memory only — lock unavailable');setNotice('Storage lock failed. Changes remain in memory; retry pending saves or download a backup.');return false; }
    }
    return commit();
  };
  const save = () => {
    if (!validConfig(config)) { setNotice('Complete the configuration before saving.'); return false; }
    const id=crypto.randomUUID(), snapshot=canonicalConfig(config), savedAt=new Date().toISOString();
    flushDraft.current();
    setOpenedId(id);setOpenedSnapshot(JSON.stringify(snapshot));
    return mutate(current => [...current, { id, name: nextDesignName(current), config: snapshot, savedAt, modifiedAt:savedAt }],'Save design');
  };
  const remove = (id: string) => { setDeleted(savedDesigns.find(d => d.id === id) ?? null); mutate(current => current.filter(d => d.id !== id),'Delete design'); };
  const duplicate = (sourceId: string) => {
    const id = crypto.randomUUID(), savedAt = new Date().toISOString();
    return mutate(current => {
      const source = current.find(d => d.id === sourceId);
      return source ? [...current, copyDesign(source, current, id, savedAt)] : current;
    },'Duplicate design');
  };
  const undoDelete = () => { if (deleted) { mutate(current => current.some(d => d.id === deleted.id) ? current : [...current, deleted],'Undo design deletion'); setDeleted(null); } };
  const rename = (id: string, name: string) => { const modifiedAt=new Date().toISOString(); if (name.trim()) mutate(current => current.map(d => d.id === id ? { ...d, name: name.trim().slice(0, 120), modifiedAt } : d),'Rename design'); };
  const open = (id: string) => { const d = savedDesigns.find(d => d.id === id); if (d) { const restored=restoredConfig(d.config as ClosetConfiguration);setConfig(restored);setOpenedId(id);setOpenedSnapshot(JSON.stringify(restored)); setNotice('Opened ' + d.name); } };
  const importDesigns = (items: SavedDesign[]) => {
    const copies=items.map(d=>({...d,id:crypto.randomUUID(),config:canonicalConfig(d.config as ClosetConfiguration)}));
    return mutate(current=>[...current,...copies],'Import backup');
  };
  const tag = (id:string,tags:string[]) => { const modifiedAt=new Date().toISOString();return mutate(current=>current.map(d=>d.id===id?{...d,tags:[...new Set(tags.map(t=>t.trim()).filter(Boolean))].slice(0,12).map(t=>t.slice(0,40)),modifiedAt}:d),'Update design tags'); };
  const replace = (id:string,expected:string,note='') => {
    if(!validConfig(config)) return Promise.resolve(false);
    const snapshot=canonicalConfig(config),modifiedAt=new Date().toISOString(),revisionId=crypto.randomUUID();
    const changed=mutate(current=>{
      const original=current.find(d=>d.id===id);
      if(!original||designRevision(original)!==expected) throw new Error('This design changed since the preview. Reopen the replacement preview.');
      return current.map(d=>d.id===id?{...d,config:snapshot,modifiedAt,revisions:[...(d.revisions??[]).slice(-9),{id:revisionId,savedAt:d.modifiedAt??d.savedAt,note:note.slice(0,200),config:structuredClone(d.config)}]}:d);
    },'Replace design');
    return changed.then(saved=>{if(saved){setOpenedId(id);setOpenedSnapshot(JSON.stringify(snapshot));}return saved;});
  };
  const organize=(ids:string[],folder:string)=>mutate(current=>current.map(d=>ids.includes(d.id)?{...d,folder:folder.trim().slice(0,80),modifiedAt:new Date().toISOString()}:d),'Move designs to folder');
  const pin=(id:string)=>mutate(current=>current.map(d=>d.id===id?{...d,pinnedOrder:d.pinnedOrder===undefined?Math.max(-1,...current.map(v=>v.pinnedOrder??-1))+1:undefined}:d),'Change favorite order');
  const restoreRevision=(id:string,revisionId:string)=>{const newId=crypto.randomUUID(),savedAt=new Date().toISOString();return mutate(current=>{const source=current.find(d=>d.id===id),revision=source?.revisions?.find(r=>r.id===revisionId);if(!source||!revision)throw new Error('Revision is no longer available.');const copy=copyDesign({...source,config:revision.config},current,newId,savedAt);return [...current,copy];},'Restore design revision');};
  const removeMany=(expected:SavedDesign[])=>mutate(current=>{for(const d of expected){const existing=current.find(v=>v.id===d.id);if(!existing||designRevision(existing)!==designRevision(d))throw new Error('A cleanup record changed. Review the cleanup preview again.');}return current.filter(d=>!expected.some(v=>v.id===d.id));},'Clean up selected designs');
  const metadataBatch=(changes:Array<{before:SavedDesign;folder?:string;tags?:string[]}>)=>mutate(current=>{
    for(const change of changes){const found=current.find(d=>d.id===change.before.id);if(!found||designRevision(found)!==designRevision(change.before))throw new Error('A previewed design changed. Review the batch again.');if(change.tags&&(change.tags.length>12||change.tags.some(t=>t.length>40)))throw new Error('Use at most 12 tags of 40 characters.');}
    return current.map(d=>{const patch=changes.find(v=>v.before.id===d.id);return patch?{...d,...(patch.folder!==undefined?{folder:patch.folder.trim().slice(0,80)}:{}),...(patch.tags?{tags:patch.tags}:{}),modifiedAt:new Date().toISOString()}:d;});
  },'Update previewed library metadata');
  const moveFavorite=(id:string,direction:-1|1)=>mutate(current=>{
    const pinned=current.filter(d=>d.pinnedOrder!==undefined).sort((a,b)=>a.pinnedOrder!-b.pinnedOrder!),index=pinned.findIndex(d=>d.id===id),other=index+direction;if(index<0||other<0||other>=pinned.length)return current;
    [pinned[index],pinned[other]]=[pinned[other],pinned[index]];return current.map(d=>{const order=pinned.findIndex(v=>v.id===d.id);return order>=0?{...d,pinnedOrder:order}:d;});
  },'Reorder favorites');
  const recover = () => { try { downloadText(JSON.stringify({named:localStorage.getItem(SAVED_KEY),draft:localStorage.getItem(DRAFT_KEY)},null,2),'alveo-raw-recovery.json'); } catch { setNotice('Raw storage could not be read. Download memory-only designs from the saved library.'); } };
  const replaceUnreadableDraft=(expected:string,snapshot:Partial<ClosetConfiguration>)=>{
    try{if(!validConfig(snapshot))throw new Error('Complete a valid configuration first.');const raw=localStorage.getItem(DRAFT_KEY);if(raw!==expected)throw new Error('Draft changed since preview. Download and review it again.');if(draftStatus(raw).restorable)throw new Error('Stored draft is now restorable; it was preserved.');
      const savedAt=new Date().toISOString(),next=JSON.stringify({version:1,sourcePreset:sourcePreset.current,savedAt,config:canonicalConfig(snapshot)});localStorage.setItem(DRAFT_KEY,next);draftRaw.current=next;draftWritable.current=true;setLastDraftAt(savedAt);setDraftHealth('Saved');setConfig(canonicalConfig(snapshot));setNotice('Reviewed draft replacement saved.');return true;
    }catch(error){setNotice(error instanceof Error?error.message:'Draft replacement failed.');return false;}
  };
  const retry = () => mutate(current=>current,'Retry pending changes');
  const opened = savedDesigns.find(d=>d.id===openedId);
  const dirty = !!openedId && JSON.stringify(validConfig(config)?canonicalConfig(config):config)!==openedSnapshot;
  return { config, setConfig, savedDesigns, notice, ready, save, remove, rename, open, duplicate, deleted, undoDelete, importDesigns,tag,replace,organize,pin,restoreRevision,removeMany,recover,retry,pendingCount,namedHealth,draftHealth,lastDraftAt,lastNamedAt,pendingOperations:pending.current.map(v=>v.operation??"Saved-design change"),replaceUnreadableDraft,metadataBatch,moveFavorite,opened,dirty };
}


