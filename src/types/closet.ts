// Core closet data types for the Alvéo configurator

// ── Closet shape / type ──────────────────────────────────────────────────────
export type ClosetType =
  | 'reach-in'       // single wall, door, no entry space
  | 'walkin-single'  // dedicated room, one fitted wall
  | 'walkin-l'       // two walls at 90° — back + one side
  | 'walkin-u'       // three walls — back + both sides (luxury standard)
  | 'island'         // U-shape + central island unit
  | 'corridor'       // two facing walls, narrow central aisle
  | 'wardrobe-wall'; // full bedroom wall, no separate room

// ── Room footprint (walk-in types) ──────────────────────────────────────────
export interface RoomDimensions {
  roomWidth: number;  // interior room width wall-to-wall (inches)
  roomDepth: number;  // interior room depth door-to-back (inches)
}

export interface ClosetDimensions {
  cabinetHeight?: number; // Optional cabinet envelope; height remains the room ceiling.
  width: number; // inches
  height: number; // inches  
  depth: number; // inches
}

export interface ShoeCollection {
  sneakers: number; // ~5" height
  heels: number; // ~6" height
  boots: number; // ~12" height
  flats: number; // ~4" height
}

export interface WardrobeItems {
  // Hanging items
  longDresses: number; // 50-60" hanging space
  shortJackets: number; // 30-36" hanging space  
  suits: number; // 40-45" hanging space
  shirts: number; // 28-32" hanging space
  pants: number; // 40-44" hanging space (folded over hanger)
  
  // Folded items (for drawers/shelves)
  tShirts: number;
  sweaters: number;
  jeans: number;
  underwear: number;
  
  // Accessories
  bags: number;
  belts: number;
  jewelry: boolean;
  ties: number;
}

export interface UserPreferences {
  userType: 'homeowner' | 'renter' | 'designer' | 'browsing';
  stylePreference: 'minimal' | 'glam' | 'rustic' | 'modern' | 'luxury';
  woodFinish: 'light' | 'medium' | 'dark' | 'white';
  drawerPreference: 'many-small' | 'few-large' | 'mixed';
  priorityItems: ('shoes' | 'hanging' | 'folded' | 'accessories')[];
  hardwareFinish?: string;
  accentColor?: string;
}

// ── Zone customisation ───────────────────────────────────────────────────────
export type DrawerPosition = 'bottom' | 'middle' | 'top';

export interface ZoneOverrides {
  drawerPosition?: DrawerPosition;   // reposition drawer stack within its column
  /** Canvas-edited column recipe, per wall. A wall absent from this record keeps the
   * engine's own column decision, so overrides are additive and never all-or-nothing.
   * The layout is always regenerated from the configuration, so user edits have to
   * live here to survive — see `resolveColumns` in `src/lib/layoutColumns.ts`. */
  columns?: Partial<Record<ClosetWall['wallId'], LayoutColumn[]>>;
}

/** The element vocabulary a user can place on a wall. Mirrors the engine's own column
 * types so an edited wall stays buildable: `short-hang` carries a stacked drawer bank
 * when the wardrobe needs one, exactly as the generated layout does. */
export type LayoutColumnType = 'long-hang' | 'short-hang' | 'drawers' | 'shoe-shelves' | 'top-shelves';

/** One user-placed column, ordered left to right across the elevation. `width` is in
 * inches; the set is normalized to the wall width when applied. */
export interface LayoutColumn {
  id: string;
  type: LayoutColumnType;
  width: number;
}

export interface LayoutWarning {
  id:           string;
  message:      string;         // short description shown as toast header
  designerNote: string;         // Alvéo-voice paragraph shown to user
  severity:     'info' | 'caution';
}

export interface ClosetZone {
  type: 'double-hang' | 'long-hang' | 'shoe-shelves' | 'drawers' | 'top-shelves' | 'accessories';
  x: number; // position from left
  y: number; // position from bottom  
  width: number;
  height: number;
  shelves?: ShelfConfig[];
  rods?: RodConfig[];
  drawers?: DrawerConfig[];
  supports?: number[]; // divider offsets from zone.x
  contentLabel?: string;   // e.g. "15 shirts · 8 blazers" — populated by engine
}

// ── Fitted wall — one elevation in a multi-wall walk-in ──────────────────────
export interface ClosetWall {
  wallId: 'back' | 'left' | 'right' | 'corridor-a' | 'corridor-b' | 'island-unit';
  label: string;         // 'BACK WALL' / 'LEFT WALL' etc.
  elevationRef: string;  // 'EL-A' / 'EL-B' / 'EL-C'
  width: number;         // fitted-wall width (inches)
  height: number;        // ceiling height (inches)
  unitDepth: number;     // storage unit depth, typically 24"
  zones: ClosetZone[];
}

