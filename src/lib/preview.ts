import type { ClosetConfiguration, ZoneOverrides } from '@/types/closet';
/** Only fields read by the layout engine, excluding material colors and organizer edits. */
export function layoutInputKey(config:Partial<ClosetConfiguration>,zoneOverrides:ZoneOverrides){return JSON.stringify({closetType:config.closetType,dimensions:config.dimensions,roomDimensions:config.roomDimensions,wardrobe:config.wardrobe,shoes:config.shoes,amenities:config.amenities,planning:config.planning,inventoryPlanning:{reserve:config.inventoryPlanning?.reserve},zoneOverrides,userInfo:{userType:config.userInfo?.userType,drawerPreference:config.userInfo?.drawerPreference,priorityItems:config.userInfo?.priorityItems}});}
export function namespaceSVG(svg:string,prefix:string):string {
  const ids:string[]=[],expression=/\sid="([^"]+)"/g;let match:RegExpExecArray|null;
  while((match=expression.exec(svg)))ids.push(match[1]);
  for(const id of ids){const safe=id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');svg=svg.replace(new RegExp(`(\\s)id="${safe}"`,'g'),`$1id="${prefix}-${id}"`).replace(new RegExp(`url\\(#${safe}\\)`,'g'),`url(#${prefix}-${id})`).replace(new RegExp(`href="#${safe}"`,'g'),`href="#${prefix}-${id}"`);}
  return svg;
}
/** Generation guard also works with asynchronous workers; old results cannot commit. */
export class LatestJob {
  private generation=0;
  cancel(){this.generation++;}
  async run<T>(work:()=>T|Promise<T>,commit:(result:T)=>void,onError:(error:unknown)=>void){const generation=++this.generation;try{const result=await work();if(generation===this.generation)commit(result);}catch(error){if(generation===this.generation)onError(error);}}
}

