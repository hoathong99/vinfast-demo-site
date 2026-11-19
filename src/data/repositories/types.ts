export type ProductType = "car" | "motorbike";
export type ProductCategory = "mini-suv" | "suv" | "pho-thong" | "the-thao";

export type ProductColor = {
  name: string;
  hex: string;
  image: string;
};

/**
 * Product catalog row. `slug` is the stable public id used in URLs and
 * as the foreign key from sale programs.
 */
export type Product = {
  slug: string;
  name: string;
  type: ProductType;
  category: ProductCategory;
  tagline: string;
  price: number;
  priceNote: string;
  badge?: string;
  featured: boolean;
  order: number;
  quickSpecs: { label: string; value: string }[];
  specs: { group: string; items: { label: string; value: string }[] }[];
  images: string[];
  colors: ProductColor[];
  offers: { title: string; description: string; validUntil: string }[];
  description: string;
  highlights: { title: string; text: string }[];
};

/** Shared add-on / gift catalog row. */
export type SaleItem = {
  id: string;
  name: string;
};

/** Reference from a sale program to a sale item, with an optional per-program note. */
export type SaleProgramItemRef = {
  itemId: string;
  note?: string;
};

export type SaleDetail = {
  title: string;
  text: string;
};

/** Sale program row. Keyed to a product through `productId`. */
export type SaleProgram = {
  productId: string;
  enabled: boolean;
  percentDiscount: number;
  flatDiscount: number;
  items: SaleProgramItemRef[];
  details: SaleDetail[];
};

/** Sale item joined with its program-specific note, ready for rendering. */
export type ResolvedSaleItem = {
  itemId: string;
  name: string;
  note: string;
};

export type SaleProgramView = Omit<SaleProgram, "items"> & {
  items: ResolvedSaleItem[];
};

export interface ProductRepository {
  list(): Product[];
  getById(slug: string): Product | undefined;
  listByType(type: ProductType): Product[];
}

export interface SaleItemRepository {
  list(): SaleItem[];
  getById(id: string): SaleItem | undefined;
}

export interface SaleProgramRepository {
  list(): SaleProgram[];
  getByProductId(productId: string): SaleProgram | undefined;
}
