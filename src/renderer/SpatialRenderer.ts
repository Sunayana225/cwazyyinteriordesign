import { faceDetails, CABINET_STYLES } from '@/lib/cabinetStyle';
import type { ClosetLayout, ClosetWall, UserPreferences } from '@/types/closet';
import { wallFootprint } from '@/lib/planning';
import { escapeHTML, HARDWARE } from '@/lib/design';

export type Point = [number, number, number];
export interface SpatialOptions { style?: UserPreferences['stylePreference']; angle?: number; labels?: boolean; islandOnly?: boolean; elevation?: number; hiddenWalls?: string[]; woodFinish?: UserPreferences['woodFinish']; hardwareFinish?: string; interactive?: boolean; }
export interface SpatialPart { wallId: ClosetWall['wallId']; kind: string; drawerId?: string; corners: Point[]; }

/** Cabinet-local coordinates: length along wall, depth into room, height above floor. */
export function spatialParts(layout: ClosetLayout, style: UserPreferences['stylePreference'] = 'modern'): SpatialPart[] {
  const parts: SpatialPart[] = [];
  for (const wall of layout.walls) {
    const box = wallFootprint(wall, layout);
    const point = (u:number,v:number,z:number):Point => {
      if (wall.wallId==='left'||wall.wallId==='corridor-a') return [box.x+v,box.y+u,z];
      if (wall.wallId==='right'||wall.wallId==='corridor-b') return [box.x+box.width-v,box.y+u,z];
      return [box.x+u,box.y+v,z];
    };
    const add = (kind:string,u:number,v:number,z:number,w:number,d:number,h:number,drawerId?:string) => {
      if(w<=0||d<=0||h<=0)return;
      parts.push({wallId:wall.wallId,kind,drawerId,corners:[[u,v,z],[u+w,v,z],[u+w,v+d,z],[u,v+d,z],[u,v,z+h],[u+w,v,z+h],[u+w,v+d,z+h],[u,v+d,z+h]].map(([x,y,height])=>point(x,y,height))});
    };
    const depth=wall.unitDepth,t=.75,island=wall.wallId==='island-unit';
    for(const [zi,zone] of wall.zones.entries()){
      const {x,y,width,height}=zone;
      add('back',x,0,y,width,t,height);
      add('side',x,0,y,t,depth,height);
      add('side',x+width-t,0,y,t,depth,height);
      add('base',x,0,y,width,depth,t);
      if(!island)add('top',x,0,y+height-t,width,depth,t);
      for(const shelf of zone.shelves??[]){
        const z=y+shelf.height;
        if(z>=y&&z+t<=y+height)add('shelf',x+t,0,z,width-2*t,Math.min(depth,shelf.depth),t);
      }
      for(const [di,drawer] of (zone.drawers??[]).entries()){
        const w=Math.min(width-2*t,drawer.width),u=x+(width-w)/2;
        add('drawer',u,depth-t,drawer.position,w,t,drawer.height,`${wall.wallId}:${zi}:${di}`);
        for(const detail of faceDetails(style,w,drawer.height)) add(detail.metal?'handle':'front-detail',u+w*detail.x,depth,drawer.position+drawer.height*detail.y,w*detail.w,detail.metal?.7:.08,drawer.height*detail.h);
      }
      for(const rod of zone.rods??[])add('rod',x+t,Math.min(depth-1,rod.depth),rod.height,Math.min(width-2*t,rod.length),.7,.7);
    }
    // A single continuous counter, within the engine's 36-inch island height.
    if(island&&wall.zones.length)add('countertop',0,0,wall.height-1.5,wall.width,depth,1.5);
  }
  return parts;
}

