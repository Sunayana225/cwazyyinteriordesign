import {it,expect} from 'vitest';
import {recoveryReport} from '@/lib/recovery';
import {DEFAULT_CONFIG} from '@/lib/design';
const storage=(values:Record<string,string>)=>({length:Object.keys(values).length,key:(i:number)=>Object.keys(values)[i],getItem:(k:string)=>values[k]??null});
it('diagnostics never quote malformed stored project text',()=>{
  const marker='PRIVATE_CONTACT@example.com',values=Object.fromEntries(['alveo-draft','alveo-saved-designs','alveo-room-shells','alveo-organizer-templates'].map(k=>[k,marker]));
  const report=recoveryReport(storage(values));expect(report.draft).toMatchObject({present:true,parseable:false,restorable:false});expect(report.named.readable).toBe(false);expect(report.templates.readable).toBe(false);expect(report.shells.readable).toBe(false);expect(JSON.stringify(report)).not.toContain('PRIVATE');expect(JSON.stringify(report)).not.toContain('example.com');
});
it('diagnostics suppress user-defined validator paths and project metadata',()=>{
  const c=structuredClone(DEFAULT_CONFIG);c.planning={walls:{'PRIVATE_CONTACT@example.com':{depth:24}} as any};
  const values={'alveo-draft':JSON.stringify({version:1,config:c}),'alveo-saved-designs':JSON.stringify({version:1,designs:[{id:'id',name:'PRIVATE_NAME',savedAt:'2026-10-09',config:DEFAULT_CONFIG}]})};
  const report=recoveryReport(storage(values));expect(report.draft).toMatchObject({parseable:true,restorable:false});expect(report.named).toMatchObject({readable:true,records:1});expect(JSON.stringify(report)).not.toContain('PRIVATE');expect(JSON.stringify(report)).not.toContain('depth');
});
it('diagnostics omit absent errors and do not mutate the saved content',()=>{
  const values={'alveo-draft':JSON.stringify({version:1,config:DEFAULT_CONFIG})},before=JSON.stringify(values),report=recoveryReport(storage(values));expect(report.draft).toEqual({present:true,parseable:true,restorable:true});expect(JSON.stringify(values)).toBe(before);expect(recoveryReport(storage({})).draft).toEqual({present:false,parseable:false,restorable:false});
});
