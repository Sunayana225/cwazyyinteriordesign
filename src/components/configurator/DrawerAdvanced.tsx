'use client';
import { useState } from 'react';
import { OrganizerTemplates } from './OrganizerTemplates';
import { CATEGORIES, cellSize, innerSize, interiorSVG, itemFit, moveDivider, validInteriors } from '@/lib/drawers';
import type { DrawerInterior, DrawerTarget } from '@/lib/drawers';
import { cellMetadata, fitDetails, dividerLock } from '@/lib/drawerConstruction';

export function DrawerAdvanced({plan,target,selected,neighbor,change,multi,setMulti}:{plan:DrawerInterior;target:DrawerTarget;selected:string;neighbor:string;change:(p:DrawerInterior,group?:string)=>void;multi:Set<string>;setMulti:React.Dispatch<React.SetStateAction<Set<string>>>}){
  const cell=plan.cells.find(c=>c.id===selected)??plan.cells[0],size=innerSize(target.drawer,plan);
  const [pasteFields,setPasteFields]=useState(new Set(['label','category','quantity','color','notes','item'])),[moveMessage,setMoveMessage]=useState('');
  const [snap,setSnap]=useState(.25),[metadata,setMetadata]=useState<ReturnType<typeof cellMetadata>|null>(null),[pastePreview,setPastePreview]=useState(false);
  const fit=fitDetails(cell,target.drawer,plan);
  const field='border rounded p-2 w-full',button='border rounded px-3 py-2 text-sm';
  const update=(patch:Partial<typeof cell>,group?:string)=>change({...plan,cells:plan.cells.map(c=>c.id===cell.id?{...c,...patch}:c)},group);
  const totals=CATEGORIES.map(category=>({category,total:plan.cells.filter(c=>c.category===category).reduce((n,c)=>n+c.quantity,0)})).filter(c=>c.total);
  const neighborCell=plan.cells.find(c=>c.id===neighbor),horizontalNeighbor=!!neighborCell&&Math.abs(cell.y-neighborCell.y)<.00001&&Math.abs(cell.h-neighborCell.h)<.00001;
  const firstCell=neighborCell?(horizontalNeighbor?(cell.x<neighborCell.x?cell:neighborCell):(cell.y<neighborCell.y?cell:neighborCell)):null;
  const currentFraction=firstCell&&neighborCell?(horizontalNeighbor?firstCell.w/(cell.w+neighborCell.w):firstCell.h/(cell.h+neighborCell.h)):null;
  const combinedPhysical=neighborCell?(horizontalNeighbor?(cell.w+neighborCell.w)*size.width:(cell.h+neighborCell.h)*size.depth):0;
  const stepInches=snap>0?snap:.25;
  const nudge=(direction:number)=>{
    if(!neighborCell||currentFraction===null||combinedPhysical<=0)return;
    const lock=dividerLock(plan,cell.id,neighbor);if(lock){setMoveMessage('Movement blocked by lock: '+lock);return;}
    const next=Math.max(.05,Math.min(.95,currentFraction+direction*stepInches/combinedPhysical));
    const moved=moveDivider(plan,cell.id,neighbor,next,snap,target.drawer);
    if(moved===plan){setMoveMessage('The divider cannot move further within the usable range.');return;}
    setMoveMessage('');change(moved,'divider-'+cell.id+neighbor);
  };
  return <details data-settings-section="advanced" className="settings-advanced border rounded p-3"><summary>Measurements, item fit, divider tools, and custom templates</summary>
    <section className="settings-card"><h3>Selected compartment details</h3><p className="settings-description">Notes and fit checks apply only to the compartment selected in the plan.</p>
    {cell.item&&<p id="item-fit-details" role="status">{fit.failed.length?`Unrotated item exceeds usable ${fit.failed.join(', ')} including clearance.`:'Item fits usable dimensions including clearance.'} {fit.rotationHelps?'Rotate the item 90 degrees to fit.':''}</p>}
    <button onClick={()=>setMetadata(structuredClone(cellMetadata(cell)))}>Copy selected cell details</button><button disabled={!metadata||!multi.size} onClick={()=>setPastePreview(true)}>Preview paste to selected cells</button>
    {pastePreview&&metadata&&<div className="border p-2"><h3>Cell detail paste preview</h3>{['label','category','quantity','color','notes','item'].map(key=><label key={key} className="block"><input type="checkbox" checked={pasteFields.has(key)} onChange={e=>setPasteFields(old=>{const next=new Set(old);e.target.checked?next.add(key):next.delete(key);return next;})}/> Paste {key}</label>)}{plan.cells.filter(c=>multi.has(c.id)).map(c=><p key={c.id}>{c.label}: {Array.from(pasteFields).map(key=>`${key}: ${JSON.stringify(c[key as keyof typeof c])??'empty'} → ${JSON.stringify(metadata[key as keyof typeof metadata])??'empty'}`).join('; ')}</p>)}<button onClick={()=>{change({...plan,cells:plan.cells.map(c=>multi.has(c.id)?{...c,...Object.fromEntries(Object.entries(structuredClone(metadata)).filter(([key])=>pasteFields.has(key)))}:c)});setPastePreview(false);}}>Confirm cell detail paste</button><button onClick={()=>setPastePreview(false)}>Cancel cell detail paste</button></div>}
    <label className="block my-2">Compartment notes<textarea className={field} maxLength={300} value={cell.notes??''} onChange={e=>update({notes:e.target.value},'cell-notes-'+cell.id)}/></label>
    <label className="block my-2"><input type="checkbox" checked={!!cell.item} onChange={e=>update({item:e.target.checked?{width:2,depth:2,height:1,rotate:true}:undefined})}/> Check an item’s fit</label>
    {cell.item&&<><div className="grid grid-cols-3 gap-2">{(['width','depth','height'] as const).map(k=><label className="text-sm" key={k}>Item {k} (in)<input className={field} type="number" min={.1} max={600} step={.125} aria-describedby="item-fit-details" value={cell.item![k]} onChange={e=>update({item:{...cell.item!,[k]:Math.max(.1,Math.min(600,+e.target.value||.1))}},'item-'+cell.id+k)}/></label>)}</div><label><input type="checkbox" checked={cell.item.rotate} onChange={e=>update({item:{...cell.item!,rotate:e.target.checked}})}/> Allow rotated item</label><p role="status">Item {itemFit(cell,target.drawer,plan)}. Quantity does not imply stacked fit.</p></>}
    </section>
    <section className="settings-card"><h3>Measured drawer interior</h3><p className="settings-description">These dimensions apply to the entire organizer.</p>
    <label className="block my-2"><input type="checkbox" checked={!!plan.measured} onChange={e=>change({...plan,measured:e.target.checked?size:undefined})}/> Use measured internal dimensions</label>
    {plan.measured&&<div className="grid grid-cols-3 gap-2">{(['width','depth','height'] as const).map(k=><label className="text-sm" key={k}>Measured {k} (in)<input className={field} type="number" min={.1} max={600} step={.125} value={plan.measured![k]} onChange={e=>change({...plan,measured:{...plan.measured!,[k]:Math.max(.1,Math.min(600,+e.target.value||.1))}},'measured-'+k)}/></label>)}</div>}
    </section>
    <section className="settings-card"><h3>Shared divider movement</h3>
    <div className="my-3"><p>Choose an adjacent merge neighbor above to move their shared divider. Drag the slider, use the visible step buttons, or focus the slider and press [ or ].</p><label className="block">Divider snap (in)<select className={field} value={snap} onChange={e=>setSnap(+e.target.value)}>{[0,.125,.25,.5,1].map(n=><option key={n} value={n}>{n||'Free'}</option>)}</select></label><label className="block">Divider position<input className="w-full" aria-label="Divider position" type="range" min={5} max={95} step={1} disabled={!neighbor} value={currentFraction===null?50:100*currentFraction} onKeyDown={e=>{if(e.key==='['||e.key===']'){e.preventDefault();nudge(e.key===']'?1:-1);}}} onChange={e=>{const lock=dividerLock(plan,cell.id,neighbor);if(lock){setMoveMessage('Movement blocked by lock: '+lock);return;}setMoveMessage('');change(moveDivider(plan,cell.id,neighbor,+e.target.value/100,snap,target.drawer),'divider-'+cell.id+neighbor);}}/></label><div className="flex flex-wrap items-center gap-2 mt-2"><button className={button} disabled={!neighbor} onClick={()=>nudge(-1)}>Move divider left {stepInches} in</button><button className={button} disabled={!neighbor} onClick={()=>nudge(1)}>Move divider right {stepInches} in</button><span className="text-xs" aria-live="polite">Visible keyboard step: {stepInches} in. Focus the divider slider and press [ or ] to nudge the shared divider.</span></div></div>
    <p role="status">{moveMessage}</p></section><details className="border rounded p-2 my-3"><summary>Change multiple compartments</summary>{plan.cells.map((c,i)=><label className="block text-sm" key={c.id}><input type="checkbox" checked={multi.has(c.id)} onChange={e=>setMulti(current=>{const next=new Set(current);e.target.checked?next.add(c.id):next.delete(c.id);return next;})}/> Select compartment {i+1}: {c.label}</label>)}<label>Selected contents<select className={field} defaultValue="" disabled={!multi.size} onChange={e=>{if(e.target.value)change({...plan,cells:plan.cells.map(c=>multi.has(c.id)?{...c,category:e.target.value}:c)});}}><option value="">Choose category</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label><label>Selected color<input type="color" disabled={!multi.size} onChange={e=>change({...plan,cells:plan.cells.map(c=>multi.has(c.id)?{...c,color:e.target.value}:c)},'multi-color')}/></label></details>
    <p className="text-sm my-2">Category totals: {totals.length?totals.map(c=>`${c.category}: ${c.total}`).join(' · '):'No items entered'}</p>
    <section className="settings-card"><h3>Reusable organizer templates</h3><OrganizerTemplates plan={plan} target={target} change={change}/></section>

  </details>;
}




