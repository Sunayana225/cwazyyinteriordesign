import {it,expect} from 'vitest';
import {organizerBenchmarkFixture} from '../../scripts/organizer-benchmark-fixture';
import {validInteriors,moveDivider} from '@/lib/drawers';
import {readBackup,BACKUP_MAX_BYTES} from '@/lib/storage';
it('benchmark describes valid maximum-complexity input and produces repeatable backups',()=>{
  const f=organizerBenchmarkFixture();expect(f.description).toMatchObject({retainedPlans:200,cellsPerPlan:36,totalCells:7200,namedDividers:10});expect(f.description.backupBytes).toBeLessThan(BACKUP_MAX_BYTES);expect(validInteriors(f.plans)).toBe(true);expect(readBackup(f.raw)).toHaveLength(1);expect(f.raw).toBe(organizerBenchmarkFixture().raw);expect(validInteriors({...f.plans,'back:201:0':f.plan})).toBe(false);
});
it('benchmark edit actually moves an unlocked divider without altering source plans',()=>{
  const f=organizerBenchmarkFixture(),before=JSON.stringify(f.plan),moved=moveDivider(f.plan,'cell-0','cell-1',.6,0,f.drawer);expect(moved.cells[0].w).not.toBe(f.plan.cells[0].w);expect(validInteriors({'back:0:0':moved})).toBe(true);expect(JSON.stringify(f.plan)).toBe(before);expect(f.plans['back:0:0']).not.toBe(f.plans['back:1:0']);
});
