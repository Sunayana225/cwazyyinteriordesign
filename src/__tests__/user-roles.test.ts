import { describe, it, expect } from 'vitest';
import { USER_ROLES, rolePrintPreset } from '@/lib/userRoles';
import { DEFAULT_CONFIG } from '@/lib/design';
import { DEFAULT_PRINT, printSections } from '@/lib/printSettings';
import { validConfig, invalidConfigurationField, readBackup, serializeDesigns } from '@/lib/storage';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';

describe('role workflows',()=>{
  it.each(USER_ROLES)('round-trips %s without changing the physical design',role=>{
    const c=structuredClone(DEFAULT_CONFIG);c.userInfo.userType=role;
    c.dimensions.width=111.5;c.planning={walls:{back:{baseboard:2}}};
    expect(validConfig(c)).toBe(true);
    const [restored]=readBackup(serializeDesigns([{id:'project',name:'Wardrobe',savedAt:'2026-10-09T00:00:00Z',config:c}]));
    expect(restored.config).toEqual(c);
    const baseline=new ClosetLayoutEngine({...c,userInfo:{...c.userInfo,userType:'homeowner'}}).calculateLayout();
    const layout=new ClosetLayoutEngine(c).calculateLayout();
    expect(layout.walls).toEqual(baseline.walls);
    expect(layout.capacity).toEqual(baseline.capacity);
  });
  it('continues rejecting unsupported roles with a precise import error',()=>{
    const c={...structuredClone(DEFAULT_CONFIG),userInfo:{...DEFAULT_CONFIG.userInfo,userType:'admin'}};
    expect(validConfig(c)).toBe(false);expect(invalidConfigurationField(c)).toBe('userInfo.userType');
  });
  it('prepares different document contents while keeping project data and user file choices',()=>{
    const current={...DEFAULT_PRINT,project:'Client suite',contact:'Design studio',paper:'Letter' as const,editableJSON:true,comparison:structuredClone(DEFAULT_CONFIG),comparisonName:'Approved concept'};
    const outputs=USER_ROLES.map(role=>rolePrintPreset(role,current,['back','left']));
    for(const p of outputs){
      expect(p.project).toBe('Client suite');expect(p.contact).toBe('Design studio');expect(p.paper).toBe('Letter');
      expect(p.editableJSON).toBe(true);expect(p.comparison).toEqual(current.comparison);expect(p.comparisonName).toBe('Approved concept');
      expect(p.walls).toEqual(['back','left']);
    }
    expect(current).toEqual({...DEFAULT_PRINT,project:'Client suite',contact:'Design studio',paper:'Letter',editableJSON:true,comparison:DEFAULT_CONFIG,comparisonName:'Approved concept'});
    expect(new Set(outputs.map(p=>JSON.stringify(p))).size).toBe(5);
    const layout=new ClosetLayoutEngine(DEFAULT_CONFIG).calculateLayout();
    expect(printSections(layout,DEFAULT_CONFIG,outputs[3])).toContain('Room openings and obstacle schedule');
    expect(printSections(layout,DEFAULT_CONFIG,outputs[0])).toContain('Household and season totals');
    expect(printSections(layout,DEFAULT_CONFIG,outputs[2])).toContain('Estimated organizer materials');
    expect(outputs[4].organizers).toBe(false);
  });
  it('does not recommend unanchored furniture as a renter guarantee',()=>{
    const c=structuredClone(DEFAULT_CONFIG);c.userInfo.userType='renter';
    const layout=new ClosetLayoutEngine(c).calculateLayout();
    expect(layout.recommendations.join(' ')).not.toContain("don't require wall anchoring");
    expect(layout.recommendations.join(' ')).toContain('may still require anchoring');
  });
});
