import rawItems from "../catalog/sale-items.json";
import type { SaleItem, SaleItemRepository } from "./types";

const items = (rawItems as { items: SaleItem[] }).items;

/** JSON-backed adapter for the shared add-on / gift catalog. */
export const saleItemRepository: SaleItemRepository = {
  list(): SaleItem[] {
    return items;
  },

  getById(id: string): SaleItem | undefined {
    return items.find((item) => item.id === id);
  },
};
