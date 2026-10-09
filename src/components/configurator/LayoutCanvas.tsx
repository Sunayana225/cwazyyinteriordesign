'use client';
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { ClosetWall, LayoutColumn, LayoutColumnType } from '@/types/closet';
import {
  COLUMN_TYPES, COLUMN_LABEL, COLUMN_MIN_WIDTH, COLUMN_SNAP, MAX_COLUMNS,
  columnsFromWall, normalizeColumns, moveColumn, resizeColumn, retypeColumn, addColumn, removeColumn, droppedTypes, fittedColumnTypes,
} from '@/lib/layoutColumns';

const FILL: Record<LayoutColumnType,string> = {
  'long-hang':'#cfe0d4', 'short-hang':'#bed3e6', 'drawers':'#e8dcc4', 'shoe-shelves':'#ded0e2', 'top-shelves':'#d8e2cb',
};
const button='border rounded px-3 py-2 text-sm';

/** Direct-manipulation editor for one wall elevation. Imports the generated design as
 * movable elements, then commits the arrangement as a column override on the
 * configuration — the layout itself is always regenerated, so edits must live there. */
export function LayoutCanvas({wall,stored,fitAllowances,onCommit,onClose}:{
  wall:ClosetWall; stored?:LayoutColumn[];
  fitAllowances?:{floorOffset?:number;baseboard?:number};
  onCommit:(columns:LayoutColumn[]|null)=>void; onClose:()=>void;
}) {
  const generated=()=>normalizeColumns(columnsFromWall(wall),wall.width);
  const [columns,setColumns]=useState<LayoutColumn[]>(()=>normalizeColumns(stored?.length?stored:columnsFromWall(wall),wall.width));
  const [selected,setSelected]=useState<string|null>(null);
  const [history,setHistory]=useState<LayoutColumn[][]>([]);
  const [message,setMessage]=useState('');
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const element=dialog.current,opener=document.activeElement;
    element?.showModal();
    return()=>{element?.close();if(opener instanceof HTMLElement&&opener.isConnected)opener.focus({preventScroll:true});};
  },[]);
  const strip=useRef<SVGSVGElement>(null);
  const drag=useRef<{kind:'move'|'resize';id:string}|null>(null);

  const change=(next:LayoutColumn[],note='')=>{
    if(next===columns)return;
    setHistory(h=>[...h.slice(-24),columns]);setColumns(next);setMessage(note);
  };
  const undo=()=>{const prev=history[history.length-1];if(!prev)return;setHistory(h=>h.slice(0,-1));setColumns(prev);setMessage('Reverted the last change.');};
  const current=columns.find(c=>c.id===selected)??null;
  const index=current?columns.findIndex(c=>c.id===current.id):-1;
  /** Pointer x as a position along the wall, in inches. */
  const inches=(clientX:number)=>{
    const box=strip.current?.getBoundingClientRect();
    if(!box||!box.width)return 0;
    return Math.max(0,Math.min(wall.width,(clientX-box.left)/box.width*wall.width));
  };
  const onPointerMove=(e:ReactPointerEvent)=>{
    const active=drag.current;if(!active)return;
    const at=inches(e.clientX);
    if(active.kind==='resize'){
      const i=columns.findIndex(c=>c.id===active.id);if(i<0)return;
      const left=columns.slice(0,i).reduce((n,c)=>n+c.width,0);
      change(resizeColumn(columns,active.id,at-left,wall.width,COLUMN_SNAP));
    } else {
      // Reorder as the pointer crosses a neighbour's midpoint.
      let edge=0,target=columns.length-1;
      for(let i=0;i<columns.length;i++){if(at<edge+columns[i].width/2){target=i;break;}edge+=columns[i].width;}
      const from=columns.findIndex(c=>c.id===active.id);
      if(from!==target)change(moveColumn(columns,active.id,target));
    }
  };
  const endDrag=(e:ReactPointerEvent)=>{
    if(!drag.current)return;
    drag.current=null;
    try{(e.currentTarget as Element).releasePointerCapture(e.pointerId);}catch{}
  };

  let cursor=0;
  const placed=columns.map(c=>{const x=cursor;cursor+=c.width;return {...c,x};});
  const fmt=(n:number)=>`${n.toFixed(1)} in`;
  // Storage the generated wall had that this arrangement drops, surfaced before commit.
  const dropped=droppedTypes(columnsFromWall(wall),columns);
  // Only elements this cabinet's height and depth can physically take.
  const allowed=fittedColumnTypes(wall,fitAllowances);

  return <dialog ref={dialog} onCancel={event=>{event.preventDefault();onClose();}} aria-labelledby="layout-canvas-title" className="settings-dialog w-[95vw] max-w-5xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 rounded-xl backdrop:bg-black/40">
    <h2 id="layout-canvas-title" className="text-lg font-semibold">Rearrange {wall.label.toLowerCase()}</h2>
    <p className="settings-description">Every part of the generated design is an element here. Drag to reorder, drag a divider to resize, or use the controls below. Nothing changes your design until you choose Done.</p>

    <svg ref={strip} viewBox={`0 0 ${wall.width} 60`} className="w-full border rounded bg-[#f6f7f3] touch-none" style={{height:200}}
      onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} role="img"
      aria-label={`${wall.label} elevation, ${columns.length} elements across ${fmt(wall.width)}`}>
      {placed.map(c=><g key={c.id}>
        <rect data-layout-column={c.id} x={c.x} y={0} width={c.width} height={52} fill={FILL[c.type]}
          stroke={c.id===selected?'#1d4ed8':'#8aa08f'} strokeWidth={c.id===selected?1.2:.4}
          onPointerDown={e=>{setSelected(c.id);drag.current={kind:'move',id:c.id};(e.currentTarget as Element).setPointerCapture(e.pointerId);}}
          style={{cursor:'grab'}}/>
        <text x={c.x+c.width/2} y={24} textAnchor="middle" fontSize={2.6} fill="#2c3a2f" pointerEvents="none">{COLUMN_LABEL[c.type].slice(0,c.width<14?8:22)}</text>
        <text x={c.x+c.width/2} y={30} textAnchor="middle" fontSize={2.2} fill="#52655a" pointerEvents="none">{fmt(c.width)}</text>
      </g>)}
      {placed.slice(1).map(c=><line key={'edge-'+c.id} x1={c.x} y1={0} x2={c.x} y2={52} stroke="#5b6f61" strokeWidth={.8}/>)}
      {/* Resize handles sit on the boundary and belong to the column on their left. */}
      {placed.slice(0,-1).map(c=><rect key={'grip-'+c.id} data-layout-resize={c.id} x={c.x+c.width-.8} y={0} width={1.6} height={52}
        fill="transparent" style={{cursor:'col-resize'}}
        onPointerDown={e=>{e.stopPropagation();setSelected(c.id);drag.current={kind:'resize',id:c.id};(e.currentTarget as Element).setPointerCapture(e.pointerId);}}/>)}
    </svg>

    <div className="flex flex-wrap gap-2 my-3" role="group" aria-label="Select an element">
      {columns.map((c,i)=><button key={c.id} className={button+(c.id===selected?' bg-charcoal-600 text-white':'')}
        aria-pressed={c.id===selected} onClick={()=>setSelected(c.id)}>{i+1}. {COLUMN_LABEL[c.type]} · {fmt(c.width)}</button>)}
    </div>

    {current?<fieldset className="border rounded-lg p-3 space-y-3">
      <legend className="font-semibold">Element {index+1}: {COLUMN_LABEL[current.type]}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Element type
          <select className="border rounded w-full p-2" value={current.type}
            onChange={e=>change(retypeColumn(columns,current.id,e.target.value as LayoutColumnType,wall.width),`Changed element ${index+1}.`)}>
            {COLUMN_TYPES.filter(t=>allowed.includes(t)||t===current.type).map(t=><option key={t} value={t} disabled={!allowed.includes(t)}>{COLUMN_LABEL[t]} (min {COLUMN_MIN_WIDTH[t]} in){!allowed.includes(t)?' — no longer fits':''}</option>)}
          </select>
        </label>
        <label className="text-sm">Width (inches)
          <input className="border rounded w-full p-2" type="number" min={COLUMN_MIN_WIDTH[current.type]} max={wall.width} step={1}
            value={Number(current.width.toFixed(1))}
            onChange={e=>change(resizeColumn(columns,current.id,Number(e.target.value),wall.width),`Resized element ${index+1}.`)}/>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={button} disabled={index<=0} onClick={()=>change(moveColumn(columns,current.id,index-1),`Moved element ${index+1} left.`)}>Move left</button>
        <button className={button} disabled={index<0||index>=columns.length-1} onClick={()=>change(moveColumn(columns,current.id,index+1),`Moved element ${index+1} right.`)}>Move right</button>
        <button className={button} disabled={columns.length<=1} onClick={()=>{change(removeColumn(columns,current.id,wall.width),`Deleted element ${index+1}.`);setSelected(null);}}>Delete element</button>
      </div>
    </fieldset>:<p className="text-sm">Select an element to change its type, width or position.</p>}

    <fieldset className="border rounded-lg p-3 mt-3">
      <legend className="font-semibold">Add an element</legend>
      <p className="settings-description">Added after the selected element, or at the end. The wall must have room for its minimum width. Available elements account for cabinet height, depth, floor offset, and baseboard allowance.</p>
      <div className="flex flex-wrap gap-2">
        {allowed.map(t=>{
          const room=columns.reduce((n,c)=>n+COLUMN_MIN_WIDTH[c.type],0)+COLUMN_MIN_WIDTH[t]<=wall.width;
          return <button key={t} className={button} disabled={!room||columns.length>=MAX_COLUMNS}
            onClick={()=>change(addColumn(columns,t,index<0?columns.length:index+1,wall.width),`Added ${COLUMN_LABEL[t]}.`)}>
            Add {COLUMN_LABEL[t]}</button>;
        })}
      </div>
      {columns.length>=MAX_COLUMNS&&<p className="text-sm mt-2">This wall is at the {MAX_COLUMNS}-element limit. Delete an element to add another.</p>}
    </fieldset>

    <p role="status" className="text-sm mt-3">{message||`${columns.length} elements filling ${fmt(columns.reduce((n,c)=>n+c.width,0))} of ${fmt(wall.width)}.`}</p>
    {dropped.length>0&&<p role="status" className="text-sm mt-2 border border-amber-400 rounded p-2">
      The generated design used {dropped.map(t=>COLUMN_LABEL[t].toLowerCase()).join(', ')} on this wall and your arrangement has none.
      That storage moves elsewhere or goes unplaced — check the capacity summary after you choose Done.
    </p>}

    <footer className="settings-dialog-footer bg-white border-t pt-3 mt-4 flex flex-wrap gap-3">
      <button className="bg-charcoal-600 text-white rounded-lg px-4 py-3" onClick={()=>{onCommit(columns);onClose();}}>Done — use this arrangement</button>
      <button className={button} disabled={!history.length} onClick={undo}>Undo</button>
      <button className={button} onClick={()=>{change(generated(),'Restored the generated arrangement.');setSelected(null);}}>Reset to generated layout</button>
      {stored?.length?<button className={button} onClick={()=>{onCommit(null);onClose();}}>Remove my arrangement</button>:null}
      <button className={button} onClick={onClose}>Cancel</button>
    </footer>
  </dialog>;
}
