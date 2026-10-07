import type { ClosetConfiguration, SavedDesign } from '@/types/closet';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { canonicalConfig } from './storage';
import { drawerTargets, resolveOrganizers } from './drawers';
export function designMetrics(design:SavedDesign){
  const layout=new ClosetLayoutEngine(design.config as ClosetConfiguration).calculateLayout(),targets=drawerTargets(layout),plans=resolveOrganizers(design.config.drawerInteriors??{},targets);
  return {shortfalls:layout.capacity?.filter(c=>c.required>c.available).length??0,total:targets.length,customized:targets.filter(t=>plans[t.id]).length,retained:Object.keys(plans).filter(id=>!targets.some(t=>t.id===id)).length};
}
export function libraryFilter(designs:SavedDesign[],filters:{folder:string;from:string;to:string;shortfalls:boolean;unfiled?:boolean;organizers?:string}){
  return designs.filter(d=>{
    const date=new Date(d.modifiedAt??d.savedAt).toISOString().slice(0,10);
    if((filters.unfiled&&d.folder)||(filters.folder&&d.folder!==filters.folder)||(filters.from&&date<filters.from)||(filters.to&&date>filters.to))return false;
    if(!filters.shortfalls&&!filters.organizers)return true;
    // A layout can be expensive to generate. Share its metrics across the active
    // filters instead of rebuilding it for each condition on the same design.
    const metrics=designMetrics(d);
    return (!filters.shortfalls||metrics.shortfalls>0)&&(!filters.organizers||(filters.organizers==='retained'?metrics.retained>0:metrics.customized<metrics.total));
  }).sort((a,b)=>(a.pinnedOrder??Number.MAX_SAFE_INTEGER)-(b.pinnedOrder??Number.MAX_SAFE_INTEGER));
}

export function duplicateConfigurations(designs:SavedDesign[]){
  const groups=new Map<string,SavedDesign[]>();for(const d of designs){const key=JSON.stringify(canonicalConfig(d.config as ClosetConfiguration));groups.set(key,[...(groups.get(key)??[]),d]);}return Array.from(groups.values()).filter(group=>group.length>1);
}
