import type { ClosetLayout, ClosetWall } from '@/types/closet';

/** Keep surveyed ceiling and requested cabinet top distinct in every elevation.
 * A selected wall must not inherit another wall's custom cabinet height. */
export function wallElevation(layout:ClosetLayout,wall:ClosetWall):ClosetLayout {
  const ceiling=layout.planning?.walls?.[wall.wallId]?.ceilingHeight??layout.dimensions.height;
  const explicitTop=layout.dimensions.cabinetHeight!==undefined||ceiling!==layout.dimensions.height||wall.height<layout.dimensions.height||wall.wallId==='island-unit';
  return {...layout,dimensions:{width:wall.width,height:ceiling,depth:wall.unitDepth,...(explicitTop?{cabinetHeight:Math.min(wall.height,ceiling)}:{})},zones:wall.zones,walls:[wall]};
}
