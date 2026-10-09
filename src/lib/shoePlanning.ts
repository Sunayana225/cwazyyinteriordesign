import type {ShelfConfig,ShoeCollection} from '@/types/closet';
import {ELEMENT_FIT,SHOE_PAIR_WIDTH,SHOE_SPACING} from './design';
const ORDER: Array<keyof ShoeCollection> = ['boots','heels','sneakers','flats'];
/** Each row is a physical board with pair capacity; clearance excludes its one-inch allowance. */
export function shoeShelves(inventory:ShoeCollection,height:number,width:number,clearances?:ShoeCollection):ShelfConfig[]{
 const shelves:ShelfConfig[]=[];let bottom=2;
 if(!Number.isFinite(height)||!Number.isFinite(width)||height<=0||width<=4)return shelves;
 const kinds=ORDER.map(kind=>({kind,quantity:inventory[kind],capacity:Math.floor((width-4)/SHOE_PAIR_WIDTH[kind]),opening:clearances?.[kind]??SHOE_SPACING[kind],rows:0}))
  .filter(k=>Number.isFinite(k.quantity)&&k.quantity>0&&Number.isFinite(k.opening)&&k.opening>0&&k.capacity>0);
 // Allocate scarce height to the least-served category. For equal coverage,
 // prefer the smaller opening so one tall category cannot consume every row.
 // This is a deterministic fair-share heuristic, not a global optimum.
 let remaining=height-3;
 while(true){
  const next=kinds.filter(k=>k.rows*k.capacity<k.quantity&&k.opening+1<=remaining+.000001)
   .sort((a,b)=>a.rows*a.capacity/a.quantity-b.rows*b.capacity/b.quantity||a.opening-b.opening||ORDER.indexOf(a.kind)-ORDER.indexOf(b.kind))[0];
  if(!next)break;
  next.rows++;remaining-=next.opening+1;
 }
 // Keep heavy/tall shoes at the bottom after deciding how many rows each gets.
 for(const k of kinds)for(let row=0;row<k.rows;row++){
  shelves.push({height:bottom,depth:ELEMENT_FIT['shoe-shelves'].depth,spacing:k.opening,count:k.capacity,purpose:k.kind});bottom+=k.opening+1;
 }
 return shelves;
}
/** Try only widths where capacity changes. Choose the narrowest feasible column;
 * return the available width when inventory cannot all fit, leaving shortfalls visible.
 */
export function shoeColumnWidth(inventory:ShoeCollection,height:number,maxWidth:number,clearances?:ShoeCollection,minWidth=24):number{
 const max=Math.max(0,maxWidth),min=Math.min(minWidth,max);
 if(ORDER.every(k=>inventory[k]<=0))return min;
 const fits=(width:number)=>{
  let needed=2;
  for(const kind of ORDER){
   if(inventory[kind]<=0)continue;
   const capacity=Math.floor((width-4)/SHOE_PAIR_WIDTH[kind]);
   if(capacity<1)return false;
   needed+=Math.ceil(inventory[kind]/capacity)*((clearances?.[kind]??SHOE_SPACING[kind])+1);
  }
  return needed<=height-1;
 };
 // Capacity only increases with width. Avoid scanning candidates for an inventory
 // that cannot fit even at the maximum, especially when filtering saved designs.
 if(fits(min))return min;
 if(!fits(max))return max;
 const candidates=new Set([min,max]);
 for(const kind of ORDER)if(inventory[kind]>0){
  const pairWidth=SHOE_PAIR_WIDTH[kind];
  for(let pairs=1;pairs<=Math.min(inventory[kind],Math.floor((max-4)/pairWidth));pairs++){
   const width=4+pairs*pairWidth;if(width>=min)candidates.add(width);
  }
 }
 for(const width of [...candidates].sort((a,b)=>a-b)){
  if(fits(width))return width;
 }
 return max;
}
