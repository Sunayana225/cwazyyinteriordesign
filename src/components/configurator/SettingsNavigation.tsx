'use client';
import type { RefObject } from 'react';

/** Scoped navigation opens the destination without resetting any editor state. */
export function SettingsNavigation({root,label,items}:{root:RefObject<HTMLElement|null>;label:string;items:Array<[string,string]>}) {
  return <nav className="settings-navigation" aria-label={label}>{items.map(([id,title])=><button key={id} type="button" onClick={()=>{
    const target=root.current?.querySelector<HTMLElement>(`[data-settings-section="${id}"]`);
    if(!target)return;
    let ancestor:HTMLElement|null=target;
    while(ancestor&&ancestor!==root.current){if(ancestor instanceof HTMLDetailsElement)ancestor.open=true;ancestor=ancestor.parentElement;}
    target.tabIndex=-1;target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'instant'});
  }}>{title}</button>)}</nav>;
}
