import { shoeShelves, shoeColumnWidth } from '@/lib/shoePlanning';
import { remainingInventory, type InventoryBudget } from '@/lib/inventoryBudget';
import { hangingWidths } from '@/lib/hangingAllocation';
import { withUpperStorage } from '@/lib/upperStorage';
import { selectColumns } from '@/lib/columnSelection';
import { accessoryShelves } from '@/lib/accessoryShelves';
import { reserveInventory, validInventoryPlanning } from '@/lib/inventoryPlanning';
import { validColumns, resolveColumns, COLUMN_MIN_WIDTH } from '@/lib/layoutColumns';
import type { ZoneOverrides, LayoutColumn } from '@/types/closet';
import { EMPTY_WARDROBE, LIMITS, SHOE_SPACING, foldedDemand, hangingDemand, capacityReport, ELEMENT_FIT, elementFits, TOE_KICK } from '@/lib/design';
import { shoeLengths, bagDimensions } from '@/lib/fitMeasurements';
import { MAX_DIMENSION, MAX_HEIGHT, MAX_INVENTORY, validPlanning, freeSpans, wallFootprint, overlaps } from '@/lib/planning';
import type { PlanningOptions } from '@/types/closet';
﻿import {
  ClosetType, DrawerPosition, LayoutWarning, VillaAmenities,
  WardrobeItems, ShoeCollection, UserPreferences,
  ClosetLayout, ClosetWall, ClosetZone, ShelfConfig, RodConfig, DrawerConfig,
  ClosetCalculationInput,
} from '@/types/closet';

// â”€â”€ Wall content role â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type WallRole =
  | 'all'                // single-wall types  -  everything on one wall
  | 'hanging-only'       // back wall of L/U/corridor  -  long + double hang
  | 'drawers-only'       // left wall of U-shape  -  drawers + short hang above
  | 'shoes-only'         // right wall of U-shape  -  dedicated shoe wall
  | 'drawers-and-shoes'; // L-shape side wall / corridor Wall B

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Architectural constants  (sourced from drawing encyclopedia v1.0)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const UNIT_DEPTH  = 24;  // standard storage unit depth
const SHELF_THICK = 1;   // shelf panel thickness
const ROD_INSET   = 1.5; // inches from shelf underside to rod centre


// Rod heights A.F.F. from drawing encyclopedia Ch.14
const ROD_LONG    = 66;  // single long-hang rod  (66" A.F.F. = floor to rod)
const ROD_DBL_HI  = 78;  // double hang upper rod (6'-6")
const ROD_DBL_LO  = 40;  // double hang lower rod (3'-4")

// Shoe shelf clear-space between shelves (Ch.15 reference)
const DRAWER_STD  = 9;   // standard drawer height (inches)
const DRAWER_JEW  = 3;   // shallow jewelry drawer
const DRAWER_GAP  = 1;   // gap between drawer faces
const DRAWER_MARG = 2;   // top + bottom clearance inside drawer zone

// Column minimum widths
const COL_HANG_MIN = COLUMN_MIN_WIDTH['long-hang'];
const COL_SHOE_W   = 24;  // preferred minimum for a dedicated shoe column



// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Engine
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class ClosetLayoutEngine {
  private remaining: InventoryBudget | undefined;
  private ceilingHeight: number;
  private customCabinetHeight: boolean;
  private H: number;       // ceiling height
  private W: number;       // primary width (single-wall) or room width (walk-in)
  private D: number;       // unit depth
  private roomW: number;   // room width
  private roomD: number;   // room depth (door-to-back)
  private closetType: ClosetType;
  private drawerPosition: DrawerPosition;
  private wardrobe: WardrobeItems;
  private shoes: ShoeCollection;
  private prefs: UserPreferences;
  private amenities: VillaAmenities;
  private inputWarnings: string[] = [];
  private normalizedWarnings: string[] = [];
  private planning:PlanningOptions;
  /** Canvas-edited column recipes per wall. Validated on the way in, so a corrupt
   * override degrades to the engine's own layout instead of breaking the design. */
  private columns:NonNullable<ZoneOverrides['columns']>;
  private inputCorrections: NonNullable<ClosetLayout['inputCorrections']> = [];

  // ── Layer 1: Input normaliser ─────────────────────────────────────────────
  // Enforces supported planning bounds.
  // The drawing engine scales dynamically to any size.
  private static normDim(val: number, min: number, max: number, def: number): number {
    const n = Number(val);
    if (!isFinite(n) || n <= 0) return def;
    return Math.min(Math.max(n, min), max);
  }

  constructor(input: ClosetCalculationInput) {
    this.planning=validPlanning(input.planning)?input.planning??{}:{};
    this.columns=validColumns(input.zoneOverrides?.columns)?input.zoneOverrides?.columns??{}:{};
    const rawH     = input.dimensions.height;
    const rawW     = input.dimensions.width;
    const rawD     = input.dimensions.depth ?? UNIT_DEPTH;
    const rawRoomW = input.roomDimensions?.roomWidth ?? input.dimensions.width;
    const rawRoomD = input.roomDimensions?.roomDepth ?? Math.max(input.dimensions.width * 0.75, 60);

    // Use the same supported bounds as the dimension form.
    // The renderer scales dynamically to any width/height via calcScale() + drawH.
    // Custom cabinet depth is independent of room depth.
    this.H = ClosetLayoutEngine.normDim(rawH, LIMITS.height, MAX_HEIGHT, 108);
    this.ceilingHeight = this.H;
    this.customCabinetHeight = input.dimensions.cabinetHeight !== undefined;
    if(this.customCabinetHeight){
      const requested=input.dimensions.cabinetHeight!;
      this.H=Math.min(this.ceilingHeight,ClosetLayoutEngine.normDim(requested,LIMITS.height,MAX_HEIGHT,this.ceilingHeight));
      if(this.H!==requested){this.inputWarnings.push('Cabinet height adjusted to fit the ceiling and supported range.');this.inputCorrections.push({field:'Cabinet height',requested,effective:this.H});}
    }
    this.W = ClosetLayoutEngine.normDim(rawW, LIMITS.width, MAX_DIMENSION, 120);
    this.D = ClosetLayoutEngine.normDim(rawD, LIMITS.depthMin, LIMITS.depthMax,                      UNIT_DEPTH);
    this.closetType     = input.closetType ?? 'reach-in';
    this.drawerPosition = input.zoneOverrides?.drawerPosition ?? 'bottom';
    this.roomW = ClosetLayoutEngine.normDim(rawRoomW, LIMITS.width, MAX_DIMENSION, this.W);
    this.roomD = ClosetLayoutEngine.normDim(rawRoomD, LIMITS.roomDepth, MAX_DIMENSION, Math.max(this.W * 0.75, 60));
    const cleanCounts = <T extends object>(value: T): T => Object.fromEntries(Object.entries(value).map(([key, val]) => {
      if (key === 'jewelry') return [key, !!val];
      const clean = typeof val === 'number' && Number.isFinite(val) ? Math.min(MAX_INVENTORY,Math.max(0, Math.floor(val))) : 0;
      if (clean !== val) this.inputWarnings.push(key + ' adjusted to ' + clean + ': use a whole count from 0 to '+MAX_INVENTORY+'.');
      return [key, clean];
    })) as T;
    this.wardrobe = cleanCounts({ ...EMPTY_WARDROBE, ...input.wardrobe });
    this.shoes = cleanCounts({ boots: 0, heels: 0, sneakers: 0, flats: 0, ...(input.shoes as Partial<ShoeCollection>) });
    if(validInventoryPlanning(input.inventoryPlanning)){const reserved=reserveInventory({wardrobe:this.wardrobe,shoes:this.shoes},input.inventoryPlanning?.reserve);this.wardrobe=reserved.wardrobe;this.shoes=reserved.shoes;}
    this.prefs     = input.userInfo;
    this.amenities = input.amenities ?? {};

    for (const [field, raw, effective] of [
      ['Height', rawH, this.ceilingHeight], ['Width', rawW, this.W], ['Cabinet depth', rawD, this.D],
      ['Room width', rawRoomW, this.roomW], ['Room depth', rawRoomD, this.roomD],
    ] as const) {
      if (raw !== effective) { this.inputWarnings.push(field + ' adjusted from ' + raw + ' to ' + effective + ' inches.'); this.inputCorrections.push({ field, requested: raw, effective }); }
    }
    this.normalizedWarnings=[...this.inputWarnings];
  }

  // â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  public calculateLayout(): ClosetLayout {
    this.inputWarnings=[...this.normalizedWarnings];
    this.remaining = { wardrobe: { ...this.wardrobe }, shoes: { ...this.shoes } };
    let walls: ClosetWall[];
    try { walls = this.buildAllWalls(); }
    finally { this.remaining = undefined; }
    const aisleWarnings  = this.checkAisles();
    const layoutWarnings = this.checkZoneConstraints(walls);
    const capacity = capacityReport({ wardrobe: this.wardrobe, shoes: this.shoes, planning:this.planning }, walls);
    for (const row of capacity) if (row.required > row.available + 0.01) layoutWarnings.push({
      id: 'capacity-' + row.label, severity: 'caution', message: row.label + ' shortfall',
      designerNote: row.required.toFixed(1) + ' ' + row.unit + ' required; ' + row.available.toFixed(1) + ' provided. Allocate additional storage or reduce the inventory.',
    });
    const zones          = walls[0]?.zones ?? [];  // backward-compat

    return {
      planning:this.planning,
      closetType: this.closetType,
      dimensions: { width: this.W, height: this.ceilingHeight, depth: this.D, ...(this.customCabinetHeight?{cabinetHeight:this.H}:{}) },
      walls,
      roomDimensions: { roomWidth: this.roomW, roomDepth: this.roomD },
      capacity,
      zones,
      aisleWarnings,
      layoutWarnings,
      inputWarnings: [...new Set(this.inputWarnings)],
      inputCorrections: this.inputCorrections,
      totalStorage:     this.calcStorage(walls),
      utilizationScore: this.calcUtilization(walls),
      recommendations:  [...aisleWarnings, ...this.calcRecommendations(walls)],
    };
  }

  // â”€â”€ Wall factory  -  one entry per closet type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private buildAllWalls(): ClosetWall[] {
    type WallRequest = [ClosetWall['wallId'], string, string, number, number, WallRole];
    const sideW = Math.max(this.roomD - this.depthFor('back'), 0);
    let requests: WallRequest[];
    switch (this.closetType) {
      case 'walkin-l':
        requests = [
          ['back', 'BACK WALL', 'EL-A', this.roomW, this.D, 'hanging-only'],
          ['left', 'LEFT WALL', 'EL-B', sideW, this.D, 'drawers-and-shoes'],
        ]; break;
      case 'walkin-u':
      case 'island':
        requests = [
          ['back', 'BACK WALL', 'EL-A', this.roomW, this.D, 'hanging-only'],
          ['left', 'LEFT WALL', 'EL-B', sideW, this.D, 'drawers-only'],
          ['right', 'RIGHT WALL', 'EL-C', sideW, this.D, 'shoes-only'],
        ]; break;
      case 'corridor':
        requests = [
          ['corridor-a', 'WALL A', 'EL-A', this.roomD, this.D, 'hanging-only'],
          ['corridor-b', 'WALL B', 'EL-B', this.roomD, this.D, 'drawers-and-shoes'],
        ]; break;
      default:
        requests = [['back', 'BACK WALL', 'EL-A', this.closetType === 'walkin-single' ? this.roomW : this.W, this.D, 'all']];
    }
    // Allocate explicit wall choices first; keep the public/drawing wall order.
    // This prevents a spare span on an earlier wall consuming a later priority.
    const rank = (request: WallRequest) => this.columns[request[0]]?.length ? 2
      : this.planning.walls?.[request[0]]?.priority && this.planning.walls[request[0]]!.priority !== 'default' ? 1 : 0;
    const walls: ClosetWall[] = new Array(requests.length);
    requests.map((request, index) => ({ request, index }))
      .sort((a, b) => rank(b.request) - rank(a.request) || a.index - b.index)
      .forEach(({ request, index }) => { walls[index] = this.wall(...request); });
    if (this.closetType === 'island' && this.islandWidth() >= 36) walls.push(this.buildIslandWall(this.islandWidth(), 36));
    return walls;
  }

  private wall(
    wallId:ClosetWall['wallId'],label:string,elevationRef:string,width:number,unitDepth:number,role:WallRole,
  ):ClosetWall {
    const originalDepth=this.D,backDepth=this.depthFor('back'),originalPrefs=this.prefs,originalHeight=this.H;
    const wallOptions=this.planning.walls?.[wallId];
    const wallTop=Math.min(originalHeight,wallOptions?.ceilingHeight??this.ceilingHeight);
    unitDepth=this.depthFor(wallId);this.D=unitDepth-(wallOptions?.baseboard??0);
    for(const [kind,length] of Object.entries(shoeLengths(this.planning)))if(this.shoes[kind as keyof ShoeCollection]>0&&length>this.D){
      this.inputWarnings.push(`${label}: ${kind} need ${length} in of shelf depth including clearance; usable cabinet depth is ${this.D} in after baseboard allowance. These pairs remain unallocated on this wall.`);
    }
    const floorOffset=wallOptions?.floorOffset??0;this.H=Math.max(0,wallTop-floorOffset);
    const priority=this.planning.walls?.[wallId]?.priority;
    const roleMap:Record<string,WallRole>={hanging:'hanging-only',shoes:'shoes-only',folded:'drawers-only',accessories:'all'};
    role=roleMap[priority??'']??role;
    if(priority==='accessories')this.prefs={...this.prefs,priorityItems:['accessories']};
    // Opening measurements are above finished floor, while builders work relative
    // to the raised cabinet base. Compare both bounds in the same coordinates.
    const excluded:Array<[number,number]>=(this.planning.windows??[]).filter(w=>w.wall===wallId&&w.sill<wallTop&&w.sill+w.height>floorOffset+TOE_KICK).map(w=>[w.offset,w.offset+w.width]);
    const prototype:ClosetWall={wallId,label,elevationRef,width,height:wallTop,unitDepth,zones:[]};
    const footprint=wallFootprint(prototype,{dimensions:{width:this.W,height:this.H,depth:originalDepth},roomDimensions:{roomWidth:this.roomW,roomDepth:this.roomD},walls:[{...prototype,wallId:'back',unitDepth:backDepth}]});
    for(const obstacle of this.planning.obstacles??[])if(overlaps(footprint,obstacle)){
      const vertical=['left','right','corridor-a','corridor-b'].includes(wallId);
      excluded.push(vertical?[obstacle.y-footprint.y,obstacle.y+obstacle.depth-footprint.y]:[obstacle.x-footprint.x,obstacle.x+obstacle.width-footprint.x]);
      this.inputWarnings.push(`${label}: storage excluded around obstacle ${obstacle.label}.`);
    }
    const spans=freeSpans(width,excluded);
    let zones=spans.flatMap(([start,end])=>this.buildWall(wallId,label,elevationRef,end-start,unitDepth,role,spans.length===1&&end-start>=width-.001).zones.map(z=>({...z,x:z.x+start})));
    // Append after all spans, so a new shelf above the first span cannot shift
    // organizer IDs belonging to drawers in the second span.
    if(this.planning.upperStorage!==false)zones=withUpperStorage(zones,this.D,this.planning.accessoryShelfOpening);
    const supportSpan=this.planning.supportSpan??32;
    for(const zone of zones)if(zone.shelves&&zone.width>supportSpan){
      zone.supports=Array.from({length:Math.ceil(zone.width/supportSpan)-1},(_,i)=>(i+1)*zone.width/Math.ceil(zone.width/supportSpan));
    }
    this.D=originalDepth;this.H=originalHeight;this.prefs=originalPrefs;
    if(floorOffset)for(const zone of zones){zone.y+=floorOffset;zone.rods?.forEach(r=>r.height+=floorOffset);zone.drawers?.forEach(d=>d.position+=floorOffset);}
    if(excluded.length)this.inputWarnings.push(`${label}: openings and obstacles reserve ${Math.max(0,width-spans.reduce((n,[a,b])=>n+b-a,0)).toFixed(2)} inches of wall width.`);
    return {...prototype,zones};
  }

  private get clearance(){return this.planning.clearanceTarget??36;}
  private depthFor(id:ClosetWall['wallId']) { return this.planning.walls?.[id]?.depth??this.D; }

  /** Build a wall from a user-placed column recipe instead of the engine's own column
   * decision. Each column is still built by the normal zone builders, so an edited wall
   * carries the same rods, shelves and drawer banks a generated one would. */
  private buildZonesFromColumns(columns: LayoutColumn[], width: number): ClosetZone[] {
    const zones: ClosetZone[] = [];
    const drawerH = this.hasAnyDrawers() ? this.calcDrawerStackHeight() : 0;
    let curX = 0;
    for (const column of columns) {
      const w = column.width, top = this.H - TOE_KICK;
      switch (column.type) {
        case 'long-hang':    this.addLongHangZone(zones, curX, w, TOE_KICK, top); break;
        case 'shoe-shelves': this.addShoeColumn(zones, curX, w, TOE_KICK, top); break;
        case 'drawers':      this.addDrawerZone(zones, curX, w, TOE_KICK, Math.max(drawerH, Math.min(top, DRAWER_STD + DRAWER_MARG * 2))); break;
        case 'top-shelves':
          zones.push({ type: 'top-shelves', x: curX, y: TOE_KICK, width: w, height: top,
            shelves: accessoryShelves(w,top,this.D,this.wardrobe.bags,false,this.planning.accessoryShelfOpening,this.planning.bagDimensions),
            contentLabel: 'Shelves and accessories' });
          break;
        default:
          if (drawerH > 0) this.buildDrawerAndHang(zones, curX, w, drawerH);
          else this.addShortHangZone(zones, curX, w, TOE_KICK, top);
      }
      curX += w;
    }
    return zones;
  }

  /** Each span sees only unallocated demand. Restore source inventory before
   * reporting, so shortfalls remain relative to the user's full collection. */
  private buildWall(
    wallId: ClosetWall['wallId'], label: string, elevationRef: string,
    width: number, unitDepth: number, role: WallRole,
    /** False when this span is a window/obstacle leftover rather than the whole wall.
     * A narrow leftover reports nothing; a genuinely narrow wall gets shelves. */
    fullSpan = true,
  ): ClosetWall {
    const wardrobe = this.wardrobe, shoes = this.shoes;
    // Explicit recipes describe requested storage, including intentional spare
    // capacity. Their actual capacity still reduces later automatic demand.
    const manual = resolveColumns(this.columns[wallId], { width });
    if (this.remaining && !manual) {
      this.wardrobe = this.remaining.wardrobe;
      this.shoes = this.remaining.shoes;
    }
    try {
      const wall = this.buildWallForDemand(wallId, label, elevationRef, width, unitDepth, role, fullSpan);
      if (this.remaining) this.remaining = remainingInventory(this.remaining, wall.zones,this.planning);
      return wall;
    } finally {
      this.wardrobe = wardrobe;
      this.shoes = shoes;
    }
  }

  private buildWallForDemand(
    wallId:       ClosetWall['wallId'],
    label:        string,
    elevationRef: string,
    width:        number,
    unitDepth:    number,
    role:         WallRole,
    fullSpan =    true,
  ): ClosetWall {
    if (width < LIMITS.width) return { wallId, label, elevationRef, width, height: this.H, unitDepth, zones: [] };
    // A canvas-edited wall replaces the engine's column decision but keeps every other
    // step below (supports, annotation), so overrides are additive per wall.
    const edited = resolveColumns(this.columns[wallId], { width });
    if(edited && edited.length<(this.columns[wallId]?.length??0))this.inputWarnings.push(`${label}: some edited columns cannot meet their minimum widths in this span. Widen the span or revise the column types.`);
    const wantsAccessories = this.wardrobe.bags > 0 || this.wardrobe.belts > 0;
    const reserve = !edited && wantsAccessories && ['all', 'drawers-only', 'drawers-and-shoes'].includes(role) && width >= 48
      ? Math.min(width / 2, Math.max(this.prefs.priorityItems.includes('accessories') ? 36 : 24,this.wardrobe.bags>0?bagDimensions(this.planning).width+4:0)) : 0;
    const zones = edited ? this.buildZonesFromColumns(edited, width) : this.buildZonesForRole(role, width - reserve);
    if (reserve) {
      const shelves=accessoryShelves(reserve,this.H-TOE_KICK,this.D,this.wardrobe.bags,this.wardrobe.belts>0,this.planning.accessoryShelfOpening,this.planning.bagDimensions);
      zones.push({ type: 'top-shelves', x: width - reserve, y: TOE_KICK, width: reserve, height: this.H - TOE_KICK, shelves, contentLabel: 'Bags, accessories and adjustable shelves' });
    }
    // Retain useful shelves when the requested elements cannot fit. Never fill a
    // span deliberately excluded by a window or obstacle.
    if (!zones.length && fullSpan) this.addFallbackShelves(zones, 0, width, TOE_KICK, Math.max(1, this.H - TOE_KICK));
    this.annotateZones(zones);
    return { wallId, label, elevationRef, width, height: this.H, unitDepth, zones };
  }

  /** Island unit — 36" high counter with jewellery drawers + accessory shelf */
  private buildIslandWall(width: number, height: number): ClosetWall {
    height=Math.min(height,this.H,this.planning.walls?.['island-unit']?.ceilingHeight??this.ceilingHeight);
    const depth=this.depthFor('island-unit');
    const canHaveDrawers=elementFits('drawers',height,depth);
    const zones: ClosetZone[] = [];
    const drawerW  = canHaveDrawers?Math.round(width * 0.6):0;
    const shelfW   = width - drawerW;
    if(!canHaveDrawers)this.inputWarnings.push('Island drawers omitted: the cabinet depth is too shallow; open shelves are provided instead.');

    // Drawer stack inside the island counter
    const drawers: DrawerConfig[] = [];
    let curY = DRAWER_MARG;
    if ((this.remaining?.wardrobe ?? this.wardrobe).jewelry) {
      drawers.push({ height: DRAWER_JEW, width: drawerW - 4, depth: this.depthFor('island-unit') - 6, position: curY, purpose: 'jewelry' });
      curY += DRAWER_JEW + DRAWER_GAP;
    }
    // Fill remaining height with shallow drawers for accessories
    const remaining = height - curY - DRAWER_MARG;
    const drawerHeight=this.drawerHeight();
    const drawerCount = Math.max(Math.floor(remaining / (drawerHeight + DRAWER_GAP)), 1);
    for (let i = 0; i < drawerCount; i++) {
      drawers.push({ height: drawerHeight, width: drawerW - 4, depth: this.depthFor('island-unit') - 6, position: curY, purpose: i === 0 ? 'belts & ties' : 'accessories' });
      curY += drawerHeight + DRAWER_GAP;
    }
    if(canHaveDrawers)zones.push({ type: 'drawers', x: 0, y: 0, width: drawerW, height, drawers, contentLabel: 'Island drawers' });

    // Open shelf compartment on the other side
    zones.push({
      type: 'top-shelves', x: drawerW, y: 0, width: shelfW, height,
      shelves: [
        { height: Math.round(height * 0.5), depth: depth - 4, spacing: height-Math.round(height * 0.5)-SHELF_THICK, count: 1, purpose: 'display' },
      ],
      contentLabel: 'Open display',
    });

    return {
      wallId: 'island-unit',
      label: 'ISLAND UNIT',
      elevationRef: 'EL-D',
      width,
      height,
      unitDepth: this.depthFor('island-unit'),
      zones,
    };
  }

  // â”€â”€ Role dispatcher â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private buildZonesForRole(role: WallRole, W: number): ClosetZone[] {
    const hanging = hangingDemand(this.wardrobe,this.planning);
    const roleHasDemand = role === 'hanging-only' ? hanging.long + hanging.short > 0
      : role === 'shoes-only' ? this.countShoes() > 0
      : role === 'drawers-only' ? this.hasAnyDrawers()
      : role === 'drawers-and-shoes' ? this.hasAnyDrawers() || this.countShoes() > 0 : true;
    if (!roleHasDemand) role = 'all';
    switch (role) {
      case 'all':              return this.buildAll(W);
      case 'hanging-only':     return this.buildHanging(W);
      case 'drawers-only':     return this.buildDrawersOnly(W);
      case 'shoes-only':       return this.buildShoesOnly(W);
      case 'drawers-and-shoes':return this.buildDrawersAndShoes(W);
    }
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Role builders
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * ALL  -  single-wall layout: distributes every item type into columns.
   * Column order (Ch.14): long-hang | double-hang-with-drawers | shoe-shelves
   * AUDIT FIX: Suits are NEVER long-hang — they are double-hang (jacket upper, trousers lower)
   */
  private buildAll(W: number): ClosetZone[] {
    // AUDIT FIX (ISSUE 04): Suits belong entirely in double-hang, never long-hang
    // Long-hang is ONLY for: long dresses, coats, jumpsuits, maxi skirts, full robes
    const longItems  = this.wardrobe.longDresses;
    // Suits go to double-hang: jacket on upper rod, trousers on lower rod
    const shortItems = this.wardrobe.shirts + this.wardrobe.shortJackets +
                       this.wardrobe.pants + this.wardrobe.suits;
    const hasDrawers = this.hasAnyDrawers();
    const totalShoes = this.countShoes();

    let colTypes: ('long-hang' | 'short-hang' | 'shoe-shelves')[] = [];
    if (longItems  > 0)               colTypes.push('long-hang');
    if (shortItems > 0 || hasDrawers) colTypes.push('short-hang');
    if (totalShoes > 0)               colTypes.push('shoe-shelves');
    if (colTypes.length === 0) return W >= COLUMN_MIN_WIDTH['top-shelves'] ? [{
      type: 'top-shelves', x: 0, y: TOE_KICK, width: W, height: this.H - TOE_KICK,
      shelves: accessoryShelves(W, this.H - TOE_KICK, this.D, 0, false, this.planning.accessoryShelfOpening),
      contentLabel: 'Spare adjustable storage',
    }] : [];
    colTypes=this.fitColumnTypes(colTypes,W,hasDrawers);

    const drawerH    = hasDrawers ? this.calcDrawerStackHeight() : 0;
    // Count the rods that really fit around this drawer position, rather than
    // assuming every short-hang column provides two rods.
    const shortPrototype:ClosetZone[]=[];
    if(hasDrawers)this.buildDrawerAndHang(shortPrototype,0,COL_HANG_MIN,drawerH);
    else this.addShortHangZone(shortPrototype,0,COL_HANG_MIN,TOE_KICK,this.H-TOE_KICK);
    const rodCount=shortPrototype.reduce((n,z)=>n+(z.rods?.length??0),0);
    const widths     = this.distributeWidths(colTypes, W,rodCount);
    const zones: ClosetZone[] = [];
    let curX = 0;

    colTypes.forEach((type, i) => {
      const cW = widths[i];
      if (type === 'shoe-shelves') {
        this.addShoeColumn(zones, curX, cW, TOE_KICK, this.H - TOE_KICK);
      } else if (type === 'long-hang') {
        this.addLongHangZone(zones, curX, cW, TOE_KICK, this.H - TOE_KICK);
      } else {
        if (hasDrawers && drawerH > 0) {
          this.buildDrawerAndHang(zones, curX, cW, drawerH);
        } else {
          this.addShortHangZone(zones, curX, cW, TOE_KICK, this.H - TOE_KICK);
        }
      }
      curX += cW;
    });

    return zones;
  }

  /**
   * HANGING-ONLY  -  back wall of walk-in types: rods span full height, no drawers.
   * Long-hang column (left) + double-hang column (right).
   * AUDIT FIX: Suits are NEVER long-hang — they are double-hang only
   */
  private buildHanging(W: number): ClosetZone[] {
    // AUDIT FIX (ISSUE 04): Suits belong entirely in double-hang, never long-hang
    const longItems  = this.wardrobe.longDresses;
    // All suits go to double-hang (jacket upper + trousers lower)
    const shortItems = this.wardrobe.shirts + this.wardrobe.shortJackets +
                       this.wardrobe.pants + this.wardrobe.suits;

    const hasLong  = longItems  > 0;
    const hasShort = shortItems > 0;

    const zones: ClosetZone[] = [];
    const wanted:('long-hang'|'short-hang')[]=hasLong?(hasShort?['long-hang','short-hang']:['long-hang']):['short-hang'];
    const types=this.fitColumnTypes(wanted,W,false);
    const prototype:ClosetZone[]=[];
    this.addShortHangZone(prototype,0,COL_HANG_MIN,TOE_KICK,this.H-TOE_KICK);
    const widths=this.distributeWidths(types,W,prototype.reduce((n,z)=>n+(z.rods?.length??0),0));
    let x=0;
    types.forEach((type,i)=>{
      if(type==='long-hang')this.addLongHangZone(zones,x,widths[i],TOE_KICK,this.H-TOE_KICK);
      else this.addShortHangZone(zones,x,widths[i],TOE_KICK,this.H-TOE_KICK);
      x+=widths[i];
    });

    return zones;
  }

  /**
   * DRAWERS-ONLY  -  left wall of U-shape: all drawer inventory at base,
   * short-hang above.
   */
  private buildDrawersOnly(W: number): ClosetZone[] {
    const zones: ClosetZone[] = [];
    if (this.hasAnyDrawers()) {
      const dH = this.calcDrawerStackHeight();
      this.buildDrawerAndHang(zones, 0, W, dH);
    } else {
      // No drawers â†’ full-height short hang
      this.addShortHangZone(zones, 0, W, TOE_KICK, this.H - TOE_KICK);
    }
    return zones;
  }

  /**
   * SHOES-ONLY  -  right wall of U-shape: dedicated shoe wall.
   */
  private buildShoesOnly(W: number): ClosetZone[] {
    const zones: ClosetZone[] = [];
    this.addShoeColumn(zones, 0, W, TOE_KICK, this.H - TOE_KICK);
    return zones;
  }

  /**
   * DRAWERS-AND-SHOES  -  L-shape side wall / corridor Wall B.
   * Left portion: drawers + short-hang. Right portion: shoe shelves (if room).
   */
  private buildDrawersAndShoes(W: number): ClosetZone[] {
    const totalShoes = this.countShoes();
    const zones: ClosetZone[] = [];

    if (totalShoes > 0 && elementFits('shoe-shelves',this.H-TOE_KICK,this.D) && W >= COL_HANG_MIN + COL_SHOE_W) {
      const shoeW = this.calcShoeColumnWidth(W - COL_HANG_MIN);
      const hangW = W - shoeW;
      // Hanging/drawer column (left)
      if (this.hasAnyDrawers()) {
        const dH = this.calcDrawerStackHeight();
        this.buildDrawerAndHang(zones, 0, hangW, dH);
      } else {
        this.addShortHangZone(zones, 0, hangW, TOE_KICK, this.H - TOE_KICK);
      }
      // Shoe column (right)
      this.addShoeColumn(zones, hangW, shoeW, TOE_KICK, this.H - TOE_KICK);
    } else {
      // No room for shoe column  -  fallback to drawers-only
      return this.buildDrawersOnly(W);
    }

    return zones;
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Zone construction helpers
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private addLongHangZone(out: ClosetZone[], x: number, w: number, yBottom: number, height: number) {
    if(w<COL_HANG_MIN){this.inputWarnings.push(`Hanging omitted: this span is narrower than the ${COL_HANG_MIN}-inch minimum.`);return;}
    if(!this.zoneFits('long-hang',height))return;
    const requested=this.planning.garmentLengths?.long;
    const rodAFF = Math.min(yBottom + height - SHELF_THICK - ROD_INSET, requested?yBottom+requested+2:ROD_LONG+4);
    if(requested&&rodAFF-yBottom<requested)this.inputWarnings.push('Long garments exceed the available hanging clearance.');
    out.push({
      type: 'long-hang', x, y: yBottom, width: w, height,
      rods: [{ height: rodAFF, depth: this.D - 2, length: w - 4, purpose: 'long hang' }],
    });
  }

  private addShortHangZone(out: ClosetZone[], x: number, w: number, yBottom: number, height: number) {
    if(w<COL_HANG_MIN){this.inputWarnings.push(`Hanging omitted: this span is narrower than the ${COL_HANG_MIN}-inch minimum.`);return;}
    if (height < 30) return;  // not enough space for any hang zone
    if(!this.zoneFits('short-hang',height))return;
    const zoneTopAFF = yBottom + height;
    const short=this.planning.garmentLengths?.short;
    const upperRod = Math.min(zoneTopAFF - SHELF_THICK - ROD_INSET, Math.max(ROD_DBL_HI, yBottom + (short ? short + 2 : 30)));
    const lowerRod   = short?yBottom+short+2:Math.max(yBottom + 6, ROD_DBL_LO);
    const hasLower   = (upperRod - lowerRod) >= (short?short+2:32) && lowerRod > yBottom + 4;
    if(short&&upperRod-yBottom<short)this.inputWarnings.push('Short garments exceed the available hanging clearance.');

    const rods: RodConfig[] = [
      { height: upperRod, depth: this.D - 2, length: w - 4, purpose: 'upper rod' },
    ];
    if (hasLower) {
      rods.push({ height: lowerRod, depth: this.D - 2, length: w - 4, purpose: 'lower rod' });
    }
    out.push({ type: 'double-hang', x, y: yBottom, width: w, height, rods });
  }

  private addDrawerZone(out: ClosetZone[], x: number, w: number, yBottom: number, totalH: number) {
    if(w<COLUMN_MIN_WIDTH.drawers){this.inputWarnings.push(`Drawers omitted: this span is narrower than the ${COLUMN_MIN_WIDTH.drawers}-inch minimum.`);return;}
    if(!this.zoneFits('drawers',totalH))return;
    const drawers = this.buildDrawerList(w, yBottom, totalH);
    if (!drawers.length) return;
    out.push({ type: 'drawers', x, y: yBottom, width: w, height: totalH, drawers });
  }

  private addShoeColumn(out: ClosetZone[], x: number, w: number, yBottom: number, totalH: number) {
    if(!this.zoneFits('shoe-shelves',totalH))return;
    const shelves = this.buildShoeShelves(totalH, w);
    if (!shelves.length) return;
    out.push({ type: 'shoe-shelves', x, y: yBottom, width: w, height: totalH, shelves });
  }

  // ── Drawer position dispatcher ───────────────────────────────────────────────

  /** Place drawers at bottom / middle / top of the short-hang column */
  private buildDrawerAndHang(out: ClosetZone[], x: number, w: number, drawerH: number): void {
    const clear=Math.max(0,this.H-TOE_KICK);
    drawerH=Math.min(clear,Math.max(0,drawerH));
    const freeHeight=clear-drawerH;
    switch (this.drawerPosition) {
      case 'top': {
        const hangH = freeHeight;
        this.addShortHangZone(out, x, w, TOE_KICK, hangH);
        this.addDrawerZone(out, x, w, TOE_KICK + hangH, drawerH);
        break;
      }
      case 'middle': {
        const lowerH    = Math.min(freeHeight,Math.max(Math.round(freeHeight * 0.38),20));
        const upperY    = TOE_KICK + lowerH + drawerH;
        const upperH    = this.H - upperY;
        this.addShortHangZone(out, x, w, TOE_KICK, lowerH);
        this.addDrawerZone(out, x, w, TOE_KICK + lowerH, drawerH);
        if (upperH >= 20) this.addShortHangZone(out, x, w, upperY, upperH);
        break;
      }
      default: // 'bottom'
        this.addDrawerZone(out, x, w, TOE_KICK, drawerH);
        this.addShortHangZone(out, x, w, TOE_KICK + drawerH, this.H - TOE_KICK - drawerH);
    }
  }

  // ── Zone annotation (inventory labels) ────────────────────────────────────

  /** Set contentLabel on each zone with an inventory summary — used by renderer */
  private annotateZones(zones: ClosetZone[]): void {
    const fmt = (n: number, s: string, p?: string) =>
      n > 0 ? `${n} ${n === 1 ? s : (p ?? s + 's')}` : null;

    for (const zone of zones) {
      switch (zone.type) {
        case 'long-hang': {
          // AUDIT FIX (ISSUE 04): Long-hang is ONLY for long dresses, coats, etc. — NEVER suits
          const parts = [
            fmt(this.wardrobe.longDresses, 'dress', 'dresses'),
            // Suits removed from long-hang per audit requirement
          ].filter(Boolean) as string[];
          if (parts.length) zone.contentLabel = parts.join(' · ');
          break;
        }
        case 'double-hang': {
          // AUDIT FIX (ISSUE 04): All suits go here (jacket upper rod, trousers lower rod)
          const parts = [
            fmt(this.wardrobe.shirts, 'shirt'),
            fmt(this.wardrobe.shortJackets, 'jacket'),
            fmt(this.wardrobe.pants, 'pant', 'pants'),
            // All suits counted in double-hang, not split with long-hang
            fmt(this.wardrobe.suits, 'suit'),
            fmt(this.wardrobe.ties, 'tie'),
          ].filter(Boolean) as string[];
          if (parts.length) zone.contentLabel = parts.join(' · ');
          break;
        }
        case 'drawers': {
          const parts = [
            this.wardrobe.jewelry ? 'Jewelry' : null,
            fmt(this.wardrobe.tShirts, 'T-shirt'),
            fmt(this.wardrobe.sweaters, 'sweater'),
            fmt(this.wardrobe.jeans, 'jean', 'jeans'),
            this.wardrobe.underwear > 0 ? 'Lingerie' : null,
          ].filter(Boolean) as string[];
          if (parts.length) zone.contentLabel = parts.join(' · ');
          break;
        }
        case 'shoe-shelves': {
          const parts = [
            fmt(this.shoes.sneakers, 'sneaker'),
            fmt(this.shoes.heels, 'heel'),
            fmt(this.shoes.boots, 'boot'),
            fmt(this.shoes.flats, 'flat'),
          ].filter(Boolean) as string[];
          if (parts.length) zone.contentLabel = parts.join(' · ');
          break;
        }
      }
    }
  }

  // ── Constraint warnings ──────────────────────────────────────────────────

  /** Soft constraint checks — returns designer-voice warnings for the UI */
  private checkZoneConstraints(walls: ClosetWall[]): LayoutWarning[] {
    const warnings: LayoutWarning[] = [];

    // Drawer position warnings
    if (this.hasAnyDrawers()) {
      if (this.drawerPosition === 'middle') {
        warnings.push({
          id:          'drawer-middle',
          message:     'Drawers at mid-height',
          designerNote:
            "Mid-height drawers sit beautifully at arm's reach — perfect for jewellery, " +
            'accessories, and anything you touch daily. For heavier folded items like jeans ' +
            'or sweaters, you may find the bottom position a little easier to load.',
          severity: 'info',
        });
      } else if (this.drawerPosition === 'top') {
        warnings.push({
          id:          'drawer-top',
          message:     'Drawers at the top',
          designerNote:
            'Top drawers are the perfect home for lightly-used seasonal pieces — travel ' +
            'clutches, spare scarves, sentimental items you treasure but rarely reach for. ' +
            'For anything you touch daily, Bottom or Middle will serve you better.',
          severity: 'info',
        });
        const drawerH = this.calcDrawerStackHeight();
        const hangH   = this.H - TOE_KICK - drawerH;
        if (hangH < 52) {
          warnings.push({
            id:          'hang-compressed',
            message:     'Hanging space is tighter than ideal',
            designerNote:
              `Moving drawers to the top has left ${hangH}" of hanging space. Your longer ` +
              'garments may sit closer to the floor than ideal — consider lowering the drawers ' +
              'back to Bottom, or confirm your ceiling height is generous enough.',
            severity: 'caution',
          });
        }
      }
    }

    // T3-01: Shelf span warning — any zone wider than 32" without centre support
    for (const wall of walls) {
      for (const zone of wall.zones) {
        if (zone.width > (this.planning.supportSpan??32) && !zone.supports?.length && (zone.type === 'shoe-shelves' || zone.type === 'top-shelves')) {
          warnings.push({
            id:          `shelf-span-${wall.wallId}-${zone.x}-${zone.y}`,
            message:     `Wide shelf span: ${Math.round(zone.width)}"`,
            designerNote:
              `A ${Math.round(zone.width)}" shelf span exceeds the selected ${this.planning.supportSpan??32}" maximum without ` +
              'a centre support. Over time, shelves this wide can sag under weight. Consider adding ' +
              'a vertical divider or choosing a narrower configuration.',
            severity: 'caution',
          });
          break; // one warning per wall is enough
        }
      }
    }

    const demand = hangingDemand(this.wardrobe,this.planning);
    if (demand.long + demand.short > this.calcStorage(walls).hangingRods * 12) warnings.push({ id: 'overflow-capacity', severity: 'caution', message: 'Hanging inventory exceeds generated rods', designerNote: 'See the capacity report for the exact long- and short-hanging shortfalls.' });
    for (const wall of walls) if (wall.width < 12) warnings.push({ id: 'wall-too-short-' + wall.wallId, severity: 'caution', message: wall.label + ' has no usable storage length', designerNote: 'The cabinet depth leaves less than 12 inches on this wall. Enlarge the room or reduce cabinet depth.' });
    return warnings;
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Detail builders
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private buildDrawerList(colW: number, yBottom: number, totalH: number): DrawerConfig[] {
    const drawers: DrawerConfig[] = [];
    let curAFF = yBottom + DRAWER_MARG;
    const maxAFF = yBottom + totalH - DRAWER_MARG;

    if (this.wardrobe.jewelry && curAFF + DRAWER_JEW <= maxAFF) {
      drawers.push({ height: DRAWER_JEW, width: colW - 4, depth: this.D - 6, position: curAFF, purpose: 'jewelry' });
      curAFF += DRAWER_JEW + DRAWER_GAP;
    }
    const drawerHeight = this.drawerHeight();
    while (curAFF + drawerHeight <= maxAFF) {
      drawers.push({ height: drawerHeight, width: colW - 4, depth: this.D - 6, position: curAFF, purpose: 'folded' });
      curAFF += drawerHeight + DRAWER_GAP;
    }
    return drawers;
  }

  /** Shoe shelf heights are stored RELATIVE to zone.y (renderer adds zone.y). */
  private buildShoeShelves(totalH: number, colW: number): ShelfConfig[] {
    return shoeShelves(this.shoes,totalH,colW,this.planning.shoeHeights,{pairWidths:this.planning.shoePairWidths,lengths:this.planning.shoeLengths,usableDepth:this.D});
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Width distribution
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Choose shoe width by testing actual row capacity and vertical clearances. */
  private calcShoeColumnWidth(availableWidth=this.W): number {
    return shoeColumnWidth(this.shoes,this.H-TOE_KICK,availableWidth,this.planning.shoeHeights,COL_SHOE_W,{pairWidths:this.planning.shoePairWidths,lengths:this.planning.shoeLengths,usableDepth:this.D});
  }

  private fitColumnTypes(types:('long-hang'|'short-hang'|'shoe-shelves')[],width:number,drawers:boolean){
    const demand=hangingDemand(this.wardrobe,this.planning),priority=this.prefs.priorityItems??[];
    // Drop elements the cabinet physically cannot take before competing for width,
    // so a shallow or short unit never gets a rod it has no room for.
    const clear=this.H-TOE_KICK;
    const possible=types.filter(type=>(type!=='shoe-shelves'||this.buildShoeShelves(clear,width).length>0)&&(elementFits(type,clear,this.D)
      || (type==='short-hang' && drawers && elementFits('drawers',clear,this.D))));
    const unfit=types.filter(type=>!possible.includes(type));
    for(const type of unfit){
      if(type==='shoe-shelves'&&elementFits(type,clear,this.D)){
        this.inputWarnings.push(`Shoe storage omitted: measured pairs do not fit this span's width, usable depth, or vertical clearance.`);continue;
      }
      const need=ELEMENT_FIT[type];
      this.inputWarnings.push(`${type.replace(/-/g,' ')} omitted: needs at least ${need.height} in of clear height and ${need.depth} in of depth; this cabinet has ${clear.toFixed(0)} by ${this.D.toFixed(0)} in.`);
    }
    if(!possible.length)return [];
    const selected=selectColumns(possible.map(type=>({
      type,minimum:COLUMN_MIN_WIDTH[type],
      score:type==='shoe-shelves'?Object.values(this.shoes).filter(n=>n>0).length+(priority.includes('shoes')?2:0)
        :1+(priority.includes('hanging')?2:0)+(type==='short-hang'&&drawers?1+(priority.includes('folded')?2:0):0),
      demand:type==='shoe-shelves'?this.countShoes():type==='long-hang'?demand.long:demand.short,
    })),width);
    const omitted=possible.filter(type=>!selected.includes(type));
    if(omitted.length)this.inputWarnings.push(`${width.toFixed(2)}-inch span: omitted ${omitted.map(t=>t.replace(/-/g,' ')).join(', ')} to preserve minimum column widths. Change priorities, widen the span, or use fewer column types.`);
    return selected;
  }

  /** Last-resort storage for a span nothing else fits: adjustable shelves, which need
   * the least height and depth of any element. A wall above the supported minimum must
   * never come back empty — an empty elevation reads as a broken drawing, not a choice. */
  private addFallbackShelves(out: ClosetZone[], x: number, w: number, yBottom: number, height: number): void {
    if(w<=0||!elementFits('top-shelves',height,this.D))return;
    const shelves=accessoryShelves(w,height,this.D,0,false,this.planning.accessoryShelfOpening);
    if(!shelves.length)return;
    out.push({
      type: 'top-shelves', x, y: yBottom, width: w, height,
      shelves,
      contentLabel: 'Adjustable shelves',
    });
    this.inputWarnings.push(`${w.toFixed(0)}-inch span: fitted with adjustable shelves because the requested storage does not fit.`);
  }

  /** Guard the actual builders too: priority walls and saved recipes bypass automatic selection. */
  private zoneFits(type:keyof typeof ELEMENT_FIT,height:number):boolean {
    if(elementFits(type,height,this.D))return true;
    const need=ELEMENT_FIT[type];
    const message=`${type.replace(/-/g,' ')} omitted: needs at least ${need.height} in of clear height and ${need.depth} in of depth; this space has ${height.toFixed(2)} by ${this.D.toFixed(2)} in.`;
    if(!this.inputWarnings.includes(message))this.inputWarnings.push(message);
    return false;
  }

  private distributeWidths(types: ('long-hang' | 'short-hang' | 'shoe-shelves')[], W: number, shortRods=2): number[] {
    const shoeColW   = this.calcShoeColumnWidth();
    const shoeCount  = types.filter(t => t === 'shoe-shelves').length;
    const shortCount = types.filter(t => t === 'short-hang').length;
    const longCount  = types.filter(t => t === 'long-hang').length;

    if (types.length === 1) return [W];
    const minColumn = COL_HANG_MIN;
    const shoeTotal = shoeCount * Math.min(shoeColW, W - (longCount + shortCount) * minColumn);
    const hangAvail = W - shoeTotal;

    const demand=hangingDemand(this.wardrobe,this.planning);
    const snapLong=longCount>0?(shortCount>0?hangingWidths(hangAvail,demand.long,demand.short,shortRods,minColumn)[0]:hangAvail):0;
    const snapShort=shortCount>0?hangAvail-snapLong:0;

    return types.map(t => {
      if (t === 'shoe-shelves') return shoeTotal / shoeCount;
      if (t === 'long-hang')    return snapLong;
      return snapShort;
    });
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Drawer height calculator
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private calcDrawerStackHeight(): number {
    const stdCount = Math.min(Math.max(Math.ceil(foldedDemand(this.wardrobe) * 9 / this.drawerHeight()), 1), this.prefs.drawerPreference === 'many-small' ? 6 : 4);
    const wanted = (this.wardrobe.jewelry ? DRAWER_JEW + DRAWER_GAP : 0) + stdCount * (this.drawerHeight() + DRAWER_GAP) - DRAWER_GAP + DRAWER_MARG * 2;
    // Reserving 32 in for hanging above goes negative in a short cabinet, which used to
    // produce an inverted zone. Give the drawers whatever clear height there is, and
    // report none at all rather than a negative stack.
    const clear = this.H - TOE_KICK;
    const room = this.D>=ELEMENT_FIT['short-hang'].depth && clear >= 32 + ELEMENT_FIT.drawers.height ? clear - 32 : clear;
    return Math.max(0, Math.min(room, wanted));
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Inventory helpers
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private drawerHeight() { return this.prefs.drawerPreference === 'many-small' ? 6 : this.prefs.drawerPreference === 'few-large' ? 12 : 9; }

  private islandWidth() {
    if (this.roomD - this.depthFor('back') - this.depthFor('island-unit') < this.clearance * 2) return 0;
    return Math.max(0, Math.min(72, this.roomW - Math.max(this.depthFor('left'),this.depthFor('right'))*2 - this.clearance * 2));
  }

  private hasAnyDrawers(): boolean {
    return (
      this.wardrobe.tShirts + this.wardrobe.sweaters +
      this.wardrobe.jeans   + this.wardrobe.underwear
    ) > 0 || !!this.wardrobe.jewelry || this.wardrobe.ties > 0;
  }

  private countShoes(): number {
    return this.shoes.sneakers + this.shoes.heels + this.shoes.boots + this.shoes.flats;
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Aisle checks (Ch.4 of Closet Models doc)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private checkAisles(): string[] {
    const warnings: string[] = [];
    const UD = this.depthFor('back');

    switch (this.closetType) {
      case 'walkin-single':
      case 'walkin-l': {
        if (this.closetType === 'walkin-l' && this.roomW - this.depthFor('left') < this.clearance) warnings.push('Side aisle is ' + (this.roomW - this.depthFor('left')) + ' inches; target is '+this.clearance+' inches.');
        const aisle = this.roomD - UD;
        if (aisle < this.clearance)
          warnings.push(` Front aisle is ${aisle}"  -  personal target is ${this.clearance}". Consider reducing unit depth or widening the room.`);
        break;
      }
      case 'walkin-u':
      case 'island': {
        const lrAisle = this.roomW - this.depthFor('left') - this.depthFor('right');
        const fbAisle = this.roomD - UD;
        if (this.closetType === 'island') {
          const islandWidth = this.islandWidth();
          if (islandWidth < 36) warnings.push('Island clearance is insufficient: island omitted. For a 36-inch island, room width must be at least '+(2*Math.max(this.depthFor('left'),this.depthFor('right'))+36+2*this.clearance)+' inches and room depth at least '+(UD+this.depthFor('island-unit')+2*this.clearance)+' inches.');
          const sideClearance = (lrAisle - islandWidth) / 2;
          const endClearance = (fbAisle - this.depthFor('island-unit')) / 2;
          if (sideClearance < this.clearance || endClearance < this.clearance)
            warnings.push(`Island clearance is ${sideClearance}" at the sides and ${endClearance}" at the ends - personal target is ${this.clearance}" around all sides. Enlarge the room or choose a layout without an island.`);
        }
        if (lrAisle < this.clearance)
          warnings.push(` Left-right aisle is ${lrAisle}"  -  personal target is ${this.clearance}". Room width too narrow for U-shape units.`);
        if (fbAisle < this.clearance)
          warnings.push(` Front-back aisle is ${fbAisle}"  -  personal target is ${this.clearance}". Reduce unit depth or deepen the room.`);
        break;
      }
      case 'corridor': {
        const aisle = this.roomW - this.depthFor('corridor-a') - this.depthFor('corridor-b');
        if (aisle < this.clearance)
          warnings.push(` Corridor aisle is ${aisle}"  -  personal target ${this.clearance}" needed. Room is ${this.roomW}" wide; needs at least ${this.depthFor('corridor-a') + this.depthFor('corridor-b') + this.clearance}".`);
        break;
      }
    }
    return warnings;
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Storage & utilisation summaries
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private calcStorage(walls: ClosetWall[]) {
    let hangingRods = 0, shelfSpace = 0, drawerCount = 0, shoeCapacity = 0;
    for (const w of walls) {
      for (const z of w.zones) {
        if (z.rods)    hangingRods  += z.rods.reduce((s, r) => s + r.length, 0) / 12;
        if (z.shelves) {
          for (const sh of z.shelves) {
            shelfSpace += (z.width / 12) * (sh.depth / 12);
            // Only shoe-shelf zones contribute to shoe capacity
            if (z.type === 'shoe-shelves') {
              // Capacity per shelf depends on shoe type and zone width
              const pairsPerShelf = sh.count;
              shoeCapacity += pairsPerShelf;
            }
          }
        }
        if (z.drawers) drawerCount += z.drawers.length;
      }
    }
    return {
      hangingRods:  Math.round(hangingRods  * 10) / 10,
      shelfSpace:   Math.round(shelfSpace   * 10) / 10,
      drawerCount,
      shoeCapacity,
    };
  }

  private calcUtilization(walls: ClosetWall[]): number {
    // Compare inventory demand vs provided capacity across three dimensions:
    // hanging linear feet, drawer count, and shoe pairs
    const storage = this.calcStorage(walls);
    const wrd     = this.wardrobe;

    const hanging = hangingDemand(wrd,this.planning);
    const hangDemand = (hanging.long+hanging.short)/12;
    const hangSupply  = Math.max(storage.hangingRods, 0.01);

    // Drawer demand: ~10 folded items per drawer
    const folded       = (wrd.tShirts ?? 0) + (wrd.sweaters ?? 0) + (wrd.jeans ?? 0) + (wrd.underwear ?? 0);
    const drawerDemand = foldedDemand(wrd);
    const drawerSupply = Math.max(storage.drawerCount, 0.01);

    // Shoe demand
    const shoeDemand = this.countShoes();
    const shoeSupply = Math.max(storage.shoeCapacity, 0.01);

    // Weighted average of utilization ratios (hanging 40%, drawers 30%, shoes 30%)
    const hangUtil   = Math.min(hangDemand / hangSupply, 1.5);
    const drawerUtil = Math.min(drawerDemand / drawerSupply, 1.5);
    const shoeUtil   = Math.min(shoeDemand / shoeSupply, 1.5);

    const rawScore = (hangUtil * 0.4 + drawerUtil * 0.3 + shoeUtil * 0.3) * 100;
    return Math.min(Math.round(rawScore), 100);
  }

  private calcRecommendations(walls: ClosetWall[]): string[] {
    const recs: string[] = [];
    const shoes  = this.countShoes();
    const wrd    = this.wardrobe;
    const userType = this.prefs?.userType ?? 'homeowner';

    // ── Personalization-aware recommendations ──
    if (userType === 'renter') {
      recs.push('Renter planning: record existing doors, windows and baseboards before arranging storage. Freestanding furniture may still require anchoring; follow its installation instructions and confirm permission for modifications.');
      if (this.closetType !== 'reach-in' && this.closetType !== 'wardrobe-wall') {
        recs.push('Review the room opening schedule with your landlord or installer before changing a walk-in closet.');
      }
    }
    if (userType === 'architect') {
      recs.push('Architect review: coordinate openings, floor offsets and cabinet depths, then review clearance and capacity warnings before exporting the room schedule.');
      recs.push('These are planning drawings. Verify survey measurements, construction details and installation requirements for the project.');
    }
    if (userType === 'designer') {
      recs.push('Designer note: All measurements are in inches. Elevation drawings include AFF (Above Finished Floor) references for design review.');
      recs.push('Export PDF includes Smart Suggestions suitable for client presentation. Edit design name before exporting for professional labeling.');
    }

    // Layout type summary
    const typeNotes: Partial<Record<ClosetType, string>> = {
      'walkin-u':      'U-shape walk-in: 3 elevation drawings - EL-A (back), EL-B (left), EL-C (right).',
      'walkin-l':      'L-shape walk-in: 2 elevation drawings - EL-A (back wall) and EL-B (side wall).',
      'island':        'Island walk-in: central unit is included only when 36-inch aisles fit on all sides.',
      'corridor':      'Corridor walk-in: 2 facing walls - EL-A (hanging) and EL-B (storage).',
      'walkin-single': 'Single-wall walk-in: back wall fitted; review aisle warnings.',
    };
    const note = typeNotes[this.closetType];
    if (note) recs.push(note);

    // Hanging inventory analysis
    for (const row of capacityReport({ wardrobe: this.wardrobe, shoes: this.shoes, planning:this.planning }, walls)) {
      if (row.required > 0) recs.push(row.label + ': ' + row.required.toFixed(1) + ' ' + row.unit + ' required; ' + row.available.toFixed(1) + ' available.' + (row.required > row.available ? ' Additional storage is needed.' : ' Inventory fits the calculated capacity.'));
    }

    if (this.H < 84) recs.push('Ceiling height below 7 ft - rod heights adjusted to maximise hanging space.');
    if (this.W < 60) recs.push('Compact layout: priority items at most accessible height (18 in. to 60 in. A.F.F.).');
    if (walls.every(w => w.zones.length === 0)) recs.push('Complete your wardrobe inventory to generate a tailored layout.');

    // T3-04: Reach zone labeling by A.F.F.
    if (walls.some(w => w.zones.length > 0)) {
      recs.push(
        'Reach zones — Zone 1 (floor–18" A.F.F.): seasonal/heavy items. ' +
        'Zone 2 (18"–60" A.F.F.): daily-reach prime storage. ' +
        'Zone 3 (60"–ceiling): overhead display & seldom-used items.',
      );
    }

    // T3-02: Kids closet — suggest lower rod height
    const allItems = [
      wrd.longDresses, wrd.suits, wrd.shirts, wrd.shortJackets, wrd.pants,
      wrd.tShirts, wrd.sweaters, wrd.jeans, wrd.underwear,
    ];
    const nonZero = allItems.filter(n => n > 0);
    if (nonZero.length > 0 && nonZero.every(n => n <= 5)) {
      recs.push(
        'Small wardrobe detected (≤ 5 each category) — likely a child\'s closet. ' +
        'Consider a single rod at 36"–42" A.F.F. for easy reach, with shelves above.',
      );
    }

    // T1-03: Villa amenities recommendations
    const am = this.amenities;
    if (am.island)         recs.push('Island unit: central counter with integrated jewellery drawers and belt/tie hooks. Requires min. 36" clear aisle around all sides.');
    if (am.vanity)         recs.push('Vanity station: recommend 30"–36" wide × 30" high counter with mirror above and seated clearance below.');
    if (am.seating)        recs.push('Seating area: ottoman or bench — allocate 24"–30" depth × 48" minimum width in the aisle zone.');
    if (am.mirrorWall)     recs.push('Full mirror wall: place on door-facing wall or opposite the primary hanging wall for maximum visual depth.');
    if (am.displayShelves) recs.push('Open display shelves: glass or floating shelves for handbags/collectibles — recommend 12" depth × 14" spacing.');
    if (am.safe)           recs.push('Hidden safe: integrate into the drawer column base, behind a false panel — standard 14" × 14" × 10" internal.');
    if (am.shoeWall)       recs.push('Dedicated shoe display wall: angled shelves (15° tilt) with LED strip under each shelf for gallery effect.');
    if (am.lighting)       recs.push('Feature lighting: LED strips under shelves and inside glass-door cabinets. Warm white (2700K–3000K) for wood tones.');

    return recs;
  }
}


