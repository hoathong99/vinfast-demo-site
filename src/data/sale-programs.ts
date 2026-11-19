import { saleItemRepository } from "./repositories/sale-items";
import { saleProgramRepository } from "./repositories/sale-programs";
import type { SaleItem, SaleProgram } from "./repositories/types";

export type {
  ResolvedSaleItem,
  SaleDetail,
  SaleItem,
  SaleProgram,
  SaleProgramItemRef,
  SaleProgramView,
} from "./repositories/types";

export { salePrice, hasSaleDiscount } from "../lib/sale";

/**
 * Build-time read facade for sale data. Callers depend on this module rather
 * than the JSON files, so a DB adapter can replace it later.
 */
export const saleItems: SaleItem[] = saleItemRepository.list();

export function getSaleProgram(productId: string): SaleProgram | undefined {
  return saleProgramRepository.getByProductId(productId);
}

export function getSaleItem(id: string): SaleItem | undefined {
  return saleItemRepository.getById(id);
}

export function listSalePrograms(): SaleProgram[] {
  return saleProgramRepository.list();
}
