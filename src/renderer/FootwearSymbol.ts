/** Side profiles for drafting; symbolic examples, not the stored pair count. */
export function footwearSymbol(kind:string,x:number,baseline:number,width:number,height:number):string {
 if(![x,baseline,width,height].every(Number.isFinite)||width<=0||height<=0)return '';
 const paths:Record<string,[string,string]>={
 flats:['M2 23 L3 12 Q8 9 12 14 Q17 23 26 21 L38 14 Q47 12 48 23 L48 27 L2 27 Z','M3 24 Q25 27 47 24 M7 13 Q12 22 22 23'],
 sneakers:['M2 24 L3 10 L12 12 L20 5 Q24 4 27 11 L35 17 L44 19 Q49 21 48 27 L2 27 Z','M3 23 L47 23 M21 10 L29 12 M24 13 L32 15 M27 16 L35 18 M8 14 L8 20'],
 heels:['M2 9 Q7 5 10 12 L17 21 Q24 25 34 21 L42 17 Q48 17 48 23 L45 26 L28 26 Q18 27 10 18 L7 28 L4 28 L4 16 Z','M11 17 Q21 29 34 23 M5 11 L7 11'],
 boots:['M4 1 L24 1 L22 17 Q22 20 31 21 L44 23 Q49 24 48 28 L3 28 L3 23 L5 19 Z','M4 4 L24 4 M4 25 L47 25 M19 5 L18 18 Q19 23 29 24'],
 };
 const [outline,seams]=paths[kind]??paths.flats;
 return `<g data-footwear-symbol="${kind in paths?kind:'flats'}" transform="translate(${x} ${baseline-height}) scale(${width/50} ${height/28})" stroke="#746e66" stroke-width=".7" stroke-linejoin="round" stroke-linecap="round"><path d="${outline}" fill="#faf9f5" vector-effect="non-scaling-stroke"/><path d="${seams}" fill="none" stroke="#9c9488" stroke-width=".5" vector-effect="non-scaling-stroke"/></g>`;
}
