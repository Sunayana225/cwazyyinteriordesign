/** Shelf accessories fitted proportionally to the space above a modeled shelf. */
export function storageSymbol(kind:string,x:number,baseline:number,width:number,height:number):string {
 if(![x,baseline,width,height].every(Number.isFinite)||width<=0||height<=0)return '';
 const scale=Math.min(width/64,height/52);
 const line=(d:string)=>`<path d="${d}" fill="none" vector-effect="non-scaling-stroke"/>`;
 const bag=kind==='bags';
 const folded=kind==='folded items';
 const stack=Array.from({length:3},(_,i)=>{const y=48-i*8;return `<path d="M8 ${y-6} Q4 ${y-6} 4 ${y-2} Q4 ${y+1} 9 ${y+1} L55 ${y+1} Q60 ${y} 58 ${y-5} Q57 ${y-7} 52 ${y-7} Z" fill="${i%2?'#e5dfd4':'#f5f1e9'}" vector-effect="non-scaling-stroke"/>${line(`M9 ${y-2} Q31 ${y} 55 ${y-2}`)}`;}).join('');
 const artwork=folded?stack:bag?`
 <path d="M7 22 L55 22 L60 49 Q32 52 3 49 Z" fill="#ece8e0" vector-effect="non-scaling-stroke"/>
 <path d="M7 22 L12 25 L9 47 L3 49 M55 22 L51 26 L54 47 L60 49" fill="#d5cfc4" stroke-width=".5" vector-effect="non-scaling-stroke"/>
 ${line('M17 27 L18 13 C19 0 43 0 44 13 L45 27 M20 27 L21 14 C22 4 40 4 41 14 L42 27 M12 25 L51 25 M10 46 Q32 49 53 46')}
 <rect x="28" y="30" width="9" height="6" rx="1" fill="#d2c6af" vector-effect="non-scaling-stroke"/>
 ${line('M30 32 L35 32 M15 31 L13 42 M49 30 L51 42')}`:
 `<rect x="5" y="31" width="54" height="18" rx="1" fill="#e6e0d6" vector-effect="non-scaling-stroke"/><rect x="3" y="28" width="58" height="5" fill="#f7f4ed" vector-effect="non-scaling-stroke"/><rect x="26" y="37" width="12" height="4" rx="1" fill="#c4bdb0" vector-effect="non-scaling-stroke"/>${line('M8 35 L8 46 M56 35 L56 46 M8 47 L56 47')}`;
 return `<g data-storage-symbol="${folded?'folded-stack':bag?'bag':'accessory-box'}" transform="translate(${x} ${baseline-52*scale}) scale(${scale})" stroke="#837b6f" stroke-width=".65" stroke-linejoin="round">${artwork}</g>`;
}
