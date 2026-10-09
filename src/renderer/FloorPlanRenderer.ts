import type { ClosetLayout } from '@/types/closet';
import { escapeHTML as esc, formatInches, isWalkIn } from '@/lib/design';
import { wallFootprint, storageObstacleConflicts, storageFootprints } from '@/lib/planning';
import { doorAssessment, doorTransform, roomSize } from '@/lib/roomGeometry';

interface FloorPlanOptions { roomWidth:number;roomDepth:number;unitDepth:number;interactive?:boolean; }
/** Draw only generated storage. All coordinates are inches until the SVG transform. */
export function renderFloorPlan(layout:ClosetLayout,opts:FloorPlanOptions):string{
  const rw=layout.roomDimensions?.roomWidth??opts.roomWidth,rd=layout.roomDimensions?.roomDepth??opts.roomDepth;
  const planning=layout.planning??{},scale=3,margin=Math.max(40,layout.planning?.door?.swing==='out'?(layout.planning.door.width+12)*3:40);
  const pieces:string[]=[];
  const text=(x:number,y:number,s:string,color='#5c493b')=>`<text x="${x}" y="${y}" font-size="3.5" text-anchor="middle" fill="${color}">${esc(s)}</text>`;
  const footprints=layout.walls.filter(w=>w.zones.length).map(w=>({wall:w,box:wallFootprint(w,layout)}));
  const actual=storageFootprints(layout);
  for(const {wall,box} of footprints){
    const attrs=opts.interactive?` role="button" tabindex="0" data-wall-id="${wall.wallId}" aria-label="Show ${esc(wall.label)} elevation"`:'';
    pieces.push(`<g${attrs}><title>${esc(wall.label)}</title>`);
    for(const b of actual.filter(b=>b.wallId===wall.wallId))pieces.push(`<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.depth}" fill="#d8c8b0" stroke="#8d7353" stroke-width=".5"/>`);
    pieces.push(text(box.x+box.width/2,box.y+box.depth/2,wall.label),'</g>');
  }
  const depth=(...ids:string[])=>Math.max(0,...footprints.filter(f=>ids.includes(f.wall.wallId)).map(f=>f.wall.unitDepth));
  const left=depth('left','corridor-a'),right=depth('right','corridor-b'),back=depth('back');
  const aisleWidth=rw-left-right,aisleDepth=rd-back;
  const target=planning.clearanceTarget??36,inadequate=aisleWidth<target||aisleDepth<target;
  if(inadequate)pieces.push(`<rect x="${Math.min(rw,left)}" y="${Math.min(rd,back)}" width="${Math.max(0,aisleWidth)}" height="${Math.max(0,aisleDepth)}" fill="#ef444433" stroke="#a11" stroke-width=".5"/>`);
  const island=footprints.find(f=>f.wall.wallId==='island-unit');
  if(island){
    const b=island.box,leftGap=b.x-left,rightGap=rw-right-b.x-b.width,backGap=b.y-back,frontGap=rd-b.y-b.depth;
    const aisle=(x:number,y:number,label:string,value:number)=>text(x,y,`${label}: ${formatInches(Math.max(0,value))}`,value<target?'#991b1b':'#5c493b');
    pieces.push(`<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.depth}" fill="none" stroke="#59412a" stroke-width="1"/><title>Freestanding island countertop</title>`,
      aisle(b.x+b.width/2,b.y-4,'Behind island',backGap),aisle(b.x+b.width/2,b.y+b.depth+6,'In front',frontGap),
      aisle(left+leftGap/2,b.y+b.depth/2-3,'Left',leftGap),aisle(b.x+b.width+rightGap/2,b.y+b.depth/2+4,'Right',rightGap));
  }
  else pieces.push(text(rw/2,back+Math.max(0,aisleDepth)/2,aisleWidth<=0?'STORAGE OVERLAP — no clear aisle':`Aisle ${formatInches(Math.max(0,Math.min(aisleWidth,aisleDepth)))} clear`,inadequate?'#991b1b':'#5c493b'));
  if(layout.closetType==='island'&&!island)pieces.push(text(rw/2,back+8,'Island omitted: insufficient clearance'));
  for(const o of planning.obstacles??[]){pieces.push(`<rect x="${o.x}" y="${o.y}" width="${o.width}" height="${o.depth}" fill="${o.mobility==='movable'?'#d5dfca':'#d68b8b'}" stroke="${o.mobility==='movable'?'#405238':'#991b1b'}" stroke-width=".6" ${o.mobility==='movable'?'stroke-dasharray="1 1"':''}><title>${esc(o.label)} · ${o.mobility==='movable'?'Movable furniture':'Fixed structural object'}</title></rect>`,text(o.x+o.width/2,o.y+o.depth/2,o.label));if(o.x+o.width>rw||o.y+o.depth>rd){const x=Math.max(5,Math.min(rw-5,o.x+o.width/2)),y=Math.max(5,Math.min(rd-5,o.y+o.depth/2));pieces.push(`<g ${opts.interactive?`role="button" tabindex="0" data-obstacle-id="${esc(o.id)}" aria-label="Review out-of-room obstacle ${esc(o.label)}"`:''}><circle cx="${x}" cy="${y}" r="4" fill="#991b1b"/>${text(x,y+1,'!','#fff')}<title>${esc(o.label)} extends beyond room</title></g>`);}}
  storageObstacleConflicts(layout).forEach((label,i)=>pieces.push(text(rw/2,8+i*5,`Storage intersects obstacle: ${label}`,'#991b1b')));
  for(const win of planning.windows??[]){const wall=layout.walls.find(w=>w.wallId===win.wall);if(!wall)continue;const box=wallFootprint(wall,layout),vertical=['left','right','corridor-a','corridor-b'].includes(win.wall);pieces.push(`<rect x="${vertical?box.x:box.x+win.offset}" y="${vertical?box.y+win.offset:box.y}" width="${vertical?2:win.width}" height="${vertical?win.width:2}" fill="#1d7899"/>`);}
  if(isWalkIn(layout.closetType)){
    const door=planning.door??{wall:'front',width:30,offset:Math.max(0,(rw-30)/2),hinge:'left',swing:'in'};
    const available=['front','back'].includes(door.wall)?rw:rd;
    const transform=doorTransform(door,roomSize(layout));
    const hx=door.offset+(door.hinge==='right'?door.width:0),sign=door.hinge==='right'?-1:1,dy=door.swing==='in'?-door.width:door.width;
    pieces.push(`<g transform="${transform}"><line x1="${door.offset}" y1="0" x2="${door.offset+door.width}" y2="0" stroke="#6d4f40" stroke-width="1.2"/><path d="M ${hx+sign*door.width} 0 A ${door.width} ${door.width} 0 0 ${sign*(door.swing==='in'?-1:1)>0?1:0} ${hx} ${dy} L ${hx} 0" fill="none" stroke="#6d4f40" stroke-width=".4" stroke-dasharray="1 1"/></g>`);
    pieces.push(text(rw/2,rd+5,planning.door?`${door.wall} door ${door.width} in · ${door.hinge} hinge · opens ${door.swing}`:'ASSUMED 30-IN DOOR'));
    if(door.offset+door.width>available)pieces.push(text(rw/2,rd-5,'Door opening extends beyond wall','#991b1b'));
    const assessment=doorAssessment({...layout,planning:{...planning,door}});
    if(assessment.conflicts.length)pieces.push(text(rw/2,rd-9,'Door swing clearance may intersect storage / obstacle','#991b1b'));
  }
  return `<svg data-ruler-width="${rw}" data-ruler-origin="${margin}" data-ruler-scale="${scale}" viewBox="0 0 ${rw*scale+margin*2} ${rd*scale+margin*2}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;background:#faf8f5;font-family:Arial,sans-serif"><title>Closet floor plan</title><desc>Generated storage walls, openings, obstacles and conservative door swing clearance. ${planning.door?'Configured door.':'The centered 30-inch door is illustrative.'} Not to scale.</desc><g transform="translate(${margin} ${margin}) scale(${scale})"><rect width="${rw}" height="${rd}" fill="#f5f1eb" stroke="#8d7b6a" stroke-width=".6"/>${pieces.join('')}${text(rw/2,rd+10,`FLOOR PLAN · ${formatInches(rw)} × ${formatInches(rd)} · NOT TO SCALE`)}</g></svg>`;
}

