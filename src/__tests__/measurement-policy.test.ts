import {describe,it,expect} from 'vitest';
import {measurementFeedback,GENERATOR_CAPABILITIES} from '@/lib/measurementPolicy';
import {dimensionRange} from '@/lib/design';
describe('measurement policy',()=>{
 it('distinguishes deep cabinetry from room measurements',()=>{
  expect(measurementFeedback('depth',82)).toContain('Room Depth');
  expect(measurementFeedback('roomDepth',82)).toBeUndefined();
  expect(measurementFeedback('depth',24)).toBeUndefined();
 });
 it('explains tall-space generation without blocking valid input',()=>{
  expect(measurementFeedback('height',306)).toContain('Set cabinet height separately');
  expect(measurementFeedback('height',NaN)).toBeUndefined();
  expect(dimensionRange('height').max).toBe(GENERATOR_CAPABILITIES.ceilingHeight);
  expect(dimensionRange('depth').max).toBe(GENERATOR_CAPABILITIES.cabinetDepth);
 });
});
