import rawProducts from "../catalog/products.json";
import type { Product, ProductRepository, ProductType } from "./types";

const products = (rawProducts as { products: Product[] }).products;

/**
 * JSON-backed adapter. Replace this object with a DB-backed implementation
 * later without changing callers.
 */
export const productRepository: ProductRepository = {
  list(): Product[] {
    return products;
  },

  getById(slug: string): Product | undefined {
    return products.find((product) => product.slug === slug);
  },

  listByType(type: ProductType): Product[] {
    return products.filter((product) => product.type === type).sort((a, b) => a.order - b.order);
  },
};
