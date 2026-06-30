export type StorageClass =
  | "double-hang"
  | "long-hang"
  | "drawers"
  | "shelves"
  | "shoes"
  | "top-shelves";

export interface CatalogueEntry {
  type: string;
  label: string;
  desc: string;
  defaultWidth: number;
  bg: string;
  border: string;
  icon: string;
  storageClass: StorageClass;
  isBuiltIn?: boolean;
}

export const BUILTIN_CATALOGUE: CatalogueEntry[] = [
  { type: "double-hang",  label: "Double Hang",  desc: "Upper + lower rods",       defaultWidth: 24, bg: "#dbeafe", border: "#3b82f6", icon: "⬛", storageClass: "double-hang", isBuiltIn: true },
  { type: "long-hang",    label: "Long Hang",    desc: "Full-length rod",           defaultWidth: 30, bg: "#fce7f3", border: "#ec4899", icon: "🔱", storageClass: "long-hang",   isBuiltIn: true },
  { type: "drawers",      label: "Drawers",      desc: "Pull-out drawer stack",     defaultWidth: 18, bg: "#fef3c7", border: "#f59e0b", icon: "☰", storageClass: "drawers",     isBuiltIn: true },
  { type: "open-shelves", label: "Open Shelves", desc: "Horizontal folded storage", defaultWidth: 18, bg: "#d1fae5", border: "#10b981", icon: "≡", storageClass: "shelves",     isBuiltIn: true },
  { type: "shoe-shelves", label: "Shoe Shelves", desc: "Tiered footwear display",   defaultWidth: 18, bg: "#ede9fe", border: "#8b5cf6", icon: "◫", storageClass: "shoes",       isBuiltIn: true },
  { type: "top-shelves",  label: "Top Shelves",  desc: "High seasonal storage",     defaultWidth: 24, bg: "#fee2e2", border: "#ef4444", icon: "▤", storageClass: "top-shelves", isBuiltIn: true },
];

export const getCat = (catalogue: CatalogueEntry[], type: string): CatalogueEntry =>
  catalogue.find((e) => e.type === type) ?? {
    type, label: type, desc: "", defaultWidth: 24,
    bg: "#f5f5f4", border: "#a8a29e", icon: "📦", storageClass: "shelves",
  };
