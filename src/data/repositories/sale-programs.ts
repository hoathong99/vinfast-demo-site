import rawPrograms from "../catalog/sale-programs.json";
import type { SaleProgram, SaleProgramRepository } from "./types";

const programs = (rawPrograms as { programs: SaleProgram[] }).programs;

/** JSON-backed adapter for sale programs. */
export const saleProgramRepository: SaleProgramRepository = {
  list(): SaleProgram[] {
    return programs;
  },

  getByProductId(productId: string): SaleProgram | undefined {
    return programs.find((program) => program.productId === productId);
  },
};
