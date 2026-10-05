import type { SavedDesign } from '@/types/closet';
import { formatInches } from './design';

export type DesignSort = 'newest' | 'oldest' | 'name';

export function designDetails(design: SavedDesign): string {
  const { closetType, dimensions, userInfo, drawerInteriors } = design.config;
  return [
    closetType?.replace(/-/g, ' ') || 'Closet',
    dimensions && `${formatInches(dimensions.width)} W × ${formatInches(dimensions.height)} H × ${formatInches(dimensions.depth)} D`,
    userInfo && `${userInfo.stylePreference} · ${userInfo.woodFinish} finish`,
    `${Object.keys(drawerInteriors ?? {}).length} drawer organizers`,
  ].filter(Boolean).join(' · ');
}

export function findDesigns(designs: SavedDesign[], query: string, sort: DesignSort): SavedDesign[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return designs.filter(d => {
    const text = `${d.name} ${d.folder??''} ${(d.tags??[]).join(' ')} ${designDetails(d)}`.toLocaleLowerCase();
    return terms.every(term => text.includes(term));
  }).sort((a, b) => sort === 'name'
    ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    : (Date.parse(a.savedAt) - Date.parse(b.savedAt)) * (sort === 'newest' ? -1 : 1));
}

export function copyDesign(source: SavedDesign, current: SavedDesign[], id: string, savedAt: string): SavedDesign {
  let number = 1;
  let name: string;
  do {
    const suffix = number === 1 ? ' (copy)' : ` (copy ${number})`;
    name = source.name.slice(0, 120 - suffix.length) + suffix;
    number++;
  } while (current.some(d => d.name.toLocaleLowerCase() === name.toLocaleLowerCase()));
  return { id, name, savedAt, modifiedAt:savedAt, tags:[...(source.tags??[])], folder:source.folder, config: structuredClone(source.config) };
}

