import type {
  ResolvedSaleItem,
  SaleDetail,
  SaleItem,
  SaleProgram,
  SaleProgramItemRef,
} from "../data/repositories/types";

export function salePrice(basePrice: number, program: SaleProgram | undefined): number {
  if (!program || !program.enabled) return basePrice;

  const percent = Math.min(Math.max(program.percentDiscount || 0, 0), 100);
  const flat = Math.max(program.flatDiscount || 0, 0);
  const afterPercent = basePrice * (1 - percent / 100);

  return Math.max(0, Math.round(afterPercent - flat));
}

export function hasSaleDiscount(basePrice: number, program: SaleProgram | undefined): boolean {
  return salePrice(basePrice, program) < basePrice;
}

export function createSaleItemIndex(items: SaleItem[]): Map<string, SaleItem> {
  return new Map(items.map((item) => [item.id, item]));
}

export function resolveSaleItem(
  ref: SaleProgramItemRef,
  index: Map<string, SaleItem>,
): ResolvedSaleItem | null {
  const item = index.get(ref.itemId);
  if (!item) return null;

  return {
    itemId: ref.itemId,
    name: item.name,
    note: ref.note ?? "",
  };
}

export function resolveSaleItems(
  refs: SaleProgramItemRef[],
  index: Map<string, SaleItem>,
): ResolvedSaleItem[] {
  return refs.flatMap((ref) => {
    const item = resolveSaleItem(ref, index);
    return item ? [item] : [];
  });
}

/** Merge the seed catalog with browser-created items; custom rows win on id. */
export function mergeSaleItems(seed: SaleItem[], custom: SaleItem[] = []): SaleItem[] {
  const byId = new Map(seed.map((item) => [item.id, item]));
  for (const item of custom) byId.set(item.id, item);
  return [...byId.values()];
}

export function slugifySaleItemId(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "item";
}

/** Generate a unique catalog id for a browser-created item. */
export function uniqueSaleItemId(name: string, usedIds: Set<string>): string {
  const base = `custom-${slugifySaleItemId(name)}`;
  let id = base;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(id);
  return id;
}

/** Case/diacritic-insensitive key for matching item names. */
export function normalizeSaleItemName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeItemRef(value: unknown): SaleProgramItemRef | null {
  const record = asRecord(value);
  if (!record) return null;

  const itemId = String(record.itemId ?? "").trim();
  if (!itemId) return null;

  return { itemId, note: String(record.note ?? "").trim() };
}

function normalizeDetail(value: unknown): SaleDetail | null {
  const record = asRecord(value);
  if (!record) return null;

  const title = String(record.title ?? "").trim();
  const text = String(record.text ?? "").trim();
  if (!title && !text) return null;

  return { title, text };
}

/** Coerce stored / editor data into a valid sale program row. */
export function normalizeSaleProgram(input: unknown, productId: string): SaleProgram {
  const record = asRecord(input);
  const rawItems = Array.isArray(record?.items) ? record.items : [];
  const rawDetails = Array.isArray(record?.details) ? record.details : [];

  return {
    productId,
    enabled: Boolean(record?.enabled),
    percentDiscount: Math.min(Math.max(Number(record?.percentDiscount) || 0, 0), 100),
    flatDiscount: Math.max(Number(record?.flatDiscount) || 0, 0),
    items: rawItems.flatMap((item) => {
      const ref = normalizeItemRef(item);
      return ref ? [ref] : [];
    }),
    details: rawDetails.flatMap((detail) => {
      const row = normalizeDetail(detail);
      return row ? [row] : [];
    }),
  };
}
