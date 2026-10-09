import {it,expect} from 'vitest';
import {DEFAULT_CONFIG} from '@/lib/design';
import {ClosetLayoutEngine} from '@/engine/ClosetLayoutEngine';
import {drawerTargets,defaultInterior} from '@/lib/drawers';
import {organizerImpact} from '@/lib/organizerImpact';
import {compareDrawerLayouts} from '@/lib/layoutAlternatives';

it('anchors legacy plans before an alternative puts a different drawer in the old slot',()=>{
  const current=new ClosetLayoutEngine(DEFAULT_CONFIG).calculateLayout(),target=drawerTargets(current)[0];
  const plan=defaultInterior(target.drawer),plans={[target.id]:plan},before=structuredClone(plans),proposed=structuredClone(current);
  for(const wall of proposed.walls)for(const zone of wall.zones)zone.x+=.125;
  const impact=organizerImpact(plans,current,proposed);
  expect(impact.changes).toHaveLength(1);expect(impact.changes[0].kind).toBe('unassigned');
  expect(impact.plans[target.id]).toBeUndefined();expect(Object.values(impact.plans)[0].identity).toBe(target.identity);
  expect(Object.values(impact.plans)[0].cells).toEqual(plan.cells);expect(plans).toEqual(before);
});

it('reports dimension changes without altering saved measurements or compartment contents',()=>{
  const current=new ClosetLayoutEngine(DEFAULT_CONFIG).calculateLayout(),target=drawerTargets(current)[0];
  const plan={...defaultInterior(target.drawer),identity:target.identity,measured:{width:12,depth:12,height:3}};
  const proposed=structuredClone(current);for(const wall of proposed.walls)for(const zone of wall.zones)for(const drawer of zone.drawers??[])drawer.depth-=2;
  const impact=organizerImpact({[target.id]:plan},current,proposed);
  expect(impact.changes[0]).toMatchObject({kind:'resized',after:{depth:target.drawer.depth-2}});
  expect(impact.plans[target.id].measured).toEqual(plan.measured);expect(impact.plans[target.id].source).toEqual(plan.source);
  expect(organizerImpact({[target.id]:plan},current,current).changes).toEqual([]);
});

it('retains every plan across all feasible drawer alternatives',()=>{
  const config=structuredClone(DEFAULT_CONFIG);config.userInfo.drawerPreference='many-small';const current=new ClosetLayoutEngine(config).calculateLayout();
  const plans=Object.fromEntries(drawerTargets(current).map(t=>[t.id,{...defaultInterior(t.drawer),identity:t.identity,name:t.label}]));
  for(const option of compareDrawerLayouts(config,current).alternatives){
    const impact=organizerImpact(plans,current,option.layout);
    expect(Object.values(impact.plans).map(p=>p.name).sort()).toEqual(Object.values(plans).map(p=>p.name).sort());
    for(const plan of Object.values(impact.plans))expect(plan.cells).toEqual(Object.values(plans).find(p=>p.name===plan.name)!.cells);
  }
});
