/** Current generator support, separate from recommended furniture dimensions.
 * These bounds are implementation capabilities, not physical building limits.
 * Increase/remove them only alongside bounded layout generation and rendering.
 */
export const GENERATOR_CAPABILITIES = {
  roomSpan: 1200,
  ceilingHeight: 600,
  cabinetDepth: 120,
} as const;

/** Shared input floors for the room form, wall overrides, and saved-project validation. */
export const MEASUREMENT_MINIMUMS = { width:12, height:30, depth:9, roomDepth:24 } as const;

export type MeasurementField = 'width' | 'height' | 'depth' | 'roomDepth';
export function measurementFeedback(field: string, inches: number): string | undefined {
  if (!Number.isFinite(inches) || inches <= 0) return undefined;
  if (field === 'depth' && inches > 48)
    return 'This will create a deep cabinet, not a room. If this is your room measurement, choose a walk-in layout and enter it as Room Depth. Custom access and hardware need to be planned for a cabinet this deep.';
  if (field === 'height' && inches > 120)
    return 'This is a tall space. Set cabinet height separately below to leave space above cabinetry. Review access to any upper storage.';
  return undefined;
}
