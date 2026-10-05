'use client';
import { useEffect, useRef, useState } from 'react';
import { CATEGORIES, MATERIALS, LINERS, PRESETS, cellSize, defaultInterior, grid, innerSize, interiorSVG, interiorWarnings, adjacentAxis, mergeIssue, mergeCells, splitCell, transformInterior, spatialNeighbor, materialColor } from '@/lib/drawers';
import { SettingsNavigation } from './SettingsNavigation';
import { DrawerAdvanced } from './DrawerAdvanced';
import { DrawerPrecision } from './DrawerPrecision';
import { DrawerConstruction } from './DrawerConstruction';
import { useDrawerHistory } from './useDrawerHistory';
import { organizerChanges, pruneOrphanDividers, reconcileSelection, rectangleSelection, redistributeInventory } from '@/lib/drawerConstruction';
import { namespaceSVG } from '@/lib/preview';
import type { Compartment, DrawerInterior, DrawerTarget } from '@/lib/drawers';

interface Props { target:DrawerTarget; targets:DrawerTarget[]; value?:DrawerInterior; clipboard:DrawerInterior|null; onCopy:(p:DrawerInterior)=>void; onApply:(ids:string[],p:DrawerInterior)=>void; onClose:()=>void; onRemove?:()=>void; existing?:Record<string,DrawerInterior>;locationSVG?:string; }
export function DrawerDesigner({target,targets,value,clipboard,onCopy,onApply,onClose,onRemove,existing={},locationSVG}:Props) {
  const {plan,change:commit,undo,redo,canUndo,canRedo,message,setMessage}=useDrawerHistory(()=>structuredClone(value??defaultInterior(target.drawer)));
  // Item 006: every geometry edit drops divider names/locks that no longer match a real divider.
  const change=(next:DrawerInterior,group?:string)=>commit(pruneOrphanDividers(next),group);
  const [cellQuery,setCellQuery]=useState(''),[rotation,setRotation]=useState<{before:DrawerInterior;after:DrawerInterior}|null>(null);
  const [arrangement,setArrangement]=useState<{before:DrawerInterior;after:DrawerInterior;label:string}|null>(null),[allocate,setAllocate]=useState(false);
  const [multi,setMulti]=useState(new Set<string>()),selectionAnchor=useRef<string|null>(null);
  const [selected,setSelected]=useState(plan.cells[0].id),[mergeWith,setMergeWith]=useState('');
  const [ratio,setRatio]=useState(50),[rows,setRows]=useState(2),[cols,setCols]=useState(2);
  const [dimensions,setDimensions]=useState(true),[labels,setLabels]=useState(true),[unit,setUnit]=useState('in'),[zoom,setZoom]=useState(1);
  const [confirmDiscard,setConfirmDiscard]=useState(false);
  const [batch,setBatch]=useState(false),[mergePreview,setMergePreview]=useState(false),[includeNotes,setIncludeNotes]=useState(true);
  const dialog=useRef<HTMLDialogElement>(null),origin=useRef<HTMLElement|null>(null);
  const dirty=JSON.stringify(plan)!==JSON.stringify(value??defaultInterior(target.drawer));
  useEffect(()=>{
    origin.current??=document.activeElement as HTMLElement;
    dialog.current?.showModal();
    return()=>{requestAnimationFrame(()=>{
      const focusTarget=origin.current?.isConnected && origin.current.tagName==='BUTTON'?origin.current:document.querySelector<HTMLElement>(`[data-drawer-open="${target.id}"]`);
      let section=focusTarget?.closest('details');while(section){section.open=true;section=section.parentElement?.closest('details')??null;}
      focusTarget?.focus();
    });};
  },[target.id]);
  // Item 003: keep the selected compartment, multi-selection, anchor and merge neighbor on real cells.
  useEffect(()=>{
    const next=reconcileSelection(plan.cells,selected,multi,mergeWith,selectionAnchor.current);
    if(next.selected!==selected)setSelected(next.selected);
    if(next.multi.size!==multi.size)setMulti(next.multi);
    if(next.mergeWith!==mergeWith)setMergeWith(next.mergeWith);
    if(selectionAnchor.current&&!plan.cells.some(c=>c.id===selectionAnchor.current))selectionAnchor.current=plan.cells[0]?.id??null;
  },[plan,selected,multi,mergeWith]);
  const cell=plan.cells.find(c=>c.id===selected)??plan.cells[0];
  const mergeError=mergeWith?mergeIssue(plan,cell.id,mergeWith):null;
  const size=innerSize(target.drawer,plan),warnings=interiorWarnings(plan,target.drawer);
  const fmt=(n:number)=>`${(n*(unit==='cm'?2.54:1)).toFixed(2)} ${unit}`;
  // Item 007: split bounds respect the configured minimum usable width.
  const splitMin=plan.minimumCellWidth??0,splitThickness=plan.dividerThickness?.vertical??plan.thickness,splitSpan=cell.w*size.width;
  const splitRaw=splitMin>0&&splitSpan>0?(splitMin+splitThickness)/splitSpan*100:0;
  const ratioLo=splitRaw?Math.ceil(Math.max(15,splitRaw)):15,ratioHi=splitRaw?Math.floor(Math.min(85,100-splitRaw)):85,ratioAllowed=ratioLo<=ratioHi;
  useEffect(()=>{if(ratioAllowed)setRatio(r=>Math.min(Math.max(r,ratioLo),ratioHi));},[ratioLo,ratioHi,ratioAllowed]);
  const updateCell=(patch:Partial<typeof cell>)=>change({...plan,cells:plan.cells.map(c=>c.id===cell.id?{...c,...patch}:c)},'cell-'+cell.id+Object.keys(patch).join());
  // Item 004: preview inventory redistribution before replacing a populated arrangement.
  const requestArrangement=(cells:Compartment[],label:string)=>{
    const populated=plan.cells.some(c=>c.quantity>0);
    if(!populated){change({...plan,cells});return;}
    setArrangement({before:structuredClone(plan),after:{...plan,cells:redistributeInventory(plan,cells)},label});
  };
  const close=()=>dirty?setConfirmDiscard(true):onClose();
  const apply=(all=false)=>{
    const ids=all?targets.filter(t=>Math.abs(t.drawer.width-target.drawer.width)<.01&&Math.abs(t.drawer.depth-target.drawer.depth)<.01&&Math.abs(t.drawer.height-target.drawer.height)<.01).map(t=>t.id):[target.id];
    onApply(ids,{...plan,identity:target.identity,source:{width:target.drawer.width,depth:target.drawer.depth,height:target.drawer.height}});onClose();
  };
  const download=()=>{const blob=new Blob([interiorSVG(plan,target.drawer,includeNotes)],{type:'image/svg+xml'}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='drawer-compartments.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const box='border rounded-lg px-3 py-2 w-full bg-white text-charcoal-600';
  const button='border border-cream-300 rounded-lg px-3 py-2 text-sm bg-white hover:bg-cream-100 disabled:opacity-40';
  return <dialog ref={dialog} aria-labelledby="drawer-title" onCancel={e=>{e.preventDefault();close();}} className="settings-dialog drawer-settings-dialog w-[min(96vw,72rem)] max-w-6xl max-h-[94vh] overflow-auto rounded-2xl p-4 sm:p-6 backdrop:bg-black/50 text-charcoal-600"
    onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLTextAreaElement)){e.preventDefault();e.shiftKey?redo():undo();}}}>
    <header className="settings-dialog-header flex justify-between items-start gap-3"><div><p className="text-sm">{target.label}</p><h2 id="drawer-title" className="text-2xl font-serif">Design drawer compartments</h2></div><button className={button} onClick={close}>Close editor</button></header>
    <SettingsNavigation root={dialog} label="Drawer settings sections" items={[['compartment','Compartment'],['arrangement','Arrangement'],['materials','Materials'],['construction','Construction'],['advanced','Measurements & fit']]}/>
    <p className="settings-editor-hint text-sm my-3">Top view · drawer front at the bottom. Dimensions estimate usable space after edge allowance; confirm internal measurements before ordering inserts.</p>
    <div className="flex flex-wrap gap-2 mb-4"><button className={button} disabled={!canUndo} onClick={undo}>Undo</button><button className={button} disabled={!canRedo} onClick={redo}>Redo</button><button className={button} onClick={()=>{onCopy(structuredClone(plan));setMessage('Organizer copied. Open another drawer to paste it.');}}>Copy organizer</button><button className={button} disabled={!clipboard} onClick={()=>clipboard&&change({...structuredClone(clipboard),source:plan.source})}>Paste organizer</button><button className={button} onClick={()=>change(defaultInterior(target.drawer))}>Reset organizer</button><button className={button} onClick={download}>Download SVG</button></div>
    {confirmDiscard&&<div role="alert" className="border border-amber-500 rounded p-3 mb-3">Discard unapplied changes?<ul>{organizerChanges(value??defaultInterior(target.drawer),plan).map((text,i)=><li key={i}>{text}</li>)}</ul><div className="flex gap-3"><button className={button} onClick={onClose}>Discard changes</button><button className={button} onClick={()=>setConfirmDiscard(false)}>Keep editing</button></div></div>}
    <div role="status" className="text-sm mb-2">{message}</div>
    {warnings.length>0&&<ul id="drawer-validation" className="bg-amber-50 text-amber-900 text-sm rounded p-3 mb-3">{warnings.map(w=><li key={w}>{w}</li>)}</ul>}
    <div className="drawer-editor-grid">
      <section aria-label="Compartment plan" className="drawer-plan-column min-w-0"><div className="settings-section-intro"><p className="studio-eyebrow">LIVE PLAN</p><h3>Your drawer, from above</h3><p>Select a compartment to edit its contents and dimensions.</p></div>
        <div className="flex flex-wrap gap-3 items-center text-sm mb-3"><label><input type="checkbox" checked={labels} onChange={e=>setLabels(e.target.checked)}/> Labels</label><label><input type="checkbox" checked={dimensions} onChange={e=>setDimensions(e.target.checked)}/> Measurements</label><label>Display units <select className="border rounded" value={unit} onChange={e=>setUnit(e.target.value)}><option value="in">inches</option><option value="cm">centimeters</option></select></label><label>Plan zoom <select className="border rounded" value={zoom} onChange={e=>setZoom(+e.target.value)}><option value={1}>100%</option><option value={1.5}>150%</option><option value={2}>200%</option></select></label></div>
        <p className="text-sm mb-2">{plan.measured?'Measured interior':'Usable estimate'}: {fmt(size.width)} wide × {fmt(size.depth)} deep × {fmt(size.height)} high</p>
        <label className="text-sm"><input type="checkbox" checked={includeNotes} onChange={e=>setIncludeNotes(e.target.checked)}/> Include compartment notes in SVG legend</label>
        <div className="overflow-auto border-4 border-[#9d8162] rounded-lg p-2 bg-cream-100 max-h-[65vh]" role="region" tabIndex={0} aria-label="Scrollable drawer plan">
          <div className="relative" style={{width:`${zoom*100}%`,aspectRatio:`${size.width}/${size.depth}`,minHeight:220}}>
            {plan.cells.map((c,i)=>{const s=cellSize(c,target.drawer,plan);return <button key={c.id} data-cell-id={c.id} aria-label={`Compartment ${i+1}: ${c.label}`} aria-pressed={c.id===cell.id} data-multiselected={multi.has(c.id)} aria-describedby={warnings.length?'drawer-validation':undefined} className={'absolute overflow-hidden p-1 text-center border-2 text-[#242424] '+(c.id===cell.id?'border-blue-700 ring-2 ring-inset ring-blue-700':'border-[#8b7359]')}
              style={{left:`${c.x*100}%`,top:`${c.y*100}%`,width:`${c.w*100}%`,height:`${c.h*100}%`,minHeight:0,minWidth:0,backgroundColor:c.color,borderColor:c.id===cell.id?'#1d4ed8':materialColor(plan.material),backgroundImage:plan.liner==='None'?'none':plan.liner==='Velvet'?'linear-gradient(135deg, #76608055, transparent)':plan.liner==='Cork'?'radial-gradient(#9d816277 1px, transparent 1px)':'repeating-linear-gradient(90deg, #ffffff55 0 1px, transparent 1px 4px)',backgroundSize:plan.liner==='Cork'?'6px 6px':undefined}}
              onClick={e=>{if(e.shiftKey&&selectionAnchor.current)setMulti(new Set(rectangleSelection(plan.cells,selectionAnchor.current,c.id)));else selectionAnchor.current=c.id;setSelected(c.id);setMergeWith('');}} onKeyDown={e=>{if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(e.key)){e.preventDefault();const next=spatialNeighbor(plan.cells,c.id,e.key);if(next){if(e.shiftKey){selectionAnchor.current??=c.id;setMulti(new Set(rectangleSelection(plan.cells,selectionAnchor.current,next.id)));}else selectionAnchor.current=next.id;setSelected(next.id);(e.currentTarget.parentElement?.children[plan.cells.indexOf(next)] as HTMLElement)?.focus();}}}}>
              {labels&&<span className="block text-xs font-semibold bg-white/90 rounded break-words">{c.label}</span>}{dimensions&&<span className="block text-[10px] bg-white/90 rounded">{fmt(s.width)} × {fmt(s.depth)}</span>}{c.quantity>0&&<span className="text-xs bg-white/90 rounded">{c.quantity} items</span>}
            </button>;})}
          </div>
        </div><p className="text-center text-sm mt-2">FRONT / HANDLE</p>
        <p className="text-sm mt-3">{plan.cells.length} compartments · {plan.cells.reduce((n,c)=>n+c.quantity,0)} planned items. Counts are your inventory, not a fit guarantee. Shift + arrow keys selects a rectangular range for multi-cell editing.</p>
        <div className="flex flex-wrap gap-2 mt-3"><button className={button} onClick={()=>setRotation({before:structuredClone(plan),after:transformInterior(plan,'rotate')})}>Rotate arrangement</button><button className={button} onClick={()=>change(transformInterior(plan,'mirror'))}>Mirror arrangement</button></div>
        {rotation&&<div><h3>Rotation preview</h3><p>Before</p><div dangerouslySetInnerHTML={{__html:interiorSVG(rotation.before,target.drawer)}}/><p>After 90-degree rotation</p><div dangerouslySetInnerHTML={{__html:interiorSVG(rotation.after,target.drawer)}}/><button onClick={()=>{if(JSON.stringify(plan)!==JSON.stringify(rotation.before)){setMessage('Arrangement changed; preview rotation again.');return;}change(rotation.after);setRotation(null);}}>Confirm arrangement rotation</button><button onClick={()=>setRotation(null)}>Cancel arrangement rotation</button></div>}
        <label className="block">Search compartments<input className={box} value={cellQuery} onChange={e=>setCellQuery(e.target.value)}/></label>{cellQuery&&plan.cells.filter(c=>`${c.label} ${c.category}`.toLowerCase().includes(cellQuery.toLowerCase())).map(c=><button key={c.id} className={button} onClick={()=>{setSelected(c.id);setMergeWith('');const node=Array.from(dialog.current?.querySelectorAll<HTMLElement>('[data-cell-id]')??[]).find(el=>el.dataset.cellId===c.id);node?.scrollIntoView({block:'nearest'});node?.focus();}}>Focus {c.label}</button>)}
        <p>{multi.size} selected compartments; {plan.cells.filter(c=>multi.has(c.id)).reduce((n,c)=>n+c.quantity,0)} items; {plan.cells.filter(c=>multi.has(c.id)).reduce((n,c)=>{const s=cellSize(c,target.drawer,plan);return n+s.width*s.depth;},0).toFixed(2)} sq in usable area.</p><button className={button} disabled={!multi.size} onClick={()=>{setMulti(new Set());selectionAnchor.current=null;}}>Clear compartment selection</button>
        <details className="mt-4 border rounded p-3"><summary>Compartment measurements</summary><ul className="text-sm space-y-2 mt-2">{plan.cells.map((c,i)=>{const s=cellSize(c,target.drawer,plan);return <li key={c.id}>{i+1}. {c.label}: {fmt(s.width)} × {fmt(s.depth)} · {c.category} · {c.quantity} items</li>;})}</ul></details>
    {locationSVG&&<details className="border rounded p-2 mb-3"><summary>Drawer location on wall</summary><div className="drawer-location max-w-sm" dangerouslySetInnerHTML={{__html:namespaceSVG(locationSVG,'drawer-location').replace(/tabindex="0"/g,'tabindex="-1"')}}/><style>{`.drawer-location [data-drawer-id="${target.id}"]{filter:drop-shadow(0 0 5px #1d4ed8);stroke:#1d4ed8;stroke-width:3}`}</style></details>}
      </section>
      <section className="drawer-inspector min-w-0 space-y-4" aria-label="Organizer settings"><div className="settings-selection" role="status"><span className="studio-eyebrow">EDITING COMPARTMENT {plan.cells.indexOf(cell)+1}</span><strong>{cell.label}</strong><span>{fmt(cellSize(cell,target.drawer,plan).width)} × {fmt(cellSize(cell,target.drawer,plan).depth)}</span></div>
        <fieldset data-settings-section="compartment" aria-describedby={warnings.length?"drawer-validation":undefined} className="border rounded-lg p-3 space-y-3"><legend className="font-semibold">Selected compartment</legend>
          <label className="block text-sm">Compartment label<input className={box} maxLength={60} value={cell.label} onChange={e=>updateCell({label:e.target.value})}/></label>
          <div className="grid grid-cols-2 gap-3"><label className="text-sm">Contents<select className={box} value={cell.category} onChange={e=>updateCell({category:e.target.value})}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label><label className="text-sm">Planned quantity<input className={box} type="number" min={0} max={999} value={cell.quantity} onChange={e=>updateCell({quantity:Math.min(999,Math.max(0,Math.floor(+e.target.value||0)))})}/></label></div>
          <label className="flex items-center gap-3 text-sm">Compartment color<input type="color" value={cell.color} onChange={e=>updateCell({color:e.target.value})}/></label>
          <label className="block text-sm">Split ratio: {ratio}%<input className="w-full" type="range" min={ratioLo} max={ratioHi} step={5} value={ratio} disabled={!ratioAllowed} onChange={e=>setRatio(+e.target.value)}/></label>
          <p className="text-sm">Selected size: {fmt(cellSize(cell,target.drawer,plan).width)} × {fmt(cellSize(cell,target.drawer,plan).depth)}. Splits below 2 inches need a fit review.</p>
          <p className="text-xs" data-split-range>Usable split range: {ratioAllowed&&splitSpan>0?`${(splitSpan*(ratioLo/100)-splitThickness).toFixed(2)}–${(splitSpan*(ratioHi/100)-splitThickness).toFixed(2)} in per compartment`:'the configured minimum usable width is larger than this compartment'}</p>
          {cell.quantity>0&&<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allocate} onChange={e=>setAllocate(e.target.checked)}/>Distribute the {cell.quantity} planned items proportionally between the new compartments</label>}
          <div className="flex flex-wrap gap-2"><button className={button} disabled={plan.cells.length>=36||!ratioAllowed} onClick={()=>change(splitCell(plan,cell.id,'x',ratio/100,allocate))}>Split left / right</button><button className={button} disabled={plan.cells.length>=36||!ratioAllowed} onClick={()=>change(splitCell(plan,cell.id,'y',ratio/100,allocate))}>Split front / back</button></div>
          <label className="block text-sm">Merge with adjacent compartment<select className={box} value={mergeWith} onChange={e=>{setMergeWith(e.target.value);setMergePreview(false);}}><option value="">Choose a neighbor</option>{plan.cells.filter(c=>adjacentAxis(plan,cell.id,c.id)).map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label><button className={button} disabled={!mergeWith||!!mergeError} onClick={()=>setMergePreview(true)}>Merge compartments</button>
          {mergeError&&<p role="status">{mergeError}</p>}
          {mergePreview&&mergeWith&&!mergeError&&<div className="border p-2"><p>Merge preview: {cell.quantity+(plan.cells.find(c=>c.id===mergeWith)?.quantity??0)} items. Keep “{cell.label}”, its category, color, notes and item dimensions; discard the neighbor’s metadata.</p><button className={button} onClick={()=>{const next=mergeCells(plan,cell.id,mergeWith);if(next)change(next);setMergeWith('');setMergePreview(false);}}>Confirm merge</button><button className={button} onClick={()=>setMergePreview(false)}>Cancel merge</button></div>}
        </fieldset>
        <DrawerPrecision plan={plan} target={target} selected={cell.id} neighbor={mergeWith} change={change}/>
        <label className="block text-sm">Organizer name<input className={box} maxLength={80} value={plan.name} onChange={e=>change({...plan,name:e.target.value},'name')}/></label>
        <details data-settings-section="arrangement" open className="border rounded-lg p-3"><summary className="font-semibold">Templates and layout</summary><p className="text-xs my-2">Templates replace the arrangement. Undo restores your previous compartments.</p><div className="flex flex-wrap gap-2">{PRESETS.map(p=><button key={p.name} className={button} onClick={()=>requestArrangement(grid(p.rows,p.cols,p.category),p.name+' template')}>{p.name} template</button>)}</div>
          <div className="grid grid-cols-2 gap-3 mt-3"><label className="text-sm">Grid rows<select className={box} value={rows} onChange={e=>setRows(+e.target.value)}>{[1,2,3,4,5,6].map(n=><option key={n}>{n}</option>)}</select></label><label className="text-sm">Grid columns<select className={box} value={cols} onChange={e=>setCols(+e.target.value)}>{[1,2,3,4,5,6].map(n=><option key={n}>{n}</option>)}</select></label></div><button className={button+' mt-2'} onClick={()=>requestArrangement(grid(rows,cols),`${rows} × ${cols} grid`)}>Create grid</button>
        </details>
        {arrangement&&<div className="border border-amber-400 rounded p-3" role="group" aria-label="Arrangement replacement preview"><h3 className="font-semibold">Arrangement replacement preview</h3><p className="text-sm my-1">{arrangement.label} replaces the current {arrangement.before.cells.length} compartments. The {arrangement.before.cells.reduce((n,c)=>n+c.quantity,0)} planned items are redistributed evenly and nothing is discarded.</p><ul className="text-sm">{arrangement.after.cells.map((c,i)=><li key={c.id}>{i+1}. {c.label}: {c.quantity} items</li>)}</ul><div className="flex flex-wrap gap-2 mt-2"><button className={button} onClick={()=>{if(JSON.stringify(plan)!==JSON.stringify(arrangement.before)){setMessage('Arrangement changed; preview the replacement again.');return;}change(arrangement.after);setArrangement(null);}}>Confirm arrangement replacement</button><button className={button} onClick={()=>setArrangement(null)}>Cancel arrangement replacement</button></div></div>}
        <details data-settings-section="materials" className="border rounded-lg p-3" open><summary className="font-semibold">Materials and fit</summary><div className="grid grid-cols-2 gap-3 mt-3">
          <label className="text-sm">Divider material<select aria-label="Divider material" className={box} value={plan.material} onChange={e=>change({...plan,material:e.target.value})}>{MATERIALS.map(m=><option key={m}>{m}</option>)}</select></label>
          <label className="text-sm">Base liner<select className={box} value={plan.liner} onChange={e=>change({...plan,liner:e.target.value})}>{LINERS.map(m=><option key={m}>{m}</option>)}</select></label>
          <label className="text-sm">Divider thickness (in)<select aria-label="Divider thickness (in)" className={box} value={plan.thickness} onChange={e=>change({...plan,thickness:+e.target.value})}>{[.125,.25,.5,.75,1].map(n=><option key={n}>{n}</option>)}</select></label>
          <label className="text-sm">Edge allowance per side (in)<select aria-label="Edge allowance per side (in)" className={box} value={plan.clearance} onChange={e=>change({...plan,clearance:+e.target.value})}>{[0,.25,.5,.75,1,1.5,2].map(n=><option key={n}>{n}</option>)}</select></label>
        </div><p className="text-xs mt-3">Materials and liner are recorded specifications. Thickness is deducted conservatively from each compartment. Allowance represents drawer sides and fitting tolerance.</p></details>
        <label className="block text-sm">Organizer notes<textarea className={box} rows={3} maxLength={500} value={plan.notes} onChange={e=>change({...plan,notes:e.target.value},'notes')}/></label>
        <DrawerConstruction plan={plan} target={target} change={change}/>
        <DrawerAdvanced plan={plan} target={target} selected={cell.id} neighbor={mergeWith} change={change} multi={multi} setMulti={setMulti}/>
      </section>
    </div>
    {batch&&<div className="border p-3 mt-3"><h3>Batch application preview</h3>{targets.filter(t=>Math.abs(t.drawer.width-target.drawer.width)<.01&&Math.abs(t.drawer.depth-target.drawer.depth)<.01&&Math.abs(t.drawer.height-target.drawer.height)<.01).map(t=><p key={t.id}>{t.label}: {existing[t.id]?'replace existing organizer':'new organizer'}</p>)}<button className={button} onClick={()=>apply(true)}>Confirm batch application</button><button className={button} onClick={()=>setBatch(false)}>Cancel batch</button></div>}
    <footer className="settings-dialog-footer bg-white border-t pt-3 mt-5 flex flex-wrap gap-3"><button className="bg-charcoal-600 text-white rounded-lg px-4 py-3" onClick={()=>apply()}>Apply to drawer</button><button className={button} onClick={()=>setBatch(true)}>Apply to matching drawers</button>{value&&onRemove&&<button className={button} onClick={()=>{onRemove();onClose();}}>Remove organizer</button>}<button className={button} onClick={close}>Cancel</button><span className="text-xs self-center">Apply updates the current draft. Use Save to keep a named design.</span></footer>
  </dialog>;
}


