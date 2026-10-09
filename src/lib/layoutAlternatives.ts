import type { ClosetConfiguration, ClosetLayout, UserPreferences } from '@/types/closet';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { alternativeIssues } from './roomGeometry';
import { storageFit } from './storageFit';

type Preference=UserPreferences['drawerPreference'];
export interface DrawerAlternative { id?:string;title?:string;description?:string;patch?:Pick<ClosetConfiguration,'zoneOverrides'>;preference:Preference; equivalentPreferences:Preference[]; layout:ClosetLayout; score:number; changes:Array<{label:string;unit:string;delta:number}>; }
const category=(label:string):UserPreferences['priorityItems'][number]=>label.startsWith('Long')||label.startsWith('Short')?'hanging':label==='Folded storage'?'folded':['boots','heels','sneakers','flats'].includes(label)?'shoes':'accessories';
/** Compare fractions within each category instead of adding inches, pairs and
 * drawer equivalents. Selected priorities carry twice the weight, openly. */
export function shortfallScore(layout:ClosetLayout,priorities:UserPreferences['priorityItems']):number {
  let total=0,missing=0;
  for(const row of layout.capacity??[]){
    if(!(row.required>0))continue;
    const weight=priorities.includes(category(row.label))?2:1;
    total+=weight;missing+=weight*Math.max(0,Math.min(1,(row.required-row.available)/row.required));
  }
  return total?missing/total:0;
}
export function compareDrawerLayouts(config:ClosetConfiguration,current:ClosetLayout) {
  const byGeometry=new Map<string,DrawerAlternative>(),rejected:Array<{preference:string;issues:Array<[string,string[]]>}>=[];
  for(const preference of ['many-small','few-large','mixed'] as const){
    const layout=new ClosetLayoutEngine({...config,userInfo:{...config.userInfo,drawerPreference:preference}}).calculateLayout();
    const issues=alternativeIssues(layout);
    if(issues.length){rejected.push({preference,issues});continue;}
    const key=JSON.stringify(layout.walls),duplicate=byGeometry.get(key);
    if(duplicate){duplicate.equivalentPreferences.push(preference);continue;}
    const changes=(layout.capacity??[]).map(row=>({label:row.label,unit:row.unit,delta:row.available-(current.capacity?.find(c=>c.label===row.label)?.available??0)})).filter(row=>Math.abs(row.delta)>.01);
    byGeometry.set(key,{preference,equivalentPreferences:[preference],layout,score:shortfallScore(layout,config.userInfo.priorityItems),changes});
  }
  const alternatives=[...byGeometry.values()].sort((a,b)=>a.score-b.score||storageFit(a.layout.capacity).shortfalls.length-storageFit(b.layout.capacity).shortfalls.length);
  return {alternatives,rejected};
}
