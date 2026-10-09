import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '@/lib/design';
import { confirmSurvey, surveyState, validSurveyConfirmation } from '@/lib/surveyReview';
import { validConfig, invalidConfigurationField, readBackup, serializeDesigns } from '@/lib/storage';
import { layoutInputKey } from '@/lib/preview';
import { workspaceReview } from '@/lib/workspaceReview';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { buildPrintDocument } from '@/engine/PDFExporter';
import { DEFAULT_PRINT } from '@/lib/printSettings';

describe('survey confirmations',()=>{
  it('records an explicit confirmation even when no room objects are needed',()=>{
    const c=structuredClone(DEFAULT_CONFIG),key=layoutInputKey(c,{});
    expect(surveyState(c)).toBe('unconfirmed');
    c.surveyConfirmation=confirmSurvey(c,new Date('2026-10-09T00:00:00.000Z'));
    expect(surveyState(c)).toBe('current');expect(layoutInputKey(c,{})).toBe(key);
    expect(c.planning).toBeUndefined();
    const restored=readBackup(serializeDesigns([{id:'a',name:'A',savedAt:'2026-10-09',config:c}]))[0].config;
    expect(restored.surveyConfirmation).toEqual(c.surveyConfirmation);expect(surveyState(restored)).toBe('current');
  });
  it('invalidates confirmation for measurement changes but not role or finish changes',()=>{
    const c=structuredClone(DEFAULT_CONFIG);c.surveyConfirmation=confirmSurvey(c);
    c.userInfo.userType='architect';c.userInfo.woodFinish='dark';c.wardrobe.shirts++;
    expect(surveyState(c)).toBe('current');
    c.dimensions.width+=.125;expect(surveyState(c)).toBe('stale');
    c.dimensions.width-=.125;expect(surveyState(c)).toBe('current');
    c.planning={walls:{back:{floorOffset:1}}};expect(surveyState(c)).toBe('stale');
  });
  it('is independent of object order and labels while detecting object movement',()=>{
    const c=structuredClone(DEFAULT_CONFIG);c.planning={obstacles:[{id:'a',label:'Column',x:0,y:0,width:12,depth:12},{id:'b',label:'Beam',x:40,y:40,width:10,depth:10}]};
    c.surveyConfirmation=confirmSurvey(c);c.planning.obstacles!.reverse();c.planning.obstacles![0].label='Updated label';
    expect(surveyState(c)).toBe('current');c.planning.obstacles![0].x++;
    expect(surveyState(c)).toBe('stale');
  });
  it('rejects oversized or malformed review metadata with a precise import error',()=>{
    for(const value of [null,[],{version:2,geometry:'x',confirmedAt:'2026-10-09T00:00:00.000Z'},{version:1,geometry:'x'.repeat(32769),confirmedAt:'2026-10-09T00:00:00.000Z'},{version:1,geometry:'x',confirmedAt:'2026-02-30T00:00:00.000Z'}]){
      expect(validSurveyConfirmation(value)).toBe(false);
      const c={...DEFAULT_CONFIG,surveyConfirmation:value};expect(validConfig(c)).toBe(false);expect(invalidConfigurationField(c)).toBe('surveyConfirmation');
    }
  });
  it('does not clear geometry conflicts and reports stale confirmation in exports',()=>{
    const c=structuredClone(DEFAULT_CONFIG);c.planning={windows:[{id:'bad',wall:'back',offset:90,width:24,sill:36,height:36}]};c.surveyConfirmation=confirmSurvey(c);
    const layout=new ClosetLayoutEngine(c).calculateLayout();
    expect(workspaceReview('architect',layout,surveyState(c)).next.action).toBe('room');
    c.dimensions.width=100;
    const print=buildPrintDocument([{layout:new ClosetLayoutEngine(c).calculateLayout(),config:c,settings:{...DEFAULT_PRINT,notes:true,roomSchedule:true}}]);
    expect(print.includes('room geometry changed since confirmation')).toBe(true);
    expect(print.includes('Wall height coordination')).toBe(true);
  });
});
