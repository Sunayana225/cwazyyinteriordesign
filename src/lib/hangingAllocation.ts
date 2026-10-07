/** Allocate wall width to equalize fulfilled long/short rod demand. Double hanging
 * needs half as much column width for the same linear rod capacity. Four inches
 * per column are reserved for sides and rod brackets, as in the engine. */
export function hangingWidths(width:number,longDemand:number,shortDemand:number,shortRods:number,minWidth=24):[number,number] {
  const minimum=Math.min(minWidth,width/2);
  const shortEquivalent=shortDemand/Math.max(1,shortRods);
  const total=longDemand+shortEquivalent;
  const target=total>0?4+Math.max(0,width-8)*longDemand/total:width/2;
  const longWidth=Math.max(minimum,Math.min(width-minimum,target));
  return [longWidth,width-longWidth];
}