export interface ShelfConfig {
  height: number; // inches from bottom of zone
  depth: number;
  spacing: number; // height between shelves
  count: number; // Item capacity on this board, not number of boards.
  purpose: string; // "shoes", "folded items", "bags", etc.
}

export interface RodConfig {
  height: number; // absolute inches above finished floor
  depth: number;
  length: number;
  purpose: string; // "short hang", "long hang", etc.
}

export interface DrawerConfig {
  height: number;
  width: number; 
  depth: number;
  position: number; // absolute inches above finished floor
  purpose: string; // "jewelry", "ties", "folded tees", etc.
}

export interface ClosetLayout {
  planning?: PlanningOptions;
  closetType: ClosetType;              // what shape this closet is
  dimensions: ClosetDimensions;        // primary wall / room dimensions
  walls: ClosetWall[];                 // all fitted walls (1 for single-wall, 2-3 for walk-in)
  zones: ClosetZone[];                 // backward-compat: first (or selected) wall's zones
  roomDimensions?: RoomDimensions;
  capacity?: import('@/lib/design').CapacityRow[];
  aisleWarnings: string[];             // flagged if any aisle < 36"
  inputCorrections?: { field: string; requested: number; effective: number }[];
  inputWarnings?: string[];            // values clamped by the input normaliser
  layoutWarnings: LayoutWarning[];     // soft warnings for zone positioning choices
  totalStorage: {
    hangingRods: number;   // total linear feet across all walls
    shelfSpace: number;    // total sq ft across all walls
    drawerCount: number;
    shoeCapacity: number;  // pairs
  };
  utilizationScore: number;
  recommendations: string[];
}

export interface VillaAmenities {
  island?:         boolean;  // central island unit
  seating?:        boolean;  // seating / ottoman
  vanity?:         boolean;  // vanity + mirror
  mirrorWall?:     boolean;  // full mirror wall
  displayShelves?: boolean;  // open display shelves
  safe?:           boolean;  // hidden safe
  shoeWall?:       boolean;  // dedicated shoe display wall
  lighting?:       boolean;  // feature / accent lighting
}

export interface ClosetConfiguration {
  inventoryPlanning?: import('@/lib/inventoryPlanning').InventoryPlanning;
  planning?: PlanningOptions;
  closetType?: ClosetType;           // set in step 0 — the shape question
  userInfo: UserPreferences;
  dimensions: ClosetDimensions;
  roomDimensions?: RoomDimensions;   // set for walk-in types
  wardrobe: WardrobeItems;
  shoes: ShoeCollection;
  amenities?: VillaAmenities;        // villa mode only
  layout?: ClosetLayout;
  zoneOverrides?: ZoneOverrides;
  drawerInteriors?: Record<string, import('@/lib/drawers').DrawerInterior>;
}

/** Input to the layout engine — explicit interface so all fields are visible */
export interface ClosetCalculationInput {
  inventoryPlanning?: import('@/lib/inventoryPlanning').InventoryPlanning;
  planning?: PlanningOptions;
  closetType?: ClosetType;         // defaults to 'reach-in' if omitted
  dimensions: ClosetDimensions;
  roomDimensions?: RoomDimensions;
  wardrobe: WardrobeItems;
  shoes: ShoeCollection;
  userInfo: UserPreferences;
  zoneOverrides?: ZoneOverrides;
  amenities?: VillaAmenities;      // villa mode only
}
export type CalculationResult = ClosetLayout;

export interface PlanningOptions {
  upperStorage?:boolean; // Use spare height above hanging and shoes; enabled by default.
  accessoryShelfOpening?:number; // Minimum clear opening for adaptive accessory shelves (inches).
  garmentLengths?:{long:number;short:number};
  shoeHeights?:ShoeCollection;
  supportSpan?:number;
  clearanceTarget?:number;
  walls?:Partial<Record<ClosetWall['wallId'],{depth?:number;priority?:'default'|'hanging'|'shoes'|'folded'|'accessories';ceilingHeight?:number;baseboard?:number;floorOffset?:number}>>;
  door?:{wall:'front'|'back'|'left'|'right';offset:number;width:number;hinge:'left'|'right';swing:'in'|'out';check?:'envelope'|'sector'};
  windows?:Array<{id:string;label?:string;wall:ClosetWall['wallId'];offset:number;width:number;sill:number;height:number}>;
  obstacles?:Array<{id:string;label:string;x:number;y:number;width:number;depth:number}>;
}

// ─── Saved design entry ──────────────────────────────────────────────────────
// Persisted in localStorage; one entry per saved closet configuration.
export interface SavedDesign {
  id: string;
  name: string;
  config: Partial<ClosetConfiguration>;
  savedAt: string; // ISO date string (JSON-serialisable)
  modifiedAt?: string;
  tags?: string[];
  folder?:string;
  pinnedOrder?:number;
  revisions?:Array<{id:string;savedAt:string;note?:string;config:Partial<ClosetConfiguration>}>;
}
