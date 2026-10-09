'use client';
import type {ClosetConfiguration} from '@/types/closet';
import {householdDemand,HOUSEHOLD_DEMAND_NOTE} from '@/lib/householdDemand';

export default function HouseholdDemandReport({config}:{config:Partial<ClosetConfiguration>}){
  const report=householdDemand(config);
  if(!report.members.length)return <p className="text-sm">Add household profiles under Household, seasonal inventory, and reserve capacity to see demand by person and season.</p>;
  return <section aria-label="Household demand breakdown" className="rounded border p-3 my-3">
    <h3 className="font-semibold">Demand by household and season</h3>
    <p className="text-sm my-2">{HOUSEHOLD_DEMAND_NOTE}</p>
    <p role="status" className={report.matches?'text-sm text-green-800':'text-sm text-amber-900'}>{report.matches?'Profile totals match active inventory.':'Draft profile totals differ from active inventory. The layout uses active inventory; profile demand below is for comparison.'}</p>
    {!!report.differences.length&&<details className="my-2"><summary>Review profile differences</summary><ul className="text-sm">{report.differences.map(d=><li key={d.key}>{d.label}: {d.current} active, {d.profiles} in profiles{d.key.endsWith('.jewelry')?' (0 = not requested, 1 = requested)':''}.</li>)}</ul></details>}
    <div role="region" aria-label="Seasonal demand table" tabIndex={0} className="overflow-x-auto my-3"><table className="w-full text-sm text-left"><caption className="text-left my-2">Demand in the units shown for each category</caption><thead><tr>{['Category / unit','Everyday profiles','Seasonal profiles','Active inventory','Reserve addition','Active total'].map(h=><th scope="col" className="p-2 border-b" key={h}>{h}</th>)}</tr></thead><tbody>{report.rows.filter(r=>r.current+r.everyday+r.seasonal>0).map(r=><tr key={r.label}><th scope="row" className="p-2 border-b font-medium">{r.label}<span className="block text-xs font-normal">{r.unit}</span></th>{[r.everyday,r.seasonal,r.current,r.reserve,r.total].map((n,i)=><td key={i} className="p-2 border-b tabular-nums">{n.toFixed(2)}</td>)}</tr>)}</tbody></table></div>
    <h4 className="font-semibold">Individual contributions before reserve</h4><div className="grid sm:grid-cols-2 gap-3 mt-2">{report.members.map(m=><details key={m.id} className="border rounded p-3"><summary>{m.name} · {m.season}</summary><ul className="text-sm mt-2">{m.rows.filter(r=>r.required>0).map(r=><li key={r.label}>{r.label}: {r.required.toFixed(2)} {r.unit}</li>)}</ul>{!m.rows.some(r=>r.required>0)&&<p className="text-sm">No measured demand in this profile.</p>}</details>)}</div>
  </section>;
}
