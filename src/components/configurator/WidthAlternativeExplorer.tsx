'use client';
import {useEffect,useRef,useState} from 'react';
import type {ClosetConfiguration,ClosetLayout} from '@/types/closet';
import {layoutInputKey} from '@/lib/preview';
import {searchWidthAlternatives,type WidthSearchResult} from '@/lib/widthAlternatives';
import DrawerAlternativeCard from './DrawerAlternativeCard';

export default function WidthAlternativeExplorer({config,layout,onChange}:{config:Partial<ClosetConfiguration>;layout:ClosetLayout;onChange?:(patch:Partial<ClosetConfiguration>)=>void}){
  const source=layoutInputKey(config,config.zoneOverrides??{}),controller=useRef<AbortController|null>(null);
  const [running,setRunning]=useState(false),[result,setResult]=useState<{source:string;value:WidthSearchResult}|null>(null),[message,setMessage]=useState('');
  useEffect(()=>{controller.current?.abort();setRunning(false);setResult(null);setMessage('');return()=>controller.current?.abort();},[source,layout]);
  const run=async()=>{
    controller.current?.abort();const job=new AbortController();controller.current=job;setRunning(true);setResult(null);setMessage('');
    try{const value=await searchWidthAlternatives(config as ClosetConfiguration,layout,{signal:job.signal});if(!job.signal.aborted&&controller.current===job)setResult({source,value});}
    catch(error){if(!job.signal.aborted)setMessage(error instanceof Error?error.message:'Width alternatives could not be generated.');}
    finally{if(controller.current===job&&!job.signal.aborted)setRunning(false);}
  };
  const value=result?.source===source?result.value:null;
  return <section aria-label="Width allocation alternatives" className="border rounded p-3 my-3"><h3 className="font-semibold">Explore column widths</h3><p className="text-sm">Try adjacent boundary shifts of 2, 4 and 8 inches while keeping edited walls and reserved openings. Examines up to 24 layouts or 250 ms, yielding after each layout. A single generation can finish after that time budget. This is a local search, not an optimum guarantee.</p>
    <button disabled={running} onClick={()=>void run()}>Find width alternatives</button>{running&&<button onClick={()=>{controller.current?.abort();setRunning(false);setMessage('Search stopped. No option was applied.');}}>Stop width search</button>}
    <p role="status">{running?'Examining width alternatives…':message|| (value?`${value.examined} layouts examined; ${value.rejected} rejected by room checks. Showing ${value.alternatives.length} distinct feasible options. Search ended: ${value.stopped}.`:'Start a search to compare column widths.')}</p>
    {value&&<><p className="text-xs">Ranked by weighted unmet inventory demand. The best examined options are retained when a limit is reached.</p>{value.skipped.length>0&&<details><summary>Walls preserved by this search</summary><ul>{value.skipped.map(text=><li key={text}>{text}</li>)}</ul></details>}{value.alternatives.map(a=><DrawerAlternativeCard key={a.id} alternative={a} current={layout} config={config} onChange={onChange}/>)}</>}
  </section>;
}
