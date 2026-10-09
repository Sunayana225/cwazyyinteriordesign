import {it,expect} from 'vitest';
import {DEFAULT_CONFIG,EMPTY_WARDROBE} from '@/lib/design';
import {roomShell,applyRoomShell,readShells,serializeShells} from '@/lib/roomShells';
import {ClosetLayoutEngine} from '@/engine/ClosetLayoutEngine';
import {confirmSurvey,surveyState} from '@/lib/surveyReview';

it('keeps measured room geometry separate from storage assumptions and priorities',()=>{
  const c=structuredClone(DEFAULT_CONFIG);c.planning={shoeLengths:{boots:16},hangerSpacing:{shirts:3},bagDimensions:{width:20},clearanceTarget:42,walls:{back:{depth:30,priority:'shoes'}},windows:[{id:'w',wall:'back',offset:12,width:24,sill:30,height:30}]};
  const shell=roomShell(c);expect(shell.planning?.walls?.back?.depth).toBe(30);expect(shell.planning?.windows).toEqual(c.planning.windows);
  for(const key of ['shoeLengths','hangerSpacing','bagDimensions','clearanceTarget'])expect(shell.planning).not.toHaveProperty(key);
  expect(shell.planning?.walls?.back?.priority).toBeUndefined();
  const legacy={...shell,planning:c.planning};
  expect(readShells(serializeShells([{id:'legacy',name:'Legacy',shell:legacy}]))[0].shell).toEqual(shell);
});

it('replaces physical overrides but preserves current fit values when applying and undoing',()=>{
  const c=structuredClone(DEFAULT_CONFIG);c.planning={shoeLengths:{boots:16},hangerSpacing:{shirts:3},walls:{back:{depth:30,priority:'shoes'}},door:{wall:'front',offset:12,width:24,hinge:'left',swing:'in',check:'sector'},obstacles:[{id:'old',label:'Old column',x:0,y:0,width:12,depth:12}]};
  c.surveyConfirmation=confirmSurvey(c);const before=roomShell(c);
  const shell=roomShell({...DEFAULT_CONFIG,dimensions:{width:144,height:120,depth:24},planning:{walls:{back:{ceilingHeight:108}},shoeLengths:{boots:10},door:{wall:'back',offset:20,width:30,hinge:'right',swing:'out'}}});
  const next={...c,...applyRoomShell(c,shell)};
  expect(next.dimensions.width).toBe(144);expect(next.planning?.shoeLengths?.boots).toBe(16);expect(next.planning?.hangerSpacing?.shirts).toBe(3);
  expect(next.planning?.walls?.back).toMatchObject({ceilingHeight:108,priority:'shoes'});expect(next.planning?.walls?.back?.depth).toBeUndefined();expect(next.planning?.obstacles).toBeUndefined();expect(next.planning?.door).toMatchObject({wall:'back',check:'sector'});
  expect(surveyState(next)).toBe('stale');expect(c.dimensions.width).toBe(96);
  next.planning!.shoeLengths={boots:18};
  const undone={...next,...applyRoomShell(next,before)};expect(undone.dimensions.width).toBe(96);expect(undone.planning?.shoeLengths?.boots).toBe(18);expect(undone.planning?.obstacles?.[0].id).toBe('old');
});

it('regenerates the new room using the active inventory and measured hanger demand',()=>{
  const config=structuredClone(DEFAULT_CONFIG);config.wardrobe={...EMPTY_WARDROBE,shirts:10};config.planning={hangerSpacing:{shirts:3},shoePairWidths:{sneakers:9},bagDimensions:{width:24,height:28},upperStorage:false};
  const shell=roomShell({...DEFAULT_CONFIG,closetType:'walkin-u',roomDimensions:{roomWidth:180,roomDepth:140}});
  const patch=applyRoomShell(config,shell),preview=new ClosetLayoutEngine({...config,...patch}).calculateLayout();
  expect(preview.walls).toHaveLength(3);
  expect(preview.capacity?.find(r=>r.label.startsWith('Short hanging'))?.required).toBe(30);
  expect(roomShell({...config,...patch})).toEqual(shell);
  expect(preview.planning?.bagDimensions).toEqual({width:24,height:28});
});
