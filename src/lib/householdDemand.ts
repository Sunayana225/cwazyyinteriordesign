import type {ClosetConfiguration} from '@/types/closet';
import {capacityReport} from './design';
import {combinedInventory,EMPTY_INVENTORY,INVENTORY_KEYS,inventoryLabel,inventoryValue,reserveInventory,type Inventory} from './inventoryPlanning';

/** Profiles describe demand only. Shared cabinet capacity cannot be attributed to
 * a person or a season without explicit ownership of the generated components. */
export function householdDemand(config:Partial<ClosetConfiguration>){
  const profiles=config.inventoryPlanning?.members??[];
  const demand=(inventory:Inventory)=>capacityReport({...inventory,planning:config.planning},[]).map(({label,required,unit})=>({label,required,unit}));
  const current:Inventory={wardrobe:config.wardrobe??EMPTY_INVENTORY.wardrobe,shoes:config.shoes??EMPTY_INVENTORY.shoes};
  const combined=combinedInventory(profiles),entered=demand(current),reserved=demand(reserveInventory(current,config.inventoryPlanning?.reserve));
  const members=profiles.map(p=>({id:p.id,name:p.name||'Unnamed profile',season:p.season,rows:demand(p.inventory)}));
  const everyday=demand(combinedInventory(profiles.filter(p=>p.season==='everyday'))),seasonal=demand(combinedInventory(profiles.filter(p=>p.season==='seasonal')));
  const differences=INVENTORY_KEYS.filter(key=>inventoryValue(current,key)!==inventoryValue(combined,key)).map(key=>({key,label:inventoryLabel(key),current:inventoryValue(current,key),profiles:inventoryValue(combined,key)}));
  const rows=entered.map((row,i)=>({...row,current:row.required,everyday:everyday[i].required,seasonal:seasonal[i].required,reserve:reserved[i].required-row.required,total:reserved[i].required}));
  return {members,rows,differences,matches:profiles.length>0&&differences.length===0};
}

export const HOUSEHOLD_DEMAND_NOTE='These are storage requirements, not assigned capacity. Everyday and seasonal demand remain separate; shared shelves and rods are not credited to each person twice. Reserve is calculated once from the active inventory, with item counts rounded up. Jewelry is not measured; ties require the optional measured tie model.';
