export interface ColumnCandidate<T extends string> {type:T;minimum:number;score:number;demand:number;}
/** Enumerate the small set of candidate column types. Prefer serving more
 * weighted needs, then greater inventory demand. Keep stable display ordering.
 * Scores express product priorities, not a claim of globally optimal packing. */
export function selectColumns<T extends string>(candidates:ColumnCandidate<T>[],width:number):T[]{
  if(!Number.isFinite(width)||width<=0)return [];
  if(candidates.length>10)throw new Error('Column selection supports up to ten candidate types.');
  let best:T[]=[],bestScore=-1,bestDemand=-1;
  for(let mask=1;mask<2**candidates.length;mask++){
    const subset=candidates.filter((_,i)=>mask&(1<<i));
    if(subset.reduce((n,c)=>n+c.minimum,0)>width+.000001)continue;
    const score=subset.reduce((n,c)=>n+c.score,0),demand=subset.reduce((n,c)=>n+c.demand,0);
    if(score>bestScore||(score===bestScore&&demand>bestDemand)){
      best=subset.map(c=>c.type);bestScore=score;bestDemand=demand;
    }
  }
  return best;
}
