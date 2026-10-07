'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClosetConfiguration, ClosetLayout, ClosetWall, ZoneOverrides, DrawerPosition, LayoutWarning, SavedDesign } from '@/types/closet';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { ClosetSVGRenderer } from '@/renderer/ClosetSVGRenderer';
import { usePreviewExport } from './usePreviewExport';
import { ExportSettingsDialog } from './ExportSettingsDialog';
import { renderFloorPlan } from '@/renderer/FloorPlanRenderer';
import { Download, Layers, Lightbulb, BarChart2, Bookmark, ChevronDown, X, Trash2, Palette, TriangleAlert } from 'lucide-react';
import { SavedDesignDialog } from './SavedDesignDialog';
import type { LibraryActions } from './LibraryTools';
import { DrawingCanvas } from './DrawingCanvas';
import { LayoutCanvas } from './LayoutCanvas';
import type { CanvasView } from './DrawingCanvas';
import { PlanningControls } from './PlanningControls';
import { InventoryPlanning } from './InventoryPlanning';
import { LayoutInsights } from './LayoutInsights';
import { OrphanOrganizers } from './OrphanOrganizers';
import { layoutInputKey, LatestJob } from '@/lib/preview';
import { StyleCustomizer } from './StyleCustomizer';
import { StudioGuide, type StudioTool } from './StudioGuide';
import { SpatialPreview } from './SpatialPreview';
import dynamic from 'next/dynamic';
import { drawerTargets, resolveOrganizers } from '@/lib/drawers';
import { storageFit } from '@/lib/storageFit';
import type { DrawerInterior } from '@/lib/drawers';

const EMPTY_OVERRIDES: ZoneOverrides = {};
const DrawerDesigner = dynamic(()=>import('./DrawerDesigner').then(module=>module.DrawerDesigner),{
  loading:()=> <p role="status">Opening drawer editor…</p>,
});

interface LivePreviewProps {
  config: Partial<ClosetConfiguration>;
  savedDesigns: SavedDesign[];
  onSaveDesign: () => boolean | Promise<boolean>;
  onOpenSavedDesign?: (id: string) => void;
  onRemoveSavedDesign: (id: string) => void;
  onRenameSavedDesign?: (id: string, newName: string) => void;
  onDuplicateSavedDesign?: (id: string) => Promise<boolean>;
  onConfigChange?: (updates: Partial<ClosetConfiguration>) => void;
  libraryActions?:LibraryActions;
}

