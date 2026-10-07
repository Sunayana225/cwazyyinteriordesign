import type {ShelfConfig} from '@/types/closet';
/** One entry per physical board. count is the item capacity on that board.
 * Use the full cabinet envelope, distributing leftover height across openings.
 */
export function accessoryShelves(width:number,height:number,depth:number,bags:number,belts:boolean,opening=14):ShelfConfig[]{
 if(![width,height,depth,opening,bags].every(Number.isFinite)||width<=4||height<=3||depth<=0||opening<=0)return [];
 const shelves:ShelfConfig[]=[];
 let bottom=2;
 if(belts&&height>=10){shelves.push({height:bottom,spacing:6,depth:Math.min(depth,12),count:Math.max(0,Math.floor((width-4)/2)),purpose:'belts'});bottom+=7;}
 const available=height-bottom-1;
 const rows=Math.floor(available/(opening+1));
 if(rows<1)return shelves;
 const pitch=available/rows;
 const capacity=Math.max(0,Math.floor((width-4)/10));
 const bagRows=capacity>0?Math.ceil(Math.max(0,bags)/capacity):0;
 for(let row=0;row<rows;row++)shelves.push({height:bottom+row*pitch,spacing:pitch-1,depth:Math.min(depth,16),count:row<bagRows?capacity:Math.max(0,Math.floor((width-4)/12)),purpose:row<bagRows?'bags':'folded items'});
 return shelves;
}
