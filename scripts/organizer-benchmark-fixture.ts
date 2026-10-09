import {DEFAULT_CONFIG,MAX_COMPARTMENTS} from '../src/lib/design';
import {defaultInterior,grid,type DrawerInterior} from '../src/lib/drawers';
import {dividerPositions} from '../src/lib/drawerConstruction';
import {serializeDesigns} from '../src/lib/storage';
import type {DrawerConfig} from '../src/types/closet';

/** Deterministic stress data, not customer data or 200 physically generated drawers.
 * Retained organizers exercise import validation even when no drawer is assigned.
 * One dense plan exercises real editing and SVG generation at the compartment cap. */
export function organizerBenchmarkFixture(){
  const drawer:DrawerConfig={width:42,depth:30,height:8,position:3,purpose:'accessories'};
  const side=Math.sqrt(MAX_COMPARTMENTS);if(!Number.isInteger(side))throw new Error('Update benchmark grid for the changed compartment limit.');
  const plan:DrawerInterior={...defaultInterior(drawer),name:'Dense organizer benchmark',notes:'N'.repeat(500),measured:{width:40,depth:28,height:6},dividerThickness:{horizontal:.25,vertical:.375},itemMargin:.125,minimumCellWidth:1,
    cells:grid(side,side,'Jewelry').map((cell,i)=>({...cell,label:('Cell '+i+' ').repeat(12).slice(0,60),notes:'n'.repeat(300),quantity:999,item:{width:1.25,depth:1.5,height:1,rotate:true}}))};
  plan.dividerNames=Object.fromEntries((['x','y'] as const).flatMap(axis=>dividerPositions(plan,axis).map((n,i)=>[axis+':'+n,('Divider '+axis+i+' ').repeat(10).slice(0,80)])));
  plan.lockedDividers={x:dividerPositions(plan,'x').slice(1,3),y:dividerPositions(plan,'y').slice(1,3)};
  const plans=Object.fromEntries(Array.from({length:200},(_,i)=>['back:'+i+':0',structuredClone(plan)]));
  const config={...structuredClone(DEFAULT_CONFIG),drawerInteriors:plans};
  const raw=serializeDesigns([{id:'benchmark',name:'Organizer stress fixture',savedAt:'2026-10-09T00:00:00.000Z',config}]);
  const description={name:'Maximum compartment and retained-organizer fixture',units:'inches',drawer,measuredInterior:plan.measured,retainedPlans:Object.keys(plans).length,cellsPerPlan:plan.cells.length,totalCells:Object.values(plans).reduce((n,p)=>n+p.cells.length,0),namedDividers:Object.keys(plan.dividerNames).length,quantityPerCell:999,notesCharactersPerCell:300,backupBytes:new TextEncoder().encode(raw).length,scope:'CPU validation, editing, and SVG generation; excludes browser paint, network, and physical capacity claims'};
  return {drawer,plan,plans,raw,description};
}
