'use client';
import { useEffect, useState, type RefObject } from 'react';

/** Scoped navigation opens the destination without resetting any editor state. */
export function SettingsNavigation({root,label,items}:{root:RefObject<HTMLElement|null>;label:string;items:Array<[string,string]>}) {
  const [active,setActive]=useState(items[0]?.[0]);
  useEffect(()=>{
    const container=root.current;
    if(!container)return;
    const track=(event:Event)=>{
      const section=(event.target as HTMLElement).closest<HTMLElement>('[data-settings-section]');
      if(section?.dataset.settingsSection&&container.contains(section))setActive(section.dataset.settingsSection);
    };
    container.addEventListener('focusin',track);
    return()=>container.removeEventListener('focusin',track);
  },[root]);
  return <nav className="settings-navigation" aria-label={label}>{items.map(([id,title])=><button key={id} type="button" aria-current={active===id?'location':undefined} onClick={()=>{
    const target=root.current?.querySelector<HTMLElement>(`[data-settings-section="${id}"]`);
    if(!target)return;
    let ancestor:HTMLElement|null=target;
    while(ancestor&&ancestor!==root.current){if(ancestor instanceof HTMLDetailsElement)ancestor.open=true;ancestor=ancestor.parentElement;}
    setActive(id);target.tabIndex=-1;target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'instant'});
  }}>{title}</button>)}</nav>;
}