export function LivePreview({ config, savedDesigns, onSaveDesign, onRemoveSavedDesign, onRenameSavedDesign, onOpenSavedDesign, onDuplicateSavedDesign, onConfigChange, libraryActions }: LivePreviewProps) {
  const [activeTab, setActiveTab] = useState<'drawing' | 'summary' | 'tips' | 'style'>('drawing');
  const [activeWallIdx, setActiveWallIdx] = useState(0);
  const [selectedZone,setSelectedZone]=useState<{wall:string;index:number}|null>(null);
  const [editingDrawer, setEditingDrawer] = useState<string|null>(null);
  const [drawerClipboard, setDrawerClipboard] = useState<DrawerInterior|null>(null);
  const [localZoneOverrides, setLocalZoneOverrides] = useState<ZoneOverrides>(config.zoneOverrides ?? {});
  const zoneOverrides = onConfigChange ? (config.zoneOverrides ?? EMPTY_OVERRIDES) : localZoneOverrides;
  const setZoneOverrides = (next: ZoneOverrides) => {
    setLocalZoneOverrides(next);
    onConfigChange?.({ zoneOverrides: next });
  };
  const [prevZoneOverrides, setPrevZoneOverrides] = useState<ZoneOverrides | null>(null);
  const [warningsDismissed, setWarningsDismissed] = useState(new Set<string>());
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [renderError, setRenderError] = useState('');
  const [showDimensions, setShowDimensions] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [highContrast,setHighContrast]=useState(false),[openIllustration,setOpenIllustration]=useState(false),[preferencesReady,setPreferencesReady]=useState(false);
  const views=useRef(new Map<string,CanvasView>()),renderJob=useRef(new LatestJob());
  useEffect(()=>{try{const p=JSON.parse(localStorage.getItem('alveo-drawing-preferences')??'{}');if(typeof p.dimensions==='boolean')setShowDimensions(p.dimensions);if(typeof p.labels==='boolean')setShowLabels(p.labels);if(typeof p.highContrast==='boolean')setHighContrast(p.highContrast);}catch{}setPreferencesReady(true);},[]);
  useEffect(()=>{if(preferencesReady)try{localStorage.setItem('alveo-drawing-preferences',JSON.stringify({dimensions:showDimensions,labels:showLabels,highContrast}));}catch{}},[showDimensions,showLabels,highContrast,preferencesReady]);
  const [showSpatial,setShowSpatial]=useState(false);
  const [rearranging,setRearranging]=useState<string|null>(null);
  const [showFloorPlan, setShowFloorPlan] = useState(false);

  const handlePositionChange = (position: DrawerPosition) => {
    setPrevZoneOverrides(zoneOverrides);
    setZoneOverrides({ ...zoneOverrides, drawerPosition: position });
    setWarningsDismissed(new Set());
  };

  const undoPosition = () => {
    if (prevZoneOverrides !== null) {
      setZoneOverrides(prevZoneOverrides);
      setPrevZoneOverrides(null);
      setWarningsDismissed(new Set());
    }
  };

  const isReady = !!(config.dimensions?.width && config.wardrobe && config.shoes && config.userInfo);

  const calculationKey=layoutInputKey(config,zoneOverrides);
  const calculation = useMemo(() => {
    if (!isReady) return { value: null, error: '' };
    try {
      const engine = new ClosetLayoutEngine(JSON.parse(calculationKey));
      return { value: engine.calculateLayout(), error: '' };
    } catch (error) { return { value: null, error: error instanceof Error ? error.message : 'Could not calculate the design.' }; }
  }, [calculationKey,isReady]);

  const layout = calculation.value;
  const fit=storageFit(layout?.capacity);
  const drawers = layout ? drawerTargets(layout) : [];
  const targetDrawer = drawers.find(d=>d.id===editingDrawer);
  const organizers=resolveOrganizers(config.drawerInteriors??{},drawers);
  const unmatchedOrganizers=Object.keys(organizers).filter(id=>!drawers.some(d=>d.id===id));

  // When layout changes (new closet type), reset to first wall
  const numWalls   = layout?.walls?.length ?? 1;
  useEffect(() => { setActiveWallIdx(0); }, [numWalls]);
  const safeWallIdx = Math.min(activeWallIdx, numWalls - 1);
  // The wall being rearranged, resolved fresh each render so the canvas always opens
  // against the current regenerated geometry rather than a stale snapshot.
  const rearrangingWall = rearranging ? layout?.walls?.find(w => w.wallId === rearranging) ?? null : null;

  // Build a single-wall layout for the selected wall (renderer works on one wall at a time)
  const wallLayout = useMemo((): ClosetLayout | null => {
    if (!layout) return null;
    const wall: ClosetWall | undefined = layout.walls?.[safeWallIdx];
    if (!wall) return layout;
    return {
      ...layout,
      dimensions: { width: wall.width, height: wall.height, depth: wall.unitDepth },
      zones:      wall.zones,
      walls:      [wall],
    };
  }, [layout, safeWallIdx]);

  useEffect(() => {
    if (!wallLayout || !config.userInfo) return;
    try {
      const renderer = new ClosetSVGRenderer(wallLayout, {
        showDimensions, showLabels, style: config.userInfo.stylePreference,
        woodFinish: config.userInfo.woodFinish, hardwareFinish: config.userInfo.hardwareFinish,
        accentColor: config.userInfo.accentColor,
        interactiveDrawers: !!onConfigChange,
      });
      void renderJob.current.run(()=>renderer.renderElevation(),svg=>{setSvgContent(svg);setRenderError('');},error=>setRenderError(String(error)));
    } catch (error) { setRenderError(error instanceof Error ? error.message : 'Drawing failed. Edit the dimensions and retry.'); }
    const job=renderJob.current;return()=>job.cancel();
  }, [wallLayout, config.userInfo, showDimensions, showLabels, onConfigChange]);

  const hasDrawersInView = wallLayout?.zones.some(z => z.type === 'drawers') ?? false;

  const {isExporting,showExportMenu,setShowExportMenu,exportMenuRef,settings,showExportSettings,setShowExportSettings,handleExport,handleExportAll,handleExportSelected}=usePreviewExport({layout,config,savedDesigns,showDimensions,showLabels,onError:setRenderError,onSelectedDone:()=>setShowCustomModal(false)});

  const handleSave = async () => {
    setSaveToast(await onSaveDesign());
    setTimeout(() => setSaveToast(false), 2500);
  };

  const openStudioTool = (tool: StudioTool) => {
    if (tool === 'library') { setShowCustomModal(true); return; }
    if (!layout) return;
    if (tool === 'print') { setShowExportSettings(true); return; }
    const detailTargets: Partial<Record<StudioTool, string>> = { fit: 'studio-fit-tools', room: 'studio-room-tools', inventory: 'studio-inventory-tools' };
    const detailsId = detailTargets[tool];
    if (detailsId) {
      const details = document.getElementById(detailsId);
      if (details instanceof HTMLDetailsElement) {
        details.open = true;
        details.querySelector('summary')?.focus();
        details.scrollIntoView({ block: 'start' });
      }
      return;
    }
    const tab = tool === 'style' ? 'style' : 'drawing';
    setActiveTab(tab);
    setShowSpatial(tool === 'spatial');
    setShowFloorPlan(tool === 'floor');
    if (tool === 'drawers' && drawers.length) {
      const drawer = drawers.find(d => d.id.startsWith(`${layout.walls[safeWallIdx]?.wallId}:`)) ?? drawers[0];
      setActiveWallIdx(Math.max(0, layout.walls.findIndex(w => w.wallId === drawer.id.split(':')[0])));
      setEditingDrawer(drawer.id);
    }
    if (tool === 'arrange' && layout.walls[safeWallIdx]) setRearranging(layout.walls[safeWallIdx].wallId);
    document.getElementById(`tab-${tab}`)?.focus();
    document.getElementById(`tab-${tab}`)?.scrollIntoView({ block: 'center' });
  };



  const tabs = [
    { id: 'drawing' as const, label: 'Drawing',    Icon: Layers },
    { id: 'summary' as const, label: 'Summary',    Icon: BarChart2 },
    { id: 'tips'    as const, label: 'Suggestions', Icon: Lightbulb },
    ...(onConfigChange ? [{ id: 'style' as const, label: 'Style', Icon: Palette }] : []),
  ];

  return (
    <div id="closet-preview" className="studio-live-preview flex flex-col gap-4 scroll-mt-24">
      {(renderError || calculation.error) && <p role="alert" className="border border-red-300 bg-red-50 p-3 rounded text-red-800">{renderError || calculation.error} The last valid drawing remains visible. Update the configuration to retry.</p>}

      {/* Save toast */}
      <AnimatePresence>
        {saveToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            role="status" className="fixed top-4 right-4 z-50 bg-charcoal-600 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2"
          >
            <Bookmark className="w-4 h-4" />
            <span>Design saved!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="studio-preview-heading flex flex-wrap gap-3 items-center justify-between">
        <div><p className="studio-eyebrow">02 / YOUR DESIGN</p><h2 className="font-serif text-2xl text-charcoal-600">Your Closet Preview</h2></div>
        {layout && (
          <div className="flex items-center gap-2">
            {/* Save Design */}
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              title="Save this design"
              className="flex items-center space-x-1.5 bg-cream-100 hover:bg-cream-200 text-charcoal-600 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border border-cream-300"
            >
              <Bookmark className="w-4 h-4" />
              <span>Save</span>
            </motion.button>

            {/* Export dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                aria-expanded={showExportMenu} aria-controls="export-options" aria-haspopup="menu" onClick={() => setShowExportMenu(v => !v)}
                disabled={isExporting}
                className="flex items-center space-x-2 bg-charcoal-500 hover:bg-charcoal-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'Opening PDF…' : 'Export'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
              </motion.button>

              <AnimatePresence>
                {showExportMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.12 }}
                    id="export-options" role="menu" onKeyDown={e => { if (e.key === 'Escape') { setShowExportMenu(false); exportMenuRef.current?.querySelector<HTMLElement>('[aria-haspopup]')?.focus(); } if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button')); const i = buttons.indexOf(document.activeElement as HTMLButtonElement); buttons[(i + (e.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus(); } }} className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-cream-200 overflow-hidden z-50"
                  >
                    <button
                      role="menuitem" onClick={() => { setShowExportMenu(false); handleExport(); }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-cream-50 transition-colors"
                    >
                      <span className="font-medium text-charcoal-600">Export Current</span>
                      <div className="text-xs text-charcoal-400 mt-0.5">This design only</div>
                    </button>
                    <div className="border-t border-cream-100" />
                    <button role="menuitem" className="w-full text-left px-4 py-3 text-sm" onClick={()=>{setShowExportMenu(false);setShowExportSettings(true);}}>Print options and preview</button>
                    <button
                      role="menuitem" onClick={() => { setShowExportMenu(false); handleExportAll(); }}
                      disabled={savedDesigns.length === 0}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-cream-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="font-medium text-charcoal-600">Export All Saved ({savedDesigns.length})</span>
                      <div className="text-xs text-charcoal-400 mt-0.5">All saved designs in one PDF</div>
                    </button>
                    <div className="border-t border-cream-100" />
                    <button
                      role="menuitem" onClick={() => {
                        setShowExportMenu(false);
                        setShowCustomModal(true);
                      }}
                      disabled={savedDesigns.length === 0}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-cream-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="font-medium text-charcoal-600">Custom Export…</span>
                      <div className="text-xs text-charcoal-400 mt-0.5">Pick which designs to include</div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {showExportSettings&&layout&&<ExportSettingsDialog layout={layout} config={config} initial={settings} activeWall={layout.walls[activeWallIdx]?.wallId} savedDesigns={savedDesigns} onExport={handleExport} onClose={()=>setShowExportSettings(false)} busy={isExporting}/>}
      <button className="studio-library-button text-sm self-start" onClick={() => setShowCustomModal(true)}>Manage saved designs ({savedDesigns.length})</button>
      <StudioGuide onAction={openStudioTool} hasLayout={!!layout} hasDrawers={drawers.length > 0} canEdit={!!onConfigChange} hasFloorPlan={!!layout&&!['reach-in','wardrobe-wall'].includes(layout.closetType)}/>
      <div hidden={activeTab!=='drawing'||showSpatial||showFloorPlan} className="studio-display-options flex flex-wrap gap-3 text-sm"><label><input type="checkbox" checked={showDimensions} onChange={e => setShowDimensions(e.target.checked)} /> Dimensions</label><label><input type="checkbox" checked={showLabels} onChange={e => setShowLabels(e.target.checked)} /> Labels</label><label><input type="checkbox" checked={highContrast} onChange={e=>setHighContrast(e.target.checked)}/> High contrast drawing</label></div>
      {/* Tabs */}
      <div role="tablist" aria-label="Preview views" className="flex flex-wrap bg-cream-100 rounded-lg p-1">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            role="tab" id={'tab-' + id} aria-controls={'panel-' + id} aria-selected={activeTab === id} tabIndex={activeTab === id ? 0 : -1}
            onKeyDown={e => { const i = tabs.findIndex(t => t.id === activeTab); const next = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1; if (next >= 0) { e.preventDefault(); setActiveTab(tabs[next].id); document.getElementById('tab-' + tabs[next].id)?.focus(); } }}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === id ? 'bg-white text-charcoal-600 shadow-sm' : 'text-charcoal-400 hover:text-charcoal-600'
            }`}
          >
            <Icon className="w-4 h-4" /><span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          role="tabpanel" id={"panel-" + activeTab} aria-labelledby={"tab-" + activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {/* ── Drawing ── */}
          {activeTab === 'drawing' && (
            <div className="studio-drawing-stage">
              <div className="studio-view-switch" role="group" aria-label="Drawing perspective">
                <button aria-pressed={!showSpatial&&!showFloorPlan} onClick={()=>{setShowSpatial(false);setShowFloorPlan(false);}}>Elevation</button>
                <button aria-label={showSpatial?'Hide 3D room view':'Show 3D room view'} aria-pressed={showSpatial} onClick={()=>{setShowSpatial(v=>!v);setShowFloorPlan(false);}}>3D room</button>
                {layout&&!['reach-in','wardrobe-wall'].includes(layout.closetType)&&<button aria-label={showFloorPlan?'Hide floor plan':'Show floor plan'} aria-pressed={showFloorPlan} onClick={()=>{setShowFloorPlan(v=>!v);setShowSpatial(false);}}>Floor plan</button>}
              </div>
              <p className="studio-drawing-help">{showSpatial ? 'Explore the room in 3D. Select a drawer to design its interior.' : showFloorPlan ? 'Select a wall to open its elevation. Select a room object to edit its settings.' : 'Select a drawer face to design its compartments. Use “Rearrange elements” below to change this wall’s columns.'}</p>
              {layout&&showSpatial&&<SpatialPreview layout={layout} preferences={config.userInfo} onDrawerClick={onConfigChange?setEditingDrawer:undefined}/>}
              {layout&&showFloorPlan&&<DrawingCanvas viewKey="floor-plan" views={views.current} onObjectClick={(kind,id)=>{if(kind==='wall'){setActiveWallIdx(layout.walls.findIndex(w=>w.wallId===id));setShowFloorPlan(false);}else window.dispatchEvent(new CustomEvent('alveo-focus-obstacle',{detail:id}));}} svg={renderFloorPlan(layout,{roomWidth:layout.roomDimensions?.roomWidth??120,roomDepth:layout.roomDimensions?.roomDepth??120,unitDepth:config.dimensions?.depth??24,interactive:true})}/>}
              {/* Wall selector tabs — shown for multi-wall closet types */}
              {!showSpatial&&!showFloorPlan&&numWalls > 1 && layout?.walls && (
                <div className="flex gap-2 mb-4 flex-wrap">
                  {layout.walls.map((wall, i) => (
                    <button
                      key={wall.wallId}
                      type="button"
                      aria-pressed={safeWallIdx===i}
                      onClick={() => setActiveWallIdx(i)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors flex items-center gap-1.5 ${
                        safeWallIdx === i
                          ? 'bg-charcoal-500 text-white shadow-sm'
                          : 'bg-cream-200 text-charcoal-500 hover:bg-cream-300'
                      }`}
                    >
                      <span>{wall.elevationRef} · {wall.label}</span>
                      <span className={`inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full ${
                        safeWallIdx === i ? 'bg-white/20 text-white' : 'bg-charcoal-200 text-charcoal-600'
                      }`}>
                        {wall.zones.length}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {/* ── Input normalisation warnings (amber toasts) ── */}
              {(layout?.inputWarnings?.length ?? 0) > 0 && (
                <div className="mb-3 space-y-1.5">
                  {layout!.inputWarnings!.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 leading-snug">
                      <span className="flex-shrink-0 font-bold">&#9888;</span>
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {svgContent ? (
                <>
                <div hidden={showSpatial||showFloorPlan}><DrawingCanvas key={layout?.walls[safeWallIdx]?.wallId} viewKey={layout?.walls[safeWallIdx]?.wallId} views={views.current} svg={svgContent} onDrawerClick={setEditingDrawer} selectedDrawer={editingDrawer} selectedZone={selectedZone?.wall===layout?.walls[safeWallIdx]?.wallId?selectedZone?.index:null} highContrast={highContrast}/></div>
                {onConfigChange&&layout?.walls[safeWallIdx]&&!showSpatial&&!showFloorPlan&&<p className="my-3"><button className="border rounded px-3 py-2 text-sm" data-rearrange-wall={layout.walls[safeWallIdx].wallId} onClick={()=>setRearranging(layout.walls[safeWallIdx].wallId)}>Rearrange elements on this wall{zoneOverrides.columns?.[layout.walls[safeWallIdx].wallId]?.length?' · Customized':''}</button></p>}
                {rearrangingWall&&<LayoutCanvas wall={rearrangingWall} stored={zoneOverrides.columns?.[rearrangingWall.wallId]} onClose={()=>setRearranging(null)}
                  onCommit={cols=>{const next={...(zoneOverrides.columns??{})};if(cols)next[rearrangingWall.wallId]=cols;else delete next[rearrangingWall.wallId];
                    setZoneOverrides({...zoneOverrides,columns:Object.keys(next).length?next:undefined});setWarningsDismissed(new Set());}}/>}
                {onConfigChange&&drawers.length>0&&<details className="border rounded-lg p-3 mt-3"><summary className="font-semibold">Drawer organizers</summary><p className="text-sm my-2">Click a drawer face above, or choose one below, to design its compartments.</p><div className="flex flex-wrap gap-2">{drawers.map(d=><button key={d.id} data-drawer-open={d.id} className="border rounded px-3 py-2 text-sm" onClick={()=>{setActiveWallIdx(layout?.walls.findIndex(w=>w.wallId===d.id.split(':')[0])??0);setEditingDrawer(d.id);}}>{d.label}{organizers[d.id]?' · Customized':''}</button>)}</div><label className="block my-2 text-sm"><input type="checkbox" checked={openIllustration} onChange={e=>setOpenIllustration(e.target.checked)}/> Show open-drawer illustration</label>{openIllustration&&<button onClick={()=>setEditingDrawer(drawers[0].id)} aria-label="Design compartments from open drawer illustration"><svg viewBox="0 0 240 140" role="img" aria-label="Open drawer illustration"><path d="M30 25 H190 V80 H30 Z" fill="#d5b995" stroke="#66523a"/><path d="M30 45 L10 105 H170 L190 45 Z" fill="#eee1ca" stroke="#66523a"/><path d="M10 105 H170 V130 H10 Z" fill="#b7966e" stroke="#66523a"/><path d="M70 117 H110" stroke="#242424" strokeWidth="4"/><text x="95" y="80" fontSize="12" textAnchor="middle">Design compartments</text></svg></button>}</details>}
                {unmatchedOrganizers.length>0&&<p role="status" className="text-sm text-amber-900 mt-2">{unmatchedOrganizers.length} organizer(s) belong to drawers no longer in this layout. They remain saved and will return if you restore that layout.</p>}
                {unmatchedOrganizers.length>0&&onConfigChange&&<OrphanOrganizers ids={unmatchedOrganizers} plans={organizers} targets={drawers} onChange={drawerInteriors=>onConfigChange({drawerInteriors})}/>}
                {targetDrawer&&onConfigChange&&<DrawerDesigner key={targetDrawer.id} target={targetDrawer} targets={drawers} existing={organizers} value={organizers[targetDrawer.id]} clipboard={drawerClipboard} onCopy={setDrawerClipboard} onClose={()=>setEditingDrawer(null)} locationSVG={svgContent} onRemove={()=>{const next={...organizers};delete next[targetDrawer.id];onConfigChange({drawerInteriors:next});}} onApply={(ids,plan)=>{const next={...organizers};ids.forEach(id=>{next[id]={...structuredClone(plan),identity:drawers.find(d=>d.id===id)?.identity};});onConfigChange({drawerInteriors:next});}}/>}

                </>
              ) : isReady ? (
                /* ── Ready but SVG failed ── */
                <div className="py-10 text-center space-y-2">
                  <div className="text-3xl">⚠️</div>
                  <p className="text-sm font-semibold text-charcoal-500">Layout could not be rendered</p>
                  <p className="text-xs text-charcoal-400">Try adjusting your dimensions or wardrobe configuration</p>
                </div>

              ) : (
                /* ── Incomplete form — step checklist ── */
                <div className="py-8 px-4 space-y-4">
                  <div className="text-center space-y-1 mb-2">
                    <p className="text-xs font-semibold text-charcoal-400 uppercase tracking-widest">Blueprint pending</p>
                    <p className="text-xs text-charcoal-300">Complete the steps below to generate your design</p>
                  </div>
                  <div className="space-y-2">
                    {([
                      { label: 'Closet shape & type',    done: !!config.closetType },
                      { label: 'Room dimensions',         done: !!config.dimensions?.width },
                      { label: 'Wardrobe configuration',  done: !!config.wardrobe },
                      { label: 'Shoe storage',            done: !!config.shoes },
                      { label: 'Style & finish',          done: !!config.userInfo },
                    ] as { label: string; done: boolean }[]).map(({ label, done }) => (
                      <motion.div
                        key={label}
                        initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm ${
                          done
                            ? 'bg-cream-50 border-cream-200 text-charcoal-500'
                            : 'bg-white border-cream-100 text-charcoal-300'
                        }`}
                      >
                        <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                          done ? 'bg-taupe-400 text-white' : 'bg-cream-200 text-charcoal-300'
                        }`}>
                          {done ? '✓' : '·'}
                        </span>
                        <span>{label}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Zone Controls — drawer position selector ── */}
              {svgContent && hasDrawersInView && (
                <div className="mt-4 pt-4 border-t border-cream-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-widest">
                      Fine-tune your layout
                    </p>
                    {prevZoneOverrides !== null && (
                      <button
                        type="button"
                        onClick={undoPosition}
                        className="text-xs text-taupe-500 hover:text-taupe-700 font-medium underline underline-offset-2 transition-colors"
                      >
                        ↩ Undo last change
                      </button>
                    )}
                  </div>
                  <DrawerPositionControl
                    position={zoneOverrides.drawerPosition ?? 'bottom'}
                    onChange={handlePositionChange}
                  />
                </div>
              )}

              {/* ── Designer warnings ── */}
              <AnimatePresence>
                {(layout?.layoutWarnings ?? []).filter(w=>!warningsDismissed.has(w.id+w.designerNote)).map(w => (
                  <motion.div
                    key={w.id}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="mt-3"
                  >
                    <DesignerWarning
                      warning={w}
                      onKeep={() => setWarningsDismissed(current=>new Set([...current,w.id+w.designerNote]))}
                      onUndo={prevZoneOverrides !== null && w.id.startsWith('drawer-') ? undoPosition : undefined}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* ── Summary ── */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              {layout ? (
                <>
                  <div className="bg-cream-50 rounded-xl border border-cream-200 p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-charcoal-600">Storage needs covered</p>
                      <span className="text-2xl font-serif font-bold text-taupe-500">{fit.covered} / {fit.total}</span>
                    </div>
                    <div role="progressbar" aria-label="Storage needs covered" aria-valuemin={0} aria-valuemax={fit.total||1} aria-valuenow={fit.covered} aria-valuetext={fit.total?`${fit.covered} of ${fit.total} categories covered`:'Add inventory to assess fit'} className="w-full h-3 bg-cream-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${fit.percent}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          fit.total>0&&fit.covered===fit.total ? 'bg-green-500' :
                          'bg-amber-400'
                        }`}
                      />
                    </div>
                    <p className="text-xs text-charcoal-400 mt-2">
                      {!fit.total?'Add wardrobe items to assess storage fit.':fit.shortfalls.length?`Additional storage needed for: ${fit.shortfalls.map(row=>row.label).join(', ')}. Review the quantities below.`:'Your entered inventory fits the modeled capacity. Review access, clearances, and item sizes before finalizing.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Hanging Rods', value: `${layout.totalStorage.hangingRods} ft`,     icon: '👗' },
                      { label: 'Shelf Space',  value: `${layout.totalStorage.shelfSpace} sq ft`,   icon: '📦' },
                      { label: 'Drawers',      value: `${layout.totalStorage.drawerCount}`,         icon: '🗄️' },
                      { label: 'Shoe Pairs',   value: `${layout.totalStorage.shoeCapacity} pairs`, icon: '👠' },
                    ].map(({ label, value, icon }) => (
                      <div key={label} className="bg-cream-50 rounded-xl border border-cream-200 p-4 flex items-center space-x-3">
                        <span className="text-xl">{icon}</span>
                        <div>
                          <p className="text-xs text-charcoal-400">{label}</p>
                          <p className="font-semibold text-charcoal-600">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Per-wall breakdown */}
                  {layout.walls.length > 1 && (
                    <div className="bg-cream-50 rounded-xl border border-cream-200 p-4 space-y-2">
                      <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wide">Per-wall breakdown</p>
                      {layout.walls.map(w => (
                        <div key={w.wallId} className="flex items-center justify-between text-sm">
                          <span className="text-charcoal-500">{w.elevationRef} · {w.label}</span>
                          <span className="text-charcoal-600 font-medium">
                            {w.zones.length} zone{w.zones.length !== 1 ? 's' : ''} · {Math.round(w.width)}&quot; wide
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-cream-50 rounded-xl border border-cream-200 p-4 text-sm text-charcoal-500">
                    Effective: {layout.dimensions.width}&quot; wide × {layout.dimensions.height}&quot; tall × {layout.dimensions.depth}&quot; cabinet depth
                    <span className="ml-2 text-charcoal-600 font-medium">
                      · {(config.closetType ?? 'reach-in').replace(/-/g, ' ')}
                    </span>
                  </div>
                </>
              ) : (
                <div className="bg-cream-50 rounded-xl border border-cream-200 p-8 text-center">
                  <p className="text-charcoal-400">Complete the configurator steps to see your storage summary</p>
                </div>
              )}
            </div>
          )}

          {/* ── Tips ── */}
          {activeTab === 'tips' && (
            <div className="space-y-3">
              {layout?.recommendations?.length ? (
                layout.recommendations.map((rec, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-start space-x-3 bg-cream-50 rounded-xl border border-cream-200 p-4"
                  >
                    <span className="text-taupe-400 text-lg mt-0.5">💡</span>
                    <p className="text-sm text-charcoal-600">{rec}</p>
                  </motion.div>
                ))
              ) : layout ? (
                <div className="bg-cream-50 rounded-xl border border-cream-200 p-6 text-center">
                  <div className="text-3xl mb-2">✨</div>
                  <p className="text-charcoal-600 font-medium">Your layout is well optimized!</p>
                  <p className="text-sm text-charcoal-400 mt-1">No major suggestions — you&apos;re all set</p>
                </div>
              ) : (
                <div className="bg-cream-50 rounded-xl border border-cream-200 p-8 text-center">
                  <p className="text-charcoal-400">Smart suggestions will appear after your layout is generated</p>
                </div>
              )}
            </div>
          )}

          {/* ─── Style tab ─── */}
          {activeTab === 'style' && onConfigChange && (
            <StyleCustomizer config={config} onConfigChange={onConfigChange} />
          )}

        </motion.div>
      </AnimatePresence>
          {layout?.capacity && <details className="studio-capacity text-sm mb-4 border rounded p-3" open={activeTab === 'summary'}><summary>Capacity and fit — utilization alone does not confirm fit</summary><ul className="mt-2 space-y-1">{layout.capacity.filter(r => r.required > 0).map(r => <li key={r.label} className={r.required > r.available ? 'text-red-800' : ''}>{r.label}: {r.available.toFixed(1)} provided / {r.required.toFixed(1)} {r.unit} required{r.required > r.available ? ' — additional storage needed' : ''}</li>)}</ul></details>}
      <div className="studio-planning"><div className="studio-tool-heading"><p className="studio-eyebrow">REFINE YOUR DESIGN</p><h3>Details that make it yours</h3><p>Adjust openings, household needs, and storage allocation.</p></div>
      {layout&&<LayoutInsights layout={layout} config={config} onChange={onConfigChange} onZone={(wall,index)=>{setActiveTab("drawing");setShowFloorPlan(false);setActiveWallIdx(layout.walls.findIndex(w=>w.wallId===wall));setSelectedZone({wall,index});}}/>}
      {layout&&onConfigChange&&<InventoryPlanning layout={layout} config={config} onChange={onConfigChange}/>}
      {layout&&onConfigChange&&<PlanningControls layout={layout} config={config} onChange={onConfigChange}/>}
      </div>
      {showCustomModal && <SavedDesignDialog designs={savedDesigns} close={() => setShowCustomModal(false)} remove={onRemoveSavedDesign} rename={onRenameSavedDesign} open={onOpenSavedDesign} duplicate={onDuplicateSavedDesign} exportSelected={handleExportSelected} busy={isExporting} libraryActions={libraryActions} config={config} />}
    </div>
  );
}

// ── Drawer Position Control ───────────────────────────────────────────────────────────
function DrawerPositionControl({ position, onChange }: {
  position: DrawerPosition;
  onChange: (p: DrawerPosition) => void;
}) {
  const options: { value: DrawerPosition; label: string; desc: string; emoji: string }[] = [
    { value: 'bottom', label: 'Bottom', desc: 'Easy everyday access',               emoji: '⬇️' },
    { value: 'middle', label: 'Middle', desc: 'Great for accessories & jewellery',  emoji: '↕️' },
    { value: 'top',    label: 'Top',    desc: 'Ideal for seasonal items',            emoji: '⬆️' },
  ];
  return (
    <div className="space-y-2">
      <p className="text-xs text-charcoal-400">Drawer stack position in the hanging column</p>
      <div className="grid grid-cols-3 gap-2">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-xl px-3 py-3 text-left transition-all border ${
              position === o.value
                ? 'bg-charcoal-500 text-white border-charcoal-500 shadow-sm'
                : 'bg-white text-charcoal-600 border-cream-200 hover:border-taupe-300'
            }`}
          >
            <div className="text-base mb-1">{o.emoji}</div>
            <div className="text-xs font-semibold">{o.label}</div>
            <div className={`text-[10px] mt-0.5 leading-tight ${
              position === o.value ? 'text-cream-300' : 'text-charcoal-400'
            }`}>{o.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Designer Warning Toast ─────────────────────────────────────────────────────────
function DesignerWarning({ warning, onKeep, onUndo }: {
  warning: LayoutWarning;
  onKeep: () => void;
  onUndo?: () => void;
}) {
  const isCaution = warning.severity === 'caution';
  return (
    <div className={`rounded-xl border p-4 space-y-3 ${
      isCaution ? 'bg-amber-50 border-amber-200' : 'bg-cream-50 border-taupe-200'
    }`}>
      <div className="flex items-start gap-3">
        <span className="shrink-0 text-amber-800">{isCaution?<TriangleAlert className="w-4 h-4"/>:<Lightbulb className="w-4 h-4"/>}</span>
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${
            isCaution ? 'text-amber-800' : 'text-taupe-500'
          }`}>
            {isCaution ? "Designer's caution" : "Designer's note"}
          </p>
          <p className="text-sm text-charcoal-600 leading-relaxed">{warning.designerNote}</p>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={onKeep}
          className="text-xs font-medium px-4 py-2 bg-charcoal-500 text-white rounded-lg hover:bg-charcoal-600 transition-colors"
        >
          Keep this layout
        </button>
        {onUndo && (
          <button
            onClick={onUndo}
            className="text-xs font-medium px-4 py-2 bg-white text-charcoal-600 border border-cream-200 rounded-lg hover:bg-cream-100 transition-colors"
          >
            Undo move
          </button>
        )}
      </div>
    </div>
  );
}




