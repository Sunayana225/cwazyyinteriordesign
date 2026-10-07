import type {CapacityRow} from './design';
/** Count satisfied categories rather than combining incompatible capacity units
 * or mistaking a highly overloaded closet for an efficient one. */
export function storageFit(rows:CapacityRow[]=[]){
  const needs=rows.filter(row=>row.required>0);
  const shortfalls=needs.filter(row=>row.required>row.available+.01);
  const covered=needs.length-shortfalls.length;
  return {total:needs.length,covered,shortfalls,percent:needs.length?Math.round(100*covered/needs.length):0};
}
