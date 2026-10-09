import {it,expect} from 'vitest';
import {DEFAULT_CONFIG} from '@/lib/design';
import {confirmSurvey,surveyState,surveyRecordIssue} from '@/lib/surveyReview';
import {surveyChanges} from '@/lib/surveyChanges';
import {layoutInputKey} from '@/lib/preview';
import {invalidConfigurationField,validConfig,readBackup,serializeDesigns} from '@/lib/storage';
import {ClosetLayoutEngine} from '@/engine/ClosetLayoutEngine';
import {buildPrintDocument} from '@/engine/PDFExporter';

it('keeps the actual survey date separate from confirmation and requires review after attribution changes',()=>{
  const c=structuredClone(DEFAULT_CONFIG),key=layoutInputKey(c,{});
  c.surveyRecord={author:'Site survey team',date:'2026-09-30'};
  c.surveyConfirmation=confirmSurvey(c,new Date('2026-10-09T00:00:00.000Z'));
  expect(surveyState(c)).toBe('current');expect(c.surveyConfirmation.confirmedAt).toContain('2026-10-09');
  expect(layoutInputKey(c,{})).toBe(key);
  c.surveyRecord.author='Second surveyor';expect(c.surveyConfirmation.record?.author).toBe('Site survey team');
  expect(surveyState(c)).toBe('stale');expect(surveyChanges(c)).toEqual([{field:'Survey author',before:'Site survey team',after:'Second surveyor'}]);
  c.surveyConfirmation=confirmSurvey(c);c.surveyRecord.date='2026-10-01';expect(surveyChanges(c)?.[0].field).toBe('Survey date');
});

it('preserves the record and its confirmed snapshot through backup import without changing legacy confirmations',()=>{
  const c=structuredClone(DEFAULT_CONFIG);c.surveyConfirmation=confirmSurvey(c);expect(surveyState(c)).toBe('current');
  c.surveyRecord={author:'Surveyor',date:'2024-02-29'};c.surveyConfirmation=confirmSurvey(c);
  const restored=readBackup(serializeDesigns([{id:'survey',name:'Survey',savedAt:'2026-10-09',config:c}]))[0].config;
  expect(restored.surveyRecord).toEqual(c.surveyRecord);expect(restored.surveyConfirmation).toEqual(c.surveyConfirmation);expect(surveyState(restored)).toBe('current');
});

it('rejects impossible dates and malformed author fields at the import boundary',()=>{
  for(const date of ['2026-02-29','2026-04-31','2026-10-09T00:00:00Z','2026-1-1','0000-01-01',4,'']){
    const c={...DEFAULT_CONFIG,surveyRecord:{date}};expect(validConfig(c)).toBe(false);expect(invalidConfigurationField(c)).toBe('surveyRecord.date');
  }
  for(const author of [[],true,'a'.repeat(121)])expect(invalidConfigurationField({...DEFAULT_CONFIG,surveyRecord:{author}})).toBe('surveyRecord.author');
  expect(surveyRecordIssue({author:'',date:undefined})).toBeNull();
  expect(validConfig({...DEFAULT_CONFIG,surveyConfirmation:{...confirmSurvey(DEFAULT_CONFIG),record:{date:'2026-02-30'}}})).toBe(false);
});

it('prints the survey attribution as escaped text and keeps stale review status visible',()=>{
  const c=structuredClone(DEFAULT_CONFIG);c.surveyRecord={author:'<img onerror=evil>',date:'2026-09-30'};c.surveyConfirmation=confirmSurvey(c);c.surveyRecord.date='2026-10-01';
  const print=buildPrintDocument([{config:c,layout:new ClosetLayoutEngine(c).calculateLayout()}]);
  expect(print).toContain('Site survey author: &lt;img onerror=evil&gt;');expect(print).toContain('survey date: 2026-10-01');expect(print).toContain('survey record changed since confirmation');expect(print).not.toContain('<img onerror=evil>');
});
