'use client';
import {useEffect,useId,useState} from 'react';
import type {SurveyRecord} from '@/lib/surveyReview';
import {surveyRecordIssue} from '@/lib/surveyReview';

export default function SurveyRecordEditor({record,onChange}:{record?:SurveyRecord;onChange?:(record:SurveyRecord)=>void}){
  const id=useId(),[date,setDate]=useState(record?.date??''),[error,setError]=useState('');
  useEffect(()=>{setDate(record?.date??'');setError('');},[record?.date]);
  return <fieldset className="grid gap-3 my-3 sm:grid-cols-2"><legend className="font-semibold">Site survey record</legend>
    <label htmlFor={`${id}-author`}>Survey author<input id={`${id}-author`} className="border rounded p-2 w-full" maxLength={120} value={record?.author??''} disabled={!onChange} onChange={e=>onChange?.({...record,author:e.target.value})}/></label>
    <div><label htmlFor={`${id}-date`}>Survey date</label><input id={`${id}-date`} className="border rounded p-2 w-full" type="date" value={date} disabled={!onChange} aria-invalid={!!error} aria-describedby={error?`${id}-error`:undefined} onChange={e=>setDate(e.target.value)} onBlur={()=>{
      const next={...record,date:date||undefined};
      if(surveyRecordIssue(next)){setError('Enter a valid calendar date.');return;}
      setError('');onChange?.(next);
    }}/>{error&&<p id={`${id}-error`} role="alert">{error}</p>}</div>
    <p className="text-sm sm:col-span-2">Enter who measured the room and the date of that survey. These are project records, separate from when you confirm the measurements below.</p>
  </fieldset>;
}
