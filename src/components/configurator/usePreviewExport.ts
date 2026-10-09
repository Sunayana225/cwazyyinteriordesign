'use client';
import { useEffect, useRef, useState } from 'react';
import type { ClosetConfiguration, ClosetLayout, SavedDesign } from '@/types/closet';
import { DEFAULT_PRINT, storedPrintSettings, materialEstimateCSV } from '@/lib/printSettings';
import type { PrintSettings } from '@/lib/printSettings';
import { downloadText } from '@/lib/download';
import { serializeDesigns } from '@/lib/storage';
export function usePreviewExport({layout,config,savedDesigns,showDimensions,showLabels,onError,onSelectedDone}:{layout:ClosetLayout|null;config:Partial<ClosetConfiguration>;savedDesigns:SavedDesign[];showDimensions:boolean;showLabels:boolean;onError:(message:string)=>void;onSelectedDone:()=>void}){
  const [isExporting,setIsExporting]=useState(false),[showExportMenu,setShowExportMenu]=useState(false),[settings,setSettings]=useState<PrintSettings>(DEFAULT_PRINT),[showExportSettings,setShowExportSettings]=useState(false);
  const exportMenuRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{try{setSettings(storedPrintSettings(localStorage.getItem("alveo-print-preferences")));}catch{}},[]);
  useEffect(()=>{if(!showExportMenu)return;exportMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();const outside=(e:MouseEvent)=>{if(!exportMenuRef.current?.contains(e.target as Node))setShowExportMenu(false);};document.addEventListener('mousedown',outside);return()=>document.removeEventListener('mousedown',outside);},[showExportMenu]);
  const run=async(work:()=>Promise<void>)=>{setIsExporting(true);try{await work();}catch(error){onError(error instanceof Error?error.message:'Export failed. Please retry.');}finally{setIsExporting(false);}};
  // Reserve the window during the click, before waiting for the print-only chunk.
  // This preserves transient user activation and avoids delayed-popup blocking.
  const runPrint=(work:(popup:Window)=>Promise<void>)=>run(async()=>{
    const popup=window.open('','_blank');
    if(!popup)throw new Error('Print window was blocked. Allow pop-ups and try again.');
    try{popup.document.title='Preparing your drawing';popup.document.body.textContent='Preparing your drawing…';await work(popup);}
    catch(error){popup.close();throw error;}
  });
  const handleExport=async(chosen:PrintSettings=settings,snapshot?:{layout:ClosetLayout;config:Partial<ClosetConfiguration>})=>{
    if(!layout&&!snapshot)return;const captured=snapshot??structuredClone({layout:layout!,config});
    setSettings(chosen);try{localStorage.setItem("alveo-print-preferences",JSON.stringify(storedPrintSettings(JSON.stringify(chosen))));}catch{}
    await runPrint(async popup=>{const {exportLayoutToPDF}=await import('@/engine/PDFExporter');if(chosen.materialsCSV)downloadText(materialEstimateCSV(captured.layout,captured.config),"alveo-material-estimates.csv","text/csv");if(chosen.editableJSON)downloadText(serializeDesigns([{id:crypto.randomUUID(),name:chosen.project||'Current design',savedAt:new Date().toISOString(),config:captured.config}]),'alveo-print-configuration.json');await exportLayoutToPDF({...captured,showDimensions,showLabels,settings:chosen},popup);});
  };
  const handleExportAll=()=>{const captured=structuredClone(savedDesigns);return runPrint(async popup=>{const {exportMultipleDesignsToPDF}=await import('@/engine/PDFExporter');await exportMultipleDesignsToPDF(captured,popup);});};
  const handleExportSelected=(ids:Set<string>)=>{const captured=structuredClone(savedDesigns.filter(d=>ids.has(d.id)));return runPrint(async popup=>{const {exportMultipleDesignsToPDF}=await import('@/engine/PDFExporter');await exportMultipleDesignsToPDF(captured,popup);onSelectedDone();});};
  return {isExporting,showExportMenu,setShowExportMenu,exportMenuRef,settings,showExportSettings,setShowExportSettings,handleExport,handleExportAll,handleExportSelected};
}

