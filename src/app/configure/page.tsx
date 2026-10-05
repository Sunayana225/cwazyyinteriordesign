'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { ClosetConfiguration, SavedDesign } from '@/types/closet';
import { EnhancedConfigurator } from '@/components/configurator/EnhancedConfigurator';
import { LivePreview } from '@/components/configurator/LivePreview';
import { useDesignStore } from '@/components/configurator/useDesignStore';
import { RecoveryTools } from '@/components/configurator/RecoveryTools';
import { ArrowLeft } from 'lucide-react';

export default function ConfigurePage() {
  const store = useDesignStore();
  const { config, setConfig, savedDesigns } = store;
  const userType = config.userInfo?.userType ?? 'homeowner';
  const updateConfig=useCallback((updates:Partial<ClosetConfiguration>)=>setConfig(prev=>({...prev,...updates})),[setConfig]);

  return (
    <main id="main-content" className="design-studio min-h-screen pt-16">
      <div className="studio-topbar">
        <div className="studio-shell flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3"><Link href="/" aria-label="Back to home" className="studio-back"><ArrowLeft className="w-4 h-4"/></Link><span className="studio-eyebrow">ALVÉO / DESIGN STUDIO</span></div>
          <div className="flex items-center gap-4"><span className="studio-save-state" role="status">{!store.ready?'Opening your workspace…':store.draftHealth==='Saved'?'Draft saved on this device':`Draft: ${store.draftHealth}`}</span><label className="studio-mode">Mode <select aria-label="User mode" value={userType} onChange={e=>setConfig(c=>({...c,userInfo:{...c.userInfo!,userType:e.target.value as 'homeowner'|'renter'|'designer'|'browsing'}}))}>{['homeowner','renter','designer','browsing'].map(t=><option key={t}>{t}</option>)}</select></label></div>
        </div>
      </div>
      <header className="studio-shell studio-intro"><div><p className="studio-eyebrow">A place for everything</p><h1>Your space. Thoughtfully arranged.</h1><p>Shape your room, tell us what you store, and make the design yours.</p></div><a className="studio-preview-link" href="#closet-preview">Explore your design <span aria-hidden="true">↗</span></a></header>
      {(store.notice||store.deleted||store.pendingCount>0)&&<div role="status" className="studio-shell studio-notice">{store.notice} {store.pendingCount>0&&<button onClick={store.retry}>Retry pending saves ({store.pendingCount})</button>}{store.deleted&&<button onClick={store.undoDelete}>Undo delete</button>}</div>}
      {store.opened&&<p className="studio-shell text-sm">Editing {store.opened.name} · {store.dirty?'Unsaved changes':'Matches saved version'}</p>}
      {/* Main two-column layout */}
      <div className="studio-shell pb-10">
        <div className="studio-grid">

          {/* Left: configurator form */}
          <fieldset disabled={!store.ready} aria-busy={!store.ready} className="studio-setup min-w-0">
            <EnhancedConfigurator
              config={config}
              onConfigChange={updateConfig}
              userType={userType}
            />
          </fieldset>

          {/* Right: live preview + export */}
          <div className="studio-preview min-w-0">
            <LivePreview
              config={config}
              savedDesigns={savedDesigns}
              onSaveDesign={store.save}
              onRemoveSavedDesign={store.remove}
              onRenameSavedDesign={store.rename}
              onDuplicateSavedDesign={store.duplicate}
              onOpenSavedDesign={store.open}
              libraryActions={{metadataBatch:store.metadataBatch,moveFavorite:store.moveFavorite,importDesigns:store.importDesigns,tag:store.tag,replace:store.replace,organize:store.organize,pin:store.pin,restoreRevision:store.restoreRevision,removeMany:store.removeMany}}
              onConfigChange={updateConfig}
            />
          </div>

        </div>
      </div>
      <div className="studio-shell pb-8"><details className="studio-recovery"><summary>Device storage & recovery</summary><p className="text-sm my-3">Draft: {store.draftHealth} · Named designs: {store.namedHealth} · {store.pendingCount} pending operations</p><div className="flex flex-wrap gap-3"><button disabled={!store.pendingCount} onClick={store.retry}>Retry pending saves</button><button onClick={store.recover}>Download raw recovery data</button></div><RecoveryTools lastDraftAt={store.lastDraftAt} lastNamedAt={store.lastNamedAt} config={store.config} designs={store.savedDesigns} pendingOperations={store.pendingOperations} onReplaceDraft={store.replaceUnreadableDraft}/></details></div>
    </main>
  );
}


