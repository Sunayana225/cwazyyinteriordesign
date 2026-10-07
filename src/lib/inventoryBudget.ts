import type { ClosetZone, ShoeCollection, WardrobeItems } from '@/types/closet';
import { capacityReport, EMPTY_WARDROBE, FOLDED_PER_DRAWER, hangingDemand } from './design';

export interface InventoryBudget { wardrobe: WardrobeItems; shoes: ShoeCollection }

/** Spend only whole items. Shared rod/drawer capacity is divided proportionally
 * before stable remainder allocation; suits reserve room for both pieces.
 * This uses the same capacity assumptions as the report, not measured packing. */
function spendGroup(wardrobe: WardrobeItems, costs: Partial<Record<keyof WardrobeItems, number>>, capacity: number) {
  const keys = Object.keys(costs) as (keyof WardrobeItems)[];
  const demand = keys.reduce((sum, key) => sum + Number(wardrobe[key]) * costs[key]!, 0);
  const fraction = demand > 0 ? Math.min(1, Math.max(0, capacity) / demand) : 0;
  for (const key of keys) {
    const used = Math.floor(Number(wardrobe[key]) * fraction + 1e-9);
    (wardrobe[key] as number) -= used;
    capacity -= used * costs[key]!;
  }
  // The proportional pass leaves fewer than one item's share per category.
  for (const key of keys) {
    const used = Math.min(Number(wardrobe[key]), Math.max(0, Math.floor((capacity + 1e-9) / costs[key]!)));
    (wardrobe[key] as number) -= used;
    capacity -= used * costs[key]!;
  }
}

export function remainingInventory(inventory: InventoryBudget, zones: ClosetZone[]): InventoryBudget {
  const wardrobe = { ...inventory.wardrobe }, shoes = { ...inventory.shoes };
  const rows = capacityReport(inventory, [{ zones }]);
  const capacity = (label: string) => rows.find(row => row.label === label)?.available ?? 0;
  const rodCosts = Object.fromEntries(['longDresses', 'shirts', 'shortJackets', 'pants', 'suits'].map(key => {
    const demand = hangingDemand({ ...EMPTY_WARDROBE, [key]: 1 });
    return [key, demand.long + demand.short];
  }));
  spendGroup(wardrobe, { longDresses: rodCosts.longDresses }, capacity('Long hanging'));
  spendGroup(wardrobe, { shirts: rodCosts.shirts, shortJackets: rodCosts.shortJackets, pants: rodCosts.pants, suits: rodCosts.suits }, capacity('Short hanging (suits count twice)'));
  spendGroup(wardrobe, Object.fromEntries(Object.entries(FOLDED_PER_DRAWER).map(([key, count]) => [key, 1 / count])), capacity('Folded storage'));
  for (const key of Object.keys(shoes) as (keyof ShoeCollection)[]) shoes[key] = Math.max(0, shoes[key] - capacity(key));
  wardrobe.bags = Math.max(0, wardrobe.bags - capacity('Bags'));
  wardrobe.belts = Math.max(0, wardrobe.belts - capacity('Belts'));
  if (zones.some(zone => zone.drawers?.some(drawer => drawer.purpose === 'jewelry'))) wardrobe.jewelry = false;
  // Ties have no measured capacity model yet: keep them outstanding rather
  // than silently treating an unrelated drawer or rod as their allocation.
  return { wardrobe, shoes };
}
