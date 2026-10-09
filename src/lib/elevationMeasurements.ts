import type {ClosetWall} from '@/types/closet';
export interface ComponentMeasurement {kind:'Shelf'|'Rod'|'Drawer';index:number;purpose:string;values:Array<[string,number]>;}
/** Keep each modeled component separate. Shelf.count is item capacity, not boards. */
export function elevationMeasurements(wall:ClosetWall){
  return wall.zones.map((zone,index)=>({index,type:zone.type==='double-hang'&&zone.rods?.length===1?'single-hang':zone.type,label:zone.contentLabel,values:[['Left offset',zone.x],['Base above finished floor',zone.y],['Width',zone.width],['Height',zone.height]] as Array<[string,number]>,components:[
    ...(zone.shelves??[]).map((s,i):ComponentMeasurement=>({kind:'Shelf',index:i,purpose:s.purpose,values:[['Datum above finished floor',zone.y+s.height],['Depth',s.depth],['Spacing',s.spacing]]})),
    ...(zone.rods??[]).map((r,i):ComponentMeasurement=>({kind:'Rod',index:i,purpose:r.purpose,values:[['Height above finished floor',r.height],['Length',r.length],['Depth',r.depth]]})),
    ...(zone.drawers??[]).map((d,i):ComponentMeasurement=>({kind:'Drawer',index:i,purpose:d.purpose,values:[['Base above finished floor',d.position],['Box width',d.width],['Box depth',d.depth],['Box height',d.height]]})),
  ]}));
}
