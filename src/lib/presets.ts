import { DEFAULT_CONFIG } from './design';
import type { ClosetConfiguration } from '@/types/closet';
const presets = [
  { style: 'minimal', finish: 'light', type: 'walkin-single', width: 96, depth: 72 },
  { style: 'glam', finish: 'white', type: 'walkin-u', width: 144, depth: 120 },
  { style: 'modern', finish: 'white', type: 'reach-in', width: 60, depth: 24 },
  { style: 'luxury', finish: 'dark', type: 'island', width: 192, depth: 144 },
  { style: 'modern', finish: 'light', type: 'walkin-l', width: 120, depth: 96 },
  { style: 'rustic', finish: 'medium', type: 'walkin-l', width: 108, depth: 84 },
] as const;
export function getPreset(id: string | null): ClosetConfiguration | null {
  if (!id || !/^[1-6]$/.test(id)) return null;
  const p = presets[Number(id) - 1];
  const c = structuredClone(DEFAULT_CONFIG);
  return { ...c, closetType: p.type, dimensions: { width: p.width, height: 96, depth: 24 }, roomDimensions: { roomWidth: p.width, roomDepth: p.depth }, userInfo: { ...c.userInfo, stylePreference: p.style, woodFinish: p.finish } };
}
