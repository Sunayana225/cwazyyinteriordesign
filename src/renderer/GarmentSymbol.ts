/** Proportional fashion-drafting blocks. Decorative samples, not a fit calculation. */
export function garmentSymbol(x:number,rodY:number,width:number,height:number,long:boolean,variant:number):string {
 if(![x,rodY,width,height].every(Number.isFinite)||width<=0||height<=0)return '';
 const dress=long&&variant%2===1;
 const jacket=!long&&variant%2===1;
 const kind=dress?'pleated-dress':long?'trench-coat':variant%2?'tailored-jacket':'collared-shirt';
 const blockHeight=long?112:76;
 const scale=Math.min(width/44,height/blockHeight);
 const line=(d:string,color='#827d73',weight='.65')=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="${weight}" vector-effect="non-scaling-stroke"/>`;
 const outline=dress
 ? 'M-6 10 L-13 15 L-10 32 L-7 42 Q-12 64 -20 106 Q0 111 20 106 Q12 65 7 42 L10 32 L13 15 L6 10 Q0 19 -6 10 Z'
 : long
 ? 'M-5 10 L-16 15 Q-19 17 -20 25 L-22 65 L-15 67 L-11 32 L-15 105 Q0 110 15 105 L11 32 L15 67 L22 65 L20 25 Q19 17 16 15 L5 10 Z'
 : 'M-5 10 L-16 15 Q-19 18 -20 25 L-22 59 L-15 60 L-11 30 L-12 70 Q0 76 12 70 L11 30 L15 60 L22 59 L20 25 Q19 18 16 15 L5 10 Z';
 let detail='';
 // Low-contrast fabric planes; inset from the silhouette so shadows cannot escape it.
 const shade=dress
 ? '<path d="M-6 44 Q-9 74 -17 104 L-11 105 Q-5 71 -3 44 Z M3 44 Q8 76 15 105 L18 104 Q11 71 6 44 Z" fill="#d4cdc0" opacity=".55" stroke="none"/>'
 : `<path d="M-11 34 Q-9 47 -10 ${long?103:68} L-6 ${long?104:70} Q-5 49 -7 35 Z M7 35 Q6 52 8 ${long?104:69} L11 ${long?103:68} Q10 44 11 32 Z M-18 23 L-21 ${long?62:56} L-18 ${long?63:57} L-15 23 Z" fill="#d6d0c5" opacity=".5" stroke="none"/>`;

 if(dress){
 detail+=line('M-6 10 L3 34 L7 41 M6 10 L-4 31 L-7 41 M-7 39 L7 39 M-7 43 L7 43');
 for(let i=-4;i<=4;i++){const a=i*1.4,b=i*4;detail+=line(`M${a} 44 Q${a*1.7} 72 ${b} 106`,'#a9a296','.4');}
 detail+=line('M-11 18 L-4 36 M10 19 L4 33 M-18 103 Q0 108 18 103','#bab3a8','.4');
 }else{
 detail+=line('M-5 10 L-1 22 L-8 19 L-10 14 M5 10 L1 22 L8 19 L10 14 M0 22 L0 '+(long?'105':'71'));
 if(long){
 detail+=line('M-8 19 L-12 29 L-3 35 L4 21 M8 19 L12 29 L3 35 M-12 45 L12 45 L12 49 L-12 49 Z M-2 44 L3 44 L3 50 L-2 50 Z M-11 57 L-4 60 M4 60 L11 57 M-21 60 L-15 62 M15 62 L21 60');
 for(let y=73;y<102;y+=2)detail+=line(`M-11 ${y} l2 -1 M7 ${y} l2 -1`,'#c4bcae','.3');
 for(const y of [36,55,69])for(const cx of [-4,5])detail+=`<circle cx="${cx}" cy="${y}" r=".8" fill="#ddd7cd" stroke="#827d73" stroke-width=".5" vector-effect="non-scaling-stroke"/>`;
 }else{
 if(jacket)detail+=line('M-5 11 L-10 22 L-4 26 L0 38 L8 23 L4 18 M-10 48 L-3 48 L-3 51 L-10 51 Z M4 48 L10 48 L10 51 L4 51 Z');
 detail+=line('M-9 29 L-3 29 L-3 38 Q-6 40 -9 38 Z M-21 55 L-15 56 M15 56 L21 55 M-10 67 Q0 72 10 67');
 for(const y of [28,37,46,55,64])detail+=`<circle cx="1.6" cy="${y}" r=".55" fill="#827d73" stroke="none"/>`;
 }
 detail+=line(`M-14 20 Q-16 34 -17 ${long?58:52} M14 20 Q16 34 17 ${long?58:52} M-9 ${long?65:44} Q-7 ${long?86:57} -9 ${long?103:68} M9 ${long?65:44} Q7 ${long?86:57} 9 ${long?103:68}`,'#b0a99d','.45');
 }
 return `<g data-garment-symbol="${long?'long':'short'}" data-garment-kind="${kind}" transform="translate(${x} ${rodY}) scale(${scale})" stroke="#6e685f" stroke-width=".8" stroke-linecap="round" stroke-linejoin="round">
 ${line('M0 6 L0 2 Q4 0 3 -2 Q1 -4 -1 -2')}
 ${line('M0 6 L-13 12 Q0 14 13 12 Z')}
 <path d="${outline}" fill="${variant%2?'#eae6de':'#faf8f2'}" vector-effect="non-scaling-stroke"/>
 ${shade}${detail}</g>`;
}
