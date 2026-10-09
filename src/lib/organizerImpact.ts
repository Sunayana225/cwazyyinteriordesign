import type {ClosetLayout} from '@/types/closet';
import {drawerTargets,resolveOrganizers,type DrawerInterior} from './drawers';
interface OrganizerChange {id:string;name:string;kind:'unassigned'|'resized';before:DrawerInterior['source'];after:DrawerInterior['source']|null;}

/** Anchor legacy plans to the current drawer before matching another layout.
 * An old array index must not silently assign a plan to a different drawer. */
export function organizerImpact(plans:Record<string,DrawerInterior>|undefined,current:ClosetLayout,proposed:ClosetLayout){
  const anchored=resolveOrganizers(plans??{},drawerTargets(current));
  const targets=drawerTargets(proposed),resolved=resolveOrganizers(anchored,targets);
  const changes=Object.entries(resolved).flatMap<OrganizerChange>(([id,plan])=>{
    const target=targets.find(t=>t.id===id);
    if(!target)return [{id,name:plan.name,kind:'unassigned' as const,before:plan.source,after:null}];
    const changed=(['width','depth','height'] as const).some(key=>Math.abs(plan.source[key]-target.drawer[key])>.001);
    return changed?[{id,name:plan.name,kind:'resized' as const,before:plan.source,after:{width:target.drawer.width,depth:target.drawer.depth,height:target.drawer.height}}]:[];
  });
  return {plans:resolved,changes};
}