/** Orthographic 3D projection; all vertices use the same inch scale. */
export function renderSpatial(layout:ClosetLayout,options:SpatialOptions={}):string {
  const angle=(options.angle??-25)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  const elevation=Math.max(10,Math.min(90,options.elevation??33))*Math.PI/180,tilt=Math.sin(elevation),rise=Math.cos(elevation);
  const project=([x,y,z]:Point)=>{const rx=x*c-y*s,ry=x*s+y*c;return {x:rx,y:ry*tilt-z*rise,depth:ry*rise+z*tilt};};
  const single=['reach-in','wardrobe-wall'].includes(layout.closetType);
  const width=single?layout.dimensions.width:layout.roomDimensions?.roomWidth??layout.dimensions.width;
  const depth=single?layout.dimensions.depth:layout.roomDimensions?.roomDepth??layout.dimensions.depth;
  const floor:Point[]=[[0,0,0],[width,0,0],[width,depth,0],[0,depth,0]];
  const parts=spatialParts(layout,options.style).filter(p=>(!options.islandOnly||p.wallId==='island-unit')&&!options.hiddenWalls?.includes(p.wallId));
  const openings=spatialOpenings(layout);
  const all=[...floor,...parts.flatMap(p=>p.corners),...openings.flatMap(o=>o.points)].map(project);
  const minX=Math.min(...all.map(p=>p.x)),maxX=Math.max(...all.map(p=>p.x)),minY=Math.min(...all.map(p=>p.y)),maxY=Math.max(...all.map(p=>p.y));
  const margin=Math.max(12,(maxX-minX)*.06),font=Math.max(3,(maxX-minX)/70);
  const points=(p:Point[])=>p.map(project).map(p=>`${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(' ');
  const faces:Array<{depth:number;svg:string}>=[];
  const indices=[[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]];
  for(const part of parts)indices.forEach((ids,i)=>{
    const vertices=ids.map(n=>part.corners[n]);
    const metal=part.kind==='rod'||part.kind==='handle',counter=part.kind==='countertop';
    const finish={light:['#a88967','#bea17f','#dac3a4','#b39979','#ead9c0'],medium:['#826344','#a27d56','#c2a17a','#92714e','#d5ba96'],dark:['#38271e','#4d3526','#705039','#483020','#89654a'],white:['#bbbdbb','#d8d9d4','#eaece5','#caced0','#fafbf6']}[options.woodFinish??'light'];
    const hardware=HARDWARE[options.hardwareFinish as keyof typeof HARDWARE]??HARDWARE[CABINET_STYLES[options.style??'modern'].hardware];
    const colors=metal?Array(5).fill(hardware):counter?finish.map((color,i)=>i===4?finish[4]:color):finish;
    const control=options.interactive&&part.drawerId&&i===2?` role="button" tabindex="0" data-spatial-drawer="${part.drawerId}" aria-label="Design compartments for ${part.drawerId}" style="cursor:pointer"`:part.kind==='handle'?' style="pointer-events:none"':'';
    faces.push({depth:vertices.reduce((n,p)=>n+project(p).depth,0)/4,svg:`<polygon${control} data-spatial-wall="${part.wallId}" data-part="${part.kind}" points="${points(vertices)}" fill="${colors[i]}" stroke="#6d5945" stroke-width=".2" stroke-linejoin="round"/>`});
  });
  for(const opening of openings){
    const style=opening.kind==='window'?'fill="#a6dbea" fill-opacity=".65" stroke="#287a96"':'fill="none" stroke="#875327"';
    faces.push({depth:opening.points.reduce((n,p)=>n+project(p).depth,0)/opening.points.length,svg:`<polyline data-opening="${opening.kind}" points="${points(opening.points)}" ${style} stroke-width=".7"><title>${escapeHTML(opening.label)}</title></polyline>`});
  }
  faces.sort((a,b)=>a.depth-b.depth);
  const labels=options.labels===false?'':layout.walls.filter(w=>w.zones.length&&(!options.islandOnly||w.wallId==='island-unit')&&!options.hiddenWalls?.includes(w.wallId)).map(w=>{
    const b=wallFootprint(w,layout),p=project([b.x+b.width/2,b.y+b.depth/2,w.height+6]);
    return `<text x="${p.x}" y="${p.y}" text-anchor="middle" font-size="${font}" fill="#392d23" stroke="#faf8f5" stroke-width="1.2" paint-order="stroke">${escapeHTML(w.label)}${w.wallId==='island-unit'?` · ${w.height} in high`:''}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" role="${options.interactive?'group':'img'}" aria-label="3D closet spatial view" viewBox="${minX-margin} ${minY-margin*2} ${maxX-minX+margin*2} ${maxY-minY+margin*3}" style="width:100%;height:auto;display:block;background:#faf8f5;font-family:Arial,sans-serif"><title>3D closet spatial view</title><metadata>${escapeHTML(JSON.stringify({projection:'orthographic',coordinateUnits:'inches',angle:options.angle??-25,elevation:options.elevation??33,woodFinish:options.woodFinish??'light',hiddenWalls:options.hiddenWalls??[],islandOnly:!!options.islandOnly,scale:'proportional; not a physical print scale'}))}</metadata><desc>Dimension-based orthographic view of generated cabinetry. Open room boundaries; configured door swings and windows are shown. Obstacles are shown in the floor plan. Island included only when generated by the layout.</desc><polygon points="${points(floor)}" fill="#eee9e0" stroke="#99846c" stroke-width=".6"/>${faces.map(f=>f.svg).join('')}${labels}</svg>`;
}

/** Room opening coordinates share the floor plan's clockwise door origins. */
export function spatialOpenings(layout:ClosetLayout):Array<{kind:string;label:string;points:Point[]}> {
  const width=layout.roomDimensions?.roomWidth??layout.dimensions.width,depth=layout.roomDimensions?.roomDepth??layout.dimensions.depth;
  const result:Array<{kind:string;label:string;points:Point[]}>=[];
  const door=layout.planning?.door;
  if(door){
    const point=(along:number,inward:number):Point=>door.wall==='front'?[along,depth-inward,0]:door.wall==='back'?[width-along,inward,0]:door.wall==='left'?[inward,along,0]:[width-inward,depth-along,0];
    const hinge=door.offset+(door.hinge==='right'?door.width:0),sign=door.hinge==='right'?-1:1,swing=door.swing==='in'?1:-1;
    const arc=Array.from({length:25},(_,i)=>{const a=i*Math.PI/48;return point(hinge+sign*door.width*Math.cos(a),swing*door.width*Math.sin(a));});
    result.push({kind:'door',label:`${door.wall} door: ${door.width} in, ${door.hinge} hinge, swings ${door.swing}`,points:[point(hinge,0),...arc,point(hinge,0)]});
  }
  for(const w of layout.planning?.windows??[]){
    const wall=layout.walls.find(v=>v.wallId===w.wall);if(!wall)continue;
    const box=wallFootprint(wall,layout),left=['left','corridor-a'].includes(w.wall),right=['right','corridor-b'].includes(w.wall);
    const point=(u:number,z:number):Point=>left?[0,box.y+u,z]:right?[width,box.y+u,z]:[box.x+u,0,z];
    result.push({kind:'window',label:`${w.label||'Window'}: sill ${w.sill} in, height ${w.height} in`,points:[point(w.offset,w.sill),point(w.offset+w.width,w.sill),point(w.offset+w.width,w.sill+w.height),point(w.offset,w.sill+w.height),point(w.offset,w.sill)]});
  }
  return result;
}
