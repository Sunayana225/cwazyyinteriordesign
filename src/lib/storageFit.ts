import type {CapacityRow} from './design';
import type {ClosetConfiguration} from '@/types/closet';
import {measuredTies} from './tieStorage';

/** Requested accessories without a quantity/size model must never be reported as covered. */
export function unassessedStorage(config:Partial<ClosetConfiguration>):string {
  const categories=[...(config.wardrobe?.ties&&!measuredTies(config.planning)?['Ties']:[]),...(config.wardrobe?.jewelry?['Jewelry']:[])];
  return categories.length?`Not assessed in the fit score: ${categories.join(', ')}. Check organizer dimensions and item quantities separately; a drawn tray does not confirm capacity.`:'';
}
/** Count satisfied categories rather than combining incompatible capacity units
 * or mistaking a highly overloaded closet for an efficient one. */
export function storageFit(rows:CapacityRow[]=[]){
  const needs=rows.filter(row=>row.required>0);
  const shortfalls=needs.filter(row=>row.required>row.available+.01);
  const covered=needs.length-shortfalls.length;
  return {total:needs.length,covered,shortfalls,percent:needs.length?Math.round(100*covered/needs.length):0};
}
