'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { ClosetConfiguration, SavedDesign } from '@/types/closet';
import { EnhancedConfigurator } from '@/components/configurator/EnhancedConfigurator';
import { LivePreview } from '@/components/configurator/LivePreview';
import { useDesignStore } from '@/components/configurator/useDesignStore';
import { RecoveryTools } from '@/components/configurator/RecoveryTools';
import { ArrowLeft } from 'lucide-react';
import { STYLE_OPTIONS, WOOD_OPTIONS } from '@/lib/design';
import { isUserRole, USER_ROLES, ROLE_WORKFLOWS } from '@/lib/userRoles';

export default function ConfigurePage() {
  const store = useDesignStore();
  const { config, setConfig, savedDesigns } = store;
  const userType = config.userInfo?.userType ?? 'homeowner';
  const finish = WOOD_OPTIONS.find(option => option.id === config.userInfo?.woodFinish) ?? WOOD_OPTIONS[2];
  const style = STYLE_OPTIONS.find(option => option.id === config.userInfo?.stylePreference);
  const updateConfig=useCallback((updates:Partial<ClosetConfiguration>)=>setConfig(prev=>({...prev,...updates})),[setConfig]);

  return (
    <main id="main-content" className="design-studio min-h-screen pt-16">
      <div className="studio-topbar">
        <div className="studio-shell flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3"><Link href="/" aria-label="Back to home" className="studio-back"><ArrowLeft className="w-4 h-4"/></Link><span className="studio-eyebrow">ALVÉO / DESIGN STUDIO</span></div>
          <div className="flex items-center gap-4"><span className="studio-save-state" role="status">{!store.ready?'Opening your workspace…':store.draftHealth==='Saved'?'Draft saved on this device':`Draft: ${store.draftHealth}`}</span><label className="studio-mode">Mode <select aria-label="User mode" disabled={!store.ready} value={userType} onChange={e=>{const role=e.target.value;if(isUserRole(role))setConfig(c=>({...c,userInfo:{...c.userInfo!,userType:role}}));}}>{USER_ROLES.map(role=><option key={role} value={role}>{ROLE_WORKFLOWS[role].label}</option>)}</select></label></div>
        </div>
      </div>
      <header className="studio-atelier">
        <div className="studio-shell studio-intro">
          <div className="studio-intro-copy">
            <p className="studio-eyebrow">THE ALVÉO ATELIER <span aria-hidden="true">—</span> MADE PERSONAL</p>
            <h1>Your space.<br/><em>Thoughtfully arranged.</em></h1>
            <p>A wardrobe shaped around your collection. Refined around you.</p>
          </div>
          <div className="studio-material-direction" aria-label="Current design palette">
            <span className="studio-material-sample" data-finish={finish.id} style={{backgroundColor:finish.color}} aria-hidden="true"/>
            <div><p className="studio-eyebrow">YOUR MATERIAL DIRECTION</p><p className="studio-material-name">{finish.name}</p><p className="studio-material-style">{style?.name ?? 'Modern'} collection</p></div>
            <a className="studio-preview-link" href="#closet-preview">Explore your design <span aria-hidden="true">↗</span></a>
            <a className="studio-guide-link" href="#studio-guide" onClick={() => document.getElementById('studio-guide')?.focus()}>New here? Discover the tools</a>
          </div>
        </div>
      </header>
      {(store.notice||store.deleted||store.pendingCount>0)&&<div role="status" className="studio-shell studio-notice">{store.notice} {store.pendingCount>0&&<button onClick={store.retry}>Retry pending saves ({store.pendingCount})</button>}{store.deleted&&<button onClick={store.undoDelete}>Undo delete</button>}</div>}
      {store.opened&&<p className="studio-shell text-sm">Editing {store.opened.name} · {store.dirty?'Unsaved changes':'Matches saved version'}</p>}
      {/* Main two-column layout */}
      <div className="studio-shell pb-10">
        <div className="studio-grid">

          {/* Left: configurator form */}
          <fieldset id="design-brief" tabIndex={-1} aria-label="Your design brief" disabled={!store.ready} aria-busy={!store.ready} className="studio-setup min-w-0 scroll-mt-24">
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
              restored={store.ready}
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


