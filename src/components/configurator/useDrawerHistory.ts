'use client';
import { useRef, useState } from 'react';
import type { DrawerInterior } from '@/lib/drawers';
export function useDrawerHistory(initial:()=>DrawerInterior){
  const [plan,setPlan]=useState(initial),[past,setPast]=useState<DrawerInterior[]>([]),[future,setFuture]=useState<DrawerInterior[]>([]),[message,setMessage]=useState('');
  const group=useRef({key:'',time:0});
  const change=(next:DrawerInterior,key='')=>{
    if(JSON.stringify(next)===JSON.stringify(plan)){setMessage('No change: the operation is not possible with these compartments or size limits.');return;}
    const now=Date.now();if(!key||group.current.key!==key||now-group.current.time>1000)setPast(p=>[...p.slice(-39),plan]);group.current={key,time:now};setFuture([]);setPlan(next);setMessage('');
  };
  const undo=()=>{if(!past.length)return;group.current.key='';setFuture(f=>[plan,...f]);setPlan(past[past.length-1]);setPast(p=>p.slice(0,-1));};
  const redo=()=>{if(!future.length)return;group.current.key='';setPast(p=>[...p,plan]);setPlan(future[0]);setFuture(f=>f.slice(1));};
  return {plan,change,undo,redo,canUndo:!!past.length,canRedo:!!future.length,message,setMessage};
}
