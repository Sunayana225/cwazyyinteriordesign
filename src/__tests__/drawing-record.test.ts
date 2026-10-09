import {it,expect} from 'vitest';
import {DEFAULT_CONFIG} from '@/lib/design';
import {canonicalConfig,validConfig,invalidConfigurationField} from '@/lib/storage';
import {drawingRecordLabel,drawingRecordIssue} from '@/lib/drawingRecord';
import {ClosetLayoutEngine} from '@/engine/ClosetLayoutEngine';
import {ClosetSVGRenderer} from '@/renderer/ClosetSVGRenderer';
import {buildPrintDocument} from '@/engine/PDFExporter';
import {layoutInputKey} from '@/lib/preview';
import {confirmSurvey,surveyState} from '@/lib/surveyReview';
import {configurationChanges} from '@/lib/printSettings';

it('preserves project drawing metadata without changing cabinet geometry or survey state',()=>{
  const c=structuredClone(DEFAULT_CONFIG),before=new ClosetLayoutEngine(c).calculateLayout();c.surveyConfirmation=confirmSurvey(c);
  c.drawingRecord={revision:'P02',status:'coordination',wallReferences:{back:'A-601',left:'A-602'}};
  expect(validConfig(c)).toBe(true);expect(canonicalConfig(c).drawingRecord).toEqual(c.drawingRecord);expect(surveyState(c)).toBe('current');
  const after=new ClosetLayoutEngine(c).calculateLayout();expect(after.walls[0].elevationRef).toBe('A-601');expect(after.zones).toEqual(before.zones);expect(after.capacity).toEqual(before.capacity);
  c.closetType='walkin-l';c.roomDimensions={roomWidth:144,roomDepth:120};expect(new ClosetLayoutEngine(c).calculateLayout().walls.find(w=>w.wallId==='left')?.elevationRef).toBe('A-602');
  c.drawingRecord.wallReferences!.back='  ';expect(new ClosetLayoutEngine(c).calculateLayout().walls[0].elevationRef).toBe('EL-A');
});

it.each([{revision:42},{revision:'x'.repeat(41)},{status:'approved'},{wallReferences:[]},{wallReferences:{ceiling:'X'}},{wallReferences:{back:'x'.repeat(25)}}])('rejects malformed drawing records precisely: %j',record=>{
  const c={...DEFAULT_CONFIG,drawingRecord:record};expect(drawingRecordIssue(record)).toMatch(/^drawingRecord/);expect(validConfig(c)).toBe(false);expect(invalidConfigurationField(c)).toMatch(/^drawingRecord/);
});

it('updates live reference generation keys but does not regenerate for revision text alone',()=>{
  const c=structuredClone(DEFAULT_CONFIG),key=layoutInputKey(c,{});c.drawingRecord={revision:'P02',status:'coordination'};expect(layoutInputKey(c,{})).toBe(key);
  c.drawingRecord.wallReferences={back:'A-601'};expect(layoutInputKey(c,{})).not.toBe(key);expect(configurationChanges(DEFAULT_CONFIG,c).some(row=>row[0]==='drawingRecord')).toBe(true);
  expect(new ClosetLayoutEngine(JSON.parse(layoutInputKey(c,{}))).calculateLayout().walls[0].elevationRef).toBe('A-601');
});

it('escapes custom references and revisions in SVG and each printed elevation',()=>{
  const c=structuredClone(DEFAULT_CONFIG);c.drawingRecord={revision:'<b>P02</b>',status:'client-review',wallReferences:{back:'<script>bad</script>'}};
  const layout=new ClosetLayoutEngine(c).calculateLayout();
  const svg=new ClosetSVGRenderer(layout,{showDimensions:true,showLabels:true,style:'modern',woodFinish:'medium'}).renderElevation();expect(svg).toContain('&lt;script&gt;bad&lt;/script&gt;');expect(svg).not.toContain('<script>');
  const print=buildPrintDocument([{layout,config:c}]);expect(print).toContain('Client review · Revision &lt;b&gt;P02&lt;/b&gt;');expect(print).not.toContain('<b>P02</b>');expect(print).toContain('Not construction approval');
  expect(drawingRecordLabel()).toBe('Concept · Revision not assigned');
});
